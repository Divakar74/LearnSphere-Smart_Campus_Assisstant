import React from 'react';
import ProgressDashboard from '../components/ProgressDashboard';
import LearningAnalytics from '../components/LearningAnalytics';
import { useAuth } from '../contexts/AuthContext';

function Progress() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8 bg-dark min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-light mb-8 text-center">
          Learning Progress & Analytics
        </h1>

        <div className="space-y-8">
          <ProgressDashboard userId={user?.id} />
          <LearningAnalytics userId={user?.id} />
        </div>
      </div>
    </div>
  );
}

export default Progress;
