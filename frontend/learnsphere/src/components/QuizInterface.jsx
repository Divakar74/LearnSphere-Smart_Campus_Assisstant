import React, { useState } from 'react';
import { saveQuizResult } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function QuizInterface({ quizData, onRegenerate }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [quizSettings, setQuizSettings] = useState({
    selectedDocuments: [],
    numQuestions: 5,
  });
  const { userData } = useAuth();

  const quiz = quizData.quiz || [];
  const totalQuestions = quiz.length;

  const handleAnswerSelect = (questionIndex, answer) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionIndex]: answer,
    });
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.forEach((question, index) => {
      if (selectedAnswers[index] === question.correct_answer) {
        correct++;
      }
    });
    return correct;
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
  };

  const handleRegenerate = () => {
    // Pass selected documents from quiz data if available, otherwise use current settings
    const selectedDocs = quizData.documents_used && quizData.documents_used.length > 0
      ? quizData.documents_used
      : quizSettings.selectedDocuments;
    onRegenerate(selectedDocs, quizSettings.numQuestions);
    resetQuiz();
  };

  const handleFinishQuiz = async () => {
    setShowResults(true);

    // Save quiz result to progress tracking
    const score = calculateScore();
    const topic = quizData.topic || 'General';
    const quizId = quizData.quiz_id || `quiz_${Date.now()}`;

    try {
      await saveQuizResult(
        userData?.id || 'default_user', // userId
        quizId,
        topic,
        score,
        totalQuestions,
        quizData.documents_used || []
      );
    } catch (error) {
      console.error('Failed to save quiz result:', error);
    }
  };

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / totalQuestions) * 100);

    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Quiz Results</h2>

        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-primary-600 mb-2">
            {score}/{totalQuestions}
          </div>
          <div className="text-lg text-gray-600">
            {percentage}% Correct
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {quiz.map((question, index) => (
            <div key={index} className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">
                Question {index + 1}: {question.question}
              </h3>

              <div className="mb-2">
                <span className="text-sm text-gray-600">Your answer: </span>
                <span className={`font-medium ${
                  selectedAnswers[index] === question.correct_answer
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {selectedAnswers[index] || 'Not answered'}
                </span>
              </div>

              <div className="mb-2">
                <span className="text-sm text-gray-600">Correct answer: </span>
                <span className="font-medium text-green-600">
                  {question.correct_answer}
                </span>
              </div>

              {question.explanation && (
                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                  <strong>Explanation:</strong> {question.explanation}
                </div>
              )}

              {question.difficulty && (
                <div className="mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {question.difficulty}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center space-x-4">
          <button
            onClick={resetQuiz}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retake Quiz
          </button>
          <button
            onClick={handleRegenerate}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Generate New Quiz
          </button>
        </div>
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <p className="text-gray-600">No questions available. Please try generating a new quiz.</p>
        <button
          onClick={handleRegenerate}
          className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Generate Quiz
        </button>
      </div>
    );
  }

  const currentQ = quiz[currentQuestion];

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Quiz Settings */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Quiz Settings</h3>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <span className="mr-2">Questions:</span>
            <select
              value={quizSettings.numQuestions}
              onChange={(e) => setQuizSettings({...quizSettings, numQuestions: parseInt(e.target.value)})}
              className="border rounded px-2 py-1"
            >
              {[3, 5, 7, 10].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </label>
          <button
            onClick={handleRegenerate}
            className="bg-primary-600 text-white px-4 py-1 rounded hover:bg-primary-700 transition-colors text-sm"
          >
            Regenerate
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            Question {currentQuestion + 1} of {totalQuestions}
          </span>
          <span className="text-sm text-gray-600">
            {Object.keys(selectedAnswers).length} answered
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {currentQ.question}
        </h2>

        <div className="space-y-3">
          {currentQ.options.map((option, index) => (
            <label key={index} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name={`question-${currentQuestion}`}
                value={option.charAt(0)}
                checked={selectedAnswers[currentQuestion] === option.charAt(0)}
                onChange={() => handleAnswerSelect(currentQuestion, option.charAt(0))}
                className="text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">{option}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <button
          onClick={currentQuestion === totalQuestions - 1 ? handleFinishQuiz : handleNext}
          disabled={!selectedAnswers[currentQuestion]}
          className="px-6 py-2 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentQuestion === totalQuestions - 1 ? 'Finish Quiz' : 'Next'}
        </button>
      </div>
    </div>
  );
}

export default QuizInterface;
