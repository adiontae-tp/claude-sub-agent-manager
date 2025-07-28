import { useState, useEffect } from 'react';
import Toast from './components/Toast';
import Header from './components/Header';
import AgentList from './components/AgentList';
import AgentForm from './components/AgentForm';
import Terminal from './components/Terminal';
import TechStackModal from './components/TechStackModal';
import TemplatesModal from './components/TemplatesModal';
import TaskManager from './components/TaskManager';
import CreateTaskModal from './components/CreateTaskModal';
import WorkflowManager from './components/WorkflowManager';
import WorkflowModal from './components/WorkflowModal';

function App() {
  // State management
  const [projectDir, setProjectDir] = useState('./');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [existingAgents, setExistingAgents] = useState([]);
  const [selectedAgentsForStart, setSelectedAgentsForStart] = useState(new Set());
  const [expandedAgents, setExpandedAgents] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const [editingAgent, setEditingAgent] = useState(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showTechStackModal, setShowTechStackModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState('create');
  const [taskModalExistingTasks, setTaskModalExistingTasks] = useState([]);
  const [techStackCount, setTechStackCount] = useState(0);
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  
  // Terminal state - now supports multiple terminals
  const [terminals, setTerminals] = useState([]);
  const [activeTerminalId, setActiveTerminalId] = useState(null);
  const [terminalIdCounter, setTerminalIdCounter] = useState(1);

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Load agents on mount
  useEffect(() => {
    // Fetch actual parent directory from backend
    fetch('http://localhost:3001/api/parent-directory')
      .then(res => res.json())
      .then(data => {
        setProjectDir(data.path);
      })
      .catch(err => {
        console.error('Failed to get parent directory:', err);
        setProjectDir('./');
      });
  }, []);

  // Load agents when projectDir changes
  useEffect(() => {
    if (projectDir) {
      loadAgents();
      loadTechStackCount();
    }
  }, [projectDir]);


  // API functions
  const loadTechStackCount = async () => {
    if (!projectDir) return;
    try {
      const encodedDir = encodeURIComponent(projectDir);
      const response = await fetch(`http://localhost:3001/api/tech-stack/global/${encodedDir}`);
      const data = await response.json();
      
      if (data.techStack && typeof data.techStack === 'object') {
        // Count total technologies across all categories
        const count = Object.values(data.techStack).reduce((total, techs) => {
          return total + (Array.isArray(techs) ? techs.length : 0);
        }, 0);
        setTechStackCount(count);
      } else {
        setTechStackCount(0);
      }
    } catch (error) {
      console.error('Failed to load tech stack count:', error);
      setTechStackCount(0);
    }
  };

  const loadAgents = async () => {
    if (!projectDir) return;
    try {
      const response = await fetch(`http://localhost:3001/api/list-agents/${encodeURIComponent(projectDir)}`);
      const data = await response.json();
      const agents = data.agents || [];
      setExistingAgents(agents);
      
      // Auto-select all agents by default
      const allAgentNames = new Set(agents.map(agent => agent.name));
      setSelectedAgentsForStart(allAgentNames);
    } catch (error) {
      console.error('Failed to load agents:', error);
      setMessage({ type: 'error', text: 'Failed to load agents' });
    }
  };


  const createAgent = async (agentData) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directory: projectDir,
          name: agentData.name,
          description: agentData.description,
          systemPrompt: agentData.systemPrompt
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Agent created successfully!' });
        setShowCreateForm(false);
        loadAgents();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create agent' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    } finally {
      setLoading(false);
    }
  };

  const updateAgent = async (agentData) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/update-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directory: projectDir,
          originalName: editingAgent.name,
          name: agentData.name,
          description: agentData.description,
          systemPrompt: agentData.systemPrompt
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Agent updated successfully!' });
        setEditingAgent(null);
        loadAgents();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update agent' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' });
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (agent) => {
    if (!confirm(`Are you sure you want to delete "${agent.name}"?`)) return;
    
    try {
      const response = await fetch(`http://localhost:3001/api/delete-agent/${encodeURIComponent(projectDir)}/${agent.name}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Agent deleted successfully!' });
        loadAgents();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete agent' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to delete agent: ${error.message}` });
    }
  };

  const createNewTerminal = async () => {
    const newTerminalId = terminalIdCounter;
    setTerminalIdCounter(prev => prev + 1);
    
    const newTerminal = {
      id: newTerminalId,
      name: `Terminal ${newTerminalId}`,
      status: 'starting',
      url: '',
      error: '',
      loading: true
    };
    
    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminalId(newTerminalId);
    
    try {
      const response = await fetch('http://localhost:3001/api/terminal/start', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const data = await response.json();
      
      // Update the terminal with the actual ID from backend
      setTerminals(prev => prev.map(term => 
        term.id === newTerminalId 
          ? { ...term, 
              id: data.terminalId || newTerminalId, // Use backend ID if provided
              url: data.url, 
              status: 'running', 
              loading: false, 
              error: '' 
            }
          : term
      ));
    } catch (error) {
      setTerminals(prev => prev.map(term => 
        term.id === newTerminalId 
          ? { ...term, error: error.message, status: 'error', loading: false }
          : term
      ));
      setMessage({ type: 'error', text: 'Failed to start terminal' });
    }
  };

  const closeTerminal = async (terminalId) => {
    // First, tell the backend to stop the terminal
    try {
      await fetch(`http://localhost:3001/api/terminal/stop/${terminalId}`, {
        method: 'POST'
      });
    } catch (error) {
      console.error('Failed to stop terminal on backend:', error);
    }
    
    setTerminals(prev => prev.filter(term => term.id !== terminalId));
    
    // If we're closing the active terminal, switch to another one
    if (activeTerminalId === terminalId) {
      const remainingTerminals = terminals.filter(term => term.id !== terminalId);
      if (remainingTerminals.length > 0) {
        setActiveTerminalId(remainingTerminals[remainingTerminals.length - 1].id);
      } else {
        setActiveTerminalId(null);
      }
    }
  };
  
  const renameTerminal = (terminalId, newName) => {
    setTerminals(prev => prev.map(term => 
      term.id === terminalId 
        ? { ...term, name: newName }
        : term
    ));
  };

  // Handler functions
  const handleToggleSelect = (agentName) => {
    const newSelected = new Set(selectedAgentsForStart);
    if (newSelected.has(agentName)) {
      newSelected.delete(agentName);
    } else {
      newSelected.add(agentName);
    }
    setSelectedAgentsForStart(newSelected);
  };

  const loadAgentSystemPrompt = async (agent) => {
    try {
      const response = await fetch(`http://localhost:3001/api/get-agent-content/${encodeURIComponent(projectDir)}/${agent.name}`);
      const data = await response.json();
      if (data.systemPrompt) {
        // Set the agent with the loaded system prompt
        setEditingAgent({
          ...agent,
          systemPrompt: data.systemPrompt
        });
      }
    } catch (error) {
      console.error('Failed to load agent system prompt:', error);
    }
  };

  const handleToggleExpand = (agentName) => {
    const newExpanded = new Set(expandedAgents);
    if (newExpanded.has(agentName)) {
      newExpanded.delete(agentName);
    } else {
      newExpanded.add(agentName);
    }
    setExpandedAgents(newExpanded);
  };

  const handleSaveAgent = (formData) => {
    if (editingAgent) {
      updateAgent(formData);
    } else {
      createAgent(formData);
    }
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingAgent(null);
  };



  const startSelectedAgents = () => {
    // Implementation for starting selected agents
    console.log('Starting agents:', Array.from(selectedAgentsForStart));
  };

  const startSingleAgent = (agent) => {
    // Implementation for starting a single agent
    console.log('Starting agent:', agent.name);
  };

  const addTaskToAgent = async (agentName, task) => {
    if (!task.trim()) return;
    
    try {
      const agent = existingAgents.find(a => a.name === agentName);
      if (!agent) return;
      
      const currentTasks = agent.tasks || [];
      // Convert existing string tasks to objects if needed
      const normalizedTasks = currentTasks.map(t => 
        typeof t === 'string' 
          ? { description: t, status: 'pending', queued: false, progress: 0, subtasks: [] }
          : t
      );
      
      // Add new task as object
      const newTask = {
        description: task,
        status: 'pending',
        queued: false,
        progress: 0,
        subtasks: []
      };
      
      const updatedTasks = [...normalizedTasks, newTask];
      
      const response = await fetch(`http://localhost:3001/api/update-agent-tasks/${encodeURIComponent(projectDir)}/${agentName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update tasks');
      }
      
      setMessage({ type: 'success', text: 'Task added successfully!' });
      await loadAgents();
    } catch (error) {
      console.error('Error adding task:', error);
      setMessage({ type: 'error', text: 'Failed to add task' });
    }
  };

  const updateAgentTasks = async (agentName, tasks) => {
    try {
      const response = await fetch(`http://localhost:3001/api/update-agent-tasks/${encodeURIComponent(projectDir)}/${agentName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update tasks');
      }
      
      await loadAgents();
      setMessage({ type: 'success', text: 'Tasks updated successfully' });
    } catch (error) {
      console.error('Failed to update tasks:', error);
      setMessage({ type: 'error', text: 'Failed to update tasks' });
    }
  };

  const handleCreateTask = async (agentNameOrTasksByAgent, taskOrReplaceMode) => {
    if (typeof agentNameOrTasksByAgent === 'object' && taskOrReplaceMode === true) {
      // Edit mode - replace all tasks
      for (const agent of existingAgents) {
        const newTasks = agentNameOrTasksByAgent[agent.name] || [];
        await updateAgentTasks(agent.name, newTasks);
      }
    } else {
      // Create mode - add single task
      await addTaskToAgent(agentNameOrTasksByAgent, taskOrReplaceMode);
    }
    // After creating/updating tasks, switch to task order view
    setViewMode('tasks');
  };

  const handleEditTaskList = (tasks) => {
    setTaskModalExistingTasks(tasks);
    setTaskModalMode('edit');
    setShowCreateTaskModal(true);
  };

  const handleShowCreateTask = () => {
    setTaskModalMode('create');
    setTaskModalExistingTasks([]);
    setShowCreateTaskModal(true);
  };

  const handleShowCreateWorkflow = () => {
    setEditingWorkflow(null);
    setShowWorkflowModal(true);
  };

  const handleEditWorkflow = (workflow) => {
    setEditingWorkflow(workflow);
    setShowWorkflowModal(true);
  };

  const handleSaveWorkflow = async (workflowData) => {
    const encodedDir = encodeURIComponent(projectDir);
    const method = workflowData.id ? 'PUT' : 'POST';
    const url = workflowData.id
      ? `http://localhost:3001/api/workflows/${encodedDir}/${workflowData.id}`
      : `http://localhost:3001/api/workflows/${encodedDir}`;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflowData.name,
          description: workflowData.description,
          tasks: workflowData.tasks
        })
      });

      if (!response.ok) throw new Error('Failed to save workflow');
      
      setMessage({ type: 'success', text: `Workflow ${workflowData.id ? 'updated' : 'created'} successfully` });
      setShowWorkflowModal(false);
      setEditingWorkflow(null);
    } catch (error) {
      console.error('Error saving workflow:', error);
      setMessage({ type: 'error', text: 'Failed to save workflow' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          <Toast message={message} onClose={() => setMessage(null)} />
          
          <Header
            projectDir={projectDir}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onShowCreateForm={() => setShowCreateForm(true)}
            onShowCreateTask={handleShowCreateTask}
            onShowTechStack={() => setShowTechStackModal(true)}
            existingAgentsCount={existingAgents.length}
            techStackCount={techStackCount}
          />

          {/* Main Content with Terminal */}
          <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)]">
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto">
              {viewMode === 'list' && (
                <AgentList
                  agents={existingAgents}
                  selectedAgents={selectedAgentsForStart}
                  expandedAgents={expandedAgents}
                  onToggleSelect={handleToggleSelect}
                  onToggleExpand={handleToggleExpand}
                  onEditAgent={(agent) => {
                    setEditingAgent(agent);
                    loadAgentSystemPrompt(agent);
                  }}
                  onDeleteAgent={deleteAgent}
                  onAddTask={addTaskToAgent}
                  onStartAgent={startSingleAgent}
                  onStartSelected={startSelectedAgents}
                  onRefresh={loadAgents}
                />
              )}

              {viewMode === 'tasks' && (
                <TaskManager
                  agents={existingAgents}
                  projectDir={projectDir}
                  onCopyCommand={() => setMessage({ type: 'success', text: 'Claude instructions copied to clipboard!' })}
                  onEditTaskList={handleEditTaskList}
                  onUpdateAgentTasks={updateAgentTasks}
                  onRefresh={loadAgents}
                />
              )}

              {viewMode === 'workflows' && (
                <WorkflowManager
                  projectDir={projectDir}
                  agents={existingAgents}
                  onShowCreateWorkflow={handleShowCreateWorkflow}
                  onEditWorkflow={handleEditWorkflow}
                  onRefreshAgents={loadAgents}
                />
              )}

            </div>

            {/* Persistent Terminal Panel */}
            <Terminal
              terminals={terminals}
              activeTerminalId={activeTerminalId}
              onSelectTerminal={setActiveTerminalId}
              onCreateTerminal={createNewTerminal}
              onCloseTerminal={closeTerminal}
              onRenameTerminal={renameTerminal}
              onCopyCommand={() => setMessage({ type: 'success', text: 'Claude instructions copied to clipboard!' })}
              agents={existingAgents}
              projectDir={projectDir}
              className="w-full lg:w-1/2 h-64 lg:h-auto"
            />
          </div>
        </div>

        {/* Modals */}
        {(showCreateForm || editingAgent) && (
          <AgentForm
            agent={editingAgent}
            onSave={handleSaveAgent}
            onCancel={handleCancelForm}
            onShowTemplates={() => setShowTemplatesModal(true)}
            onMessage={setMessage}
            loading={loading}
          />
        )}

        <TechStackModal
          isOpen={showTechStackModal}
          onClose={() => setShowTechStackModal(false)}
          projectDir={projectDir}
          onSave={() => {
            setMessage({ type: 'success', text: 'Tech stack updated successfully!' });
            loadTechStackCount(); // Refresh the count after saving
          }}
        />

        <TemplatesModal
          isOpen={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
          onSelectTemplate={(template) => {
            setEditingAgent(null);
            setShowCreateForm(true);
            // Pre-fill the form with template data
            setTimeout(() => {
              const event = new CustomEvent('templateSelected', { detail: template });
              window.dispatchEvent(event);
            }, 100);
          }}
        />

        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false);
            setTaskModalMode('create');
            setTaskModalExistingTasks([]);
          }}
          agents={existingAgents}
          onCreateTask={handleCreateTask}
          mode={taskModalMode}
          existingTasks={taskModalExistingTasks}
          projectDir={projectDir}
        />

        <WorkflowModal
          isOpen={showWorkflowModal}
          onClose={() => {
            setShowWorkflowModal(false);
            setEditingWorkflow(null);
          }}
          agents={existingAgents}
          onSave={handleSaveWorkflow}
          existingWorkflow={editingWorkflow}
        />
      </div>
    </div>
  );
}

export default App;