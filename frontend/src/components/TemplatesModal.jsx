import { useState, useEffect } from 'react';

const TemplatesModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      // Load agent templates from the new endpoint
      const response = await fetch('http://localhost:3001/api/agent-templates');
      if (response.ok) {
        const agentTemplates = await response.json();
        // Transform agent templates to the expected format
        const transformedTemplates = agentTemplates.map(template => ({
          id: template.id,
          name: template.name,
          description: template.description,
          systemPrompt: template.systemPrompt
        }));
        setTemplates(transformedTemplates);
      } else {
        console.error('Failed to load agent templates');
        setTemplates([]);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template) => {
    onSelectTemplate({
      name: template.name,
      description: template.description,
      systemPrompt: template.systemPrompt
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Agent Templates</h2>
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
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-600">Loading templates...</p>
            </div>
          ) : viewingTemplate ? (
            <div className="space-y-4">
              <button
                onClick={() => setViewingTemplate(null)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to templates
              </button>
              
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{viewingTemplate.name}</h3>
                <p className="text-gray-600 mb-4">{viewingTemplate.description}</p>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">System Prompt:</h4>
                  <pre className="whitespace-pre-wrap text-sm text-gray-600">{viewingTemplate.systemPrompt}</pre>
                </div>
              </div>
              
              <button
                onClick={() => handleSelectTemplate(viewingTemplate)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Use This Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.length === 0 ? (
                <div className="col-span-2 text-center py-8">
                  <p className="text-gray-500">No templates available</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingTemplate(template)}
                        className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleSelectTemplate(template)}
                        className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;