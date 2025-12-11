import React, { useState, useEffect } from 'react';
import QuizInterface from '../components/QuizInterface';
import DocumentSelector from '../components/DocumentSelector';
import Modal from '../components/Modal';
import { generateQuiz, getStoredQuizzes, getQuizAttempts, retakeQuiz } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Quiz() {
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(true);
  const [storedQuizzes, setStoredQuizzes] = useState([]);
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [showPastQuizzes, setShowPastQuizzes] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const { userData } = useAuth();

  const handleGenerateQuiz = async (selectedDocuments = [], numQuestions = 5) => {
    setLoading(true);
    setError(null);

    try {
      const response = await generateQuiz(userData?.id, selectedDocuments, numQuestions);
      if (response.error) {
        setError(response.error);
        setGeneratingQuiz(false);
      } else {
        setQuizData(response);
        setShowDocumentSelector(false);
        setGeneratingQuiz(false);
      }
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
      console.error('Quiz generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelection = (documents) => {
    setSelectedDocuments(documents);
  };

  const handleStartQuiz = () => {
    setGeneratingQuiz(true);
    handleGenerateQuiz(selectedDocuments);
  };

  useEffect(() => {
    loadStoredQuizzes();
    loadQuizAttempts();
  }, [userData]);

  const loadStoredQuizzes = async () => {
    try {
      const quizzes = await getStoredQuizzes(userData?.id);
      setStoredQuizzes(quizzes);
    } catch (err) {
      console.error('Failed to load stored quizzes:', err);
    }
  };

  const loadQuizAttempts = async () => {
    try {
      const attempts = await getQuizAttempts(userData?.id);
      setQuizAttempts(attempts);
    } catch (err) {
      console.error('Failed to load quiz attempts:', err);
    }
  };

  const handleRetakeQuiz = async (quizId) => {
    setLoading(true);
    setError(null);

    try {
      // Get the original quiz data to extract documents used
      const originalQuiz = await getQuizById(quizId);
      if (!originalQuiz) {
        setError('Quiz not found. Please try creating a new quiz.');
        return;
      }

      // Generate a new quiz with the same documents
      const documents = originalQuiz.documents || [];
      const response = await generateQuiz(userData?.id, documents, 5);
      if (response.error) {
        setError(response.error);
      } else {
        setQuizData(response);
        setShowDocumentSelector(false);
        setShowPastQuizzes(false);
      }
    } catch (err) {
      setError('Failed to retake quiz. Please try again.');
      console.error('Quiz retake error:', err);
    } finally {
      setLoading(false);
      setGeneratingQuiz(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-dark min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-light mb-8 text-center">
          Practice Quiz
        </h1>

        {/* Navigation between new quiz and past quizzes */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowPastQuizzes(false)}
            className={`px-4 py-2 rounded-l-lg font-medium transition-colors ${
              !showPastQuizzes
                ? 'bg-accent text-dark'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            New Quiz
          </button>
          <button
            onClick={() => setShowPastQuizzes(true)}
            className={`px-4 py-2 rounded-r-lg font-medium transition-colors ${
              showPastQuizzes
                ? 'bg-accent text-dark'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            Past Quizzes
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
            <span className="ml-3 text-light">Generating quiz...</span>
          </div>
        ) : quizData ? (
          <QuizInterface
            quizData={quizData}
            onRegenerate={handleGenerateQuiz}
          />
        ) : showPastQuizzes ? (
          <div className="bg-light rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-4 text-dark text-center">Past Quizzes</h2>
            {quizAttempts.length === 0 ? (
              <p className="text-darker text-center">No past quiz attempts found.</p>
            ) : (
              <div className="space-y-4">
                {quizAttempts.map((attempt, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-dark">{attempt.topic}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(attempt.completed_at).toLocaleDateString()} •
                          {attempt.score}/{attempt.total_questions} ({attempt.percentage}%)
                        </p>
                      </div>
                      <button
                        onClick={() => handleRetakeQuiz(attempt.quiz_id)}
                        className="bg-accent text-dark px-4 py-2 rounded-lg hover:bg-darker hover:text-light transition-colors font-medium"
                      >
                        Retake Quiz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : showDocumentSelector ? (
           <Modal isOpen={showDocumentSelector} onClose={() => { setShowDocumentSelector(false); setShowQuiz(false); setQuizData(null); setGeneratingQuiz(false); }}>
             <div className="bg-light rounded-lg shadow-lg p-8 max-h-[80vh] overflow-y-auto">
               {showQuiz && quizData ? (
                 <QuizInterface
                   quizData={quizData}
                   onRegenerate={handleGenerateQuiz}
                 />
               ) : generatingQuiz ? (
                 <div className="text-center py-8">
                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
                   <p className="text-lg text-dark mt-4">Generating your quiz...</p>
                   <p className="text-sm text-gray-600 mt-2">This may take a few moments</p>
                 </div>
               ) : (
                 <>
                   <h2 className="text-xl font-semibold mb-4 text-dark text-center">Select Documents for Quiz</h2>
                   <p className="text-darker mb-6 text-center">
                     Choose which documents to include in your practice quiz. You can select from uncategorized documents, topic folders, or similarity groups.
                   </p>
                   <DocumentSelector
                     selectedDocuments={selectedDocuments}
                     onSelectionChange={handleDocumentSelection}
                   />
                   <div className="mt-6 flex justify-center space-x-4">
                     <button
                       onClick={handleStartQuiz}
                       disabled={selectedDocuments.length === 0}
                       className="bg-accent text-dark px-6 py-3 rounded-lg hover:bg-darker hover:text-light transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       Generate Quiz ({selectedDocuments.length} documents selected)
                     </button>
                     <button
                       onClick={() => handleGenerateQuiz([])}
                       className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                     >
                       Use All Documents
                     </button>
                   </div>
                 </>
               )}
             </div>
           </Modal>
        ) : (
          <div className="bg-light rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-4 text-dark">Ready to test your knowledge?</h2>
            <p className="text-darker mb-6">
              Generate a practice quiz based on your uploaded documents.
            </p>
            <button
              onClick={() => setShowDocumentSelector(true)}
              className="bg-accent text-dark px-6 py-3 rounded-lg hover:bg-darker hover:text-light transition-colors font-medium"
            >
              Select Documents
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Quiz;
