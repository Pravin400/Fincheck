import React, { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../services/api';

const AiChatPanel = ({ currentSession, fishResults, diseaseResults, isAnalyzing, hasAnalysisResults }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSharedContext, setHasSharedContext] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when session changes
  useEffect(() => {
    if (currentSession?.id) {
      loadChatHistory();
      setHasSharedContext(false);
    } else {
      setMessages([]);
      setHasSharedContext(false);
    }
  }, [currentSession?.id]);

  // Share detection context when results arrive
  useEffect(() => {
    if ((fishResults || diseaseResults) && !hasSharedContext && currentSession?.id) {
      setHasSharedContext(true);
    }
  }, [fishResults, diseaseResults]);

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getHistory(currentSession.id);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || isLoading || isAnalyzing || !currentSession?.id || !hasAnalysisResults) return;

    setError('');
    setInputMessage('');

    // Add user message to UI immediately
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: trimmedMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build detection context if available
      let detectionContext = null;
      if (fishResults || diseaseResults) {
        detectionContext = {};
        if (fishResults) detectionContext.fishResults = fishResults;
        if (diseaseResults) detectionContext.diseaseResults = diseaseResults;
      }

      const response = await chatAPI.sendMessage({
        sessionId: currentSession.id,
        message: trimmedMessage,
        detectionContext
      });

      // Add AI response
      const aiMessage = response.data.message;
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        ...aiMessage
      }]);

    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Failed to get response. Please try again.';
      setError(errorMsg);
      // Remove the temp user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setInputMessage(trimmedMessage); // restore the message
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simple markdown-like formatting for AI messages
  const formatContent = (content) => {
    if (!content) return '';

    // Process the content line by line for better formatting
    const lines = content.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith('### ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h4 class="font-bold text-gray-900 mt-3 mb-1 text-sm">${trimmed.slice(4)}</h4>`;
      } else if (trimmed.startsWith('## ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3 class="font-bold text-gray-900 mt-3 mb-1">${trimmed.slice(3)}</h3>`;
      } else if (trimmed.startsWith('# ')) {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<h3 class="font-bold text-gray-900 mt-3 mb-1">${trimmed.slice(2)}</h3>`;
      }
      // Bullet points
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        if (!inList) { html += '<ul class="list-disc ml-4 space-y-1">'; inList = true; }
        html += `<li class="text-sm">${formatInline(trimmed.slice(2))}</li>`;
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(trimmed)) {
        if (!inList) { html += '<ol class="list-decimal ml-4 space-y-1">'; inList = true; }
        html += `<li class="text-sm">${formatInline(trimmed.replace(/^\d+\.\s/, ''))}</li>`;
      }
      // Empty line
      else if (trimmed === '') {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<br/>';
      }
      // Regular text
      else {
        if (inList) { html += '</ul>'; inList = false; }
        html += `<p class="text-sm mb-1">${formatInline(trimmed)}</p>`;
      }
    }

    if (inList) html += '</ul>';
    return html;
  };

  // Format inline markdown (bold, italic, code)
  const formatInline = (text) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1 rounded text-xs">$1</code>');
  };

  if (!currentSession) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mt-6 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-xl">🐠</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">FishCare AI Chat</h3>
            <p className="text-emerald-100 text-xs">Ask me about fish diseases, species, treatment & care</p>
          </div>
        </div>
        <div className="p-8 text-center bg-gray-50">
          <p className="text-gray-500 text-sm">
            👆 Create a <strong>New Session</strong> from the sidebar to start chatting with FishCare AI
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mt-6 overflow-hidden flex flex-col" style={{ height: '500px' }}>
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center space-x-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-xl">🐠</span>
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-lg">FishCare AI Chat</h3>
          <p className="text-emerald-100 text-xs">
            Ask me about fish diseases, species, treatment & care
          </p>
        </div>
        {hasSharedContext && (
          <div className="bg-white/20 px-3 py-1 rounded-full">
            <span className="text-white text-xs font-medium">📋 Analysis shared</span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {/* Welcome message if no messages */}
        {messages.length === 0 && !isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">🐠</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm max-w-[80%] border border-gray-100">
              <p className="text-sm text-gray-700 font-medium mb-2">Hello! I'm FishCare AI 🐟</p>
              <p className="text-sm text-gray-600 mb-2">
                I'm here to help you with everything fish-related:
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4 list-disc">
                <li>Disease diagnosis & treatment advice</li>
                <li>Fish species information</li>
                <li>Water quality & tank care</li>
                <li>Feeding & nutrition tips</li>
              </ul>
              {(fishResults || diseaseResults) ? (
                <p className="text-sm text-emerald-600 font-medium mt-3">
                  📋 I can see your analysis results! Ask me anything about the findings.
                </p>
              ) : isAnalyzing ? (
                <p className="text-sm text-blue-600 font-medium mt-3 flex items-center">
                  <span className="animate-pulse mr-2">⏳</span> Analyzing your image... I'll be ready to chat in a moment.
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-3">
                  Upload a fish image and run analysis above, then ask me follow-up questions!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg) => (
          <div
            key={msg.id || msg.created_at}
            className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                : 'bg-gradient-to-br from-emerald-500 to-teal-500'
            }`}>
              <span className="text-sm">{msg.role === 'user' ? '👤' : '🐠'}</span>
            </div>

            {/* Message bubble */}
            <div className={`max-w-[80%] ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm'
                : 'bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <div
                  className="text-gray-700 chat-ai-content"
                  dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                />
              )}
              <p className={`text-xs mt-1 ${
                msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'
              }`}>
                {formatTime(msg.created_at)}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm">🐠</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mx-4 p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isAnalyzing ? "Wait for analysis to finish..." :
                !hasAnalysisResults ? "Run analysis first to start chatting" :
                "Ask about fish diseases, treatment, species..."
              }
              rows={1}
              className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all border border-transparent focus:border-emerald-300 disabled:opacity-60 disabled:bg-gray-200"
              style={{ maxHeight: '120px' }}
              disabled={isLoading || isAnalyzing || !hasAnalysisResults}
            />
          </div>
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || isAnalyzing || !hasAnalysisResults}
            className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-1 text-center">
          FishCare AI only answers fish-related questions • Press Enter to send
        </p>
      </div>
    </div>
  );
};

export default AiChatPanel;
