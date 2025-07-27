# Claude Sub-Agent Manager

A powerful web-based tool for managing Claude Code sub-agents in your projects. This tool provides an intuitive interface to create, manage, and monitor multiple AI sub-agents that work together on your codebase.

## 🌟 Features

- **🤖 AI-Powered Agent Generation** - Use Claude to automatically generate sub-agent configurations
- **📦 Bulk Import** - Create multiple agents from project documentation or requirements
- **📊 Enhanced Dashboard** - Comprehensive project overview with metrics and progress tracking
- **🎯 Task Management** - Assign specific tasks to agents and track their completion
- **🔄 All Tasks View** - Drag-and-drop reordering of tasks across agents with sequential execution
- **📈 Status Tracking** - Real-time progress updates with structured status files
- **🔄 Auto-Refresh** - Automatically updates status for active agents every 10 seconds
- **🎯 Batch Operations** - Start multiple agents with a single command
- **🗑️ Easy Management** - Edit, delete, and organize your sub-agents
- **📱 Modern UI** - Clean, responsive interface with collapsible sections and toast notifications
- **🖥️ Terminal Integration** - Web-based terminal for direct command execution

## 🚀 Quick Start

1. **Clone into your project directory:**
   ```bash
   cd your-project
   git clone https://github.com/yourusername/claude-sub-agent-manager.git
   cd claude-sub-agent-manager
   ```

2. **Set up your Anthropic API key:**
   ```bash
   cp .env.template backend/.env
   # Edit backend/.env and add your ANTHROPIC_API_KEY
   ```

3. **Install and run:**
   ```bash
   npm install
   npm start
   ```

4. **Open in browser:**
   Navigate to `http://localhost:5173` (or the port shown in terminal)

The tool will automatically manage agents in its own `.claude/agents/` directory.

## 📁 How It Works

Claude Sub-Agent Manager stores agents in the same directory where it's installed:

```
claude-sub-agent-manager/
├── .claude/
│   ├── agents/          # Your sub-agents are stored here
│   └── agents-status/   # Agent status tracking files
├── backend/             # Express server
├── frontend/            # React app
└── other-files/
```

## 🎯 Usage

### Creating a Single Agent

1. Click "Create New Agent"
2. Enter agent name and description
3. Use "Generate with Claude" to create an AI-powered system prompt
4. Review and edit the prompt
5. Click "Create Agent"
6. **Add Tasks** - Assign specific tasks to the agent for focused execution

### Importing Multiple Agents

1. Click "Import Agents"
2. Either paste your project requirements or upload a document
3. Click "Analyze & Generate"
4. Review and edit the suggested agents
5. Click "Create X Agents" to create them all

### Managing Agents

- **List View** - See all agents with their assigned tasks and status progress
- **Dashboard View** - Comprehensive overview with metrics, agent status, and task progress
- **All Tasks View** - Reorder tasks across selected agents for sequential execution
- **Start Agents** - Generate commands for individual or batch agent execution
- **Delete** - Remove agents you no longer need

### Task Management

- **Assign Tasks** - Add specific tasks to each agent after creation
- **Task Tracking** - Monitor both assigned tasks and status tracking tasks
- **Sequential Execution** - Use "All Tasks View" to reorder tasks and generate sequential commands
- **Command Generation** - Automatic generation of Claude Code commands with task details
- **Direct Execution** - Run sequential tasks directly in the terminal with one click

### Terminal Integration

- **Web Terminal** - Access a full terminal directly from the application
- **Direct Execution** - Run commands without copying and pasting from the UI
- **Session Management** - Start, stop, and monitor terminal sessions
- **Direct Access** - No authentication required for easy use
- **Auto Claude Startup** - Start Claude with selected agents directly from terminal

To use the terminal:
1. Click the **"Terminal"** button in the application header
2. The terminal will start and open in a modal window
3. Execute commands directly in the web terminal (no authentication required)
4. Use **"Start Claude"** or **"Start Selected Agents"** buttons to automatically start Claude
5. Click **"Stop Terminal"** to close the session

**Quick Task Execution:**
- In the **"All Tasks"** view, use **"Run Sequential Tasks"** button to execute your task list directly in the terminal
- This automatically starts the terminal and runs your sequential commands without copying/pasting

## 🛠️ Sub-Agent File Structure

Each sub-agent is stored as a Markdown file with YAML frontmatter:

```markdown
---
name: frontend-developer
description: Handles all frontend development tasks
tasks:
  - Build the user dashboard
  - Implement authentication system
  - Add responsive design
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

## 🎯 Command Generation

The tool generates Claude Code commands in the correct format:

**Single Agent:**
```
Use the frontend-developer sub agent to build the user dashboard and implement authentication system
```

**Multiple Agents (Sequential):**
```
Use the project-manager sub agent to coordinate the sprint and priorities, then use the frontend-developer sub agent to build the user dashboard, then use the backend-developer sub agent to implement the API endpoints
```

## 📊 Dashboard Features

The enhanced dashboard provides:

- **Key Metrics** - Total agents, assigned tasks, active agents, progress percentage
- **Agent Overview** - Individual agent cards with status, task counts, and progress
- **Task Progress** - Visual progress bars for status tracking tasks
- **Recent Activity** - Assigned tasks and status tracking tasks
- **Quick Actions** - Direct navigation to other views and features

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

## 🎨 UI Features

- **Collapsible Sections** - Save space with expandable/collapsible cards
- **Toast Notifications** - Non-intrusive alerts that auto-dismiss
- **Drag-and-Drop** - Reorder tasks in the All Tasks view
- **Auto-Refresh** - Automatic status updates for active agents
- **Responsive Design** - Works on desktop and mobile devices
- **Modern Styling** - Clean, professional interface with Tailwind CSS

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for use with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) by Anthropic
- Uses Claude API for intelligent agent generation 