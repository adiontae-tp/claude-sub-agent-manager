import { useState, useEffect } from 'react';

const WorkflowManager = ({ projectDir, agents, onShowCreateWorkflow, onEditWorkflow }) => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWorkflows, setExpandedWorkflows] = useState(new Set());

  useEffect(() => {
    fetchWorkflows();
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
    return agent || { name: agentName, status: 'unknown' };
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

      {/* Workflows List */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-6 overflow-auto">
        {workflows.length === 0 ? (
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