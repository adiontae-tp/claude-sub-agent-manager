# Claude Sub-Agent Manager

A powerful web-based tool for managing Claude Code sub-agents in your projects. This tool provides an intuitive interface to create, manage, and monitor multiple AI sub-agents that work together on your codebase.

## 🌟 Features

- **🤖 AI-Powered Agent Generation** - Use Claude to automatically generate sub-agent configurations
- **📦 Bulk Import** - Create multiple agents from project documentation or requirements
- **📊 Dashboard View** - Monitor all agent tasks and progress in one place
- **🔄 Auto-Refresh** - Automatically updates status for active agents
- **✏️ Status Tracking** - Agents can update their progress in real-time
- **🎯 Batch Operations** - Start multiple agents with a single command
- **🗑️ Easy Management** - Edit, delete, and organize your sub-agents

## 🚀 Quick Start

1. **Clone into your project directory:**
   ```bash
   cd your-project
   git clone https://github.com/yourusername/claude-sub-agent-manager.git
   cd claude-sub-agent-manager
   ```

2. **Set up your Anthropic API key:**
   ```bash
   cp .env.template .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

3. **Install and run:**
   ```bash
   npm install
   npm start
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173`

The tool will automatically detect and manage agents in your project's `.claude/agents/` directory.

## 📁 How It Works

Claude Sub-Agent Manager looks for agents in the **parent directory** of where it's installed:

```
your-project/
├── .claude/
│   ├── agents/          # Your sub-agents are stored here
│   └── agents-status/   # Agent status tracking files
├── claude-sub-agent-manager/   # This tool
└── your-project-files/
```

## 🎯 Usage

### Creating a Single Agent

1. Click "Create New Agent"
2. Enter agent name and description
3. Use "Generate with Claude" to create an AI-powered system prompt
4. Review and edit the prompt
5. Click "Create Agent"

### Importing Multiple Agents

1. Click "Import Agents"
2. Either paste your project requirements or upload a document
3. Click "Analyze & Generate"
4. Review and edit the suggested agents
5. Click "Create X Agents" to create them all

### Managing Agents

- **List View** - See all agents with their status and task progress
- **Dashboard View** - Monitor all tasks across all agents
- **Start Agents** - Select multiple agents and generate a batch start command
- **Delete** - Remove agents you no longer need

## 🛠️ Sub-Agent File Structure

Each sub-agent is stored as a Markdown file with YAML frontmatter:

```markdown
---
name: frontend-developer
description: Handles all frontend development tasks
---

You are a frontend development specialist...

## Status Tracking

You have a status file at .claude/agents-status/frontend-developer-status.md...
```

## 📊 Agent Status Tracking

Agents update their status in structured Markdown files:

```markdown
---
agent: frontend-developer
last_updated: 2024-01-15 10:30:00
status: active
---

# Current Plan
Working on implementing the user dashboard...

# Todo List
- [x] Set up React components
- [ ] Implement state management
- [ ] Add API integration

# Progress Updates
## 2024-01-15 10:30:00
Created initial component structure...
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
ANTHROPIC_API_KEY=your-api-key-here
PORT=3001
```

### Supported File Types for Import

- `.txt` - Plain text files
- `.md` - Markdown documentation
- `.json` - Structured project data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for use with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) by Anthropic
- Uses Claude API for intelligent agent generation 