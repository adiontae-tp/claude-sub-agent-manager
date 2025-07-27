import { useState, useEffect } from 'react';

const WorkflowModal = ({ isOpen, onClose, agents, onSave, existingWorkflow = null }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tasks, setTasks] = useState([{ id: `task-${Date.now()}`, description: '', agentName: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (existingWorkflow) {
        setName(existingWorkflow.name);
        setDescription(existingWorkflow.description || '');
        setTasks(existingWorkflow.tasks.map((task, index) => ({
          ...task,
          id: `task-${index}-${Date.now()}`
        })));
      } else {
        setName('');
        setDescription('');
        setTasks([{ id: `task-${Date.now()}`, description: '', agentName: '' }]);
      }
    }
  }, [isOpen, existingWorkflow]);

  const addTask = () => {
    setTasks([...tasks, { id: `task-${Date.now()}-${tasks.length}`, description: '', agentName: '' }]);
  };

  const removeTask = (id) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter(task => task.id !== id));
    }
  };

  const updateTask = (id, field, value) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const moveTask = (index, direction) => {
    const newTasks = [...tasks];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < tasks.length) {
      [newTasks[index], newTasks[newIndex]] = [newTasks[newIndex], newTasks[index]];
      setTasks(newTasks);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Workflow name is required');
      return;
    }

    const validTasks = tasks.filter(task => task.description.trim() && task.agentName);
    if (validTasks.length === 0) {
      alert('At least one task with description and agent is required');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        id: existingWorkflow?.id,
        name: name.trim(),
        description: description.trim(),
        tasks: validTasks.map(({ description, agentName }) => ({ description, agentName }))
      });
      onClose();
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow');
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
            <h2 className="text-2xl font-bold text-gray-900">
              {existingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
            </h2>
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
            {/* Workflow Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workflow Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Design Review, QA Process, Feature Release"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when and how this workflow should be used..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tasks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Workflow Tasks
              </label>
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <div key={task.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveTask(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveTask(index, 'down')}
                        disabled={index === tasks.length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Task Description</label>
                        <textarea
                          value={task.description}
                          onChange={(e) => {
                            updateTask(task.id, 'description', e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder="What should be done?"
                          rows={1}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
                          style={{ minHeight: '2.5rem' }}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Assign to Agent</label>
                        <div className="flex flex-wrap gap-2">
                          {agents.map((agent) => (
                            <button
                              key={agent.name}
                              onClick={() => updateTask(task.id, 'agentName', agent.name)}
                              className={`px-3 py-1 rounded-md border text-sm transition-all ${
                                task.agentName === agent.name
                                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                                  : 'border-gray-300 hover:border-gray-400 text-gray-700'
                              }`}
                            >
                              {agent.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {tasks.length > 1 && (
                      <button
                        onClick={() => removeTask(task.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={addTask}
                className="mt-3 flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Task
              </button>
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
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : existingWorkflow ? 'Update Workflow' : 'Create Workflow'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowModal;