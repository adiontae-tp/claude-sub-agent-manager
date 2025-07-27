import { useState, useEffect } from 'react'

function App() {
  // Auto-detect current directory (where this tool is installed)
  const [projectDir, setProjectDir] = useState('./')
  const [agentName, setAgentName] = useState('')
  const [agentDescription, setAgentDescription] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [existingAgents, setExistingAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [agentStatus, setAgentStatus] = useState(null)
  const [selectedAgentsForStart, setSelectedAgentsForStart] = useState(new Set())
  const [expandedAgents, setExpandedAgents] = useState(new Set())
  const [viewMode, setViewMode] = useState('list') // 'list', 'dashboard', or 'tasks'
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importMethod, setImportMethod] = useState('text') // 'text' or 'file'
  const [importContent, setImportContent] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [agentSuggestions, setAgentSuggestions] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState({})
  const [showTaskInput, setShowTaskInput] = useState({})
  const [newTask, setNewTask] = useState({})
  const [taskOrder, setTaskOrder] = useState([])
  const [draggedTask, setDraggedTask] = useState(null)
  const [editingAgent, setEditingAgent] = useState(null)
  const [showTemplatesModal, setShowTemplatesModal] = useState(false)
  const [customTemplates, setCustomTemplates] = useState([])
  const [draggedTaskAgent, setDraggedTaskAgent] = useState(null)
  const [draggedTaskIndex, setDraggedTaskIndex] = useState(null)
  const [showAgentActions, setShowAgentActions] = useState(false)
  const [showToolsDropdown, setShowToolsDropdown] = useState(false)

  // Validate and format agent name
  const formatAgentName = (name) => {
    return name.toLowerCase().replace(/[^a-z-]/g, '-').replace(/-+/g, '-')
  }

  // Validate directory
  const validateDirectory = async () => {
    if (!projectDir) {
      setMessage({ type: 'error', text: 'Please select a project directory' })
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/validate-directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: projectDir })
      })
      
      const data = await response.json()
      if (!data.valid) {
        setMessage({ type: 'error', text: data.error })
      } else {
        setMessage({ type: '', text: '' })
        loadExistingAgents()
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to validate directory' })
    }
  }

  // Load existing agents
  const loadExistingAgents = async () => {
    if (!projectDir) return

    try {
      const response = await fetch(`http://localhost:3001/api/list-agents/${encodeURIComponent(projectDir)}`)
      const data = await response.json()
      const agents = data.agents || []
      setExistingAgents(agents)
      
      // Auto-select all agents by default
      const allAgentNames = new Set(agents.map(agent => agent.name))
      setSelectedAgentsForStart(allAgentNames)
    } catch (error) {
      console.error('Failed to load agents:', error)
    }
  }

  // Load agent status
  const loadAgentStatus = async (agent) => {
    if (!projectDir || !agent) return

    try {
      const response = await fetch(`http://localhost:3001/api/agent-status/${encodeURIComponent(projectDir)}/${agent.name}`)
      const data = await response.json()
      setAgentStatus(data.exists ? data : null)
      setSelectedAgent(agent)
    } catch (error) {
      console.error('Failed to load agent status:', error)
      setAgentStatus(null)
    }
  }

  // Generate agent with Claude
  const generateWithClaude = async () => {
    if (!agentName || !agentDescription) {
      setMessage({ type: 'error', text: 'Please provide agent name and description' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/generate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formatAgentName(agentName), 
          description: agentDescription 
        })
      })
      
      const data = await response.json()
      if (data.systemPrompt) {
        setSystemPrompt(data.systemPrompt)
        setMessage({ type: 'success', text: 'System prompt generated successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate prompt' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' })
    } finally {
      setLoading(false)
    }
  }

  // Enhance existing prompt
  const enhancePrompt = async () => {
    if (!systemPrompt) {
      setMessage({ type: 'error', text: 'Please write a system prompt first' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPrompt: systemPrompt,
          name: formatAgentName(agentName), 
          description: agentDescription 
        })
      })
      
      const data = await response.json()
      if (data.systemPrompt) {
        setSystemPrompt(data.systemPrompt)
        setMessage({ type: 'success', text: 'System prompt enhanced successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to enhance prompt' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' })
    } finally {
      setLoading(false)
    }
  }

  // Create agent file
  const createAgent = async () => {
    if (!projectDir || !agentName || !agentDescription || !systemPrompt) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/create-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          directory: projectDir,
          name: formatAgentName(agentName), 
          description: agentDescription,
          systemPrompt
        })
      })
      
      const data = await response.json()
      if (data.success) {
        const formattedName = formatAgentName(agentName)
        setMessage({ 
          type: 'success', 
          text: `${data.message}\n\nExample Claude Code commands:\n> Use the ${formattedName} sub agent to [describe task]\n> Have the ${formattedName} sub agent complete assigned tasks\n> Ask the ${formattedName} sub agent to help with ${agentDescription.toLowerCase()}` 
        })
        // Don't auto-copy since it needs a task description
        // Reset form
        setAgentName('')
        setAgentDescription('')
        setSystemPrompt('')
        setShowCreateForm(false)
        
        // Add the new agent to the selected agents set
        setSelectedAgentsForStart(prev => new Set([...prev, formattedName]))
        
        // Reload agents list
        loadExistingAgents()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create agent' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' })
    } finally {
      setLoading(false)
    }
  }

  // Toggle agent selection for batch start
  const toggleAgentSelection = (agentName) => {
    const newSelection = new Set(selectedAgentsForStart)
    if (newSelection.has(agentName)) {
      newSelection.delete(agentName)
    } else {
      newSelection.add(agentName)
    }
    setSelectedAgentsForStart(newSelection)
  }

  // Load all agent statuses
  const loadAllAgentStatuses = async () => {
    const statuses = {}
    for (const agent of existingAgents) {
      const status = await loadAgentStatus(agent, false)
      if (status) {
        statuses[agent.name] = status
      }
    }
    setAgentStatuses(statuses)
  }

  // Build task list from selected agents
  const buildTaskList = () => {
    const tasks = []
    Array.from(selectedAgentsForStart).forEach(agentName => {
      const agent = existingAgents.find(a => a.name === agentName)
      if (agent?.tasks) {
        agent.tasks.forEach((task, index) => {
          tasks.push({
            id: `${agentName}-${index}`,
            task,
            agentName,
            originalIndex: index
          })
        })
      }
    })
    return tasks
  }

  // Initialize task order when switching to tasks view or when selection changes
  useEffect(() => {
    if (viewMode === 'tasks') {
      const tasks = buildTaskList()
      // Only reset if the tasks have changed
      const currentIds = taskOrder.map(t => t.id).join(',')
      const newIds = tasks.map(t => t.id).join(',')
      if (currentIds !== newIds) {
        setTaskOrder(tasks)
      }
    }
  }, [viewMode, selectedAgentsForStart, existingAgents])

  // Toggle expanded state for agent
  const toggleAgentExpanded = (agentName) => {
    setExpandedAgents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(agentName)) {
        newSet.delete(agentName)
      } else {
        newSet.add(agentName)
      }
      return newSet
    })
  }

  const deleteAgent = async (agent) => {
    if (!confirm(`Are you sure you want to delete the agent "${agent.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const encodedDir = encodeURIComponent(projectDir)
      const response = await fetch(`http://localhost:3001/api/delete-agent/${encodedDir}/${agent.name}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete agent')
      }

      setMessage({ type: 'success', text: `Agent "${agent.name}" deleted successfully` })
      
      // Clear selection if this was the selected agent
      if (selectedAgent?.name === agent.name) {
        setSelectedAgent(null)
      }
      
      // Remove from selected agents set
      setSelectedAgentsForStart(prev => {
        const newSet = new Set(prev)
        newSet.delete(agent.name)
        return newSet
      })

      // Refresh the agent list
      await loadExistingAgents()
    } catch (error) {
      console.error('Error deleting agent:', error)
      setMessage({ type: 'error', text: `Failed to delete agent: ${error.message}` })
    }
  }



  const generateSequentialCommand = () => {
    if (selectedAgentsForStart.size === 0) {
      return ''
    }

    let command = ''
    
    // If we're in tasks view and have a custom order, use it
    if (viewMode === 'tasks' && taskOrder.length > 0) {
      const commandParts = []
      let currentAgent = null
      let currentTasks = []
      
      taskOrder.forEach((taskItem, index) => {
        if (currentAgent !== taskItem.agentName) {
          // Finish previous agent's tasks
          if (currentAgent && currentTasks.length > 0) {
            commandParts.push(`use the ${currentAgent} sub agent to ${currentTasks.join(' and ')}`)
          }
          currentAgent = taskItem.agentName
          currentTasks = [taskItem.task]
        } else {
          currentTasks.push(taskItem.task)
        }
      })
      
      // Add the last agent's tasks
      if (currentAgent && currentTasks.length > 0) {
        commandParts.push(`use the ${currentAgent} sub agent to ${currentTasks.join(' and ')}`)
      }
      
      command = commandParts.map((part, index) => {
        if (index === 0) return part.charAt(0).toUpperCase() + part.slice(1)
        return 'then ' + part
      }).join(', ')
    } else {
      // Original behavior for list view
      const agentCommands = Array.from(selectedAgentsForStart).map(agentName => {
        const agent = existingAgents.find(a => a.name === agentName)
        
        // If agent has tasks, include them in the command
        if (agent?.tasks && agent.tasks.length > 0) {
          const taskList = agent.tasks.join(' and ')
          return `Use the ${agentName} sub agent to ${taskList}`
        }
        
        // Fallback to description if no tasks
        return `Use the ${agentName} sub agent to ${agent?.description.toLowerCase() || 'complete its assigned tasks'}`
      })
      
      command = agentCommands.join('\n\n')
    }

    // Add explicit instructions about status file updates
    const instructions = `IMPORTANT: Each sub-agent MUST update their status file at ${projectDir}/.claude/agents-status/[agent-name]-status.md regularly with:
- Current plan and approach
- Todo list with completed items marked as [x]
- Progress updates with timestamps
- Status: active, completed, or blocked

Now starting the following sub-agents:

${command}`

    return instructions
  }

  const copySequentialCommand = async () => {
    const command = generateSequentialCommand()
    if (!command) {
      setMessage({ type: 'error', text: 'No agents selected to copy command for' })
      return
    }

    try {
      await navigator.clipboard.writeText(command)
      setMessage({ 
        type: 'success', 
        text: `Copied commands for ${selectedAgentsForStart.size} agent${selectedAgentsForStart.size > 1 ? 's' : ''} to clipboard with status update instructions!` 
      })
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      setMessage({ type: 'error', text: 'Failed to copy to clipboard' })
    }
  }

  // Update project directory and save to localStorage
  const updateProjectDir = (dir) => {
    // This function is no longer needed for manual updates
    // Keeping for compatibility but it won't be called
    setProjectDir(dir)
  }

  const analyzeContent = async () => {
    setIsAnalyzing(true)
    setMessage(null)

    try {
      let response
      
      if (importMethod === 'text') {
        response = await fetch('http://localhost:3001/api/analyze-for-agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: importContent })
        })
      } else if (importMethod === 'file' && importFile) {
        const formData = new FormData()
        formData.append('file', importFile)
        
        response = await fetch('http://localhost:3001/api/analyze-file-for-agents', {
          method: 'POST',
          body: formData
        })
      } else {
        throw new Error('No content to analyze')
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze content')
      }

      const data = await response.json()
      // Ensure suggestions is always an array
      const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []
      setAgentSuggestions(suggestions)
      
      if (suggestions.length === 0) {
        setMessage({ type: 'warning', text: 'No agent suggestions were generated. Try providing more detailed content.' })
      }
      
      setImportMethod('text') // Reset for next time
      setImportContent('')
      setImportFile(null)
    } catch (error) {
      console.error('Error analyzing content:', error)
      setMessage({ type: 'error', text: `Failed to analyze content: ${error.message}` })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const createBulkAgents = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      const createPromises = agentSuggestions.map(async (agent) => {
        const response = await fetch('http://localhost:3001/api/create-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directory: projectDir,
            name: agent.name,
            description: agent.description,
            systemPrompt: agent.systemPrompt
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(`Failed to create ${agent.name}: ${error.error}`)
        }

        return agent.name
      })

      const createdAgents = await Promise.all(createPromises)
      
      setMessage({ 
        type: 'success', 
        text: `Successfully created ${createdAgents.length} agents: ${createdAgents.join(', ')}`
      })
      
      // Reset and close modal
      setAgentSuggestions([])
      setShowImportModal(false)
      
      // Add all new agents to the selected agents set
      setSelectedAgentsForStart(prev => new Set([...prev, ...createdAgents]))
      
      // Refresh agent list
      await loadExistingAgents()
    } catch (error) {
      console.error('Error creating agents:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  const updateSuggestion = (index, field, value) => {
    const updated = [...agentSuggestions]
    updated[index] = { ...updated[index], [field]: value }
    setAgentSuggestions(updated)
  }

  const removeSuggestion = (index) => {
    const updated = agentSuggestions.filter((_, i) => i !== index)
    setAgentSuggestions(updated)
  }

  // Add a task to an agent
  const addTaskToAgent = async (agent) => {
    const taskText = newTask[agent.name]?.trim()
    if (!taskText) return

    try {
      const encodedDir = encodeURIComponent(projectDir)
      const currentTasks = agent.tasks || []
      const updatedTasks = [...currentTasks, taskText]
      
      const response = await fetch(`http://localhost:3001/api/update-agent-tasks/${encodedDir}/${agent.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks })
      })

      if (!response.ok) {
        throw new Error('Failed to update tasks')
      }

      // Clear input and refresh agents
      setNewTask({ ...newTask, [agent.name]: '' })
      setShowTaskInput({ ...showTaskInput, [agent.name]: false })
      await loadExistingAgents()
      
      setMessage({ type: 'success', text: 'Task added successfully' })
    } catch (error) {
      console.error('Error adding task:', error)
      setMessage({ type: 'error', text: 'Failed to add task' })
    }
  }

  // Remove a task from an agent
  const removeTaskFromAgent = async (agent, taskIndex) => {
    try {
      const encodedDir = encodeURIComponent(projectDir)
      const updatedTasks = agent.tasks.filter((_, index) => index !== taskIndex)
      
      const response = await fetch(`http://localhost:3001/api/update-agent-tasks/${encodedDir}/${agent.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: updatedTasks })
      })

      if (!response.ok) {
        throw new Error('Failed to update tasks')
      }

      await loadExistingAgents()
      setMessage({ type: 'success', text: 'Task removed successfully' })
    } catch (error) {
      console.error('Error removing task:', error)
      setMessage({ type: 'error', text: 'Failed to remove task' })
    }
  }

  // Edit agent functionality
  const startEditingAgent = (agent) => {
    setEditingAgent(agent)
    setAgentName(agent.name)
    setAgentDescription(agent.description)
    // Load the system prompt from the agent file
    loadAgentSystemPrompt(agent)
  }

  const loadAgentSystemPrompt = async (agent) => {
    try {
      const response = await fetch(`http://localhost:3001/api/get-agent-content/${encodeURIComponent(projectDir)}/${agent.name}`)
      const data = await response.json()
      if (data.systemPrompt) {
        setSystemPrompt(data.systemPrompt)
      }
    } catch (error) {
      console.error('Failed to load agent system prompt:', error)
    }
  }

  const saveEditedAgent = async () => {
    if (!projectDir || !editingAgent || !agentName || !agentDescription || !systemPrompt) {
      setMessage({ type: 'error', text: 'Please fill in all fields' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/update-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          directory: projectDir,
          oldName: editingAgent.name,
          newName: formatAgentName(agentName), 
          description: agentDescription,
          systemPrompt
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setMessage({ type: 'success', text: 'Agent updated successfully!' })
        setEditingAgent(null)
        setAgentName('')
        setAgentDescription('')
        setSystemPrompt('')
        setShowCreateForm(false)
        loadExistingAgents()
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update agent' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to connect to server' })
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setEditingAgent(null)
    setAgentName('')
    setAgentDescription('')
    setSystemPrompt('')
    setShowCreateForm(false)
  }

  // Agent templates - loaded from backend
  const [agentTemplates, setAgentTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)

  // Load templates from backend
  const loadTemplates = async () => {
    setTemplatesLoading(true)
    try {
      const response = await fetch('http://localhost:3001/api/agent-templates')
      const data = await response.json()
      if (data.templates) {
        setAgentTemplates(data.templates)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
      setMessage({ type: 'error', text: 'Failed to load templates' })
    } finally {
      setTemplatesLoading(false)
    }
  }

  const [viewingTemplate, setViewingTemplate] = useState(null)
  const [showTechStackModal, setShowTechStackModal] = useState(false) // Added for tech stack modal
  const [availableTechnologies, setAvailableTechnologies] = useState([]) // Added for available technologies
  const [commonStacks, setCommonStacks] = useState({}) // Added for common tech stacks
  const [globalTechStack, setGlobalTechStack] = useState([]) // Added for global tech stack
  const [selectedTechnologies, setSelectedTechnologies] = useState([]) // Added for current selection
  const [searchQuery, setSearchQuery] = useState('') // Added for search input
  const [techStackLoading, setTechStackLoading] = useState(false) // Added for loading state
  
  // Terminal-related state variables
  const [terminalUrl, setTerminalUrl] = useState(null)
  const [terminalStatus, setTerminalStatus] = useState('stopped') // 'stopped', 'starting', 'running', 'error'
  const [terminalLoading, setTerminalLoading] = useState(false)
  const [terminalError, setTerminalError] = useState(null)
  const [terminalExpanded, setTerminalExpanded] = useState(false) // Terminal panel expanded state
  const [terminalAutoStart, setTerminalAutoStart] = useState(true) // Auto-start terminal on app load
  const [terminalHeight, setTerminalHeight] = useState(384) // Terminal height in pixels

  const useTemplate = async (template) => {
    // Confirm with user before creating agent
    if (!confirm(`Create agent "${template.name}" from template? This will immediately create the agent with the template's configuration.`)) {
      return
    }
    
    setAgentName(template.name)
    setAgentDescription(template.description)
    setSystemPrompt(template.systemPrompt)
    setShowTemplatesModal(false)
    
    // Automatically create the agent after a short delay
    setTimeout(async () => {
      try {
        setLoading(true)
        setMessage({ type: 'info', text: `Creating agent from template "${template.name}"...` })
        
        // Create the agent using the existing createAgent logic
        const formattedName = formatAgentName(template.name)
        
        // Create enhanced system prompt with status tracking
        const enhancedSystemPrompt = `${template.systemPrompt}

## Status Tracking

You have a status file at .claude/agents-status/${formattedName}-status.md that you should update regularly.

Use the following format for your status file:

\`\`\`markdown
---
agent: ${formattedName}
last_updated: YYYY-MM-DD HH:MM:SS
status: active|completed|blocked
---

# Current Plan

[Describe your current approach and strategy]

# Todo List

- [ ] Task 1 description
- [x] Completed task
- [ ] Task 3 description

# Progress Updates

## YYYY-MM-DD HH:MM:SS
[Describe what you accomplished and any blockers]

## YYYY-MM-DD HH:MM:SS
[Another update]
\`\`\`

Always update this file when:
1. Starting a new task
2. Completing significant work
3. Encountering blockers
4. Changing your approach`;

        const content = `---
name: ${formattedName}
description: ${template.description}
---

${enhancedSystemPrompt}
`;

        const response = await fetch('http://localhost:3001/api/create-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            directory: projectDir,
            name: formattedName,
            description: template.description,
            systemPrompt: enhancedSystemPrompt
          })
        })

        const data = await response.json()
        
        if (data.success) {
          setMessage({ type: 'success', text: `Agent "${formattedName}" created successfully from template!` })
          // Clear form and reload agents
          setAgentName('')
          setAgentDescription('')
          setSystemPrompt('')
          setShowCreateForm(false)
          
          // Add the new agent to the selected agents set
          setSelectedAgentsForStart(prev => new Set([...prev, formattedName]))
          
          // Reload agents list
          loadExistingAgents()
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to create agent from template' })
        }
      } catch (error) {
        console.error('Error creating agent from template:', error)
        setMessage({ type: 'error', text: 'Failed to create agent from template' })
      } finally {
        setLoading(false)
      }
    }, 500) // Small delay to show the loading message
  }

  const viewTemplate = (template) => {
    setViewingTemplate(template)
  }

  const saveAsTemplate = async () => {
    if (!agentName || !agentDescription || !systemPrompt) {
      setMessage({ type: 'error', text: 'Please fill in all fields before saving as template' })
      return
    }

    const newTemplate = {
      name: agentName,
      description: agentDescription,
      systemPrompt: systemPrompt
    }

    const updatedTemplates = [...customTemplates, newTemplate]
    setCustomTemplates(updatedTemplates)
    localStorage.setItem('customAgentTemplates', JSON.stringify(updatedTemplates))
    setMessage({ type: 'success', text: 'Template saved successfully!' })
  }

  const deleteTemplate = (index) => {
    const updatedTemplates = customTemplates.filter((_, i) => i !== index)
    setCustomTemplates(updatedTemplates)
    localStorage.setItem('customAgentTemplates', JSON.stringify(updatedTemplates))
    setMessage({ type: 'success', text: 'Template deleted successfully!' })
  }

  // Task reordering functionality
  const handleTaskDragStart = (e, agent, taskIndex) => {
    setDraggedTaskAgent(agent)
    setDraggedTaskIndex(taskIndex)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleTaskDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleTaskDrop = async (e, targetAgent, targetIndex) => {
    e.preventDefault()
    
    if (!draggedTaskAgent || draggedTaskIndex === null) return

    const draggedTask = draggedTaskAgent.tasks[draggedTaskIndex]
    
    try {
      // Remove task from source agent
      const sourceTasks = draggedTaskAgent.tasks.filter((_, index) => index !== draggedTaskIndex)
      await updateAgentTasks(draggedTaskAgent, sourceTasks)

      // Add task to target agent
      const targetTasks = [...targetAgent.tasks]
      targetTasks.splice(targetIndex, 0, draggedTask)
      await updateAgentTasks(targetAgent, targetTasks)

      setMessage({ type: 'success', text: 'Task moved successfully!' })
    } catch (error) {
      console.error('Error moving task:', error)
      setMessage({ type: 'error', text: 'Failed to move task' })
    } finally {
      setDraggedTaskAgent(null)
      setDraggedTaskIndex(null)
    }
  }

  const updateAgentTasks = async (agent, tasks) => {
    const encodedDir = encodeURIComponent(projectDir)
    const response = await fetch(`http://localhost:3001/api/update-agent-tasks/${encodedDir}/${agent.name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    })

    if (!response.ok) {
      throw new Error('Failed to update tasks')
    }
  }

  const reorderTasks = async (agent, newOrder) => {
    try {
      const reorderedTasks = newOrder.map(index => agent.tasks[index])
      await updateAgentTasks(agent, reorderedTasks)
      await loadExistingAgents()
      setMessage({ type: 'success', text: 'Tasks reordered successfully!' })
    } catch (error) {
      console.error('Error reordering tasks:', error)
      setMessage({ type: 'error', text: 'Failed to reorder tasks' })
    }
  }

  // Tech Stack Functions

  // Load tech stack technologies and common stacks
  const loadTechStackData = async () => {
    try {
      setTechStackLoading(true)
      const response = await fetch('http://localhost:3001/api/tech-stack/technologies')
      const data = await response.json()
      setAvailableTechnologies(data.technologies || [])
      setCommonStacks(data.commonStacks || {})
    } catch (error) {
      console.error('Failed to load tech stack data:', error)
      setMessage({ type: 'error', text: 'Failed to load tech stack data' })
    } finally {
      setTechStackLoading(false)
    }
  }

  // Load global tech stack
  const loadGlobalTechStack = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/tech-stack/global/${encodeURIComponent(projectDir)}`)
      const data = await response.json()
      const techArray = Object.values(data.techStack || {}).flat()
      setGlobalTechStack(techArray)
      setSelectedTechnologies(techArray)
    } catch (error) {
      console.error('Failed to load global tech stack:', error)
      setMessage({ type: 'error', text: 'Failed to load global tech stack' })
    }
  }

  // Save global tech stack
  const saveGlobalTechStack = async () => {
    try {
      setTechStackLoading(true)
      const response = await fetch('http://localhost:3001/api/tech-stack/global', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directory: projectDir,
          techStack: { technologies: selectedTechnologies }
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setGlobalTechStack(selectedTechnologies)
        setMessage({ type: 'success', text: 'Global tech stack saved successfully' })
        setShowTechStackModal(false)
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save global tech stack' })
      }
    } catch (error) {
      console.error('Error saving global tech stack:', error)
      setMessage({ type: 'error', text: 'Failed to save global tech stack' })
    } finally {
      setTechStackLoading(false)
    }
  }

  // Open tech stack modal
  const openTechStackModal = async () => {
    setShowTechStackModal(true)
    await loadTechStackData()
    await loadGlobalTechStack()
  }

  // Apply common stack
  const applyCommonStack = (stackKey) => {
    const stack = commonStacks[stackKey]
    if (stack && stack.technologies) {
      setSelectedTechnologies(stack.technologies)
    }
  }

  // Toggle technology selection
  const toggleTechnology = (technology) => {
    setSelectedTechnologies(prev => {
      const index = prev.indexOf(technology)
      if (index > -1) {
        return prev.filter(t => t !== technology)
      } else {
        return [...prev, technology]
      }
    })
  }

  // Add custom technology
  const addCustomTechnology = (tech) => {
    if (!tech.trim()) return
    
    const technology = tech.trim()
    if (!selectedTechnologies.includes(technology) && !availableTechnologies.includes(technology)) {
      setSelectedTechnologies(prev => [...prev, technology])
    }
  }

  // Remove technology
  const removeTechnology = (technology) => {
    setSelectedTechnologies(prev => prev.filter(t => t !== technology))
  }

  // Clear all selections
  const clearTechStack = () => {
    setSelectedTechnologies([])
  }

  // Filter technologies based on search
  const filteredTechnologies = availableTechnologies.filter(tech =>
    tech.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Terminal management functions
  const startTerminal = async () => {
    try {
      console.log('Starting terminal...')
      setTerminalLoading(true)
      setTerminalError(null)
      setTerminalStatus('starting')

      const response = await fetch('http://localhost:3001/api/terminal/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      console.log('Terminal start response:', data)
      
      if (response.ok) {
        console.log('Terminal started successfully, URL:', data.url)
        setTerminalUrl(data.url)
        setTerminalStatus('running')
        console.log('Terminal started successfully')
      } else {
        console.error('Terminal start failed:', data.error)
        setTerminalError(data.error || 'Failed to start terminal')
        setTerminalStatus('error')
      }
    } catch (error) {
      console.error('Error starting terminal:', error)
      setTerminalError('Failed to connect to terminal service')
      setTerminalStatus('error')
    } finally {
      setTerminalLoading(false)
    }
  }

  const stopTerminal = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/terminal/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()
      
      if (response.ok) {
        setTerminalUrl(null)
        setTerminalStatus('stopped')
      }
    } catch (error) {
      console.error('Error stopping terminal:', error)
    }
  }

  const checkTerminalStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/terminal/status')
      const data = await response.json()
      
      if (response.ok) {
        if (data.running) {
          setTerminalStatus('running')
          setTerminalUrl(data.url)
        } else {
          setTerminalStatus('stopped')
          setTerminalUrl(null)
        }
      }
    } catch (error) {
      console.error('Error checking terminal status:', error)
    }
  }

  const executeCommand = async (command) => {
    try {
      const response = await fetch('http://localhost:3001/api/terminal/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command })
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Error executing command:', data.error)
      }
    } catch (error) {
      console.error('Error executing command:', error)
    }
  }

  const startClaudeWithAgents = async (agents = []) => {
    try {
      console.log('Starting Claude with agents:', agents)
      const response = await fetch('http://localhost:3001/api/terminal/start-claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agents })
      })

      const data = await response.json()
      console.log('Start Claude response:', data)
      
      if (response.ok) {
        console.log('Claude started with agents:', data.agents)
        if (agents.length > 0) {
          setMessage({ type: 'success', text: `Claude started with ${agents.length} agent${agents.length > 1 ? 's' : ''} as context` })
        } else {
          setMessage({ type: 'success', text: 'Claude started in interactive mode' })
        }
      } else {
        console.error('Error starting Claude:', data.error)
        setMessage({ type: 'error', text: `Failed to start Claude: ${data.error}` })
      }
    } catch (error) {
      console.error('Error starting Claude:', error)
      setMessage({ type: 'error', text: 'Failed to start Claude' })
    }
  }



  const runSequentialTasks = async () => {
    try {
      // First, ensure terminal is running
      if (terminalStatus !== 'running') {
        await startTerminal()
        // Wait for terminal to start
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      // Generate the sequential command
      const sequentialCommand = generateSequentialCommand()
      
      if (!sequentialCommand) {
        setMessage({ type: 'error', text: 'No agents selected to run' })
        return
      }

      // Execute the command in the terminal
      await executeCommand(sequentialCommand)
      
      setMessage({ 
        type: 'success', 
        text: `Started sequential tasks for ${selectedAgentsForStart.size} agent${selectedAgentsForStart.size > 1 ? 's' : ''} in terminal!` 
      })
      
      console.log('Sequential tasks started in terminal')
    } catch (error) {
      console.error('Error running sequential tasks:', error)
      setMessage({ type: 'error', text: 'Failed to run sequential tasks in terminal' })
    }
  }

  // Auto-refresh active agents
  useEffect(() => {
    // This useEffect is now redundant as projectDir is set in the initial useEffect
    // Keeping it for now, but it will not be triggered by projectDir changes
    // if (projectDir) {
    //   validateDirectory()
    // }
  }, [])

  // Load first agent on load
  useEffect(() => {
    if (existingAgents.length > 0 && !selectedAgent) {
      loadAgentStatus(existingAgents[0])
    }
  }, [existingAgents])

  // Load all agent statuses when agents list changes
  useEffect(() => {
    loadAllAgentStatuses()
  }, [existingAgents, projectDir])

  // Auto-refresh active agents
  useEffect(() => {
    if (!projectDir || existingAgents.length === 0) return

    // Clear existing interval
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
    }

    // Check if any agents are active
    const hasActiveAgents = Object.values(agentStatuses).some(
      status => status.status !== 'completed'
    )

    if (hasActiveAgents) {
      const interval = setInterval(() => {
        loadAllAgentStatuses()
      }, 10000) // Refresh every 10 seconds

      setAutoRefreshInterval(interval)

      return () => clearInterval(interval)
    }
  }, [projectDir, existingAgents, agentStatuses])

  // Auto-dismiss messages after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // Auto-validate and load agents on mount
  useEffect(() => {
    // Fetch actual parent directory from backend
    fetch('http://localhost:3001/api/parent-directory')
      .then(res => res.json())
      .then(data => {
        setProjectDir(data.path)
        validateDirectory()
        loadExistingAgents()
      })
      .catch(err => {
        console.error('Error fetching parent directory:', err)
        // Fallback to current directory
        setProjectDir('./')
        validateDirectory()
        loadExistingAgents()
      })
  }, [])

  // Load custom templates from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem('customAgentTemplates')
    if (savedTemplates) {
      try {
        setCustomTemplates(JSON.parse(savedTemplates))
      } catch (error) {
        console.error('Error loading custom templates:', error)
      }
    }
  }, [])

  // Check terminal status on mount and auto-start if enabled
  useEffect(() => {
    checkTerminalStatus().then(() => {
      if (terminalAutoStart && terminalStatus === 'stopped') {
        startTerminal()
      }
    })
  }, [terminalAutoStart])

  // Cleanup terminal only when component unmounts or page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (terminalStatus === 'running') {
        stopTerminal()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      // Only cleanup terminal when component unmounts (not when hidden)
      if (terminalStatus === 'running') {
        stopTerminal()
      }
    }
  }, [terminalStatus])

  // Keyboard shortcuts for terminal
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + ` to toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        setTerminalExpanded(!terminalExpanded)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [terminalExpanded])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on dropdown buttons or their content
      if (event.target.closest('.dropdown-container')) {
        return
      }
      
      if (showAgentActions || showToolsDropdown) {
        setShowAgentActions(false)
        setShowToolsDropdown(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showAgentActions, showToolsDropdown])

  // Load templates when templates modal is opened
  useEffect(() => {
    if (showTemplatesModal) {
      loadTemplates()
    }
  }, [showTemplatesModal])



  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
        {/* Toast Message */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-md transition-opacity ${
            message.type === 'error' ? 'bg-red-600 text-white' : 
            message.type === 'success' ? 'bg-green-600 text-white' : 
            'bg-blue-600 text-white'
          }`}>
            <div className="flex items-start gap-2">
              <p className="flex-1">{message.text}</p>
              <button 
                onClick={() => setMessage(null)}
                className="text-white hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Claude Sub-Agent Manager</h1>
          
          {/* Auto-detected Directory Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm text-blue-900 break-all">
                Managing agents in: <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">./.claude/agents/</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Content - Agents and Status */}
        {/* Existing Agents */}
        <div>
          {/* View Toggle and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            {/* View Toggle Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap text-sm ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Agent List
              </button>
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap text-sm ${
                  viewMode === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setViewMode('tasks')}
                className={`px-3 py-2 rounded-md transition-colors whitespace-nowrap text-sm ${
                  viewMode === 'tasks'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Tasks
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Primary Actions */}
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={!projectDir}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                Create New Agent
              </button>
              
              {/* Agent Actions Dropdown */}
              {selectedAgentsForStart.size > 0 && (viewMode === 'list' || viewMode === 'tasks') && (
                <div className="relative inline-block text-left dropdown-container">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAgentActions(!showAgentActions)
                    }}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm whitespace-nowrap flex items-center gap-1"
                  >
                    Agent Actions
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showAgentActions && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10 transform transition-all duration-200 ease-in-out">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            copySequentialCommand()
                            setShowAgentActions(false)
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Copy Sequential Command
                        </button>
                        {viewMode === 'tasks' && (
                          <button
                            onClick={() => {
                              runSequentialTasks()
                              setShowAgentActions(false)
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Run Sequential Tasks
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Tools Dropdown */}
              <div className="relative inline-block text-left dropdown-container">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowToolsDropdown(!showToolsDropdown)
                  }}
                  className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm whitespace-nowrap flex items-center gap-1"
                >
                  Tools
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showToolsDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 transform transition-all duration-200 ease-in-out">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowTemplatesModal(true)
                          setShowToolsDropdown(false)
                        }}
                        disabled={!projectDir}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                      >
                        Templates
                      </button>
                      <button
                        onClick={() => {
                          openTechStackModal()
                          setShowToolsDropdown(false)
                        }}
                        disabled={!projectDir}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                      >
                        Tech Stack
                      </button>
                      <button
                        onClick={() => {
                          setShowImportModal(true)
                          setShowToolsDropdown(false)
                        }}
                        disabled={!projectDir}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:text-gray-400"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Terminal Button */}
              <button
                onClick={() => setTerminalExpanded(!terminalExpanded)}
                disabled={!projectDir}
                className={`px-3 py-2 text-white rounded-md text-sm whitespace-nowrap ${
                  terminalStatus === 'running' 
                    ? 'bg-green-600 hover:bg-green-700' : 
                    terminalStatus === 'starting'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                } ${!projectDir ? 'disabled:bg-gray-400 disabled:cursor-not-allowed' : ''}`}
              >
                {terminalLoading ? 'Starting...' : 
                 terminalStatus === 'running' ? '🖥️ Terminal' : 
                 terminalStatus === 'starting' ? '🔄 Starting...' : '🖥️ Terminal'}
                {viewMode === 'tasks' ? ' (Side Panel)' : terminalStatus === 'running' && !terminalExpanded ? ' (Hidden)' : ''}
                {viewMode !== 'tasks' && terminalExpanded ? ' ▼' : viewMode !== 'tasks' ? ' ▲' : ''}
              </button>
              
              {/* Refresh Button */}
              <button
                onClick={() => {
                  loadExistingAgents()
                  loadAllAgentStatuses()
                }}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm whitespace-nowrap"
              >
                Refresh
              </button>
            </div>
          </div>
          
          {/* Auto-refresh indicator */}
          {Object.values(agentStatuses).some(s => s.status !== 'completed') && (
            <div className="mb-4">
              <span className="text-sm text-green-600">
                ⟳ Auto-refreshing every 10s
              </span>
            </div>
          )}
          
          {/* List View */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h2 className="text-xl font-semibold mb-4">Your Agents</h2>
                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  {existingAgents.length === 0 ? (
                    <div className="text-center py-8">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <p className="text-gray-500 mb-4">No agents created yet</p>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Create your first agent
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {existingAgents.map((agent) => (
                          <div 
                            key={agent.name} 
                            className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedAgent?.name === agent.name 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              setSelectedAgent(agent)
                              loadAgentStatus(agent)
                            }}
                          >
                            <div className="space-y-3">
                              {/* Agent Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <input
                                      type="checkbox"
                                      checked={selectedAgentsForStart.has(agent.name)}
                                      onChange={(e) => {
                                        e.stopPropagation()
                                        toggleAgentSelection(agent.name)
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-4 h-4 text-blue-600 rounded flex-shrink-0"
                                    />
                                    <h3 className="font-semibold text-gray-900 truncate">{agent.name}</h3>
                                    {agentStatuses[agent.name] && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                                        agentStatuses[agent.name].status === 'active' ? 'bg-green-100 text-green-800' :
                                        agentStatuses[agent.name].status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                        agentStatuses[agent.name].status === 'blocked' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-600'
                                      }`}>
                                        {agentStatuses[agent.name].status}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{agent.description}</p>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      startEditingAgent(agent)
                                    }}
                                    className="text-blue-600 hover:text-blue-700 p-1"
                                    title="Edit agent"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteAgent(agent)
                                    }}
                                    className="text-red-600 hover:text-red-700 p-1"
                                    title="Delete agent"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                              
                              {/* Tasks Section - More Prominent */}
                              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                    </svg>
                                    Tasks ({agent.tasks?.length || 0})
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setShowTaskInput({ ...showTaskInput, [agent.name]: !showTaskInput[agent.name] })
                                    }}
                                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <span className="hidden sm:inline">Add Task</span>
                                    <span className="sm:hidden">Add</span>
                                  </button>
                                </div>
                                
                                {/* Task Input */}
                                {showTaskInput[agent.name] && (
                                  <div className="mb-3 flex flex-col sm:flex-row gap-2">
                                    <input
                                      type="text"
                                      value={newTask[agent.name] || ''}
                                      onChange={(e) => setNewTask({ ...newTask, [agent.name]: e.target.value })}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.stopPropagation()
                                          addTaskToAgent(agent)
                                        }
                                      }}
                                      placeholder="Describe the task..."
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                      onClick={(e) => e.stopPropagation()}
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          addTaskToAgent(agent)
                                        }}
                                        className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                      >
                                        Add
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setShowTaskInput({ ...showTaskInput, [agent.name]: false })
                                          setNewTask({ ...newTask, [agent.name]: '' })
                                        }}
                                        className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Task List */}
                                {agent.tasks && agent.tasks.length > 0 ? (
                                  <div className="space-y-2">
                                    {agent.tasks.map((task, index) => (
                                      <div 
                                        key={index} 
                                        className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200 cursor-move hover:bg-gray-50 transition-colors"
                                        draggable
                                        onDragStart={(e) => handleTaskDragStart(e, agent, index)}
                                        onDragOver={handleTaskDragOver}
                                        onDrop={(e) => handleTaskDrop(e, agent, index)}
                                      >
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">
                                          {index + 1}
                                        </div>
                                        <span className="flex-1 text-gray-700 text-sm sm:text-base break-words">{task}</span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              removeTaskFromAgent(agent, index)
                                            }}
                                            className="text-red-600 hover:text-red-700 p-1"
                                            title="Remove task"
                                          >
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">No tasks assigned yet. Click "Add Task" to get started.</p>
                                )}
                              </div>
                              
                              {/* Status Tracking Summary */}
                              {agentStatuses[agent.name]?.todos && agentStatuses[agent.name].todos.length > 0 && (
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleAgentExpanded(agent.name)
                                    }}
                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                  >
                                    <svg 
                                      className={`w-4 h-4 transition-transform ${expandedAgents.has(agent.name) ? 'rotate-90' : ''}`} 
                                      fill="currentColor" 
                                      viewBox="0 0 20 20"
                                    >
                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    View Progress
                                  </button>
                                  <span className="text-sm text-gray-600">
                                    {(() => {
                                      const completed = agentStatuses[agent.name].todos.filter(t => t.completed).length
                                      const total = agentStatuses[agent.name].todos.length
                                      return `${completed}/${total} completed`
                                    })()}
                                  </span>
                                </div>
                              )}
                              
                              {/* Expanded Progress View */}
                              {expandedAgents.has(agent.name) && agentStatuses[agent.name]?.todos && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
                                  <h5 className="text-sm font-semibold text-gray-700 mb-2">Progress Tracking:</h5>
                                  {agentStatuses[agent.name].todos.map((todo, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                      <input 
                                        type="checkbox" 
                                        checked={todo.completed} 
                                        readOnly 
                                        className="mt-0.5"
                                      />
                                      <span className={`text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                        {todo.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                      ))}
                      
                      {selectedAgentsForStart.size > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                          {selectedAgentsForStart.size} agent{selectedAgentsForStart.size > 1 ? 's' : ''} selected for batch start
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Agent Status Details */}
              <div className="lg:col-span-2">
                {selectedAgent && agentStatus ? (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="mb-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">{selectedAgent.name}</h2>
                          <p className="text-gray-600 mt-1">{selectedAgent.description}</p>
                        </div>
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          agentStatus.status === 'active' ? 'bg-green-100 text-green-800' :
                          agentStatus.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {agentStatus.status}
                        </span>
                      </div>

                      {/* Last Updated */}
                      <p className="text-sm text-gray-500 mb-6">
                        Last updated: {new Date(agentStatus.last_updated).toLocaleString()}
                      </p>
                      
                      {/* Claude Code Command */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Start Command</h3>
                        <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                          <code className="flex-1 text-sm font-mono text-gray-900">
                            {selectedAgent.tasks && selectedAgent.tasks.length > 0 
                              ? `Use the ${selectedAgent.name} sub agent to ${selectedAgent.tasks.join(' and ')}`
                              : `Use the ${selectedAgent.name} sub agent to ${selectedAgent.description.toLowerCase()}`
                            }
                          </code>
                          <button
                            onClick={() => {
                              const command = selectedAgent.tasks && selectedAgent.tasks.length > 0 
                                ? `Use the ${selectedAgent.name} sub agent to ${selectedAgent.tasks.join(' and ')}`
                                : `Use the ${selectedAgent.name} sub agent to ${selectedAgent.description.toLowerCase()}`
                              navigator.clipboard.writeText(command)
                              setMessage({ type: 'success', text: 'Command copied to clipboard!' })
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Todo List */}
                    {agentStatus.todos && agentStatus.todos.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Todo List</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <ul className="space-y-2">
                            {agentStatus.todos.map((todo, index) => (
                              <li key={index} className="flex items-start">
                                <input 
                                  type="checkbox" 
                                  checked={todo.completed} 
                                  readOnly 
                                  className="mt-1 mr-3"
                                />
                                <span className={`${
                                  todo.completed ? 'line-through text-gray-500' : 'text-gray-700'
                                }`}>
                                  {todo.text}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <p className="text-gray-500">
                      {existingAgents.length > 0 
                        ? 'Select an agent to view its status' 
                        : 'Create your first agent to get started'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dashboard View */}
          {viewMode === 'dashboard' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Dashboard</h2>
                <p className="text-gray-600">Overview of all agents, tasks, and project progress</p>
              </div>
              
              {existingAgents.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-24 h-24 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Agents Yet</h3>
                  <p className="text-gray-500 mb-6">Create agents to start managing your project</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create Single Agent
                    </button>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      Import Multiple Agents
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {(() => {
                    // Collect all data for dashboard
                    const allTasks = []
                    const allAssignedTasks = []
                    const agentStats = {}
                    
                    existingAgents.forEach(agent => {
                      const status = agentStatuses[agent.name]
                      const assignedTasks = agent.tasks || []
                      
                      // Track assigned tasks
                      assignedTasks.forEach((task, index) => {
                        allAssignedTasks.push({
                          id: `${agent.name}-${index}`,
                          task,
                          agentName: agent.name,
                          status: status?.status || 'unknown'
                        })
                      })
                      
                      // Track status tracking tasks
                      if (status?.todos) {
                        status.todos.forEach(todo => {
                          allTasks.push({
                            ...todo,
                            agentName: agent.name,
                            agentStatus: status.status
                          })
                        })
                      }
                      
                      // Build agent stats
                      agentStats[agent.name] = {
                        assignedTasks: assignedTasks.length,
                        status: status?.status || 'unknown',
                        lastUpdated: status?.last_updated,
                        completedTodos: status?.todos?.filter(t => t.completed).length || 0,
                        totalTodos: status?.todos?.length || 0
                      }
                    })

                    const completedTasks = allTasks.filter(t => t.completed)
                    const pendingTasks = allTasks.filter(t => !t.completed)
                    const totalTasks = allTasks.length
                    const progressPercent = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0
                    
                    const activeAgents = existingAgents.filter(a => agentStatuses[a.name]?.status === 'active')
                    const completedAgents = existingAgents.filter(a => agentStatuses[a.name]?.status === 'completed')
                    const blockedAgents = existingAgents.filter(a => agentStatuses[a.name]?.status === 'blocked')

                    return (
                      <>
                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-blue-600">Total Agents</p>
                                <p className="text-2xl font-bold text-blue-900">{existingAgents.length}</p>
                              </div>
                              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-green-600">Assigned Tasks</p>
                                <p className="text-2xl font-bold text-green-900">{allAssignedTasks.length}</p>
                              </div>
                              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="bg-yellow-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-yellow-600">Active Agents</p>
                                <p className="text-2xl font-bold text-yellow-900">{activeAgents.length}</p>
                              </div>
                              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="bg-purple-50 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-purple-600">Progress</p>
                                <p className="text-2xl font-bold text-purple-900">{Math.round(progressPercent)}%</p>
                              </div>
                              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {/* Agent Overview */}
                        <div className="mb-8">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Overview</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {existingAgents.map(agent => {
                              const stats = agentStats[agent.name]
                              const status = agentStatuses[agent.name]
                              
                              return (
                                <div key={agent.name} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                                      <p className="text-sm text-gray-600">{agent.description}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      stats.status === 'active' ? 'bg-green-100 text-green-800' :
                                      stats.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                      stats.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-600'
                                    }`}>
                                      {stats.status}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Assigned Tasks:</span>
                                      <span className="font-medium">{stats.assignedTasks}</span>
                                    </div>
                                    {stats.totalTodos > 0 && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Progress:</span>
                                        <span className="font-medium">{stats.completedTodos}/{stats.totalTodos}</span>
                                      </div>
                                    )}
                                    {stats.lastUpdated && (
                                      <div className="text-xs text-gray-500">
                                        Updated: {new Date(stats.lastUpdated).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Task Progress */}
                        {totalTasks > 0 && (
                          <div className="mb-8">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-900">Task Progress</h3>
                              <span className="text-sm text-gray-600">
                                {completedTasks.length} of {totalTasks} tasks completed
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                              <div 
                                className="bg-blue-600 h-4 rounded-full transition-all duration-300 flex items-center justify-center" 
                                style={{ width: `${progressPercent}%` }}
                              >
                                {progressPercent > 10 && (
                                  <span className="text-xs text-white font-medium">
                                    {Math.round(progressPercent)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Recent Activity */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Assigned Tasks */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                              Assigned Tasks ({allAssignedTasks.length})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {allAssignedTasks.length === 0 ? (
                                <p className="text-gray-500 text-sm">No tasks assigned to agents</p>
                              ) : (
                                allAssignedTasks.map((taskItem, index) => (
                                  <div 
                                    key={taskItem.id} 
                                    className="bg-blue-50 rounded-lg p-3 flex items-start gap-3"
                                  >
                                    <div className="w-4 h-4 border-2 border-blue-400 rounded mt-0.5 flex-shrink-0"></div>
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-700">{taskItem.task}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Agent: <span className={`font-medium ${
                                          taskItem.status === 'active' ? 'text-green-600' : 'text-gray-600'
                                        }`}>{taskItem.agentName}</span>
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Status Tracking Tasks */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Status Tracking ({totalTasks})
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {totalTasks === 0 ? (
                                <p className="text-gray-500 text-sm">No status tracking tasks yet</p>
                              ) : (
                                <>
                                  {pendingTasks.slice(0, 3).map((task, index) => (
                                    <div 
                                      key={`pending-${index}`} 
                                      className="bg-yellow-50 rounded-lg p-3 flex items-start gap-3"
                                    >
                                      <div className="w-4 h-4 border-2 border-yellow-400 rounded mt-0.5 flex-shrink-0"></div>
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-700">{task.text}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Agent: <span className="font-medium">{task.agentName}</span>
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  {completedTasks.slice(0, 3).map((task, index) => (
                                    <div 
                                      key={`completed-${index}`} 
                                      className="bg-green-50 rounded-lg p-3 flex items-start gap-3"
                                    >
                                      <svg className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-600 line-through">{task.text}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Agent: <span className="font-medium">{task.agentName}</span>
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                  {(pendingTasks.length > 3 || completedTasks.length > 3) && (
                                    <p className="text-xs text-gray-500 text-center">
                                      Showing first 3 of each type...
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-8 pt-6 border-t">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => setViewMode('list')}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                              Manage Agents
                            </button>
                            <button
                              onClick={() => setViewMode('tasks')}
                              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                            >
                              Reorder Tasks
                            </button>
                            <button
                              onClick={() => setShowCreateForm(true)}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                            >
                              Add New Agent
                            </button>
                            <button
                              onClick={() => setShowImportModal(true)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
                            >
                              Import Agents
                            </button>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </>
              )}
            </div>
          )}

          {/* Tasks View with Side-by-Side Terminal */}
          {viewMode === 'tasks' && (
            <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-200px)]">
              {/* Tasks Panel */}
              <div className="w-full lg:flex-1 bg-white rounded-lg shadow-md p-6 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">All Tasks - Drag to Reorder</h2>
                <p className="text-gray-600">
                  {selectedAgentsForStart.size === 0 
                    ? 'Select agents to see their tasks' 
                    : `Showing tasks from ${selectedAgentsForStart.size} selected agent${selectedAgentsForStart.size > 1 ? 's' : ''}`
                  }
                </p>
              </div>

              {selectedAgentsForStart.size > 0 && taskOrder.length > 0 ? (
                <div className="space-y-2">
                  {taskOrder.map((taskItem, index) => (
                    <div
                      key={taskItem.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedTask(taskItem)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (!draggedTask || draggedTask.id === taskItem.id) return
                        
                        const newOrder = [...taskOrder]
                        const draggedIndex = newOrder.findIndex(t => t.id === draggedTask.id)
                        const dropIndex = index
                        
                        // Remove dragged item
                        newOrder.splice(draggedIndex, 1)
                        // Insert at new position
                        newOrder.splice(dropIndex, 0, draggedTask)
                        
                        setTaskOrder(newOrder)
                        setDraggedTask(null)
                      }}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="text-gray-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M7 2a2 2 0 00-2 2v1a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM5 7a2 2 0 012-2h6a2 2 0 012 2v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7zM7 12a2 2 0 00-2 2v1a2 2 0 002 2h6a2 2 0 002-2v-1a2 2 0 00-2-2H7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{taskItem.task}</div>
                        <div className="text-sm text-gray-600">Agent: {taskItem.agentName}</div>
                      </div>
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        #{index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedAgentsForStart.size > 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">The selected agents have no tasks assigned.</p>
                  <p className="text-sm text-gray-400 mt-2">Add tasks to agents in the Agent List view.</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <p className="text-gray-500">No agents selected</p>
                  <p className="text-sm text-gray-400 mt-2">Select agents in the Agent List view to see and reorder their tasks.</p>
                </div>
              )}

              {/* Copy Command Button */}
              {selectedAgentsForStart.size > 0 && taskOrder.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={copySequentialCommand}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Sequential Command
                  </button>
                </div>
              )}
              </div>
              
              {/* Terminal Panel - Side by Side */}
              <div className="w-full lg:w-1/2 h-64 lg:h-auto bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                {terminalStatus === 'running' ? (
                  <>
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">Terminal</h3>
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Running
                        </span>
                        <span className="text-xs text-gray-500" title="Ctrl/Cmd + ` to toggle">
                          ⌨️
                        </span>
                        {terminalError && (
                          <span className="text-red-600 text-sm">{terminalError}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedAgentsForStart.size > 0 && (
                          <button
                            onClick={copySequentialCommand}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            title="Copy sequential command for selected agents"
                          >
                            Copy Sequential Command
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Terminal Content */}
                    <div className="flex-1 overflow-hidden">
                      {terminalUrl ? (
                        <iframe
                          src={terminalUrl}
                          className="w-full h-full border-0"
                          title="Terminal"
                          allow="fullscreen"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
                            <p className="text-gray-600 text-sm">Starting terminal...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Terminal Not Running State */
                  <div className="flex flex-col items-center justify-center h-full p-6">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Terminal</h3>
                      <p className="text-gray-600 text-sm mb-4">Terminal is not running</p>
                      <button
                        onClick={startTerminal}
                        disabled={terminalLoading}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      >
                        {terminalLoading ? 'Starting...' : 'Start Terminal'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Agent Modal */}
        {(showCreateForm || editingAgent) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingAgent ? 'Edit Agent' : 'Create New Agent'}
                  </h2>
                  <button
                    onClick={() => {
                      if (editingAgent) {
                        cancelEdit()
                      } else {
                        setShowCreateForm(false)
                      }
                      setMessage({ type: '', text: '' })
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Agent Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="code-reviewer"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {agentName && (
                    <p className="text-sm text-gray-500 mt-1">
                      Will be saved as: {formatAgentName(agentName)}.md
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    placeholder="Expert code review specialist. Use PROACTIVELY after code changes..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Include "proactive" keywords to encourage automatic delegation
                  </p>
                </div>

                {/* System Prompt */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are a senior code reviewer ensuring high standards..."
                    rows={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4">
                  {!editingAgent && (
                    <>
                      <button
                        onClick={generateWithClaude}
                        disabled={loading || !agentName || !agentDescription}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      >
                        {loading ? 'Generating...' : 'Generate with Claude'}
                      </button>
                      
                      <button
                        onClick={enhancePrompt}
                        disabled={loading || !systemPrompt}
                        className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      >
                        {loading ? 'Enhancing...' : 'Enhance Prompt'}
                      </button>
                    </>
                  )}
                  
                  <button
                    onClick={editingAgent ? saveEditedAgent : createAgent}
                    disabled={loading || !projectDir || !agentName || !agentDescription || !systemPrompt}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                  >
                    {loading ? (editingAgent ? 'Saving...' : 'Creating...') : (editingAgent ? 'Save Changes' : 'Create Sub-Agent')}
                  </button>
                  
                  {!editingAgent && (
                    <button
                      onClick={saveAsTemplate}
                      disabled={!agentName || !agentDescription || !systemPrompt}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                    >
                      Save as Template
                    </button>
                  )}
                  
                  {editingAgent && (
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Message Display in Modal */}
                {message && (
                  <div className={`mt-4 p-4 rounded-md ${
                    message.type === 'error' ? 'bg-red-50 text-red-800' : 
                    message.type === 'info' ? 'bg-blue-50 text-blue-800' :
                    'bg-green-50 text-green-800'
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans">{message.text}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Templates Modal */}
        {showTemplatesModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Agent Templates</h2>
                  <button
                    onClick={() => setShowTemplatesModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Built-in Templates */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Built-in Templates</h3>
                    {templatesLoading ? (
                      <div className="text-center py-8">
                        <svg className="animate-spin h-8 w-8 mx-auto text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-600">Loading templates...</p>
                      </div>
                    ) : agentTemplates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No templates available</p>
                        <p className="text-sm">Templates will be loaded from the agent-templates directory</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {agentTemplates.map((template, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900 capitalize">{template.name}</h4>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {template.category}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-gray-500">
                                <strong>Focus:</strong> {template.category === 'Development' ? 'AI-proof coding practices' : template.category === 'Design' ? 'Human-centered design' : template.category === 'Testing' ? 'Quality assurance practices' : 'Best practices'}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => viewTemplate(template)}
                                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => useTemplate(template)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  Create Agent
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Custom Templates */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Custom Templates</h3>
                    {customTemplates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No custom templates yet</p>
                        <p className="text-sm">Create an agent and save it as a template to see it here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {customTemplates.map((template, index) => (
                          <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-gray-900">{template.name}</h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => useTemplate(template)}
                                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  Create Agent
                                </button>
                                <button
                                  onClick={() => deleteTemplate(index)}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600">{template.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import Agents Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Import & Generate Agents</h2>
                  <button
                    onClick={() => {
                      setShowImportModal(false)
                      setAgentSuggestions([])
                      setImportContent('')
                      setImportFile(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {agentSuggestions.length === 0 ? (
                  <>
                    {/* Input Method Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Choose Input Method:
                      </label>
                      <div className="flex gap-4">
                        <button
                          onClick={() => setImportMethod('text')}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            importMethod === 'text'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Paste Text
                        </button>
                        <button
                          onClick={() => setImportMethod('file')}
                          className={`px-4 py-2 rounded-md transition-colors ${
                            importMethod === 'file'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload File
                        </button>
                      </div>
                    </div>

                    {/* Input Area */}
                    {importMethod === 'text' && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Paste your project description, requirements, or documentation:
                        </label>
                        <textarea
                          value={importContent}
                          onChange={(e) => setImportContent(e.target.value)}
                          placeholder="Example: We need to build an e-commerce platform with user authentication, product catalog, shopping cart, payment processing..."
                          rows={10}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}

                    {importMethod === 'file' && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Upload a file (txt, md, json):
                        </label>
                        <input
                          type="file"
                          accept=".txt,.md,.json"
                          onChange={(e) => setImportFile(e.target.files[0])}
                          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                        />
                        {importFile && (
                          <p className="text-sm text-gray-500 mt-2">
                            Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Agent Suggestions Preview */}
                    {agentSuggestions && agentSuggestions.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          AI Suggested {agentSuggestions.length} Agents
                        </h3>
                        <div className="space-y-4">
                          {agentSuggestions.map((agent, index) => (
                            <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={agent.name}
                                    onChange={(e) => updateSuggestion(index, 'name', e.target.value)}
                                    className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none w-full mb-2"
                                  />
                                  <textarea
                                    value={agent.description}
                                    onChange={(e) => updateSuggestion(index, 'description', e.target.value)}
                                    className="text-sm text-gray-600 bg-transparent border border-gray-300 rounded p-2 focus:border-blue-500 focus:outline-none w-full resize-none"
                                    rows={2}
                                  />
                                </div>
                                <button
                                  onClick={() => removeSuggestion(index)}
                                  className="ml-4 text-red-600 hover:text-red-700"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-gray-700">System Prompt:</label>
                                <textarea
                                  value={agent.systemPrompt}
                                  onChange={(e) => updateSuggestion(index, 'systemPrompt', e.target.value)}
                                  className="mt-1 text-xs text-gray-700 bg-white border border-gray-300 rounded p-2 focus:border-blue-500 focus:outline-none w-full"
                                  rows={4}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    {isAnalyzing && (
                      <span className="text-sm text-blue-600">
                        <svg className="animate-spin h-4 w-4 inline mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing with AI...
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {agentSuggestions.length === 0 ? (
                      <>
                        <button
                          onClick={() => {
                            setShowImportModal(false)
                            setImportContent('')
                            setImportFile(null)
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={analyzeContent}
                          disabled={isAnalyzing || (!importContent && !importFile)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Analyze & Generate
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setAgentSuggestions([])
                            setImportContent('')
                            setImportFile(null)
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Start Over
                        </button>
                        <button
                          onClick={createBulkAgents}
                          disabled={loading || agentSuggestions.length === 0}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          Create {agentSuggestions.length} Agents
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tech Stack Modal */}
        {showTechStackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Tech Stack Configuration</h2>
                  <button
                    onClick={() => setShowTechStackModal(false)}
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
                    <svg className="animate-spin h-8 w-8 mx-auto text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Loading tech stack data...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Common Stacks */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start - Common Stacks</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </div>

                    {/* Search and Add */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Add Technologies</h3>
                      <div className="space-y-4">
                        {/* Search Input */}
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

                        {/* Search Results */}
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
                                  const isSelected = selectedTechnologies.includes(tech)
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
                                  )
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
                        <div className="text-center py-8 text-gray-500">
                          <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <p>No technologies selected</p>
                          <p className="text-sm">Choose from common stacks or search for technologies</p>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {selectedTechnologies.map(tech => (
                            <span
                              key={tech}
                              className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                            >
                              {tech}
                              <button
                                onClick={() => removeTechnology(tech)}
                                className="text-blue-600 hover:text-blue-800 ml-1"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {selectedTechnologies.length > 0 ? (
                      <span>{selectedTechnologies.length} technologies selected</span>
                    ) : (
                      <span>No technologies selected</span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowTechStackModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveGlobalTechStack}
                      disabled={techStackLoading}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {techStackLoading ? 'Saving...' : 'Save Tech Stack'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Template View Modal */}
        {viewingTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Template: {viewingTemplate.name}</h2>
                  <button
                    onClick={() => setViewingTemplate(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                    {viewingTemplate.category}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Template Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700">{viewingTemplate.description}</p>
                  </div>

                  {/* System Prompt */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">System Prompt</h3>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans overflow-x-auto">
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
                    Close
                  </button>
                  <button
                    onClick={async () => {
                      await useTemplate(viewingTemplate)
                      setViewingTemplate(null)
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Agent
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
};

export default App;
