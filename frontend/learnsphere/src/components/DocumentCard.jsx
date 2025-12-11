import React, { useState } from 'react';
import Modal from './Modal';

const DocumentCard = ({ summary, detailedSummary }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailedContent, setDetailedContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = async () => {
    setIsModalOpen(true);
    setLoading(true);

    if (detailedSummary?.detailed_summary) {
      setDetailedContent(detailedSummary.detailed_summary);
      setLoading(false);
    } else {
      try {
        const { generateDetailedSummary } = await import('../services/api');
        const userId = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id : 'default_user';
        const response = await generateDetailedSummary(userId, summary.filename);
        setDetailedContent(response.detailed_summary);
      } catch (error) {
        console.error('Error fetching detailed summary:', error);
        setDetailedContent(summary.summary || 'Document summary not available');
      } finally {
        setLoading(false);
      }
    }
  };

  const displayText = `Uploaded on ${formatTimestamp(summary.timestamp)}`;

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 ease-in-out border border-gray-50 p-8 hover:border-gray-100">
      <h3 className="text-xl font-medium text-gray-800 mb-4 leading-tight">{summary.filename}</h3>
      {/* <p className="text-gray-600 mb-6 line-clamp-3 leading-relaxed text-base">
        {displayText}
      </p> */}
      <button
        onClick={handleViewDetails}
        className="bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-sm hover:shadow-md border border-blue-100"
      >
        View Detailed Summary
      </button>
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Detailed Summary"
      >
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading detailed summary...</p>
          </div>
        ) : (
          <p className="text-dark leading-relaxed text-lg">
            {detailedContent}
          </p>
        )}
      </Modal>
    </div>
  );
};

export default DocumentCard;
