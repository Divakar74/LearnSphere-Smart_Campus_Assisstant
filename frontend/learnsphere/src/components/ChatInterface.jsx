import React, { useState, useEffect, useRef } from 'react';
import { askQuestion, getDocuments, getUserChats, saveUserChat, getChatById, deleteChat } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ChatInterface = () => {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState([]);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [savedChats, setSavedChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const docsResponse = await getDocuments(userData?.id || 'default_user');
        // Flatten all documents from different categories
        const allDocs = [
          ...(docsResponse.uncategorized || []),
          ...Object.values(docsResponse.topics || {}).flatMap(topic => topic.documents || []),
          ...Object.values(docsResponse.folders || {}).flatMap(folder => folder.documents || []),
          ...(docsResponse.similarity_groups || [])
        ].filter((doc, index, self) => self.findIndex(d => d.filename === doc.filename) === index); // Remove duplicates by filename
        setAvailableDocuments(allDocs);
        // Select all documents by default
        setSelectedDocuments(allDocs.map(doc => doc.filename));
      } catch (error) {
        console.error('Error loading documents:', error);
      }
    };

    const loadSavedChats = async () => {
      try {
        const chats = await getUserChats();
        setSavedChats(chats);
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    };

    loadDocuments();
    if (userData) {
      loadSavedChats();
    }
  }, [userData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Prepare chat history for context (exclude current message)
      const chatHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await askQuestion(input, userData?.id || 'default_user', selectedDocuments, chatHistory);
      const aiMessage = {
        role: 'ai',
        content: response.answer,
        sources: response.sources,
        timestamp: new Date()
      };
      const updatedMessages = [...messages, userMessage, aiMessage];
      setMessages(updatedMessages);

      // Auto-save chat after each exchange
      if (userData) {
        setTimeout(() => saveCurrentChat(), 1000); // Save after 1 second
      }
    } catch (error) {
      const errorMessage = {
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      const updatedMessages = [...messages, userMessage, errorMessage];
      setMessages(updatedMessages);
    } finally {
      setLoading(false);
    }
  };

  const toggleDocumentSelection = (filename) => {
    setSelectedDocuments(prev =>
      prev.includes(filename)
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  const createNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setInput('');
  };

  const saveCurrentChat = async () => {
    if (messages.length === 0) return;

    try {
      const chatId = currentChatId || `chat_${Date.now()}`;
      const title = messages[0]?.content?.substring(0, 50) || 'New Chat';

      await saveUserChat(chatId, title, messages, selectedDocuments);

      if (!currentChatId) {
        setCurrentChatId(chatId);
        // Reload chats to include the new one
        const chats = await getUserChats();
        setSavedChats(chats);
      }
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  };

  const loadChat = async (chatId) => {
    try {
      const chat = await getChatById(chatId);
      setCurrentChatId(chatId);
      setMessages(chat.messages || []);
      setSelectedDocuments(chat.selected_documents || []);
    } catch (error) {
      console.error('Error loading chat:', error);
    }
  };

  const deleteSavedChat = async (chatId) => {
    try {
      await deleteChat(chatId);
      setSavedChats(prev => prev.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        createNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const TypingIndicator = () => (
    <div className="flex justify-start mb-4">
      <div className="flex items-start space-x-3 max-w-4xl">
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">AI</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Chat History</h2>
              <button
                onClick={createNewChat}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                title="New Chat"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {savedChats.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <p>No saved chats yet</p>
                <p className="text-sm">Start a conversation to see it here</p>
              </div>
            ) : (
              <div className="p-2">
                {savedChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                      currentChatId === chat.id
                        ? 'bg-blue-100 border border-blue-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => loadChat(chat.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {chat.title}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {chat.message_count} messages • {new Date(chat.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSavedChat(chat.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete Chat"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with Document Selector */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title={showSidebar ? "Hide Sidebar" : "Show Sidebar"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Document Chat</h1>
                  <p className="text-sm text-gray-500">Ask questions about your uploaded documents</p>
                </div>
              </div>
              <button
                onClick={() => setShowDocumentSelector(!showDocumentSelector)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                <span className="text-gray-600">📁</span>
                <span className="text-sm font-medium text-gray-700">
                  {selectedDocuments.length} of {availableDocuments.length} selected
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showDocumentSelector ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Document Selector Panel */}
            {showDocumentSelector && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableDocuments.map((doc) => (
                    <label key={doc.filename} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors duration-200">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.includes(doc.filename)}
                        onChange={() => toggleDocumentSelection(doc.filename)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                        <p className="text-xs text-gray-500 truncate">{doc.summary?.substring(0, 60)}...</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start space-x-3 max-w-4xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-green-500 to-green-600'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  <span className="text-white text-sm font-semibold">
                    {message.role === 'user' ? '👤' : 'AI'}
                  </span>
                </div>

                {/* Message Bubble */}
                <div className={`rounded-2xl px-6 py-4 shadow-sm max-w-3xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}>
                   <p className="m-0 leading-relaxed whitespace-pre-wrap">{message.content}</p>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sources</span>
                      </div>
                      <div className="space-y-2">
                        {message.sources.map((source, idx) => (
                          <div key={idx} className="flex items-center space-x-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                            <span className="font-medium truncate">{source.filename}</span>
                            <span className="text-gray-400">• chunk {source.chunk_index}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                  }`}>
                    {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center space-x-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-200">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Shoot your questions.. clear your doubts.."
                className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 text-sm"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 rounded-full flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
          
        </div>
      </div>
      </div>
    </div>
  );
};

export default ChatInterface;
