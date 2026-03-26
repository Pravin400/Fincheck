import React from 'react';

const SessionHistory = ({
  sessions,
  currentSession,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  loading
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-72 bg-gray-900 text-white flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-semibold">FishCare AI</p>
        <button
          onClick={onNewSession}
          className="w-full px-4 py-2.5 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg font-medium transition-all flex items-center space-x-2 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Analysis</span>
        </button>
      </div>

      {/* Label */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Session History</p>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
            <p className="mt-2 text-xs">Loading...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No sessions yet</p>
            <p className="text-xs mt-1">Creating a new one...</p>
          </div>
        ) : (
          <div className="px-2 py-1 space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group relative rounded-lg transition-all cursor-pointer ${
                  currentSession?.id === session.id
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-800'
                }`}
              >
                <div
                  onClick={() => onSelectSession(session)}
                  className="p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5 mb-1">
                        {currentSession?.id === session.id && (
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0"></span>
                        )}
                        <p className="text-sm font-medium truncate text-gray-200">
                          {session.title || 'Untitled Session'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(session.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this session and its history?')) {
                          onDeleteSession(session.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/80 rounded transition-all flex-shrink-0"
                      title="Delete session"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center">
          <p>{sessions.length} session{sessions.length !== 1 ? 's' : ''} saved</p>
        </div>
      </div>
    </div>
  );
};

export default SessionHistory;

