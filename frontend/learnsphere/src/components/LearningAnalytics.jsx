import React, { useState, useEffect } from 'react';
import { getLearningAnalytics } from '../services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function LearningAnalytics({ userId = 'default_user' }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const analyticsData = await getLearningAnalytics(userId);
      setAnalytics(analyticsData);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={loadAnalytics}
            className="mt-2 text-sm text-primary-600 hover:text-primary-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Learning Analytics</h2>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-gray-500">Analytics data not available</p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const topicMasteryData = analytics.topic_mastery_levels ? Object.entries(analytics.topic_mastery_levels).map(([topic, mastery]) => ({
    topic,
    mastery: Math.round(mastery * 100),
    level: mastery >= 0.8 ? 'Expert' : mastery >= 0.6 ? 'Good' : mastery >= 0.4 ? 'Fair' : 'Needs Work'
  })) : [];

  const performanceData = analytics.performance_trends ? analytics.performance_trends.map((item, index) => ({
    quiz: `Quiz ${index + 1}`,
    score: item.score,
    percentage: item.percentage
  })) : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Analytics & Insights</h2>

      {/* Learning Insights */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Learning Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.weak_topics && analytics.weak_topics.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Areas Needing Focus</h4>
              <ul className="text-sm text-red-700">
                {analytics.weak_topics.map((topic, index) => (
                  <li key={index} className="mb-1">• {topic}</li>
                ))}
              </ul>
            </div>
          )}

          {analytics.strong_topics && analytics.strong_topics.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Strong Areas</h4>
              <ul className="text-sm text-green-700">
                {analytics.strong_topics.map((topic, index) => (
                  <li key={index} className="mb-1">• {topic}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {analytics.recommendations && analytics.recommendations.length > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">💡 Recommendations</h4>
            <ul className="text-sm text-blue-700">
              {analytics.recommendations.map((rec, index) => (
                <li key={index} className="mb-1">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Topic Mastery Chart */}
      {topicMasteryData.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Mastery Levels</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topicMasteryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="topic" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="mastery" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Trends */}
      {performanceData.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quiz" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="percentage" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Study Streak and Consistency */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {analytics.study_streak || 0}
          </div>
          <div className="text-sm text-gray-600">Day Study Streak</div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {analytics.consistency_score ? Math.round(analytics.consistency_score * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600">Consistency Score</div>
        </div>
        <div className="bg-teal-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-teal-600">
            {analytics.improvement_rate ? Math.round(analytics.improvement_rate * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600">Improvement Rate</div>
        </div>
      </div>
    </div>
  );
}

export default LearningAnalytics;
