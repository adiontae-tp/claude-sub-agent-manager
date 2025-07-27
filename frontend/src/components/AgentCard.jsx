import { useState } from 'react';

const AgentCard = ({ 
  agent, 
  isExpanded,
  isSelected,
  onToggleExpand,
  onToggleSelect,
  onEdit,
  onDelete,
  onAddTask
}) => {
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [newTask, setNewTask] = useState('');

  const handleAddTask = () => {
    if (newTask.trim()) {
      onAddTask(agent.name, newTask);
      setNewTask('');
      setShowTaskInput(false);
    }
  };

  const handleCardClick = (e) => {
    // Don't trigger edit if clicking on buttons, input, or task section
    if (e.target.tagName === 'BUTTON' || 
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'svg' ||
        e.target.tagName === 'path' ||
        e.target.closest('button') ||
        e.target.closest('.task-section')) {
      return;
    }
    onEdit();
  };

  const taskCount = agent.tasks?.length || 0;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-4">
        {/* Header with title and delete button */}
        <div className="flex items-start gap-3">
          <div 
            className="flex-1 cursor-pointer"
            onClick={handleCardClick}
          >
            <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{agent.description}</p>

            {/* Task count indicator */}
            {taskCount > 0 && !isExpanded && (
              <div className="mt-2 text-sm text-purple-600 font-medium">
                {taskCount} task{taskCount !== 1 ? 's' : ''} assigned
              </div>
            )}
          </div>

          {/* Delete button in top right */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Delete agent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tasks section */}
        <div className="task-section mt-4">
          {/* Expand/collapse tasks button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 rounded transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">
              Tasks ({taskCount})
            </span>
            <svg 
              className={`w-4 h-4 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Expanded tasks list */}
          {isExpanded && (
            <div className="mt-2 space-y-2">
              {agent.tasks && agent.tasks.length > 0 ? (
                <ul className="space-y-1 px-2">
                  {agent.tasks.map((task, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start gap-2 py-1">
                      <span className="text-purple-600 mt-0.5">•</span>
                      <span className="flex-1">{task}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 italic px-2">No tasks assigned yet</p>
              )}

              {/* Add task button and input */}
              <div className="pt-2 border-t border-gray-100">
                {!showTaskInput ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTaskInput(true);
                    }}
                    className="w-full px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    Add Task
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      onKeyPress={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') handleAddTask();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Enter task description..."
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddTask();
                      }}
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTaskInput(false);
                        setNewTask('');
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* System prompt preview (when expanded) */}
      {isExpanded && agent.systemPrompt && (
        <div className="border-t bg-gray-50 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">System Prompt:</h4>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-3 rounded border border-gray-200 max-h-40 overflow-y-auto">
            {agent.systemPrompt}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AgentCard;