const API_BASE_URL = 'http://localhost:5000';

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  console.log('DEBUG: Token retrieved from localStorage:', token);
  const config = {
    headers: {
      ...(options.body && { 'Content-Type': 'application/json' }),
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    ...options,
  };

  console.log('DEBUG: apiRequest - making request to:', url, 'with token present:', !!token);
  console.log('DEBUG: apiRequest - headers:', config.headers);
  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Authentication functions
export const login = async (username, password) => {
  return apiRequest('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
};

export const register = async (username, email, password) => {
  return apiRequest('/api/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
};

// Progress tracking functions
export const getUserProgress = async (userId) => {
  return apiRequest(`/api/progress?user_id=${userId}`);
};

export const saveQuizResult = async (userId, quizId, topic, score, totalQuestions, documentsUsed) => {
  return apiRequest('/api/progress/quiz-result', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      quiz_id: quizId,
      topic,
      score,
      total_questions: totalQuestions,
      documents_used: documentsUsed
    }),
  });
};

// Topic management functions
export const getUserTopics = async () => {
  return apiRequest('/api/topics');
};

export const createTopic = async (topicName, description = '') => {
  return apiRequest('/api/topics', {
    method: 'POST',
    body: JSON.stringify({
      name: topicName,
      description
    }),
  });
};

export const addDocumentToTopic = async (topicName, filename) => {
  return apiRequest(`/api/topics/${topicName}/documents`, {
    method: 'POST',
    body: JSON.stringify({
      filename
    }),
  });
};

export const getTopicDocuments = async (topicName) => {
  return apiRequest(`/api/topics/${topicName}/documents`);
};

export const categorizeDocument = async (filename) => {
  return apiRequest('/api/categorize-document', {
    method: 'POST',
    body: JSON.stringify({
      filename
    }),
  });
};

export const autoCategorizeDocuments = async () => {
  return apiRequest('/api/auto-categorize', {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

// Existing quiz functions
export const generateQuiz = async (userId, selectedDocuments = [], numQuestions = 5) => {
  return apiRequest('/api/generate-quiz', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      selected_documents: selectedDocuments,
      num_questions: numQuestions
    }),
  });
};

export const getStoredQuizzes = async (userId, topic = null) => {
  const url = topic ? `/api/stored-quizzes?user_id=${userId}&topic=${topic}` : `/api/stored-quizzes?user_id=${userId}`;
  return apiRequest(url);
};

export const getQuizAttempts = async (userId, limit = 10) => {
  return apiRequest(`/api/quiz-attempts?user_id=${userId}&limit=${limit}`);
};

export const getQuizById = async (quizId) => {
  return apiRequest(`/api/quiz/${quizId}`);
};

export const retakeQuiz = async (quizId, userId, numQuestions = 5) => {
  return apiRequest(`/api/retake-quiz/${quizId}`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      num_questions: numQuestions
    }),
  });
};

// Document management functions
export const getDocuments = async (userId = 'default_user') => {
  return apiRequest(`/api/documents?user_id=${userId}`);
};

export const deleteDocument = async (filename) => {
  return apiRequest(`/api/documents/${filename}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
};

// Upload functions
export const uploadDocument = async (file, userId = 'default_user', folderId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('user_id', userId);
  if (folderId) {
    formData.append('folder_id', folderId);
  }

  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

// Folder functions
export const getFolders = async () => {
  return apiRequest('/api/folders');
};

export const createFolder = async (name, description = '') => {
  return apiRequest('/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
};

export const updateFolder = async (folderId, name, description) => {
  return apiRequest(`/api/folders/${folderId}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description }),
  });
};

export const deleteFolder = async (folderId) => {
  return apiRequest(`/api/folders/${folderId}`, {
    method: 'DELETE',
  });
};

export const getFolderDocuments = async (folderId) => {
  return apiRequest(`/api/folders/${folderId}/documents`);
};

// Chat functions
export const askQuestion = async (query, userId, selectedDocuments = [], chatHistory = []) => {
  return apiRequest('/api/ask', {
    method: 'POST',
    body: JSON.stringify({
      query,
      user_id: userId,
      selected_documents: selectedDocuments,
      chat_history: chatHistory
    }),
  });
};

// Summary functions
export const getSummaries = async (userId = 'default_user') => {
  return apiRequest(`/api/summaries?user_id=${userId}`);
};

export const generateDetailedSummary = async (userId, filename) => {
  return apiRequest('/api/generate-summary', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      filename
    }),
  });
};

export const getLearningAnalytics = async (userId) => {
  return apiRequest(`/api/progress/analytics?user_id=${userId}`);
};

// Chat functions
export const getUserChats = async () => {
  return apiRequest('/api/chats');
};

export const saveUserChat = async (chatId, title, messages, selectedDocuments) => {
  return apiRequest('/api/chats', {
    method: 'POST',
    body: JSON.stringify({
      chat_id: chatId,
      title,
      messages,
      selected_documents: selectedDocuments
    }),
  });
};

export const getChatById = async (chatId) => {
  return apiRequest(`/api/chats/${chatId}`);
};

export const deleteChat = async (chatId) => {
  return apiRequest(`/api/chats/${chatId}`, {
    method: 'DELETE',
  });
};
