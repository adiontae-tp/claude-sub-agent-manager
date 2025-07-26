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
  const [viewMode, setViewMode] = useState('list') // 'list' or 'dashboard'
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importMethod, setImportMethod] = useState('text') // 'text' or 'file'
  const [importContent, setImportContent] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [agentSuggestions, setAgentSuggestions] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [agentStatuses, setAgentStatuses] = useState({})

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
      setExistingAgents(data.agents || [])
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
    if (!projectDir || existingAgents.length === 0) return

    const statuses = {}
    for (const agent of existingAgents) {
      try {
        const response = await fetch(`http://localhost:3001/api/agent-status/${encodeURIComponent(projectDir)}/${agent.name}`)
        const data = await response.json()
        if (data.exists) {
          statuses[agent.name] = data
        }
      } catch (error) {
        console.error(`Failed to load status for ${agent.name}:`, error)
      }
    }
    setAgentStatuses(statuses)
  }

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

      // Refresh the agent list
      await loadExistingAgents()
    } catch (error) {
      console.error('Error deleting agent:', error)
      setMessage({ type: 'error', text: `Failed to delete agent: ${error.message}` })
    }
  }

  // Generate batch start command
  const generateBatchStartCommand = () => {
    if (selectedAgentsForStart.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one agent to start' })
      return
    }

    const agentCommands = Array.from(selectedAgentsForStart).map(agentName => {
      const agent = existingAgents.find(a => a.name === agentName)
      return `Use the ${agentName} sub agent to ${agent?.description.toLowerCase() || 'complete its assigned tasks'}`
    })

    // Add explicit instructions about status file updates
    const instructions = `IMPORTANT: Each sub-agent MUST update their status file at ${projectDir}/.claude/agents-status/[agent-name]-status.md regularly with:
- Current plan and approach
- Todo list with completed items marked as [x]
- Progress updates with timestamps
- Status: active, completed, or blocked

Now starting the following sub-agents:

${agentCommands.join('\n\n')}`

    navigator.clipboard.writeText(instructions)
    setMessage({ 
      type: 'success', 
      text: `Copied commands for ${selectedAgentsForStart.size} agent${selectedAgentsForStart.size > 1 ? 's' : ''} to clipboard with status update instructions!` 
    })
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
    setAgentSuggestions(agentSuggestions.filter((_, i) => i !== index))
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

  return (
    <div className="min-h-screen bg-gray-100">
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Claude Sub-Agent Manager</h1>
          
          {/* Auto-detected Directory Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-sm text-blue-900">
                Managing agents in: <span className="font-mono bg-blue-100 px-2 py-0.5 rounded">./.claude/agents/</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Content - Agents and Status */}
        {/* Existing Agents */}
        <div>
          {/* View Toggle and Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Agent List
              </button>
              <button
                onClick={() => setViewMode('dashboard')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  viewMode === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Dashboard
              </button>
            </div>
            <div className="flex items-center gap-2">
              {selectedAgentsForStart.size > 0 && viewMode === 'list' && (
                <button
                  onClick={generateBatchStartCommand}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Start {selectedAgentsForStart.size} Selected
                </button>
              )}
              <button
                onClick={() => setShowCreateForm(true)}
                disabled={!projectDir}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Create New Agent
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                disabled={!projectDir}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Import Agents
              </button>
              <button
                onClick={() => {
                  loadExistingAgents()
                  loadAllAgentStatuses()
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Refresh
              </button>
              {Object.values(agentStatuses).some(s => s.status !== 'completed') && (
                <span className="text-sm text-green-600">
                  ⟳ Auto-refreshing every 10s
                </span>
              )}
            </div>
          </div>
          
          {/* List View */}
          {viewMode === 'list' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h2 className="text-xl font-semibold mb-4">Your Agents</h2>
                <div className="bg-white rounded-lg shadow-md p-6">
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
                          key={agent.filename}
                          className={`p-4 rounded-lg transition-colors ${
                            selectedAgent?.name === agent.name
                              ? 'bg-blue-50 border-2 border-blue-500'
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedAgentsForStart.has(agent.name)}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleAgentSelection(agent.name)
                              }}
                              className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
                            />
                            <div className="flex-1">
                              <div 
                                className="cursor-pointer"
                                onClick={() => loadAgentStatus(agent)}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                                  {agentStatuses[agent.name] && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      agentStatuses[agent.name].status === 'active' ? 'bg-green-100 text-green-800' :
                                      agentStatuses[agent.name].status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {agentStatuses[agent.name].status}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{agent.description}</p>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteAgent(agent)
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  Delete
                                </button>
                                
                                {/* Completed Tasks Summary */}
                                {agentStatuses[agent.name]?.todos && agentStatuses[agent.name].todos.length > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleAgentExpanded(agent.name)
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                  >
                                    <svg 
                                      className={`w-3 h-3 transition-transform ${expandedAgents.has(agent.name) ? 'rotate-90' : ''}`} 
                                      fill="currentColor" 
                                      viewBox="0 0 20 20"
                                    >
                                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {(() => {
                                      const completed = agentStatuses[agent.name].todos.filter(t => t.completed).length
                                      const total = agentStatuses[agent.name].todos.length
                                      return `${completed}/${total} tasks completed`
                                    })()}
                                  </button>
                                )}
                              </div>
                              
                              {expandedAgents.has(agent.name) && (
                                <div className="mt-2 ml-4 text-xs space-y-1">
                                  {agentStatuses[agent.name].todos
                                    .filter(todo => todo.completed)
                                    .map((todo, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <svg className="w-3 h-3 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-gray-600 line-through">{todo.text}</span>
                                      </div>
                                    ))}
                                  {agentStatuses[agent.name].todos
                                    .filter(todo => !todo.completed)
                                    .map((todo, index) => (
                                      <div key={index} className="flex items-start gap-2">
                                        <div className="w-3 h-3 border border-gray-400 rounded-sm mt-0.5"></div>
                                        <span className="text-gray-700">{todo.text}</span>
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-6">All Tasks Overview</h2>
              
              {existingAgents.length === 0 ? (
                <div className="text-center py-16">
                  <svg className="w-24 h-24 mx-auto text-gray-300 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tasks Yet</h3>
                  <p className="text-gray-500 mb-6">Create agents to start tracking tasks and progress</p>
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
                    // Collect all tasks from all agents
                    const allTasks = []
                    existingAgents.forEach(agent => {
                      const status = agentStatuses[agent.name]
                      if (status?.todos) {
                        status.todos.forEach(todo => {
                          allTasks.push({
                            ...todo,
                            agentName: agent.name,
                            agentStatus: status.status
                          })
                        })
                      }
                    })

                    const completedTasks = allTasks.filter(t => t.completed)
                    const pendingTasks = allTasks.filter(t => !t.completed)
                    const totalTasks = allTasks.length
                    const progressPercent = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0

                    return (
                      <>
                        {/* Overall Progress */}
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
                            <span className="text-sm text-gray-600">
                              {completedTasks.length} of {totalTasks} tasks completed
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4">
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
                          
                          {/* Compact Agent Status Summary */}
                          <div className="mt-3 flex items-center gap-4">
                            <span className="text-sm text-gray-600">Agents:</span>
                            <div className="flex flex-wrap gap-2">
                              {existingAgents.map(agent => {
                                const status = agentStatuses[agent.name]
                                if (!status) return null
                                
                                return (
                                  <span 
                                    key={agent.name}
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      status.status === 'active' ? 'bg-green-100 text-green-800' :
                                      status.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                      status.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {agent.name}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Pending Tasks */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              Pending Tasks ({pendingTasks.length})
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {pendingTasks.length === 0 ? (
                                <p className="text-gray-500 text-sm">No pending tasks</p>
                              ) : (
                                pendingTasks.map((task, index) => (
                                  <div 
                                    key={`pending-${index}`} 
                                    className="bg-gray-50 rounded-lg p-3 flex items-start gap-3"
                                  >
                                    <div className="w-4 h-4 border-2 border-gray-400 rounded mt-0.5 flex-shrink-0"></div>
                                    <div className="flex-1">
                                      <p className="text-sm text-gray-700">{task.text}</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Agent: <span className={`font-medium ${
                                          task.agentStatus === 'active' ? 'text-green-600' : 'text-gray-600'
                                        }`}>{task.agentName}</span>
                                      </p>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Completed Tasks */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Completed Tasks ({completedTasks.length})
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {completedTasks.length === 0 ? (
                                <p className="text-gray-500 text-sm">No completed tasks</p>
                              ) : (
                                completedTasks.map((task, index) => (
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
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Statistics */}
                        <div className="mt-6 pt-4 border-t flex items-center justify-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{existingAgents.length}</span>
                            <span className="text-gray-600">Total Agents</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-green-600">
                              {existingAgents.filter(a => agentStatuses[a.name]?.status === 'active').length}
                            </span>
                            <span className="text-gray-600">Active</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-yellow-600">{pendingTasks.length}</span>
                            <span className="text-gray-600">Pending</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600">{completedTasks.length}</span>
                            <span className="text-gray-600">Completed</span>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </>
              )}
            </div>
          )}
        </div>

        {/* Create Agent Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Create New Agent</h2>
                  <button
                    onClick={() => {
                      setShowCreateForm(false)
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
                <div className="flex gap-4">
                  <button
                    onClick={generateWithClaude}
                    disabled={loading || !agentName || !agentDescription}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Generating...' : 'Generate with Claude'}
                  </button>
                  
                  <button
                    onClick={enhancePrompt}
                    disabled={loading || !systemPrompt}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enhancing...' : 'Enhance Prompt'}
                  </button>
                  
                  <button
                    onClick={createAgent}
                    disabled={loading || !projectDir || !agentName || !agentDescription || !systemPrompt}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating...' : 'Create Sub-Agent'}
                  </button>
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
      </div>
    </div>
  )
}

export default App
