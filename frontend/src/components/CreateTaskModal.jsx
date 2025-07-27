import { useState } from 'react';

const CreateTaskModal = ({ isOpen, onClose, agents, onCreateTask }) => {
  const [taskRows, setTaskRows] = useState([{ id: Date.now(), description: '', agentName: '' }]);
  const [loading, setLoading] = useState(false);

  const handleCreateTasks = async () => {
    const validTasks = taskRows.filter(row => row.description.trim() && row.agentName);
    if (validTasks.length === 0) return;

    setLoading(true);
    try {
      for (const task of validTasks) {
        await onCreateTask(task.agentName, task.description);
      }
      setTaskRows([{ id: Date.now(), description: '', agentName: '' }]);
      onClose();
    } catch (error) {
      console.error('Failed to create tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTaskRow = () => {
    setTaskRows([...taskRows, { id: Date.now(), description: '', agentName: '' }]);
  };

  const removeTaskRow = (id) => {
    if (taskRows.length > 1) {
      setTaskRows(taskRows.filter(row => row.id !== id));
    }
  };

  const updateTaskRow = (id, field, value) => {
    setTaskRows(taskRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const moveTaskRow = (index, direction) => {
    const newRows = [...taskRows];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < taskRows.length) {
      [newRows[index], newRows[newIndex]] = [newRows[newIndex], newRows[index]];
      setTaskRows(newRows);
    }
  };

  const hasValidTasks = taskRows.some(row => row.description.trim() && row.agentName);

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
          {agents.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500">No agents available</p>
              <p className="text-sm text-gray-400 mt-2">Please create an agent first</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left pb-2 pr-4 font-medium text-gray-700 w-16">Order</th>
                      <th className="text-left pb-2 px-4 font-medium text-gray-700">Task Description</th>
                      <th className="text-left pb-2 px-4 font-medium text-gray-700">Select Agent</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {taskRows.map((row, index) => (
                      <tr key={row.id} className="border-b">
                        <td className="py-3 pr-4">
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => moveTaskRow(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => moveTaskRow(index, 'down')}
                              disabled={index === taskRows.length - 1}
                              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative">
                            <textarea
                              value={row.description}
                              onChange={(e) => updateTaskRow(row.id, 'description', e.target.value)}
                              placeholder="Enter task description..."
                              rows={2}
                              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                            {row.description.trim() && (
                              <button
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(row.description);
                                  } catch (error) {
                                    console.error('Failed to copy:', error);
                                  }
                                }}
                                className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                title="Copy task description"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-2">
                            {agents.map((agent) => (
                              <button
                                key={agent.name}
                                onClick={() => updateTaskRow(row.id, 'agentName', agent.name)}
                                className={`px-3 py-1 rounded-md border text-sm transition-all ${
                                  row.agentName === agent.name
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                    : 'border-gray-300 hover:border-gray-400 text-gray-700'
                                }`}
                              >
                                {agent.name}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pl-4">
                          {taskRows.length > 1 && (
                            <button
                              onClick={() => removeTaskRow(row.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={addTaskRow}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Task
              </button>
            </div>
          )}
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
              onClick={handleCreateTasks}
              disabled={loading || !hasValidTasks}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : `Create ${taskRows.filter(r => r.description.trim() && r.agentName).length} Task${taskRows.filter(r => r.description.trim() && r.agentName).length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;