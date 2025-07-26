const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');
const multer = require('multer');

// Load environment variables
dotenv.config();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const app = express();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Get parent directory path
app.get('/api/parent-directory', (req, res) => {
  // Use the current directory where the app is installed
  const currentDir = path.resolve(__dirname, '../..')
  res.json({ 
    path: currentDir,
    agentsPath: path.join(currentDir, '.claude', 'agents')
  })
})

// Validate directory endpoint
app.post('/api/validate-directory', async (req, res) => {
  const { directory } = req.body;
  
  try {
    const stats = await fs.stat(directory);
    if (!stats.isDirectory()) {
      return res.status(400).json({ valid: false, error: 'Path is not a directory' });
    }
    
    // Try to access the directory
    await fs.access(directory, fs.constants.W_OK);
    
    res.json({ valid: true, fullPath: path.join(directory, '.claude', 'agents') });
  } catch (error) {
    res.status(400).json({ valid: false, error: error.message });
  }
});

// List agents in a directory
app.get('/api/list-agents/:encodedDir', async (req, res) => {
  const directory = decodeURIComponent(req.params.encodedDir);
  const agentsDir = path.join(directory, '.claude', 'agents');
  
  try {
    const files = await fs.readdir(agentsDir);
    const agents = [];
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const content = await fs.readFile(path.join(agentsDir, file), 'utf-8');
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        
        if (match) {
          const frontmatter = match[1];
          const nameMatch = frontmatter.match(/name:\s*(.+)/);
          const descMatch = frontmatter.match(/description:\s*(.+)/);
          
          // Parse tasks - look for tasks array in YAML
          let tasks = [];
          const tasksMatch = frontmatter.match(/tasks:\s*\n((?:\s*-\s*.+\n?)*)/);
          if (tasksMatch) {
            tasks = tasksMatch[1]
              .split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => line.trim().substring(1).trim())
              .filter(task => task.length > 0);
          }
          
          agents.push({
            filename: file,
            name: nameMatch ? nameMatch[1].trim() : file.replace('.md', ''),
            description: descMatch ? descMatch[1].trim() : 'No description',
            tasks: tasks
          });
        }
      }
    }
    
    res.json({ agents });
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ agents: [] });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Generate agent with Claude
app.post('/api/generate-agent', async (req, res) => {
  const { name, description } = req.body;
  
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in .env file' });
  }
  
  try {
    const prompt = `You are an expert at creating Claude Code sub-agents based on the documentation at https://docs.anthropic.com/en/docs/claude-code/sub-agents.

Create a sub-agent with the following details:
- Name: ${name}
- Description: ${description}

Generate a comprehensive system prompt for this sub-agent that:
1. Clearly defines the agent's role and expertise
2. Includes specific instructions and best practices
3. Provides a structured approach to solving problems in its domain
4. Uses proactive language to encourage automatic delegation
5. Is detailed and actionable

Return ONLY the system prompt text (no markdown formatting, no explanations).`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const systemPrompt = message.content[0].text;
    res.json({ systemPrompt });
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Failed to generate agent: ' + error.message });
  }
});

// Enhance existing prompt
app.post('/api/enhance-prompt', async (req, res) => {
  const { currentPrompt, name, description } = req.body;
  
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in .env file' });
  }
  
  try {
    const prompt = `You are an expert at creating Claude Code sub-agents based on the documentation at https://docs.anthropic.com/en/docs/claude-code/sub-agents.

Enhance and improve this existing sub-agent system prompt:

Current prompt:
${currentPrompt}

Agent details:
- Name: ${name}
- Description: ${description}

Improve the prompt to:
1. Be more comprehensive and detailed
2. Include better structure and organization
3. Add specific best practices and constraints
4. Use more proactive language
5. Make it more actionable and effective

Return ONLY the enhanced system prompt text (no markdown formatting, no explanations).`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const enhancedPrompt = message.content[0].text;
    res.json({ systemPrompt: enhancedPrompt });
  } catch (error) {
    console.error('Claude API error:', error);
    res.status(500).json({ error: 'Failed to enhance prompt: ' + error.message });
  }
});

