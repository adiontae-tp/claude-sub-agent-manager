import { useState, useEffect } from 'react';

const TaskManager = ({ agents, onCopyCommand, onUpdateAgentTasks, onRefresh }) => {
  const [unqueuedTasks, setUnqueuedTasks] = useState([]);
  const [queuedTasks, setQueuedTasks] = useState([]);
  const [draggedTask, setDraggedTask] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [taskProgress, setTaskProgress] = useState({});

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
            progress: typeof task === 'object' ? task.progress || 0 : 0
          };
          
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

  const handleDragStart = (e, taskItem) => {
    setDraggedTask(taskItem);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex, targetList) => {
    e.preventDefault();
    if (!draggedTask) return;
    
    const sourceList = draggedTask.queued ? queuedTasks : unqueuedTasks;
    const targetListData = targetList === 'queued' ? [...queuedTasks] : [...unqueuedTasks];
    const sourceListData = draggedTask.queued ? [...queuedTasks] : [...unqueuedTasks];
    
    const draggedIndex = sourceListData.findIndex(t => t.id === draggedTask.id);
    
    if (draggedTask.queued === (targetList === 'queued') && draggedIndex === dropIndex) return;
    
    // Remove from source list
    sourceListData.splice(draggedIndex, 1);
    
    // Update queued status if moving between lists
    const updatedTask = { ...draggedTask, queued: targetList === 'queued' };
    
    // Insert into target list
    targetListData.splice(dropIndex, 0, updatedTask);
    
    // Update states
    if (draggedTask.queued) {
      setQueuedTasks(sourceListData);
    } else {
      setUnqueuedTasks(sourceListData);
    }
    
    if (targetList === 'queued') {
      setQueuedTasks(targetListData);
    } else {
      setUnqueuedTasks(targetListData);
    }
    
    // Persist the change to the backend
    const agent = agents.find(a => a.name === draggedTask.agentName);
    if (agent) {
      const updatedTasks = agent.tasks.map((task, index) => {
        if (index === draggedTask.originalIndex) {
          return typeof task === 'string' 
            ? { description: task, status: 'pending', queued: targetList === 'queued', progress: 0, subtasks: [] }
            : { ...task, queued: targetList === 'queued' };
        }
        return task;
      });
      await onUpdateAgentTasks(draggedTask.agentName, updatedTasks);
    }
    
    setDraggedTask(null);
  };

  const toggleTaskExpanded = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const markTaskComplete = async (task) => {
    const agent = agents.find(a => a.name === task.agentName);
    if (!agent) return;
    
    const updatedTasks = agent.tasks.map((t, index) => {
      if (index === task.originalIndex) {
        return typeof t === 'string' 
          ? { description: t, status: 'completed', queued: task.queued, subtasks: task.subtasks, progress: 100 }
          : { ...t, status: 'completed', progress: 100 };
      }
      return t;
    });
    
    await onUpdateAgentTasks(task.agentName, updatedTasks);
  };

  const deleteTask = async (task) => {
    const agent = agents.find(a => a.name === task.agentName);
    if (!agent) return;
    
    const updatedTasks = agent.tasks.filter((_, index) => index !== task.originalIndex);
    await onUpdateAgentTasks(task.agentName, updatedTasks);
  };

  const copyClaudeInstructions = () => {
    if (unqueuedTasks.length === 0) return;
    
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
    
    const fullCommand = command + '\n\nIMPORTANT: Each agent MUST:\n1. Mark their tasks as queued: curl -X POST http://localhost:3001/api/update-task-progress/{project-dir}/{agent-name}/{task-index} -d \'{"queued": true}\'\n2. Update task status to "in-progress" when starting work\n3. Update progress percentage (0-100) as they work\n4. Set status to "completed" when done\n\nRefer to TASK_TRACKING.md for detailed instructions.';
    
    navigator.clipboard.writeText(fullCommand);
    
    // Don't update tasks to queued - let agents do it themselves
    onCopyCommand();
  };

  const renderTaskCard = (taskItem, index, listType) => (
    <div
      key={taskItem.id}
      draggable
      onDragStart={(e) => handleDragStart(e, taskItem)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, index, listType)}
      className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-3">
        <div className="flex items-start gap-3">
          <div className="text-gray-400 mt-1 cursor-move">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 00-2 2v1a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM5 7a2 2 0 012-2h6a2 2 0 012 2v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7zM7 12a2 2 0 00-2 2v1a2 2 0 002 2h6a2 2 0 002-2v-1a2 2 0 00-2-2H7z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="font-medium text-gray-900">{taskItem.task}</div>
                <div className="text-sm text-gray-600 mt-1">Agent: {taskItem.agentName}</div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {taskItem.status === 'completed' ? (
                  <span className="text-green-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                ) : (
                  <button
                    onClick={() => markTaskComplete(taskItem)}
                    className="text-gray-400 hover:text-green-600 transition-colors"
                    title="Mark as complete"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => deleteTask(taskItem)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete task"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Progress bar */}
            {taskItem.progress > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{taskItem.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${taskItem.progress}%` }}
                  />
                </div>
              </div>
            )}
            
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
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">New Tasks</h3>
              <p className="text-sm text-gray-600 mt-1">Tasks not yet sent to Claude</p>
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
                      
                      const fullCommand = command + '\n\nIMPORTANT: Check task progress and continue where you left off. Update task status as you work.';
                      navigator.clipboard.writeText(fullCommand);
                      onCopyCommand();
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