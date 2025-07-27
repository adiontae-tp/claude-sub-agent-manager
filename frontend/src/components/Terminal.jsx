const Terminal = ({ 
  terminalStatus, 
  terminalUrl, 
  terminalError,
  terminalLoading,
  onStart,
  onCopyCommand,
  selectedAgentsCount,
  className = ""
}) => {
  if (terminalStatus === 'running') {
    return (
      <div className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col ${className}`}>
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
          {selectedAgentsCount > 0 && onCopyCommand && (
            <button
              onClick={onCopyCommand}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              title="Copy sequential command for selected agents"
            >
              Copy Sequential Command
            </button>
          )}
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
      </div>
    );
  }

  // Terminal Not Running State
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden flex flex-col ${className}`}>
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Terminal</h3>
          <p className="text-gray-600 text-sm mb-4">Terminal is not running</p>
          <button
            onClick={onStart}
            disabled={terminalLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
          >
            {terminalLoading ? 'Starting...' : 'Start Terminal'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Terminal;