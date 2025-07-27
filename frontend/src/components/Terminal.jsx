import { useState, useEffect } from 'react';

const Terminal = ({ 
  terminals = [],
  activeTerminalId,
  onSelectTerminal,
  onCreateTerminal,
  onCloseTerminal,
  onRenameTerminal,
  agents = [],
  projectDir,
  onCopyCommand,
  className = ""
}) => {
  const [editingTerminalId, setEditingTerminalId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const handleCopyClaudeInstructions = async () => {
    if (!agents || agents.length === 0) return;
    
    // Get all unqueued tasks
    const unqueuedTasks = [];
    agents.forEach(agent => {
      if (agent.tasks) {
        agent.tasks.forEach((task, index) => {
          const taskItem = {
            agentName: agent.name,
            task: typeof task === 'string' ? task : task.description || task.task || '',
            queued: typeof task === 'object' ? task.queued : false
          };
          
          if (!taskItem.queued) {
            unqueuedTasks.push(taskItem);
          }
        });
      }
    });
    
    if (unqueuedTasks.length === 0) return;
    
    const commandParts = [];
    let currentAgent = null;
    let currentTasks = [];
    
    unqueuedTasks.forEach((taskItem) => {
      if (currentAgent !== taskItem.agentName) {
        if (currentAgent && currentTasks.length > 0) {
          commandParts.push(`use the ${currentAgent} sub agent to ${currentTasks.join(' and ')}`);
        }
        currentAgent = taskItem.agentName;
        currentTasks = [taskItem.task];
      } else {
        currentTasks.push(taskItem.task);
      }
    });
    
    if (currentAgent && currentTasks.length > 0) {
      commandParts.push(`use the ${currentAgent} sub agent to ${currentTasks.join(' and ')}`);
    }
    
    const command = commandParts.map((part, index) => {
      if (index === 0) return part.charAt(0).toUpperCase() + part.slice(1);
      return 'then ' + part;
    }).join(', ');
    
    // Fetch tech stack information
    let techStackInfo = '';
    if (projectDir) {
      try {
        const encodedDir = encodeURIComponent(projectDir);
        const response = await fetch(`http://localhost:3001/api/tech-stack/global/${encodedDir}`);
        const data = await response.json();
        
        if (data.techStack && Object.keys(data.techStack).length > 0) {
          techStackInfo = '\n\nPROJECT TECH STACK:';
          for (const [category, technologies] of Object.entries(data.techStack)) {
            if (technologies && technologies.length > 0) {
              techStackInfo += `\n- ${category}: ${technologies.join(', ')}`;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch tech stack:', error);
      }
    }
    
    const fullCommand = command + techStackInfo + '\n\nTASK TRACKING INSTRUCTIONS:\n\nFOR EACH SUB-AGENT, tell them to update their progress using these simple commands:\n\nExample for "developer" agent working on task 0:\n\n1. When they start:\n   "First, mark your task as started:\n   curl -X POST http://localhost:3001/api/task/developer/0/queued/true"\n   \n2. Then:\n   "Now mark as in-progress:\n   curl -X POST http://localhost:3001/api/task/developer/0/status/in-progress"\n\n3. As they work (update the number):\n   "Update your progress:\n   curl -X POST http://localhost:3001/api/task/developer/0/progress/50"\n\n4. When done:\n   "Mark your task complete:\n   curl -X POST http://localhost:3001/api/task/developer/0/status/completed"\n   \nThese simple URLs make it easy for agents to update their status.';
    
    try {
      await navigator.clipboard.writeText(fullCommand);
      if (onCopyCommand) onCopyCommand();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again or manually copy the text.');
    }
  };

  // No need for iframe reloading anymore since we keep all iframes mounted
  
  const handleStartEdit = (terminal, e) => {
    e.stopPropagation();
    setEditingTerminalId(terminal.id);
    setEditingName(terminal.name);
  };
  
  const handleSaveEdit = () => {
    if (editingTerminalId && editingName.trim() && onRenameTerminal) {
      onRenameTerminal(editingTerminalId, editingName.trim());
    }
    setEditingTerminalId(null);
    setEditingName('');
  };
  
  const handleCancelEdit = () => {
    setEditingTerminalId(null);
    setEditingName('');
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col ${className}`}>
      {/* Copy Claude Instructions Button Above Terminal */}
      {agents && agents.length > 0 && (
        <div className="p-3 bg-blue-50 border-b border-blue-200">
          <button
            onClick={handleCopyClaudeInstructions}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Claude Instructions
          </button>
        </div>
      )}
      
      {/* Terminal Tabs */}
      <div className="flex items-center bg-gray-50 border-b border-gray-200 overflow-x-auto">
        <div className="flex-1 flex items-center min-w-0">
          {terminals.map((terminal) => (
            <button
              key={terminal.id}
              onClick={() => onSelectTerminal(terminal.id)}
              onDoubleClick={(e) => handleStartEdit(terminal, e)}
              className={`px-4 py-2 text-sm font-medium border-r border-gray-200 flex items-center gap-2 min-w-0 ${
                terminal.id === activeTerminalId
                  ? 'bg-white text-gray-900 border-b-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {editingTerminalId === terminal.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={handleSaveEdit}
                  onClick={(e) => e.stopPropagation()}
                  className="px-1 py-0 text-sm border-b border-gray-400 bg-transparent focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              ) : (
                <span className="truncate" title="Double-click to rename">{terminal.name}</span>
              )}
              {terminal.status === 'running' && !editingTerminalId && (
                <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
              )}
              {terminal.status === 'error' && !editingTerminalId && (
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></span>
              )}
              {terminal.loading && !editingTerminalId && (
                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              )}
              {editingTerminalId !== terminal.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTerminal(terminal.id);
                  }}
                  className="ml-1 text-gray-400 hover:text-red-600 flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={onCreateTerminal}
          className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 text-sm flex-shrink-0"
          title="Create new terminal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden relative">
        {terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Terminals Open</h3>
              <p className="text-gray-600 text-sm mb-4">Click "New" to create a terminal</p>
              <button
                onClick={onCreateTerminal}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Create Terminal
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Render all terminal iframes but only show the active one */}
            {terminals.map((terminal) => (
              <div
                key={`terminal-container-${terminal.id}`}
                className={`absolute inset-0 ${terminal.id === activeTerminalId ? 'block' : 'hidden'}`}
              >
                {terminal.status === 'running' && terminal.url ? (
                  <iframe
                    key={`terminal-iframe-${terminal.id}`}
                    src={terminal.url}
                    className="w-full h-full border-0"
                    title={terminal.name}
                    allow="fullscreen"
                  />
                ) : terminal.error ? (
                  <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto text-red-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-600 font-medium mb-2">Terminal Error</p>
                      <p className="text-gray-600 text-sm">{terminal.error}</p>
                    </div>
                  </div>
                ) : terminal.loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                      <p className="text-gray-600 text-sm">Starting terminal...</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Terminal;