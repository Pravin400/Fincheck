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

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await sessionAPI.getSessions();
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSession = async () => {
    try {
      const response = await sessionAPI.createSession({
        title: `New Analysis ${new Date().toLocaleTimeString()}`,
        type: 'fish_detection'
      });
      const newSession = response.data.session;
      setCurrentSession(newSession);
      setSessions([newSession, ...sessions]);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSelectSession = (session) => {
    setCurrentSession(session);
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await sessionAPI.deleteSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
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
        onNewSession={handleNewSession}
        loading={loading}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🐠</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FishCare AI</h1>
                <p className="text-sm text-gray-500">AI-Powered Fish Analysis & Disease Detection</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-500">{user?.user_metadata?.full_name || 'User'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-700 hover:text-red-600 font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Detection Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <UnifiedDetection currentSession={currentSession} onNewSession={handleNewSession} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
