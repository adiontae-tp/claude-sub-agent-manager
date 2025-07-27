import { useState, useEffect } from 'react';

const AgentForm = ({ agent, onSave, onCancel, onShowTemplates, onMessage }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    systemPrompt: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        description: agent.description || '',
        systemPrompt: agent.systemPrompt || ''
      });
    }
  }, [agent]);

  // Listen for template selection
  useEffect(() => {
    const handleTemplateSelected = (event) => {
      const template = event.detail;
      setFormData({
        name: template.name || '',
        description: template.description || '',
        systemPrompt: template.systemPrompt || ''
      });
    };

    window.addEventListener('templateSelected', handleTemplateSelected);
    return () => window.removeEventListener('templateSelected', handleTemplateSelected);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const isEditing = !!agent;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Agent' : 'Create New Agent'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {message && (
            <div className={`p-3 rounded-md mb-4 ${
              message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., UI Designer, Backend Developer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isEditing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the agent's purpose"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  System Prompt
                </label>
                {!isEditing && onShowTemplates && (
                  <button
                    type="button"
                    onClick={onShowTemplates}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Use Template
                  </button>
                )}
              </div>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                placeholder="Define the agent's behavior, expertise, and constraints..."
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {!isEditing && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.name || !formData.description) {
                          setMessage({ type: 'error', text: 'Please provide agent name and description' });
                          return;
                        }
                        setLoading(true);
                        try {
                          const response = await fetch('http://localhost:3001/api/generate-agent', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              name: formData.name, 
                              description: formData.description 
                            })
                          });
                          const data = await response.json();
                          if (data.systemPrompt) {
                            setFormData({ ...formData, systemPrompt: data.systemPrompt });
                            setMessage({ type: 'success', text: 'System prompt generated successfully!' });
                          } else {
                            setMessage({ type: 'error', text: data.error || 'Failed to generate prompt' });
                          }
                        } catch (error) {
                          setMessage({ type: 'error', text: 'Failed to connect to server' });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !formData.name || !formData.description}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                      {loading ? 'Generating...' : 'Generate with Claude'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.systemPrompt) {
                          setMessage({ type: 'error', text: 'Please write a system prompt first' });
                          return;
                        }
                        setLoading(true);
                        try {
                          const response = await fetch('http://localhost:3001/api/enhance-prompt', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              currentPrompt: formData.systemPrompt,
                              name: formData.name, 
                              description: formData.description 
                            })
                          });
                          const data = await response.json();
                          if (data.systemPrompt) {
                            setFormData({ ...formData, systemPrompt: data.systemPrompt });
                            setMessage({ type: 'success', text: 'System prompt enhanced successfully!' });
                          } else {
                            setMessage({ type: 'error', text: data.error || 'Failed to enhance prompt' });
                          }
                        } catch (error) {
                          setMessage({ type: 'error', text: 'Failed to connect to server' });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !formData.systemPrompt}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                      {loading ? 'Enhancing...' : 'Enhance Prompt'}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!formData.name || !formData.description || !formData.systemPrompt) {
                          setMessage({ type: 'error', text: 'Please fill in all fields before saving as template' });
                          return;
                        }
                        try {
                          const response = await fetch('http://localhost:3001/api/save-template', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: formData.name,
                              description: formData.description,
                              systemPrompt: formData.systemPrompt
                            })
                          });
                          const data = await response.json();
                          if (data.success) {
                            setMessage({ type: 'success', text: 'Template saved successfully!' });
                            // Pass message to parent if available
                            if (onMessage) {
                              onMessage({ type: 'success', text: 'Template saved successfully!' });
                            }
                            // Close the modal after successful save
                            setTimeout(() => {
                              onCancel();
                            }, 1000); // Give user time to see success message
                          } else {
                            setMessage({ type: 'error', text: data.error || 'Failed to save template' });
                          }
                        } catch (error) {
                          setMessage({ type: 'error', text: 'Failed to save template' });
                        }
                      }}
                      disabled={!formData.name || !formData.description || !formData.systemPrompt}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                      Save as Template
                    </button>
                  </>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  {isEditing ? 'Update Agent' : 'Create Agent'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AgentForm;