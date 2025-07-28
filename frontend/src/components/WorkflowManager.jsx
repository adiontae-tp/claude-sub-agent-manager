import { useState, useEffect } from 'react';

const WorkflowManager = ({ projectDir, agents, onShowCreateWorkflow, onEditWorkflow, onRefreshAgents }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkflows, setExpandedWorkflows] = useState(new Set());
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [agentTemplates, setAgentTemplates] = useState([]);

  useEffect(() => {
    fetchWorkflows();
    fetchTemplates();
    fetchAgentTemplates();
  }, [projectDir]);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/workflows/${encodeURIComponent(projectDir)}`);
      if (!response.ok) throw new Error('Failed to fetch workflows');
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/workflow-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchAgentTemplates = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/agent-templates');
      if (!response.ok) throw new Error('Failed to fetch agent templates');
      const data = await response.json();
      setAgentTemplates(data);
    } catch (error) {
      console.error('Error fetching agent templates:', error);
    }
  };

  const createMissingAgents = async (workflow) => {
    const requiredAgentIds = [...new Set(workflow.tasks.map(task => task.agentId))];
    const existingAgentNames = agents.map(a => a.name.toLowerCase());
    const missingAgentIds = requiredAgentIds.filter(id => 
      !existingAgentNames.includes(id.toLowerCase()) && 
      !existingAgentNames.includes(id)
    );

    if (missingAgentIds.length === 0) {
      return true;
    }

    // Confirm with user
    if (!confirm(`This workflow requires agents that don't exist yet:\n\n${missingAgentIds.join(', ')}\n\nWould you like to create them from templates?`)) {
      return false;
    }

    // Create missing agents
    for (const agentId of missingAgentIds) {
      const template = agentTemplates.find(t => t.id === agentId);
      if (template) {
        try {
          const response = await fetch('http://localhost:3001/api/create-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              directory: projectDir,
              name: template.id,
              description: template.description,
              systemPrompt: template.systemPrompt
            })
          });
          
          const data = await response.json();
          if (!data.success) throw new Error(data.error || 'Failed to create agent');
        } catch (error) {
          console.error(`Failed to create agent ${agentId}:`, error);
          alert(`Failed to create agent ${agentId}`);
          return false;
        }
      }
    }

    // Refresh agents list
    if (onRefreshAgents) {
      await onRefreshAgents();
    }
    return true;
  };

  const deleteWorkflow = async (workflowId) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/workflows/${encodeURIComponent(projectDir)}/${workflowId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete workflow');
      await fetchWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const toggleExpanded = (workflowId) => {
    const newExpanded = new Set(expandedWorkflows);
    if (newExpanded.has(workflowId)) {
      newExpanded.delete(workflowId);
    } else {
      newExpanded.add(workflowId);
    }
    setExpandedWorkflows(newExpanded);
  };

  const getAgentInfo = (agentName) => {
    const agent = agents.find(a => a.name === agentName);
    if (agent) {
      return agent;
    }
    
    // Map agent IDs to display names for templates
    const displayNames = {
      'architect': 'Architect',
      'designer': 'Designer', 
      'developer': 'Developer',
      'tester': 'Tester'
    };
    
    return { 
      name: displayNames[agentName] || agentName, 
      status: 'unknown' 
    };
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Workflow Templates</h2>
            <p className="text-gray-600">
              Create reusable task templates that automatically generate tasks for multiple agents
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              {showTemplates ? 'My Workflows' : 'Templates'}
            </button>
            <button
              onClick={onShowCreateWorkflow}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Workflows List */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-6 overflow-auto">
        {showTemplates ? (
          /* Templates View */
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Templates</h3>
            {templates.length === 0 ? (
              <p className="text-gray-500">No templates available</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="text-xs text-gray-500 mb-3">
                      {template.tasks.length} tasks
                    </div>
                    <button
                      onClick={async () => {
                        // Check and create missing agents first
                        const success = await createMissingAgents(template);
                        if (success) {
                          const templateWorkflow = {
                            name: template.name,
                            description: template.description,
                            tasks: template.tasks.map(task => ({
                              description: task.description,
                              agentName: task.agentId,
                              instructions: task.instructions
                            }))
                          };
                          onEditWorkflow(templateWorkflow);
                        }
                      }}
                      className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Use This Template
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-500">No workflows created yet</p>
            <p className="text-sm text-gray-400 mt-2">Create your first workflow to streamline task creation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleExpanded(workflow.id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg 
                          className={`w-5 h-5 transform transition-transform ${
                            expandedWorkflows.has(workflow.id) ? 'rotate-90' : ''
                          }`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                        {workflow.description && (
                          <p className="text-sm text-gray-600 mt-1">{workflow.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {workflow.tasks.length} task{workflow.tasks.length !== 1 ? 's' : ''} • 
                          Created {new Date(workflow.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEditWorkflow(workflow)}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                
                {expandedWorkflows.has(workflow.id) && (
                  <div className="p-4 border-t border-gray-200">
                    <div className="space-y-2">
                      {workflow.tasks.map((task, index) => {
                        const agent = getAgentInfo(task.agentName);
                        return (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                            <div className="text-gray-400 font-medium w-8">{index + 1}.</div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{task.description}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                Assigned to: <span className="font-medium">{agent.name}</span>
                                {!agents.find(a => a.name === task.agentName) && (
                                  <span className="text-red-600 ml-2">(Agent not found)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowManager;