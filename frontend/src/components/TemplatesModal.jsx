import { useState, useEffect } from 'react';

const TemplatesModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Predefined templates
  const defaultTemplates = [
    {
      id: 'frontend-dev',
      name: 'Frontend Developer',
      description: 'Expert in React, Vue, or Angular development',
      systemPrompt: `You are an expert frontend developer specializing in modern JavaScript frameworks.
Your expertise includes:
- React, Vue.js, or Angular development
- State management (Redux, Vuex, NgRx)
- CSS and responsive design
- Performance optimization
- Accessibility best practices
- Testing with Jest, React Testing Library, or similar tools

Follow clean code principles and modern best practices.`
    },
    {
      id: 'backend-dev',
      name: 'Backend Developer',
      description: 'Expert in server-side development and APIs',
      systemPrompt: `You are an expert backend developer with deep knowledge of server-side technologies.
Your expertise includes:
- RESTful API design and implementation
- Database design and optimization
- Authentication and authorization
- Microservices architecture
- Performance optimization and caching
- Security best practices
- Testing and CI/CD

Write clean, maintainable, and scalable code.`
    },
    {
      id: 'fullstack-dev',
      name: 'Full Stack Developer',
      description: 'Versatile developer for both frontend and backend',
      systemPrompt: `You are a versatile full-stack developer capable of handling both frontend and backend tasks.
Your expertise spans:
- Frontend frameworks (React, Vue, Angular)
- Backend technologies (Node.js, Python, Ruby, etc.)
- Database design and management
- API development and integration
- DevOps practices
- System architecture
- Performance optimization across the stack

Provide comprehensive solutions considering both client and server perspectives.`
    },
    {
      id: 'ui-designer',
      name: 'UI/UX Designer',
      description: 'Expert in user interface and experience design',
      systemPrompt: `You are an expert UI/UX designer focused on creating beautiful and intuitive interfaces.
Your expertise includes:
- User interface design principles
- User experience best practices
- Design systems and component libraries
- Accessibility standards
- Responsive and mobile-first design
- Prototyping and wireframing
- CSS and modern styling techniques

Create designs that are both aesthetically pleasing and highly functional.`
    },
    {
      id: 'devops-engineer',
      name: 'DevOps Engineer',
      description: 'Expert in deployment, CI/CD, and infrastructure',
      systemPrompt: `You are an expert DevOps engineer specializing in modern deployment and infrastructure practices.
Your expertise includes:
- CI/CD pipeline design and implementation
- Container orchestration (Docker, Kubernetes)
- Cloud platforms (AWS, GCP, Azure)
- Infrastructure as Code (Terraform, CloudFormation)
- Monitoring and logging solutions
- Security and compliance
- Performance optimization

Focus on automation, reliability, and scalability.`
    },
    {
      id: 'security-expert',
      name: 'Security Expert',
      description: 'Expert in application and infrastructure security',
      systemPrompt: `You are a security expert focused on identifying and mitigating vulnerabilities.
Your expertise includes:
- Application security best practices
- OWASP Top 10 vulnerabilities
- Authentication and authorization
- Encryption and data protection
- Security testing and auditing
- Compliance requirements
- Incident response

Always prioritize security in your recommendations and implementations.`
    }
  ];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/templates');
      if (response.ok) {
        const customTemplates = await response.json();
        setTemplates([...defaultTemplates, ...customTemplates]);
      } else {
        setTemplates(defaultTemplates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates(defaultTemplates);
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
          <p className="text-sm text-gray-600 mt-2">
            Choose a template to quickly create an agent with predefined capabilities
          </p>
        </div>

        {!viewingTemplate ? (
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 mx-auto text-blue-600 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-gray-600">Loading templates...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setViewingTemplate(template)}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTemplate(template);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Use Template →
                      </button>
                      <span className="text-xs text-gray-500">Click to preview</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="p-6 border-b bg-gray-50">
              <button
                onClick={() => setViewingTemplate(null)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to templates
              </button>
              <h3 className="text-xl font-semibold text-gray-900">{viewingTemplate.name}</h3>
              <p className="text-gray-600 mt-1">{viewingTemplate.description}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">System Prompt</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                      {viewingTemplate.systemPrompt}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setViewingTemplate(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Back
                </button>
                <button
                  onClick={() => handleSelectTemplate(viewingTemplate)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Use This Template
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TemplatesModal;