// Create agent file
app.post('/api/create-agent', async (req, res) => {
  const { directory, name, description, systemPrompt } = req.body;
  
  // Validate name format
  if (!/^[a-z-]+$/.test(name)) {
    return res.status(400).json({ error: 'Agent name must contain only lowercase letters and hyphens' });
  }
  
  const agentsDir = path.join(directory, '.claude', 'agents');
  const agentFile = path.join(agentsDir, `${name}.md`);
  const statusDir = path.join(directory, '.claude', 'agents-status');
  const statusFile = path.join(statusDir, `${name}-status.md`);
  
  try {
    // Create directories if they don't exist
    await fs.mkdir(agentsDir, { recursive: true });
    await fs.mkdir(statusDir, { recursive: true });
    
    // Check if agent already exists
    try {
      await fs.access(agentFile);
      return res.status(400).json({ error: `Agent '${name}' already exists in this directory` });
    } catch {
      // File doesn't exist, which is good
    }
    
    // Create agent content with status file instructions
    const enhancedSystemPrompt = `${systemPrompt}

## Status Tracking

You have a status file at .claude/agents-status/${name}-status.md that you should update regularly.

Use the following format for your status file:

\`\`\`markdown
---
agent: ${name}
last_updated: YYYY-MM-DD HH:MM:SS
status: active|completed|blocked
---

# Current Plan

[Describe your current approach and strategy]

# Todo List

- [ ] Task 1 description
- [x] Completed task
- [ ] Task 3 description

# Progress Updates

## YYYY-MM-DD HH:MM:SS
[Describe what you accomplished and any blockers]

## YYYY-MM-DD HH:MM:SS
[Another update]
\`\`\`

Always update this file when:
1. Starting a new task
2. Completing significant work
3. Encountering blockers
4. Changing your approach`;

    const content = `---
name: ${name}
description: ${description}
---

${enhancedSystemPrompt}
`;
    
    // Write agent file
    await fs.writeFile(agentFile, content, 'utf-8');
    
    // Create initial status file
    const initialStatus = `---
agent: ${name}
last_updated: ${new Date().toISOString()}
status: active
---

# Current Plan

Agent initialized. Awaiting first task.

# Todo List

- [ ] Awaiting first task assignment

# Progress Updates

## ${new Date().toISOString()}
Agent created and ready for tasks.
`;
    
    await fs.writeFile(statusFile, initialStatus, 'utf-8');
    
    res.json({ 
      success: true, 
      filePath: agentFile,
      statusPath: statusFile,
      message: `Agent '${name}' created successfully with status tracking`
    });
  } catch (error) {
    console.error('File creation error:', error);
    res.status(500).json({ error: 'Failed to create agent file: ' + error.message });
  }
});

