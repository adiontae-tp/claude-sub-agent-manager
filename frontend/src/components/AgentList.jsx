import AgentCard from './AgentCard';

const AgentList = ({
  agents,
  selectedAgents,
  expandedAgents,
  onToggleSelect,
  onToggleExpand,
  onEditAgent,
  onDeleteAgent,
  onAddTask,
  onStartAgent,
  onStartSelected,
  onRefresh
}) => {

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Existing Agents</h2>
          <p className="text-gray-600 mt-1">
            {agents.length} agent{agents.length !== 1 ? 's' : ''} configured
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          title="Refresh agent list"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>


      {agents.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-500 mb-4">No agents created yet</p>
          <p className="text-sm text-gray-400">Create your first agent to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map(agent => (
            <AgentCard
              key={agent.name}
              agent={agent}
              isExpanded={expandedAgents.has(agent.name)}
              isSelected={selectedAgents.has(agent.name)}
              onToggleExpand={() => onToggleExpand(agent.name)}
              onToggleSelect={() => onToggleSelect(agent.name)}
              onEdit={() => onEditAgent(agent)}
              onDelete={() => onDeleteAgent(agent)}
              onAddTask={onAddTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentList;