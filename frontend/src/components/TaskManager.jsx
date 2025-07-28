import { useState, useEffect } from 'react';

const TaskManager = ({ agents, onCopyCommand, onUpdateAgentTasks, onRefresh, projectDir, onEditTaskList }) => {
  const [unqueuedTasks, setUnqueuedTasks] = useState([]);
  const [queuedTasks, setQueuedTasks] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState(new Set());

  // Update task lists when agents change
  useEffect(() => {
    const unqueued = [];
    const queued = [];
    
    agents.forEach(agent => {
      if (agent.tasks) {
        agent.tasks.forEach((task, index) => {
          const taskItem = {
            id: `${agent.name}-${index}`,
            task: typeof task === 'string' ? task : task.description || task.task || '',
            agentName: agent.name,
            originalIndex: index,
            status: typeof task === 'object' ? task.status : 'pending',
            queued: typeof task === 'object' ? task.queued : false,
            subtasks: typeof task === 'object' ? task.subtasks || [] : [],
          };
          
          // Skip deleted tasks
          if (taskItem.status === 'deleted') {
            return;
          }
          
          if (taskItem.queued) {
            queued.push(taskItem);
          } else {
            unqueued.push(taskItem);
          }
        });
      }
    });
    
    setUnqueuedTasks(unqueued);
    setQueuedTasks(queued);
  }, [agents]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (onRefresh) {
        onRefresh();
      }
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [onRefresh]);


  const toggleTaskExpanded = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const deleteTask = async (taskItem) => {
    if (!confirm(`Are you sure you want to delete this task?\n\n"${taskItem.task}"`)) {
      return;
    }

    try {
      // Update the task status in the database to mark it as deleted
      const response = await fetch(`http://localhost:3001/api/task-progress/${taskItem.agentName}/${taskItem.index}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'deleted',
          queued: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      // Remove from local state
      setTasks(prevTasks => {
        const newTasks = { ...prevTasks };
        const agent = agents.find(a => a.name === taskItem.agentName);
        if (agent && newTasks[agent.id]) {
          newTasks[agent.id] = newTasks[agent.id].filter((_, idx) => idx !== taskItem.index);
        }
        return newTasks;
      });

      // Refresh tasks
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };


  const copyClaudeInstructions = async () => {
    if (unqueuedTasks.length === 0) return;
    
    // Fetch tech stack information
    let techStackInfo = '';
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
        techStackInfo += '\n';
      }
    } catch (error) {
      console.error('Failed to fetch tech stack:', error);
    }
    
    const commandParts = [];
    let currentAgent = null;
    let currentTasks = [];
    
    unqueuedTasks.forEach((taskItem) => {
      if (currentAgent !== taskItem.agentName) {
        // Finish previous agent's tasks
        if (currentAgent && currentTasks.length > 0) {
          commandParts.push(`use the ${currentAgent} sub agent to ${currentTasks.join(' and ')}`);
        }
        currentAgent = taskItem.agentName;
        currentTasks = [taskItem.task];
      } else {
        currentTasks.push(taskItem.task);
      }
    });
    
    // Add the last agent's tasks
    if (currentAgent && currentTasks.length > 0) {
      commandParts.push(`use the ${currentAgent} sub agent to ${currentTasks.join(' and ')}`);
    }
    
    const command = commandParts.map((part, index) => {
      if (index === 0) return part.charAt(0).toUpperCase() + part.slice(1);
      return 'then ' + part;
    }).join(', ');
    
    const fullCommand = command + techStackInfo + '\n\nTASK TRACKING INSTRUCTIONS:\n\nFOR EACH SUB-AGENT, tell them to update their status using these simple commands:\n\nExample for "developer" agent working on task 0:\n\n1. When they start:\n   "First, mark your task as started:\n   curl -X POST http://localhost:3001/api/task/developer/0/queued/true"\n   \n2. Then:\n   "Now mark as in-progress:\n   curl -X POST http://localhost:3001/api/task/developer/0/status/in-progress"\n\n3. When done:\n   "Mark your task complete:\n   curl -X POST http://localhost:3001/api/task/developer/0/status/completed"\n   \nThese simple URLs make it easy for agents to update their status.';
    
    try {
      await navigator.clipboard.writeText(fullCommand);
      // Don't update tasks to queued - let agents do it themselves
      onCopyCommand();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again or manually copy the text.');
    }
  };

  const renderTaskCard = (taskItem, index, listType) => (
    <div
      key={taskItem.id}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{taskItem.task}</div>
                <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                  <span>Agent: {taskItem.agentName}</span>
                  <span className="flex items-center gap-1">
                    Status: 
                    {taskItem.status === 'completed' ? (
                      <span className="text-green-600 font-medium">Done</span>
                    ) : taskItem.status === 'in-progress' || taskItem.queued ? (
                      <span className="text-blue-600 font-medium">Started</span>
                    ) : (
                      <span className="text-gray-500 font-medium">Not started</span>
                    )}
                  </span>
                </div>
              </div>
              {taskItem.status === 'completed' && (
                <span className="text-green-600 ml-4" title="Completed">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
              {listType === 'queued' && (
                <button
                  onClick={() => deleteTask(taskItem)}
                  className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded" 
                  title="Delete task"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Subtasks section */}
            {taskItem.subtasks.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => toggleTaskExpanded(taskItem.id)}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <svg 
                    className={`w-4 h-4 transform transition-transform ${
                      expandedTasks.has(taskItem.id) ? 'rotate-90' : ''
                    }`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {taskItem.subtasks.length} subtask{taskItem.subtasks.length !== 1 ? 's' : ''}
                </button>
                
                {expandedTasks.has(taskItem.id) && (
                  <div className="mt-2 ml-6 space-y-1">
                    {taskItem.subtasks.map((subtask, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className={`${
                          subtask.completed ? 'text-green-600' : 'text-gray-400'
                        }`}>
                          {subtask.completed ? '✓' : '○'}
                        </span>
                        <span className={subtask.completed ? 'line-through' : ''}>
                          {subtask.description}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Management</h2>
            <p className="text-gray-600">
              {agents.length === 0 
                ? 'No agents created yet' 
                : `Managing tasks from ${agents.length} agent${agents.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p>Auto-refreshing every 10s</p>
            <p className="text-xs">Tasks persist across refreshes</p>
          </div>
        </div>
      </div>

      {agents.length > 0 ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* Unqueued Tasks */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
            <div className="mb-4 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">New Tasks</h3>
                <p className="text-sm text-gray-600 mt-1">Tasks not yet sent to Claude</p>
              </div>
              {unqueuedTasks.length > 0 && (
                <button
                  onClick={() => onEditTaskList(unqueuedTasks)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Task List
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {unqueuedTasks.length > 0 ? (
                <div className="space-y-3">
                  {unqueuedTasks.map((taskItem, index) => renderTaskCard(taskItem, index, 'unqueued'))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No new tasks</p>
                  <p className="text-sm text-gray-400 mt-2">Create tasks or drag from the queue</p>
                </div>
              )}
            </div>
            
            {/* Copy Command Button */}
            {unqueuedTasks.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={copyClaudeInstructions}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Claude Instructions
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Copies instructions for Claude to execute
                </p>
              </div>
            )}
          </div>
          
          {/* Queued Tasks */}
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Active Task Queue</h3>
              <p className="text-sm text-gray-600 mt-1">Tasks being worked on by agents</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {queuedTasks.length > 0 ? (
                <div className="space-y-3">
                  {queuedTasks.map((taskItem, index) => renderTaskCard(taskItem, index, 'queued'))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No active tasks</p>
                  <p className="text-sm text-gray-400 mt-2">Tasks appear here when agents start working on them</p>
                </div>
              )}
            </div>
            
            {queuedTasks.length > 0 && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center justify-between mb-1">
                    <span>Total tasks:</span>
                    <span className="font-medium">{queuedTasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span>In Progress:</span>
                    <span className="font-medium text-blue-600">
                      {queuedTasks.filter(t => t.status === 'in-progress').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Completed:</span>
                    <span className="font-medium text-green-600">
                      {queuedTasks.filter(t => t.status === 'completed').length}
                    </span>
                  </div>
                </div>
                
                {/* Resend incomplete tasks button */}
                {queuedTasks.filter(t => t.status !== 'completed').length > 0 && (
                  <button
                    onClick={async () => {
                      const incompleteTasks = queuedTasks.filter(t => t.status !== 'completed');
                      
                      // Fetch tech stack information
                      let techStackInfo = '';
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
                          techStackInfo += '\n';
                        }
                      } catch (error) {
                        console.error('Failed to fetch tech stack:', error);
                      }
                      
                      const commandParts = [];
                      let currentAgent = null;
                      let currentTasks = [];
                      
                      incompleteTasks.forEach((taskItem) => {
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
                      
                      const fullCommand = command + techStackInfo + '\n\nTASK TRACKING INSTRUCTIONS:\n\nFOR EACH SUB-AGENT, tell them to update their status using these simple commands:\n\nExample for "developer" agent working on task 0:\n\n1. When they start:\n   "First, mark your task as started:\n   curl -X POST http://localhost:3001/api/task/developer/0/queued/true"\n   \n2. Then:\n   "Now mark as in-progress:\n   curl -X POST http://localhost:3001/api/task/developer/0/status/in-progress"\n\n3. When done:\n   "Mark your task complete:\n   curl -X POST http://localhost:3001/api/task/developer/0/status/completed"\n   \nThese simple URLs make it easy for agents to update their status.';
                      try {
                        await navigator.clipboard.writeText(fullCommand);
                        onCopyCommand();
                      } catch (error) {
                        console.error('Failed to copy to clipboard:', error);
                        alert('Failed to copy to clipboard. Please try again or manually copy the text.');
                      }
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Resend Incomplete Tasks
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-gray-500">No agents created</p>
            <p className="text-sm text-gray-400 mt-2">Create agents to start managing tasks.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;