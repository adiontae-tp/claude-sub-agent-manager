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

function App() {
  // State management
  const [projectDir, setProjectDir] = useState('./');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [existingAgents, setExistingAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedAgentsForStart, setSelectedAgentsForStart] = useState(new Set());
  const [expandedAgents, setExpandedAgents] = useState(new Set());
  const [viewMode, setViewMode] = useState('list');
  const [editingAgent, setEditingAgent] = useState(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTechStackModal, setShowTechStackModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  // Terminal state
  const [terminalStatus, setTerminalStatus] = useState('not_started');
  const [terminalUrl, setTerminalUrl] = useState('');
  const [terminalError, setTerminalError] = useState('');
  const [terminalLoading, setTerminalLoading] = useState(false);

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
    }
  }, [projectDir]);


  // API functions
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

  const startTerminal = async () => {
    setTerminalLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/terminal/start', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const data = await response.json();
      setTerminalUrl(data.url);
      setTerminalStatus('running');
      setTerminalError('');
    } catch (error) {
      setTerminalError(error.message);
      setMessage({ type: 'error', text: 'Failed to start terminal' });
    } finally {
      setTerminalLoading(false);
    }
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

  const generateSequentialCommand = () => {
    if (selectedAgentsForStart.size === 0) {
      return '';
    }
    
    let command = '';
    
    // If we're in tasks view and have a custom order, use it
    if (viewMode === 'tasks') {
      // Get tasks from TaskManager's order if available
      const selectedAgentsList = Array.from(selectedAgentsForStart);
      const tasks = [];
      
      selectedAgentsList.forEach(agentName => {
        const agent = existingAgents.find(a => a.name === agentName);
        if (agent?.tasks && agent.tasks.length > 0) {
          agent.tasks.forEach(task => {
            tasks.push({
              agentName,
              task
            });
          });
        }
      });
      
      if (tasks.length > 0) {
        const commandParts = [];
        let currentAgent = null;
        let currentTasks = [];
        
        tasks.forEach((taskItem) => {
          if (currentAgent !== taskItem.agentName) {
            // Finish previous agent's tasks
            if (currentAgent && currentTasks.length > 0) {
              commandParts.push(`use the ${currentAgent} sub agent to ${currentTasks.join(' and ')}`);
            }
            currentAgent = taskItem.agentName;
            currentTasks = [taskItem.task];
          } else {
            currentTasks.push(taskItem.task);
          }
        });
        
        // Add the last agent's tasks
        if (currentAgent && currentTasks.length > 0) {
          commandParts.push(`use the ${currentAgent} sub agent to ${currentTasks.join(' and ')}`);
        }
        
        command = commandParts.map((part, index) => {
          if (index === 0) return part.charAt(0).toUpperCase() + part.slice(1);
          return 'then ' + part;
        }).join(', ');
      }
    } else {
      // Original behavior for list view
      const agentCommands = Array.from(selectedAgentsForStart).map(agentName => {
        const agent = existingAgents.find(a => a.name === agentName);
        
        // If agent has tasks, include them in the command
        if (agent?.tasks && agent.tasks.length > 0) {
          const taskList = agent.tasks.join(' and ');
          return `Use the ${agentName} sub agent to ${taskList}`;
        }
        
        // Fallback to description if no tasks
        return `Use the ${agentName} sub agent to ${agent?.description.toLowerCase() || 'complete its assigned tasks'}`;
      });
      
      command = agentCommands.join('\n\n');
    }
    
    // Add tracking reminder
    if (command) {
      command += '\n\nIMPORTANT: Each agent should update their status files to track progress. Check the status with the dashboard view.';
    }
    
    return command;
  };

  const copySequentialCommand = async () => {
    const command = generateSequentialCommand();
    if (!command) {
      setMessage({ type: 'error', text: 'No agents selected to copy command for' });
      return;
    }
    
    try {
      await navigator.clipboard.writeText(command);
      setMessage({ 
        type: 'success', 
        text: `Copied commands for ${selectedAgentsForStart.size} agent${selectedAgentsForStart.size > 1 ? 's' : ''} to clipboard with status update instructions!` 
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' });
    }
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

  const handleCreateTask = async (agentName, task) => {
    await addTaskToAgent(agentName, task);
    // After creating task, switch to task order view
    setViewMode('tasks');
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
            onShowCreateTask={() => setShowCreateTaskModal(true)}
            onShowImport={() => setShowImportModal(true)}
            onShowTechStack={() => setShowTechStackModal(true)}
            existingAgentsCount={existingAgents.length}
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
                  onCopyCommand={() => setMessage({ type: 'success', text: 'Claude instructions copied to clipboard!' })}
                  onUpdateAgentTasks={async (agentName, tasks) => {
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
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Failed to update tasks' });
                    }
                  }}
                  onRefresh={loadAgents}
                />
              )}

            </div>

            {/* Persistent Terminal Panel */}
            <Terminal
              terminalStatus={terminalStatus}
              terminalUrl={terminalUrl}
              terminalError={terminalError}
              terminalLoading={terminalLoading}
              onStart={startTerminal}
              onCopyCommand={copySequentialCommand}
              selectedAgentsCount={selectedAgentsForStart.size}
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
          />
        )}

        <TechStackModal
          isOpen={showTechStackModal}
          onClose={() => setShowTechStackModal(false)}
          onSave={(technologies) => {
            setMessage({ type: 'success', text: 'Tech stack updated successfully!' });
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
          onClose={() => setShowCreateTaskModal(false)}
          agents={existingAgents}
          onCreateTask={handleCreateTask}
        />
      </div>
    </div>
  );
}

export default App;