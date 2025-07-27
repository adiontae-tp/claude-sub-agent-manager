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
          
          // Only load tasks from JSON file - don't fall back to YAML
          let tasks = [];
          const taskFile = path.join(directory, '.claude', 'tasks', `${nameMatch[1].trim()}-tasks.json`);
          
          try {
            const taskData = await fs.readFile(taskFile, 'utf-8');
            tasks = JSON.parse(taskData);
          } catch (err) {
            // If JSON file doesn't exist, tasks array remains empty
            // This ensures tasks only appear in the queue after being properly created
            tasks = [];
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
    const tasksDir = path.join(directory, '.claude', 'tasks');
    const taskFile = path.join(tasksDir, `${agentName}-tasks.json`);
    
    // Ensure tasks directory exists
    await fs.mkdir(tasksDir, { recursive: true });
    
    // Save tasks to dedicated JSON file
    await fs.writeFile(taskFile, JSON.stringify(tasks, null, 2), 'utf-8');
    
    // Also update agent file for backward compatibility
    const content = await fs.readFile(agentFile, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!match) {
      return res.status(400).json({ error: 'Invalid agent file format' });
    }
    
    let frontmatter = match[1];
    const body = match[2];
    
    // Remove existing tasks if any - updated regex to handle complex task structures
    frontmatter = frontmatter.replace(/tasks:\s*\n((?:(?:\s*-\s*.+\n)+(?:\s{4,}.+\n)*)*)/g, '');
    
    // Add new tasks if any
    if (tasks && tasks.length > 0) {
      const tasksYaml = 'tasks:\n' + tasks.map(task => {
        if (typeof task === 'string') {
          return `  - ${task}`;
        } else {
          // Enhanced task format
          return `  - description: ${task.description || task.task || ''}
    status: ${task.status || 'pending'}
    queued: ${task.queued || false}
    progress: ${task.progress || 0}
    subtasks: ${task.subtasks && task.subtasks.length > 0 
      ? '\n' + task.subtasks.map(st => `      - description: ${st.description}\n        completed: ${st.completed || false}`).join('\n')
      : '[]'}`;
        }
      }).join('\n');
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

// Update single task progress (for agents to use)
app.post('/api/update-task-progress/:encodedDir/:agentName/:taskIndex', async (req, res) => {
  try {
    const directory = decodeURIComponent(req.params.encodedDir);
    const { agentName, taskIndex } = req.params;
    const { status, progress, subtasks, queued } = req.body;
    
    const tasksDir = path.join(directory, '.claude', 'tasks');
    const taskFile = path.join(tasksDir, `${agentName}-tasks.json`);
    
    // Ensure tasks directory exists
    await fs.mkdir(tasksDir, { recursive: true });
    
    // Read current tasks or get from agent file if task file doesn't exist
    let tasks = [];
    try {
      const taskData = await fs.readFile(taskFile, 'utf-8');
      tasks = JSON.parse(taskData);
    } catch (err) {
      // If task file doesn't exist, try to get tasks from agent file
      const agentFile = path.join(directory, '.claude', 'agents', `${agentName}.md`);
      try {
        const agentContent = await fs.readFile(agentFile, 'utf-8');
        const match = agentContent.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const frontmatter = match[1];
          // Parse tasks from frontmatter
          const tasksMatch = frontmatter.match(/tasks:\s*\n((?:\s*-\s*.+\n?)*)/);
          if (tasksMatch) {
            const taskLines = tasksMatch[1]
              .split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => line.trim().substring(1).trim())
              .filter(task => task.length > 0);
            
            // Convert to task objects
            tasks = taskLines.map(task => ({
              description: task,
              status: 'pending',
              queued: false,
              progress: 0,
              subtasks: []
            }));
            
            // Save to task file
            await fs.writeFile(taskFile, JSON.stringify(tasks, null, 2), 'utf-8');
          }
        }
      } catch (agentErr) {
        return res.status(404).json({ error: 'Agent not found and no task file exists' });
      }
    }
    
    // Update specific task
    const index = parseInt(taskIndex);
    if (index >= 0 && index < tasks.length) {
      if (status !== undefined) tasks[index].status = status;
      if (progress !== undefined) tasks[index].progress = progress;
      if (subtasks !== undefined) tasks[index].subtasks = subtasks;
      if (queued !== undefined) tasks[index].queued = queued;
      
      // Save updated tasks
      await fs.writeFile(taskFile, JSON.stringify(tasks, null, 2), 'utf-8');
      
      res.json({ success: true, message: 'Task progress updated' });
    } else {
      res.status(400).json({ error: 'Invalid task index' });
    }
  } catch (error) {
    console.error('Error updating task progress:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent tasks (for agents to check their tasks)
app.get('/api/get-agent-tasks/:encodedDir/:agentName', async (req, res) => {
  try {
    const directory = decodeURIComponent(req.params.encodedDir);
    const { agentName } = req.params;
    
    const tasksDir = path.join(directory, '.claude', 'tasks');
    const taskFile = path.join(tasksDir, `${agentName}-tasks.json`);
    
    // Try to read task file
    try {
      const taskData = await fs.readFile(taskFile, 'utf-8');
      const tasks = JSON.parse(taskData);
      res.json({ success: true, tasks });
    } catch (err) {
      // If task file doesn't exist, try to get from agent file
      const agentFile = path.join(directory, '.claude', 'agents', `${agentName}.md`);
      try {
        const agentContent = await fs.readFile(agentFile, 'utf-8');
        const match = agentContent.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
          const frontmatter = match[1];
          // Parse tasks from frontmatter
          const tasksMatch = frontmatter.match(/tasks:\s*\n((?:\s*-\s*.+\n?)*)/);
          if (tasksMatch) {
            const taskLines = tasksMatch[1]
              .split('\n')
              .filter(line => line.trim().startsWith('-'))
              .map(line => line.trim().substring(1).trim())
              .filter(task => task.length > 0);
            
            // Convert to task objects
            const tasks = taskLines.map(task => ({
              description: task,
              status: 'pending',
              queued: false,
              progress: 0,
              subtasks: []
            }));
            
            // Create task file
            await fs.mkdir(tasksDir, { recursive: true });
            await fs.writeFile(taskFile, JSON.stringify(tasks, null, 2), 'utf-8');
            
            res.json({ success: true, tasks });
          } else {
            res.json({ success: true, tasks: [] });
          }
        } else {
          res.status(400).json({ error: 'Invalid agent file format' });
        }
      } catch (agentErr) {
        res.status(404).json({ error: 'Agent not found' });
      }
    }
  } catch (error) {
    console.error('Error getting agent tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get agent content (for editing)
app.get('/api/get-agent-content/:encodedDir/:agentName', async (req, res) => {
  try {
    const directory = decodeURIComponent(req.params.encodedDir);
    const { agentName } = req.params;
    
    const agentFile = path.join(directory, '.claude', 'agents', `${agentName}.md`);
    
    // Check if agent exists
    const agentExists = await fs.access(agentFile).then(() => true).catch(() => false);
    if (!agentExists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Read agent file
    const content = await fs.readFile(agentFile, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!match) {
      return res.status(400).json({ error: 'Invalid agent file format' });
    }
    
    const frontmatter = match[1];
    const systemPrompt = match[2];
    
    // Parse frontmatter
    const nameMatch = frontmatter.match(/name:\s*(.+)/);
    const descMatch = frontmatter.match(/description:\s*(.+)/);
    
    res.json({
      name: nameMatch ? nameMatch[1].trim() : agentName,
      description: descMatch ? descMatch[1].trim() : '',
      systemPrompt: systemPrompt.trim()
    });
  } catch (error) {
    console.error('Error reading agent content:', error);
    res.status(500).json({ error: 'Failed to read agent content' });
  }
});

// Update agent
app.post('/api/update-agent', async (req, res) => {
  const { directory, oldName, newName, description, systemPrompt } = req.body;
  
  // Validate name format
  if (!/^[a-z-]+$/.test(newName)) {
    return res.status(400).json({ error: 'Agent name must contain only lowercase letters and hyphens' });
  }
  
  const agentsDir = path.join(directory, '.claude', 'agents');
  const oldAgentFile = path.join(agentsDir, `${oldName}.md`);
  const newAgentFile = path.join(agentsDir, `${newName}.md`);
  const oldStatusFile = path.join(directory, '.claude', 'agents-status', `${oldName}-status.md`);
  const newStatusFile = path.join(directory, '.claude', 'agents-status', `${newName}-status.md`);
  
  try {
    // Check if old agent exists
    const oldAgentExists = await fs.access(oldAgentFile).then(() => true).catch(() => false);
    if (!oldAgentExists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Check if new name already exists (if different)
    if (oldName !== newName) {
      const newAgentExists = await fs.access(newAgentFile).then(() => true).catch(() => false);
      if (newAgentExists) {
        return res.status(400).json({ error: `Agent '${newName}' already exists` });
      }
    }
    
    // Create enhanced system prompt with status tracking
    const enhancedSystemPrompt = `${systemPrompt}

## Status Tracking

You have a status file at .claude/agents-status/${newName}-status.md that you should update regularly.

Use the following format for your status file:

\`\`\`markdown
---
agent: ${newName}
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

    // Create new agent content
    const content = `---
name: ${newName}
description: ${description}
---

${enhancedSystemPrompt}
`;
    
    // Write new agent file
    await fs.writeFile(newAgentFile, content, 'utf-8');
    
    // Delete old agent file if name changed
    if (oldName !== newName) {
      await fs.unlink(oldAgentFile).catch(err => console.warn(`Failed to delete old agent file: ${err.message}`));
      
      // Rename status file if it exists
      const oldStatusExists = await fs.access(oldStatusFile).then(() => true).catch(() => false);
      if (oldStatusExists) {
        await fs.rename(oldStatusFile, newStatusFile).catch(err => console.warn(`Failed to rename status file: ${err.message}`));
      }
    }
    
    res.json({ 
      success: true, 
      message: `Agent updated successfully${oldName !== newName ? ` and renamed from '${oldName}' to '${newName}'` : ''}`
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent: ' + error.message });
  }
});

// Load agent templates from directory
app.get('/api/agent-templates', async (req, res) => {
  try {
    const templatesDir = path.join(__dirname, '..', 'agent-templates');
    const files = await fs.readdir(templatesDir);
    const templates = [];
    
    for (const file of files) {
      if (file.endsWith('.md') && file !== 'README.md') {
        const content = await fs.readFile(path.join(templatesDir, file), 'utf-8');
        
        // Parse template content
        const nameMatch = content.match(/## Agent Details[\s\S]*?\*\*Name\*\*:\s*(.+)/);
        const descMatch = content.match(/## Agent Details[\s\S]*?\*\*Description\*\*:\s*(.+)/);
        const categoryMatch = content.match(/## Agent Details[\s\S]*?\*\*Category\*\*:\s*(.+)/);
        
        // Extract system prompt (everything after "## System Prompt")
        const systemPromptMatch = content.match(/## System Prompt\s*\n\s*([\s\S]*?)(?=\n## |$)/);
        
        if (nameMatch && descMatch && systemPromptMatch) {
          templates.push({
            name: nameMatch[1].trim(),
            description: descMatch[1].trim(),
            category: categoryMatch ? categoryMatch[1].trim() : 'General',
            systemPrompt: systemPromptMatch[1].trim(),
            filename: file
          });
        }
      }
    }
    
    res.json({ templates });
  } catch (error) {
    console.error('Error loading templates:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

// Tech Stack API Endpoints

// Get tech stack technologies and common stacks
app.get('/api/tech-stack/technologies', async (req, res) => {
  try {
    const techStackData = JSON.parse(await fs.readFile(path.join(__dirname, '..', 'tech-stack-data.json'), 'utf-8'));
    res.json({ technologies: techStackData.technologies, commonStacks: techStackData.commonStacks });
  } catch (error) {
    console.error('Error loading tech stack data:', error);
    res.status(500).json({ error: 'Failed to load tech stack data' });
  }
});

// Get global tech stack for a project
app.get('/api/tech-stack/global/:encodedDir', async (req, res) => {
  try {
    const directory = decodeURIComponent(req.params.encodedDir);
    const techStackFile = path.join(directory, '.claude', 'tech-stack.json');
    
    const exists = await fs.access(techStackFile).then(() => true).catch(() => false);
    if (exists) {
      const techStack = JSON.parse(await fs.readFile(techStackFile, 'utf-8'));
      res.json({ techStack });
    } else {
      res.json({ techStack: {} });
    }
  } catch (error) {
    console.error('Error loading global tech stack:', error);
    res.status(500).json({ error: 'Failed to load global tech stack' });
  }
});

// Save global tech stack for a project
app.post('/api/tech-stack/global', async (req, res) => {
  try {
    const { directory, techStack } = req.body;
    
    if (!directory) {
      return res.status(400).json({ error: 'Directory is required' });
    }
    
    const claudeDir = path.join(directory, '.claude');
    const techStackFile = path.join(claudeDir, 'tech-stack.json');
    
    // Ensure .claude directory exists
    await fs.mkdir(claudeDir, { recursive: true });
    
    // Save tech stack
    await fs.writeFile(techStackFile, JSON.stringify(techStack, null, 2), 'utf-8');
    
    res.json({ success: true, message: 'Global tech stack saved successfully' });
  } catch (error) {
    console.error('Error saving global tech stack:', error);
    res.status(500).json({ error: 'Failed to save global tech stack' });
  }
});

// Get agent-specific tech stack
app.get('/api/tech-stack/agent/:encodedDir/:agentName', async (req, res) => {
  try {
    const directory = decodeURIComponent(req.params.encodedDir);
    const agentName = req.params.agentName;
    const agentFile = path.join(directory, '.claude', 'agents', `${agentName}.md`);
    
    const exists = await fs.access(agentFile).then(() => true).catch(() => false);
    if (exists) {
      const content = await fs.readFile(agentFile, 'utf-8');
      
      // Parse YAML frontmatter for tech stack
      const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const techStackMatch = frontmatter.match(/techStack:\s*\n([\s\S]*?)(?=\n\w|$)/);
        
        if (techStackMatch) {
          // Parse the tech stack YAML
          const techStackYaml = techStackMatch[1];
          const techStack = {};
          
          // Simple YAML parsing for tech stack
          const lines = techStackYaml.split('\n');
          let currentCategory = null;
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('-')) {
              currentCategory = trimmed.replace(':', '');
              techStack[currentCategory] = [];
            } else if (trimmed.startsWith('-') && currentCategory) {
              const tech = trimmed.replace('-', '').trim();
              if (tech) {
                techStack[currentCategory].push(tech);
              }
            }
          }
          
          res.json({ techStack });
        } else {
          res.json({ techStack: {} });
        }
      } else {
        res.json({ techStack: {} });
      }
    } else {
      res.status(404).json({ error: 'Agent not found' });
    }
  } catch (error) {
    console.error('Error loading agent tech stack:', error);
    res.status(500).json({ error: 'Failed to load agent tech stack' });
  }
});

// Save agent-specific tech stack
app.post('/api/tech-stack/agent', async (req, res) => {
  try {
    const { directory, agentName, techStack } = req.body;
    
    if (!directory || !agentName) {
      return res.status(400).json({ error: 'Directory and agent name are required' });
    }
    
    const agentFile = path.join(directory, '.claude', 'agents', `${agentName}.md`);
    
    const exists = await fs.access(agentFile).then(() => true).catch(() => false);
    if (!exists) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const content = await fs.readFile(agentFile, 'utf-8');
    
    // Parse existing frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    let newContent = content;
    
    if (frontmatterMatch) {
      // Update existing frontmatter
      const frontmatter = frontmatterMatch[1];
      let updatedFrontmatter = frontmatter;
      
      // Remove existing techStack if present
      updatedFrontmatter = updatedFrontmatter.replace(/techStack:\s*\n([\s\S]*?)(?=\n\w|$)/g, '');
      
      // Add new techStack
      if (Object.keys(techStack).length > 0) {
        const techStackYaml = Object.entries(techStack)
          .filter(([_, techs]) => techs && techs.length > 0)
          .map(([category, techs]) => `  ${category}:\n${techs.map(tech => `    - ${tech}`).join('\n')}`)
          .join('\n');
        
        updatedFrontmatter += `\ntechStack:\n${techStackYaml}`;
      }
      
      newContent = content.replace(frontmatterMatch[0], `---\n${updatedFrontmatter}\n---\n`);
    } else {
      // Create new frontmatter
      const techStackYaml = Object.entries(techStack)
        .filter(([_, techs]) => techs && techs.length > 0)
        .map(([category, techs]) => `  ${category}:\n${techs.map(tech => `    - ${tech}`).join('\n')}`)
        .join('\n');
      
      const newFrontmatter = `---\ntechStack:\n${techStackYaml}\n---\n\n`;
      newContent = newFrontmatter + content;
    }
    
    await fs.writeFile(agentFile, newContent, 'utf-8');
    
    res.json({ success: true, message: 'Agent tech stack saved successfully' });
  } catch (error) {
    console.error('Error saving agent tech stack:', error);
    res.status(500).json({ error: 'Failed to save agent tech stack' });
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

// Terminal management endpoints
let terminalProcess = null;
let terminalPort = null;

// Start terminal session
app.post('/api/terminal/start', async (req, res) => {
  try {
    // Kill existing terminal process if running
    if (terminalProcess) {
      terminalProcess.kill();
      terminalProcess = null;
    }

    // Find an available port starting from 7681 (ttyd default)
    const { spawn } = require('child_process');
    const net = require('net');
    
    const findAvailablePort = (startPort) => {
      return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(startPort, () => {
          const port = server.address().port;
          server.close(() => resolve(port));
        });
        server.on('error', () => {
          resolve(findAvailablePort(startPort + 1));
        });
      });
    };

    // Kill any existing ttyd processes on common ports
    const killExistingTtyd = () => {
      return new Promise((resolve) => {
        const { exec } = require('child_process');
        exec('pkill -f "ttyd.*768[0-9]"', (error) => {
          // Ignore errors as there might not be any processes to kill
          setTimeout(resolve, 1000); // Wait a moment for processes to be killed
        });
      });
    };

    // Kill any existing ttyd processes first
    await killExistingTtyd();
    
    const port = await findAvailablePort(7681);
    terminalPort = port;

    // Start ttyd process
    terminalProcess = spawn('ttyd', [
      '-p', port.toString(),
      '-W', // Enable writable mode
      '-t', 'titleFixed=Claude Agent Terminal',
      '-t', 'theme=dark',
      'bash'
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    terminalProcess.on('error', (error) => {
      console.error('Failed to start ttyd:', error);
      res.status(500).json({ error: 'Failed to start terminal' });
    });

    terminalProcess.on('exit', (code) => {
      console.log(`ttyd process exited with code ${code}`);
      terminalProcess = null;
      terminalPort = null;
    });

    // Add stdout and stderr handlers for debugging
    terminalProcess.stdout.on('data', (data) => {
      console.log('ttyd stdout:', data.toString());
    });

    terminalProcess.stderr.on('data', (data) => {
      console.log('ttyd stderr:', data.toString());
    });

    // Wait a moment for ttyd to start, then send startup information
    setTimeout(() => {
      // Send startup information to the terminal
      if (terminalProcess && !terminalProcess.killed) {
        const startupInfo = `
echo "🚀 Starting Claude Agent Manager..."
echo "Current directory: $(pwd)"
echo ""
echo "Available agents:"
ls -la .claude/agents/ 2>/dev/null || echo "No agents directory found"
echo ""
echo "Quick Commands:"
echo "  • claude agents start <agent-name>     - Start a specific agent"
echo "  • claude agents start <agent1> <agent2> - Start multiple agents"
echo "  • claude --help                        - See all commands"
echo ""
echo "🎯 Ready to work with your agents!"
echo ""
        `.trim();
        
        terminalProcess.stdin.write(startupInfo + '\n');
      }
      
      res.json({ 
        url: `http://localhost:${port}`,
        port: port,
        status: 'running'
      });
    }, 1000);

  } catch (error) {
    console.error('Error starting terminal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop terminal session
app.post('/api/terminal/stop', async (req, res) => {
  try {
    if (terminalProcess) {
      terminalProcess.kill();
      terminalProcess = null;
      terminalPort = null;
      res.json({ status: 'stopped' });
    } else {
      res.json({ status: 'not running' });
    }
  } catch (error) {
    console.error('Error stopping terminal:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get terminal status
app.get('/api/terminal/status', async (req, res) => {
  try {
    const isRunning = terminalProcess && !terminalProcess.killed;
    res.json({ 
      running: isRunning,
      port: terminalPort,
      url: isRunning ? `http://localhost:${terminalPort}` : null
    });
  } catch (error) {
    console.error('Error getting terminal status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute command in terminal (if terminal is running)
app.post('/api/terminal/command', async (req, res) => {
  try {
    const { command } = req.body;
    
    if (!terminalProcess || terminalProcess.killed) {
      return res.status(400).json({ error: 'Terminal is not running' });
    }

    if (!command) {
      return res.status(400).json({ error: 'No command provided' });
    }

    // Send command to terminal process
    terminalProcess.stdin.write(command + '\n');
    
    res.json({ status: 'command sent', command });
  } catch (error) {
    console.error('Error executing command:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-start Claude with specific agents
app.post('/api/terminal/start-claude', async (req, res) => {
  try {
    const { agents = [] } = req.body;
    
    if (!terminalProcess || terminalProcess.killed) {
      return res.status(400).json({ error: 'Terminal is not running' });
    }

    // Start Claude in interactive mode
    let command = 'claude';
    
    // If specific agents are provided, we can add them as context
    if (agents.length > 0) {
      command += ` --append-system-prompt "You are working with the following agents: ${agents.join(', ')}. Use the agents when appropriate for the task."`;
    }

    // Send command to terminal process
    terminalProcess.stdin.write(command + '\n');
    
    res.json({ status: 'claude started', command, agents });
  } catch (error) {
    console.error('Error starting Claude:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Make sure ANTHROPIC_API_KEY is set in your .env file`);
});

// Cleanup on server shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  if (terminalProcess) {
    console.log('Stopping terminal process...');
    terminalProcess.kill();
  }
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  if (terminalProcess) {
    console.log('Stopping terminal process...');
    terminalProcess.kill();
  }
  server.close(() => {
    console.log('Server stopped');
    process.exit(0);
  });
}); 