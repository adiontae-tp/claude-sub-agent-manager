import { useState } from 'react';

const CreateTaskModal = ({ isOpen, onClose, agents, onCreateTask }) => {
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedAgentName, setSelectedAgentName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTask = async () => {
    if (!taskDescription.trim() || !selectedAgentName) {
      return;
    }

    setLoading(true);
    try {
      await onCreateTask(selectedAgentName, taskDescription);
      setTaskDescription('');
      setSelectedAgentName('');
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create Task</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Description
              </label>
              <textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Paste or type your task description here..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Agent {selectedAgentName && (
                  <span className="text-blue-600 ml-2">({selectedAgentName} selected)</span>
                )}
              </label>
              
              {agents.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-gray-500">No agents available</p>
                  <p className="text-sm text-gray-400 mt-2">Please create an agent first</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {agents.map((agent) => (
                    <button
                      key={agent.name}
                      onClick={() => setSelectedAgentName(agent.name)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedAgentName === agent.name
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium ${
                          selectedAgentName === agent.name ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {agent.name}
                        </h3>
                        {selectedAgentName === agent.name && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      {agent.tasks && agent.tasks.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {agent.tasks.length} task{agent.tasks.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t p-6">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTask}
              disabled={loading || !taskDescription.trim() || !selectedAgentName}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;