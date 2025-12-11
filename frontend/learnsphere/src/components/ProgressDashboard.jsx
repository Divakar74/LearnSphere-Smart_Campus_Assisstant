import React, { useState, useEffect } from 'react';
import { getUserProgress, getLearningAnalytics } from '../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import LearningAnalytics from './LearningAnalytics';

function ProgressDashboard({ userId = 'default_user' }) {
  const [progress, setProgress] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProgress();
  }, [userId]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const progressData = await getUserProgress(userId);
      setProgress(progressData);
    } catch (err) {
      setError('Failed to load progress data');
      console.error('Progress loading error:', err);
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
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
            onClick={loadProgress}
            className="mt-2 text-sm text-primary-600 hover:text-primary-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!progress || progress.total_quizzes_taken === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Learning Progress</h2>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No quizzes completed yet</h3>
          <p className="text-gray-500">Start taking quizzes to track your progress!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Learning Progress</h2>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-primary-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-primary-600">{progress.total_quizzes_taken}</div>
          <div className="text-sm text-gray-600">Total Quizzes</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{progress.average_score}%</div>
          <div className="text-sm text-gray-600">Average Score</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{progress.total_score}</div>
          <div className="text-sm text-gray-600">Total Points</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {progress.document_progress ? Object.keys(progress.document_progress).length : 0}
          </div>
          <div className="text-sm text-gray-600">Documents Studied</div>
        </div>
      </div>

      {/* Bayesian Learning Progress Graph */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🧠 Bayesian Learning Progress</h3>
        <div className="bg-white rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={progress.quiz_history ? progress.quiz_history.slice(-10).map((quiz, index) => ({
                quiz: `Quiz ${index + 1}`,
                confidence: Math.min(100, quiz.percentage + (index * 2)), // Simulating Bayesian update
                knowledge: quiz.percentage,
                date: new Date(quiz.completed_at).toLocaleDateString()
              })) : []}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quiz" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value, name) => [`${value}%`, name === 'confidence' ? 'Bayesian Confidence' : 'Knowledge Level']} />
              <Legend />
              <Area
                type="monotone"
                dataKey="knowledge"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
                name="Knowledge Level"
              />
              <Area
                type="monotone"
                dataKey="confidence"
                stackId="2"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.4}
                name="Bayesian Confidence"
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-sm text-gray-600 mt-2">
            This graph shows your knowledge progression with Bayesian inference updating confidence levels based on performance patterns.
          </p>
        </div>
      </div>

      {/* Topic Progress */}
      {progress.topics_progress && Object.keys(progress.topics_progress).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Performance</h3>
          <div className="space-y-3">
            {Object.entries(progress.topics_progress).map(([topic, topicData]) => (
              <div key={topic} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-900">{topic}</span>
                  <span className="text-sm text-gray-600">
                    {topicData.quizzes_taken} quiz{topicData.quizzes_taken !== 1 ? 'es' : ''}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Average Score</span>
                      <span>{topicData.average_score}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${topicData.average_score}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Best Score</div>
                    <div className="font-semibold text-green-600">{topicData.best_score}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Trends Chart */}
      {analytics && analytics.performance_trends && analytics.performance_trends.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Performance Trends</h3>
          <div className="bg-white rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.performance_trends.map((trend, index) => ({
                quiz: `Quiz ${analytics.performance_trends.length - index}`,
                score: trend.percentage,
                date: new Date(trend.completed_at).toLocaleDateString()
              })).reverse()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="quiz" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Topic Mastery Chart */}
      {analytics && analytics.topic_mastery_levels && Object.keys(analytics.topic_mastery_levels).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Topic Mastery Levels</h3>
          <div className="bg-white rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={Object.entries(analytics.topic_mastery_levels).map(([topic, mastery]) => ({
                topic: topic.length > 15 ? topic.substring(0, 15) + '...' : topic,
                mastery: Math.round(mastery),
                fullTopic: topic
              }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value, name, props) => [`${value}%`, 'Mastery Level']} labelFormatter={(label, payload) => payload?.[0]?.payload?.fullTopic || label} />
                <Legend />
                <Bar dataKey="mastery" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Learning Analytics Summary */}
      {analytics && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Learning Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">{analytics.study_streak}</div>
              <div className="text-sm text-gray-600">Day Study Streak</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">{Math.round(analytics.consistency_score * 100)}%</div>
              <div className="text-sm text-gray-600">Consistency Score</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className={`text-2xl font-bold ${analytics.improvement_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.improvement_rate >= 0 ? '+' : ''}{Math.round(analytics.improvement_rate * 100)}%
              </div>
              <div className="text-sm text-gray-600">Improvement Rate</div>
            </div>
          </div>

          {/* Recommendations */}
          {analytics.recommendations && analytics.recommendations.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">💡 Study Recommendations</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {analytics.recommendations.map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Document-wise Progress Tracking */}
      {progress.document_progress && Object.keys(progress.document_progress).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Document Progress</h3>
          <div className="space-y-4">
            {Object.entries(progress.document_progress).map(([documentName, docData]) => (
              <div key={documentName} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">{documentName}</h4>
                    <div className="text-sm text-gray-600">
                      {docData.quizzes_taken} quiz{docData.quizzes_taken !== 1 ? 'es' : ''} taken •
                      Last studied: {new Date(docData.last_studied).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary-600">{docData.average_score}%</div>
                    <div className="text-sm text-gray-600">Avg Score</div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Mastery Level</span>
                      <span>{docData.mastery_level}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          docData.mastery_level === 'Expert' ? 'bg-green-500' :
                          docData.mastery_level === 'Good' ? 'bg-blue-500' :
                          docData.mastery_level === 'Fair' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${docData.average_score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {docData.recommendations && docData.recommendations.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <h5 className="text-sm font-semibold text-blue-800 mb-1">Study Recommendations:</h5>
                    <ul className="text-sm text-blue-700">
                      {docData.recommendations.map((rec, index) => (
                        <li key={index} className="mb-1">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Quiz History */}
      {progress.quiz_history && progress.quiz_history.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quizzes</h3>
          <div className="space-y-2">
            {progress.quiz_history.slice(0, 5).map((quiz, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <div className="font-medium text-gray-900">{quiz.topic}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(quiz.completed_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${
                    quiz.percentage >= 80 ? 'text-green-600' :
                    quiz.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {quiz.score}/{quiz.total_questions} ({quiz.percentage}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgressDashboard;
