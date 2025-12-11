import React, { useState, useEffect } from 'react';
import { getSummaries, generateDetailedSummary } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import DocumentCard from '../components/DocumentCard';

const Summaries = () => {
  const [summaries, setSummaries] = useState([]);
  const [detailedSummaries, setDetailedSummaries] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchSummaries = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      const userId = user?.id || 'default_user';
      const data = await getSummaries(userId);
      setSummaries(data);

      // Preload detailed summaries for all documents
      const detailedPromises = data.map(async (summary) => {
        try {
          const detailed = await generateDetailedSummary(userId, summary.filename);
          return { filename: summary.filename, detailed_summary: detailed.detailed_summary };
        } catch (error) {
          console.error(`Error preloading detailed summary for ${summary.filename}:`, error);
          return { filename: summary.filename, detailed_summary: summary.summary || 'Summary not available' };
        }
      });

      const detailedResults = await Promise.all(detailedPromises);
      const detailedMap = detailedResults.reduce((acc, item) => {
        acc[item.filename] = item;
        return acc;
      }, {});
      setDetailedSummaries(detailedMap);
    } catch (error) {
      console.error('Error fetching summaries:', error);
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
    // Set up polling every 5 seconds to check for new summaries
    const interval = setInterval(() => {
      fetchSummaries(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const handleRefresh = () => {
    fetchSummaries(true);
  };

  return (
    <div className="container mx-auto px-6 py-8 bg-dark min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-light">Document Summaries</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-accent hover:bg-darker disabled:bg-darker text-dark hover:text-light disabled:text-light px-4 py-2 rounded-lg transition-colors"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {loading ? (
        <div className="text-center text-light">Loading summaries...</div>
      ) : summaries.length === 0 ? (
        <div className="text-center text-light">
          No summaries available. Upload documents to see summaries here.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-light">
          {summaries.map((summary, index) => (
            <DocumentCard
              key={`${summary.filename}-${index}`}
              summary={summary}
              detailedSummary={detailedSummaries[summary.filename]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Summaries;
