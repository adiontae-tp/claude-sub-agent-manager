import { useState, useEffect } from 'react';

const TechStackModal = ({ isOpen, onClose, onSave }) => {
  const [selectedTechnologies, setSelectedTechnologies] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [techStackLoading, setTechStackLoading] = useState(false);
  const [showCommonStacks, setShowCommonStacks] = useState(false);
  
  // Common technology stacks
  const commonStacks = {
    mern: {
      name: 'MERN Stack',
      description: 'MongoDB, Express, React, Node.js',
      technologies: ['MongoDB', 'Express.js', 'React', 'Node.js', 'JavaScript', 'REST API', 'JWT', 'Mongoose']
    },
    mean: {
      name: 'MEAN Stack',
      description: 'MongoDB, Express, Angular, Node.js',
      technologies: ['MongoDB', 'Express.js', 'Angular', 'Node.js', 'TypeScript', 'REST API', 'JWT', 'Mongoose']
    },
    django: {
      name: 'Django + React',
      description: 'Django backend with React frontend',
      technologies: ['Django', 'Python', 'React', 'PostgreSQL', 'Django REST Framework', 'Redux', 'Celery', 'Redis']
    },
    rails: {
      name: 'Ruby on Rails',
      description: 'Full-stack Rails with Stimulus/Turbo',
      technologies: ['Ruby on Rails', 'Ruby', 'PostgreSQL', 'Stimulus.js', 'Turbo', 'Sidekiq', 'Redis', 'RSpec']
    },
    vue: {
      name: 'Vue.js Full Stack',
      description: 'Vue.js with Node.js backend',
      technologies: ['Vue.js', 'Vuex', 'Vue Router', 'Node.js', 'Express.js', 'MongoDB', 'Axios', 'Pinia']
    },
    nextjs: {
      name: 'Next.js Full Stack',
      description: 'Next.js with API routes',
      technologies: ['Next.js', 'React', 'TypeScript', 'Prisma', 'PostgreSQL', 'tRPC', 'Tailwind CSS', 'NextAuth.js']
    }
  };

  // All available technologies
  const allTechnologies = [
    // Frontend
    'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby',
    'HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'Sass/SCSS', 'Tailwind CSS',
    'Bootstrap', 'Material-UI', 'Ant Design', 'Chakra UI',
    
    // Backend
    'Node.js', 'Express.js', 'Django', 'Flask', 'Ruby on Rails', 'Laravel',
    'Spring Boot', 'ASP.NET Core', 'FastAPI', 'NestJS', 'Koa.js',
    
    // Databases
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle',
    'Cassandra', 'DynamoDB', 'Firebase', 'Supabase',
    
    // Tools & Others
    'Docker', 'Kubernetes', 'Git', 'GitHub Actions', 'Jenkins', 'CircleCI',
    'AWS', 'Google Cloud', 'Azure', 'Vercel', 'Netlify', 'Heroku',
    'GraphQL', 'REST API', 'WebSocket', 'gRPC', 'Microservices',
    'Jest', 'Mocha', 'Cypress', 'Selenium', 'Pytest', 'RSpec'
  ];

  // Load saved tech stack on mount
  useEffect(() => {
    if (isOpen) {
      loadTechStack();
    }
  }, [isOpen]);

  const loadTechStack = async () => {
    setTechStackLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/tech-stack');
      if (response.ok) {
        const data = await response.json();
        setSelectedTechnologies(data.technologies || []);
      }
    } catch (error) {
      console.error('Failed to load tech stack:', error);
    } finally {
      setTechStackLoading(false);
    }
  };

  const saveTechStack = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/tech-stack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technologies: selectedTechnologies })
      });
      
      if (response.ok) {
        onSave(selectedTechnologies);
        onClose();
      }
    } catch (error) {
      console.error('Failed to save tech stack:', error);
    }
  };

  const toggleTechnology = (tech) => {
    setSelectedTechnologies(prev =>
      prev.includes(tech)
        ? prev.filter(t => t !== tech)
        : [...prev, tech]
    );
  };

  const applyCommonStack = (stackKey) => {
    const stack = commonStacks[stackKey];
    setSelectedTechnologies(stack.technologies);
  };

  const clearTechStack = () => {
    setSelectedTechnologies([]);
  };

  const addCustomTechnology = (tech) => {
    if (tech && !selectedTechnologies.includes(tech)) {
      setSelectedTechnologies([...selectedTechnologies, tech]);
      setSearchQuery('');
    }
  };

  const filteredTechnologies = searchQuery
    ? allTechnologies.filter(tech =>
        tech.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Tech Stack Configuration</h2>
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
            Configure the global tech stack for this project. Agents will use this as a reference.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {techStackLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 mx-auto text-blue-600 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-gray-600">Loading tech stack data...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Search and Add - Now First */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Add Technologies</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search technologies..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {searchQuery && (
                    <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      {filteredTechnologies.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <p>No technologies found for "{searchQuery}"</p>
                          <button
                            onClick={() => addCustomTechnology(searchQuery)}
                            className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                          >
                            Add "{searchQuery}" as custom technology
                          </button>
                        </div>
                      ) : (
                        <div className="p-2">
                          {filteredTechnologies.map(tech => {
                            const isSelected = selectedTechnologies.includes(tech);
                            return (
                              <button
                                key={tech}
                                onClick={() => toggleTechnology(tech)}
                                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center gap-2 ${
                                  isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="text-sm">{tech}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Technologies */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Selected Technologies</h3>
                  {selectedTechnologies.length > 0 && (
                    <button
                      onClick={clearTechStack}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {selectedTechnologies.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No technologies selected. Choose from common stacks or search above.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedTechnologies.map(tech => (
                      <span
                        key={tech}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {tech}
                        <button
                          onClick={() => toggleTechnology(tech)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Common Stacks - Collapsible */}
              <div className="border-t pt-6">
                <button
                  onClick={() => setShowCommonStacks(!showCommonStacks)}
                  className="flex items-center justify-between w-full text-left mb-4"
                >
                  <h3 className="text-lg font-semibold text-gray-900">Quick Start - Common Stacks</h3>
                  <svg 
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${showCommonStacks ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showCommonStacks && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                    {Object.entries(commonStacks).map(([key, stack]) => (
                      <button
                        key={key}
                        onClick={() => applyCommonStack(key)}
                        className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                      >
                        <h4 className="font-semibold text-gray-900 mb-1">{stack.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{stack.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {stack.technologies.slice(0, 6).map(tech => (
                            <span key={tech} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {tech}
                            </span>
                          ))}
                          {stack.technologies.length > 6 && (
                            <span className="text-xs text-gray-500">+{stack.technologies.length - 6} more</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={saveTechStack}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Tech Stack
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechStackModal;