import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressDashboard from '../components/ProgressDashboard';
import ChatInterface from '../components/ChatInterface';
import DocumentCard from '../components/DocumentCard';
import Modal from '../components/Modal';
import { getDocuments, getSummaries, getStoredQuizzes, generateQuiz, getLearningAnalytics, generateDetailedSummary, getQuizAttempts } from '../services/api';
import DocumentSelector from '../components/DocumentSelector';

const Dashboard = () => {
  const { userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [documents, setDocuments] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [storedQuizzes, setStoredQuizzes] = useState([]);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [quizHistory, setQuizHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [summariesLoaded, setSummariesLoaded] = useState(false);
  const [quizzesLoaded, setQuizzesLoaded] = useState(false);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [detailedSummaries, setDetailedSummaries] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });

  useEffect(() => {
    if (activeTab === 'documents' && !documentsLoaded) {
      loadDocuments();
    } else if (activeTab === 'summaries' && !summariesLoaded) {
      loadSummaries();
    } else if (activeTab === 'quiz' && !quizzesLoaded) {
      loadStoredQuizzes();
      loadQuizHistory();
    }
  }, [activeTab, documentsLoaded, summariesLoaded, quizzesLoaded]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const userId = userData?.id || 'default_user';
      const docs = await getDocuments(userId);
      setDocuments(docs || {});
      setDocumentsLoaded(true);
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocuments({});
      setDocumentsLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const loadSummaries = async () => {
    try {
      setLoading(true);
      const sums = await getSummaries();
      setSummaries(sums);
    } catch (error) {
      console.error('Error loading summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoredQuizzes = async () => {
    try {
      setLoading(true);
      const userId = userData?.id || 'default_user';
      const quizzes = await getStoredQuizzes(userId);
      setStoredQuizzes(Array.isArray(quizzes) ? quizzes : []);
      setQuizzesLoaded(true);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      setStoredQuizzes([]);
      setQuizzesLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const loadQuizHistory = async () => {
    try {
      const userId = userData?.id || 'default_user';
      const attempts = await getQuizAttempts(userId);
      setQuizHistory(Array.isArray(attempts) ? attempts : []);
    } catch (error) {
      console.error('Error loading quiz history:', error);
      setQuizHistory([]);
    }
  };

  const handleStartQuiz = async (documents = null, numQuestions = 10) => {
    try {
      const userId = userData?.id || 'default_user';
      const quiz = await generateQuiz(userId, documents, numQuestions);
      setCurrentQuiz(quiz);
      setShowDocumentSelector(false);
      // Refresh quiz history after starting a new quiz
      if (quiz && !quiz.error) {
        loadQuizHistory();
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
    }
  };

  const handleDocumentSelection = (selectedDocs) => {
    setSelectedDocuments(selectedDocs);
  };

  const handleGenerateQuizFromSelection = () => {
    if (selectedDocuments.length > 0) {
      handleStartQuiz(selectedDocuments, 10);
      setShowDocumentSelector(false);
    } else {
      handleStartQuiz(null, 10); // Generate from all documents
      setShowDocumentSelector(false);
    }
  };

  const handleViewDetailedSummary = async (filename) => {
    if (detailedSummaries[filename]) {
      // Toggle visibility
      setDetailedSummaries(prev => ({
        ...prev,
        [filename]: null
      }));
      return;
    }

    setLoadingSummaries(prev => ({ ...prev, [filename]: true }));
    try {
      const userId = userData?.id || 'default_user';
      const summary = await generateDetailedSummary(userId, filename);
      setDetailedSummaries(prev => ({
        ...prev,
        [filename]: summary
      }));
    } catch (error) {
      console.error('Error generating detailed summary:', error);
      setDetailedSummaries(prev => ({
        ...prev,
        [filename]: 'Error generating detailed summary'
      }));
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [filename]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-light mb-4">Dashboard</h1>
          <p className="text-lg text-lighter mb-6">Your personalized learning hub</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800 rounded-lg p-1 flex space-x-1">
            {[
              { id: 'dashboard', label: '📊 Dashboard', icon: ' ' },
              { id: 'chat', label: '💬 Chat', icon: ' ' },
              { id: 'documents', label: '📄 Documents', icon: ' ' },
              { id: 'quiz', label: '🧠 Quiz', icon: ' ' },
              // { id: 'summaries', label: '📝 Summaries', icon: ' ' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-accent text-dark shadow-lg'
                    : 'text-light hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden md:inline">{tab.label.split(' ')[1]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-light rounded-2xl shadow-xl p-6 min-h-[600px]">
          {activeTab === 'dashboard' && (
            <ProgressDashboard userId={userData?.id || 'default_user'} />
          )}

          {activeTab === 'chat' && (
            <div>
              <h2 className="text-2xl font-bold text-dark mb-6">AI-Powered Chat</h2>
              <div className="h-[800px]">
                <ChatInterface />
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-dark">Your Documents</h2>
                <Link
                  to="/upload"
                  className="bg-accent text-dark px-4 py-2 rounded-lg font-semibold hover:bg-darker hover:text-light transition duration-300"
                >
                  Upload New
                </Link>
              </div>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading documents...</p>
                </div>
              ) : !documents || (documents.uncategorized?.length === 0 && (!documents.topics || Object.keys(documents.topics).length === 0) && (!documents.similarity_groups || documents.similarity_groups.length === 0)) ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No documents yet</h3>
                  <p className="text-gray-500 mb-4">Upload your first document to get started</p>
                  <Link
                    to="/upload"
                    className="bg-accent text-dark px-6 py-3 rounded-lg font-semibold hover:bg-darker hover:text-light transition duration-300"
                  >
                    Upload Document
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Uncategorized Documents */}
                  {documents.uncategorized && documents.uncategorized.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-dark">View your uploaded documents</h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {documents.uncategorized.length} files
                        </span>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.uncategorized.map((doc, index) => {
                          const summary = summaries.find(s => s.filename === doc.filename);
                          return (
                            <DocumentCard
                              key={index}
                              summary={summary || { filename: doc.filename, summary: 'Summary not available' }}
                              onViewDetailedSummary={handleViewDetailedSummary}
                              detailedSummary={detailedSummaries[doc.filename]}
                              loadingDetailed={loadingSummaries[doc.filename]}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Folder-based Documents */}
                  {documents.folders && Object.keys(documents.folders).length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-dark">Documents by Folder</h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {Object.keys(documents.folders).length} folders
                        </span>
                      </div>
                      <div className="space-y-6">
                        {Object.entries(documents.folders).map(([folderName, folderData]) => (
                          <div key={folderName} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-medium text-dark">{folderName}</h4>
                              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {folderData.documents.length} files
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-3">{folderData.description || 'No description'}</p>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {folderData.documents.map((doc, index) => {
                                const summary = summaries.find(s => s.filename === doc.filename);
                                return (
                                  <DocumentCard
                                    key={index}
                                    summary={summary || { filename: doc.filename, summary: 'Summary not available' }}
                                    onViewDetailedSummary={handleViewDetailedSummary}
                                    detailedSummary={detailedSummaries[doc.filename]}
                                    loadingDetailed={loadingSummaries[doc.filename]}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Topic-based Documents */}
                  {documents.topics && Object.keys(documents.topics).length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-dark">Documents by Topic</h3>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {Object.keys(documents.topics).length} topics
                        </span>
                      </div>
                      <div className="space-y-6">
                        {Object.entries(documents.topics).map(([topicName, topicData]) => (
                          <div key={topicName} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-medium text-dark">{topicName}</h4>
                              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {topicData.documents.length} files
                              </span>
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {topicData.documents.map((doc, index) => {
                                const summary = summaries.find(s => s.filename === doc.filename);
                                return (
                                  <DocumentCard
                                    key={index}
                                    summary={summary || { filename: doc.filename, summary: 'Summary not available' }}
                                    onViewDetailedSummary={handleViewDetailedSummary}
                                    detailedSummary={detailedSummaries[doc.filename]}
                                    loadingDetailed={loadingSummaries[doc.filename]}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {activeTab === 'quiz' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-dark">Practice Quizzes</h2>
                {/* <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDocumentSelector(true)}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition duration-300"
                  >
                    Select Documents
                  </button>
                  <button
                    onClick={() => handleStartQuiz()}
                    className="bg-accent text-dark px-4 py-2 rounded-lg font-semibold hover:bg-darker hover:text-light transition duration-300"
                  >
                    Start New Quiz
                  </button>
                </div> */}
              </div>

              {currentQuiz ? (
                <div className="bg-white rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4">Current Quiz</h3>
                  <p className="text-gray-600 mb-4">Topic: {currentQuiz.topic || 'General'}</p>
                  <p className="text-gray-600 mb-4">Questions: {currentQuiz.total_questions || currentQuiz.quiz?.length || 0}</p>
                  <Link
                    to="/quiz"
                    className="bg-accent text-dark px-4 py-2 rounded-lg font-semibold hover:bg-darker hover:text-light transition duration-300"
                  >
                    Continue Quiz
                  </Link>
                </div>
              ) : showDocumentSelector ? (
                <Modal isOpen={showDocumentSelector} onClose={() => setShowDocumentSelector(false)} title="Select Documents for Quiz">
                  <DocumentSelector
                    selectedDocuments={selectedDocuments}
                    onSelectionChange={handleDocumentSelection}
                  />
                  <div className="mt-6 flex justify-center space-x-4">
                    <button
                      onClick={handleGenerateQuizFromSelection}
                      disabled={selectedDocuments.length === 0}
                      className="bg-accent text-dark px-6 py-3 rounded-lg hover:bg-darker hover:text-light transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Generate Quiz ({selectedDocuments.length} documents selected)
                    </button>
                    <button
                      onClick={() => handleStartQuiz(null, 10)}
                      className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                      Use All Documents
                    </button>
                  </div>
                </Modal>
              ) : (
                <div>
                  {/* Quiz History Section */}
                  {quizHistory.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-xl font-semibold text-dark mb-4">Recent Quiz Activities</h3>
                      <div className="space-y-3">
                        {quizHistory.slice(0, 5).map((quiz, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-semibold text-dark">{quiz.topic}</h4>
                                <p className="text-sm text-gray-600">
                                  Score: {quiz.score}/{quiz.total_questions} ({quiz.percentage}%) •
                                  {new Date(quiz.completed_at).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Documents: {quiz.documents_used?.join(', ') || 'All documents'}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-medium px-2 py-1 rounded ${
                                  quiz.percentage >= 80 ? 'bg-green-100 text-green-800' :
                                  quiz.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {quiz.percentage >= 80 ? 'Excellent' :
                                   quiz.percentage >= 60 ? 'Good' : 'Needs Improvement'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stored Quizzes Section */}
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-dark mb-4">Available Quizzes</h3>
                    {storedQuizzes.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-6xl mb-4">🧠</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No saved quizzes available</h3>
                        <p className="text-gray-500 mb-4">Generate your first quiz to start learning</p>
                        <button
                          onClick={() => handleStartQuiz()}
                          className="bg-accent text-dark px-6 py-3 rounded-lg font-semibold hover:bg-darker hover:text-light transition duration-300"
                        >
                          Generate Quiz
                        </button>
                      </div>
                    ) : (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {storedQuizzes.map((quiz, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                            <h4 className="font-semibold text-dark mb-2">{quiz.topic}</h4>
                            <p className="text-sm text-gray-600 mb-2">{quiz.num_questions} questions</p>
                            <p className="text-sm text-gray-500 mb-4">Created: {new Date(quiz.created_at).toLocaleDateString()}</p>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleStartQuiz(quiz.documents, quiz.num_questions)}
                                className="bg-accent text-dark px-3 py-1 rounded text-sm font-medium hover:bg-darker hover:text-light transition duration-300"
                              >
                                Start Quiz
                              </button>
                              <Link
                                to={`/quiz?retake=${quiz.id}`}
                                className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-600 transition duration-300"
                              >
                                Retake
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Generate New Quiz Section */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-dark mb-4">Generate New Quiz</h3>
                    <p className="text-gray-600 mb-4">Create a custom quiz based on your preferences</p>
                    <div className="flex flex-wrap gap-4">
                      {/* <button
                        onClick={() => handleStartQuiz()}
                        className="bg-accent text-dark px-4 py-2 rounded-lg font-semibold hover:bg-darker hover:text-light transition duration-300"
                      >
                        Start New Quiz (All Documents)
                      </button> */}
                      <button
                        onClick={() => setShowDocumentSelector(true)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition duration-300"
                      >
                        Select Specific Documents
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'summaries' && (
            <div>
              <h2 className="text-2xl font-bold text-dark mb-6">Document Summaries</h2>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading summaries...</p>
                </div>
              ) : summaries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No summaries available</h3>
                  <p className="text-gray-500">Upload documents to generate AI-powered summaries</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {summaries.map((summary, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border">
                      <h4 className="font-semibold text-dark mb-2">{summary.filename}</h4>
                      <p className="text-gray-700">{summary.summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;