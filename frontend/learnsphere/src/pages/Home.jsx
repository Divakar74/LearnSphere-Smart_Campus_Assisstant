import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressDashboard from '../components/ProgressDashboard';
import ChatInterface from '../components/ChatInterface';
import DocumentCard from '../components/DocumentCard';
import FileUpload from '../components/FileUpload';
import { getDocuments, getSummaries, getStoredQuizzes, generateQuiz, getLearningAnalytics } from '../services/api';

const Home = () => {
  const { userData } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (!userData) {
    // Landing page for unauthenticated users
    return (
      <div className="min-h-screen bg-dark">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-light mb-6">LearnSphere</h1>
            <p className="text-xl text-darker mb-8 max-w-2xl mx-auto">
              Upload documents, get summaries, and chat with AI to clarify your doubts.
            </p>
            <div className="flex justify-center space-x-4 mb-12">
              <Link to="/login" className="bg-accent text-dark px-8 py-4 rounded-lg font-semibold hover:bg-darker hover:text-light shadow-lg hover:shadow-xl transition duration-300 text-lg">
                Login
              </Link>
              <Link to="/register" className="bg-darker border-2 border-accent text-light px-8 py-4 rounded-lg font-semibold hover:bg-accent hover:text-dark shadow-lg hover:shadow-xl transition duration-300 text-lg">
                Get Started
              </Link>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-light rounded-2xl shadow-xl p-8 border border-darker">
              <h3 className="text-2xl font-bold text-dark mb-4">Upload Documents</h3>
              <p className="text-darker">Smooth drag & drop interface for your PDF, DOCX, PPTX, or TXT files.</p>
            </div>
            <div className="bg-light rounded-2xl shadow-xl p-8 border border-darker">
              <h3 className="text-2xl font-bold text-dark mb-4">AI-Powered Chat</h3>
              <p className="text-darker">Shoot your questions, get them clarified with AI assistance.</p>
            </div>
            <div className="bg-light rounded-2xl shadow-xl p-8 border border-darker">
              <h3 className="text-2xl font-bold text-dark mb-4">Summaries Generator</h3>
              <p className="text-darker">Your quick stop for understanding topics and generating quizzes.</p>
            </div>
          </div>
          <div className="text-center mt-16">
            {/* <p className="text-darker text-lg">
              Join thousands of learners who are already using LearnSphere to enhance their learning experience.
            </p> */}
          </div>
        </div>
      </div>
    );
  }

  // Dashboard for authenticated users
  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-light mb-6">Welcome back, {userData?.username}! 😎</h1>
          <p className="text-xl font-semibold text-light mb-8 max-w-2xl mx-auto">
            Ready to continue your learning journey? Upload new documents or access your dashboard to explore all features.
          </p>
          <div className="flex justify-center space-x-4 mb-12">
            <Link
              to="/upload"
              className="bg-accent text-dark px-8 py-4 rounded-lg font-semibold hover:bg-darker hover:text-light shadow-lg hover:shadow-xl transition duration-300 text-lg"
            >
              Upload Document
            </Link>
            <Link
              to="/dashboard"
              className="bg-darker border-2 border-accent text-light px-8 py-4 rounded-lg font-semibold hover:bg-accent hover:text-dark shadow-lg hover:shadow-xl transition duration-300 text-lg"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>

        {/* Quick Upload Section */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-light text-center mb-8">Quick Upload</h2>
          <div className="backdrop-blur-lg bg-light/30 rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
            <FileUpload onUploadSuccess={handleUploadSuccess} key={refreshKey} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8 mt-16">
          <div className="bg-light rounded-2xl shadow-xl p-8 border border-darker">
            <h3 className="text-2xl font-bold text-dark mb-4"> Dashboard</h3>
            <p className="text-darker">Track your learning progress with detailed analytics and insights.</p>
          </div>
          <div className="bg-light rounded-2xl shadow-xl p-8 border border-darker">
            <h3 className="text-2xl font-bold text-dark mb-4">AI Chat</h3>
            <p className="text-darker">Get instant help and clarification on any topic from your documents.</p>
          </div>
          <div className="bg-light rounded-2xl shadow-xl p-8 border border-darker">
            <h3 className="text-2xl font-bold text-dark mb-4">Practice Quizzes</h3>
            <p className="text-darker">Test your knowledge and reinforce learning with AI-generated quizzes.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