// Get agent status
app.get('/api/agent-status/:encodedDir/:agentName', async (req, res) => {
  const directory = decodeURIComponent(req.params.encodedDir);
  const agentName = req.params.agentName;
  const statusFile = path.join(directory, '.claude', 'agents-status', `${agentName}-status.md`);
  
  try {
    const content = await fs.readFile(statusFile, 'utf-8');
    
    // Parse the frontmatter and content
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      const frontmatter = match[1];
      const markdownContent = match[2];
      
      // Parse frontmatter
      const status = {};
      frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          status[key.trim()] = valueParts.join(':').trim();
        }
      });
      
      // Parse todo items
      const todoMatches = [...markdownContent.matchAll(/- \[([ xX])\] (.+)/g)];
      const todos = todoMatches.map(match => ({
        completed: match[1].toLowerCase() === 'x',
        text: match[2]
      }));

      // Parse current plan
      const planMatch = markdownContent.match(/# Current Plan\s*\n\n([^#]+)/);
      const currentPlan = planMatch ? planMatch[1].trim() : '';

      res.json({
        ...status,
        content: markdownContent,
        todos,
        currentPlan,
        exists: true
      });
    } else {
      res.json({ exists: false, content: content });
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.json({ exists: false });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update agent status (for future use by agents)
app.post('/api/agent-status/:encodedDir/:agentName', async (req, res) => {
  const directory = decodeURIComponent(req.params.encodedDir);
  const agentName = req.params.agentName;
  const { content } = req.body;
  const statusFile = path.join(directory, '.claude', 'agents-status', `${agentName}-status.md`);
  
  try {
    await fs.writeFile(statusFile, content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update agent tasks
app.post('/api/update-agent-tasks/:encodedDir/:agentName', async (req, res) => {
  try {
    const directory = decodeURIComponent(req.params.encodedDir);
    const { agentName } = req.params;
    const { tasks } = req.body;
    
    const agentFile = path.join(directory, '.claude', 'agents', `${agentName}.md`);
    
    // Read current agent file
    const content = await fs.readFile(agentFile, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!match) {
      return res.status(400).json({ error: 'Invalid agent file format' });
    }
    
    let frontmatter = match[1];
    const body = match[2];
    
    // Remove existing tasks if any
    frontmatter = frontmatter.replace(/tasks:\s*\n((?:\s*-\s*.+\n)*)/g, '');
    
    // Add new tasks if any
    if (tasks && tasks.length > 0) {
      const tasksYaml = 'tasks:\n' + tasks.map(task => `  - ${task}`).join('\n');
      frontmatter = frontmatter.trim() + '\n' + tasksYaml;
    }
    
    // Write updated content
    const updatedContent = `---\n${frontmatter}\n---\n${body}`;
    await fs.writeFile(agentFile, updatedContent, 'utf-8');
    
    res.json({ success: true, message: 'Tasks updated successfully' });
  } catch (error) {
    console.error('Error updating tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an agent
app.delete('/api/delete-agent/:encodedDir/:agentName', async (req, res) => {
  try {
    const directory = decodeURIComponent(req.params.encodedDir);
    const { agentName } = req.params;

    const agentFile = path.join(directory, '.claude', 'agents', `${agentName}.md`);
    const statusFile = path.join(directory, '.claude', 'agents-status', `${agentName}-status.md`);

    // Check if agent exists
    const agentExists = await fs.access(agentFile).then(() => true).catch(() => false);
    if (!agentExists) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Delete both files
    const deletePromises = [
      fs.unlink(agentFile).catch(err => console.warn(`Failed to delete agent file: ${err.message}`)),
      fs.unlink(statusFile).catch(err => console.warn(`Failed to delete status file: ${err.message}`))
    ];

    await Promise.all(deletePromises);

    res.json({ 
      success: true, 
      message: `Agent ${agentName} deleted successfully` 
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// Analyze content and suggest agents
app.post('/api/analyze-for-agents', async (req, res) => {
  try {
    const { content, fileType } = req.body;

    const prompt = `You are an expert at analyzing projects and determining what Claude Code sub-agents would be helpful.

Analyze the following ${fileType || 'content'} and suggest Claude Code sub-agents that would be useful for this project.

For each agent, provide:
1. A clear, descriptive name (use kebab-case, e.g., "frontend-developer")
2. A brief description of what the agent does
3. A comprehensive system prompt that gives the agent its role, responsibilities, and guidelines

Return your response as a JSON array of agent suggestions.

Content to analyze:
${content}

IMPORTANT: Return ONLY a valid JSON array, no markdown formatting or extra text. Example format:
[
  {
    "name": "agent-name",
    "description": "Brief description",
    "systemPrompt": "Detailed system prompt..."
  }
]`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      // Parse the JSON response
      const suggestions = JSON.parse(response.content[0].text);
      res.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
    } catch (parseError) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = response.content[0].text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const suggestions = JSON.parse(jsonMatch[0]);
          res.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
          res.json({ suggestions: [], error: 'Failed to parse Claude response' });
        }
      } else {
        console.error('No JSON array found in response');
        res.json({ suggestions: [], error: 'Claude did not return a valid JSON array' });
      }
    }
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({ suggestions: [], error: error.message || 'Failed to analyze content' });
  }
});

// Analyze uploaded file and suggest agents
app.post('/api/analyze-file-for-agents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ suggestions: [], error: 'No file uploaded' });
    }

    // Convert file buffer to text
    const content = req.file.buffer.toString('utf-8');
    const fileType = path.extname(req.file.originalname);

    // Use the same analysis endpoint logic
    const prompt = `You are an expert at analyzing projects and determining what Claude Code sub-agents would be helpful.

Analyze the following ${fileType} file content and suggest Claude Code sub-agents that would be useful for this project.

For each agent, provide:
1. A clear, descriptive name (use kebab-case, e.g., "frontend-developer")
2. A brief description of what the agent does
3. A comprehensive system prompt that gives the agent its role, responsibilities, and guidelines

Return your response as a JSON array of agent suggestions.

File: ${req.file.originalname}
Content:
${content}

IMPORTANT: Return ONLY a valid JSON array, no markdown formatting or extra text.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      // Parse the JSON response
      const suggestions = JSON.parse(response.content[0].text);
      res.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
    } catch (parseError) {
      // If parsing fails, try to extract JSON from the response
      const jsonMatch = response.content[0].text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const suggestions = JSON.parse(jsonMatch[0]);
          res.json({ suggestions: Array.isArray(suggestions) ? suggestions : [] });
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
          res.json({ suggestions: [], error: 'Failed to parse Claude response' });
        }
      } else {
        console.error('No JSON array found in response');
        res.json({ suggestions: [], error: 'Claude did not return a valid JSON array' });
      }
    }
  } catch (error) {
    console.error('Error analyzing file:', error);
    res.status(500).json({ suggestions: [], error: error.message || 'Failed to analyze file' });
  }
});

const PORT = process.env.PORT || 3001;
// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Make sure ANTHROPIC_API_KEY is set in your .env file`);
}); 