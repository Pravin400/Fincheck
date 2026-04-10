import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sessionAPI } from '../services/api';
import SessionHistory from '../components/SessionHistory';
import UnifiedDetection from '../components/UnifiedDetection';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // On mount: load all sessions, auto-select the most recent one (or leave blank)
  useEffect(() => {
    if (user) {
      initializeSession();
    }
  }, [user]);

  const initializeSession = async () => {
    try {
      const response = await sessionAPI.getSessions();
      const existingSessions = response.data.sessions || [];
      setSessions(existingSessions);

      if (existingSessions.length > 0) {
        // Auto-restore the most recent session cleanly
        setCurrentSession(existingSessions[0]);
      } else {
        // First-time user / no sessions: wait for them to start an analysis
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSessionClick = async () => {
    // If they explicitly click "New Analysis" in the sidebar, visually give them a session right away
    await handleCreateSession();
  };

  const handleCreateSession = async () => {
    try {
      const response = await sessionAPI.createSession({
        title: `Analysis Session ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`,
        type: 'fish_detection'
      });
      const newSession = response.data.session;
      setCurrentSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      return newSession;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  };

  const handleSelectSession = (session) => {
    setCurrentSession(session);
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await sessionAPI.deleteSession(sessionId);
      const remaining = sessions.filter(s => s.id !== sessionId);
      setSessions(remaining);
      if (currentSession?.id === sessionId) {
        if (remaining.length > 0) {
          setCurrentSession(remaining[0]);
        } else {
          setCurrentSession(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Session History */}
      <SessionHistory
        sessions={sessions}
        currentSession={currentSession}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewSession={handleNewSessionClick}
        loading={loading}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 md:space-x-4 ml-10 md:ml-0">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg md:text-xl"><img src="fevicon2.jpg" alt="" className='h-10 w-20'/></span>
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold text-gray-900">FishCare AI</h1>
                <p className="text-xs md:text-sm text-gray-500 hidden sm:block">AI-Powered Fish Analysis & Disease Detection</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              {currentSession && (
                <div className="hidden lg:block text-right">
                  <p className="text-xs text-gray-400">Current session</p>
                  <p className="text-sm font-medium text-gray-700 truncate max-w-xs">{currentSession.title}</p>
                </div>
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">{user?.user_metadata?.full_name || 'User'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 md:px-4 md:py-2 text-gray-700 hover:text-red-600 font-medium transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Detection Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <UnifiedDetection 
            currentSession={currentSession} 
            onNewSessionClick={handleNewSessionClick} 
            onCreateSession={handleCreateSession} 
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

