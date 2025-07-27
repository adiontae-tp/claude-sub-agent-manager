# Terminal Integration

This document describes the terminal integration feature that allows users to access a web-based terminal directly from the Claude Sub-Agent Manager.

## Overview

The terminal integration uses [ttyd](https://github.com/tsl0922/ttyd) to provide a web-based terminal that can be accessed through the application interface. This allows users to execute commands directly without copying and pasting from the UI.

## Features

- **Web-based Terminal**: Access a full terminal through your browser
- **Integrated UI**: Terminal opens in a modal within the application
- **Session Management**: Start, stop, and monitor terminal sessions
- **Real-time Status**: See terminal status and port information
- **Direct Access**: No authentication required for easy access
- **Auto Claude Startup**: Automatically start Claude with selected agents
- **Sequential Task Execution**: Run task lists directly from the All Tasks view

## How to Use

### Starting the Terminal

1. Click the **"Terminal"** button in the application header
2. The terminal will start automatically and open in a modal
3. You'll see a status indicator showing "Running" when the terminal is active

### Terminal Interface

- **Modal Window**: The terminal opens in a large modal window
- **Status Bar**: Shows current terminal status (Running, Starting, Stopped)
- **Full Terminal**: Access to a complete bash shell
- **Direct Access**: No authentication required - terminal opens immediately
- **Claude Buttons**: Start Claude with selected agents or all agents

### Stopping the Terminal

1. Click the **"Stop Terminal"** button in the modal footer
2. The terminal session will be terminated
3. The modal will close automatically

### Starting Claude with Agents

1. **Start Claude**: Click the **"Start Claude"** button to start Claude without specific agents
2. **Start Selected Agents**: Click the **"Start Selected Agents"** button to start Claude with your currently selected agents
3. **Manual Commands**: You can also manually type commands like:
   - `claude agents start developer` - Start a specific agent
   - `claude agents start developer designer` - Start multiple agents
   - `claude --help` - See all available commands

### Running Sequential Tasks

1. **From All Tasks View**: Navigate to the "All Tasks" view and organize your tasks
2. **Run Sequential Tasks**: Click the **"Run Sequential Tasks"** button to automatically:
   - Start the terminal (if not already running)
   - Generate the sequential command based on your task order
   - Execute the command directly in the terminal
3. **No Copy/Paste**: The entire process happens automatically without manual intervention

## Technical Details

### Backend API Endpoints

- `POST /api/terminal/start` - Start a new terminal session
- `POST /api/terminal/stop` - Stop the current terminal session
- `GET /api/terminal/status` - Get current terminal status
- `POST /api/terminal/command` - Execute a command (if terminal is running)
- `POST /api/terminal/start-claude` - Start Claude with specific agents

### Configuration

The terminal is configured with:
- **Port**: Automatically assigned (starting from 7681)
- **Authentication**: None required for easy access
- **Theme**: Dark theme for better visibility
- **Title**: "Claude Agent Terminal"

### Dependencies

- **ttyd**: Web-based terminal server (installed via Homebrew on macOS)
- **Node.js**: Backend server for API management
- **React**: Frontend interface

## Installation

### Prerequisites

1. **ttyd**: Install via Homebrew (macOS)
   ```bash
   brew install ttyd
   ```

2. **Node.js Dependencies**: The backend automatically installs the required npm packages

### Setup

1. Ensure ttyd is installed and accessible in your PATH
2. Start the backend server: `npm run dev:backend`
3. Start the frontend: `npm run dev:frontend`
4. Access the application and click the "Terminal" button

## Security Considerations

- **Local Access**: Terminal is only accessible from localhost
- **Session Management**: Terminal sessions are properly cleaned up when stopped
- **Port Management**: Automatic port assignment prevents conflicts
- **No Authentication**: Terminal access is simplified for development use

## Troubleshooting

### Terminal Won't Start

1. Check if ttyd is installed: `which ttyd`
2. Verify backend server is running: `curl http://localhost:3001/api/terminal/status`
3. Check for port conflicts: The system will automatically find an available port

### Access Issues

- Terminal should open immediately without authentication
- Check browser console for any errors
- Verify the terminal URL is accessible

### Port Issues

- The system automatically finds available ports starting from 7681
- If you see port conflicts, restart the backend server

## Future Enhancements

- **Command History**: Save and reuse common commands
- **Multiple Sessions**: Support for multiple terminal tabs
- **Agent Integration**: Direct command execution from agent tasks
- **Custom Themes**: User-selectable terminal themes
- **File Transfer**: Support for file upload/download via terminal

## API Response Examples

### Start Terminal
```json
{
  "url": "http://localhost:7681",
  "port": 7681,
  "status": "running"
}
```

### Terminal Status
```json
{
  "running": true,
  "port": 7681,
  "url": "http://localhost:7681"
}
```

### Stop Terminal
```json
{
  "status": "stopped"
}
``` 