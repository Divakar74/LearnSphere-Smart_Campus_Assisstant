import React, { useState, useEffect } from 'react';
import { getDocuments, generateDetailedSummary, generateQuiz, getFolders, getFolderDocuments } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import FileUpload from '../components/FileUpload';

const Documents = () => {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailedSummaries, setDetailedSummaries] = useState({});
  const [loadingSummaries, setLoadingSummaries] = useState({});
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [showShortDescriptionModal, setShowShortDescriptionModal] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderDocuments, setFolderDocuments] = useState([]);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      fetchDocuments();
      fetchFolders();
    }
  }, [user, loading, refreshKey]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const userId = user?.id || 'default_user';
      const response = await getDocuments(userId);
      setDocuments(response);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const foldersData = await getFolders();
      setFolders(foldersData);
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  };

  const handleFolderClick = async (folder) => {
    setSelectedFolder(folder);
    try {
      const docs = await getFolderDocuments(folder.id);
      setFolderDocuments(docs);
    } catch (err) {
      console.error('Error fetching folder documents:', err);
      setError('Failed to load folder documents');
    }
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    setFolderDocuments([]);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      const userId = user?.id || 'default_user';
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

  const handleDocumentSelect = (filename) => {
    setSelectedDocuments(prev =>
      prev.includes(filename)
        ? prev.filter(doc => doc !== filename)
        : [...prev, filename]
    );
  };

  const handleCreateQuiz = async () => {
    if (selectedDocuments.length === 0) return;

    setGeneratingQuiz(true);
    try {
      const userId = user?.id || 'default_user';
      const response = await generateQuiz(userId, selectedDocuments, 5);
      if (response.error) {
        setError(response.error);
      } else {
        // Navigate to quiz page with the generated quiz
        navigate('/quiz', { state: { quizData: response } });
      }
    } catch (err) {
      setError('Failed to generate quiz. Please try again.');
      console.error('Quiz generation error:', err);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleShowShortDescription = (doc) => {
    setShowShortDescriptionModal(doc);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-black">Loading documents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <p className="text-red-600 text-xl">{error}</p>
            <button
              onClick={fetchDocuments}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition duration-300"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-black">
            {selectedFolder ? `📁 ${selectedFolder.name}` : 'My Documents'}
          </h1>
          <div className="flex space-x-4">
            {selectedFolder && (
              <button
                onClick={handleBackToFolders}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition duration-300"
              >
                ← Back to Folders
              </button>
            )}
            <button
              onClick={() => navigate('/upload')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition duration-300"
            >
              📤 Upload Document
            </button>
          </div>
        </div>

        {/* Quick Upload Section */}
        <div className="mb-8">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-4">Quick Upload</h2>
            <FileUpload onUploadSuccess={handleUploadSuccess} key={refreshKey} />
          </div>
        </div>

        {/* Folder View */}
        {!selectedFolder && (
          <>
            {/* Folders Section */}
            {folders.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">📂 My Folders</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => handleFolderClick(folder)}
                      className="bg-blue-50 rounded-2xl shadow-xl p-6 border border-blue-200 cursor-pointer hover:shadow-2xl transition duration-300"
                    >
                      <h3 className="text-xl font-semibold text-blue-800 mb-2">📁 {folder.name}</h3>
                      {folder.description && (
                        <p className="text-blue-600 text-sm mb-3">{folder.description}</p>
                      )}
                      <p className="text-blue-500 text-xs">
                        Created: {new Date(folder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Uncategorized Section */}
            {documents?.uncategorized && documents.uncategorized.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">📄 Uncategorized Documents</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {documents.uncategorized.map((doc, index) => (
                    <div key={index} className="bg-gray-100 rounded-2xl shadow-xl p-6 border border-gray-300">
                      <h3 className="text-xl font-semibold text-black mb-2">📄 {doc.filename}</h3>
                      <div className="text-gray-700 text-sm space-y-1 mb-3">
                        <p>Size: {formatFileSize(doc.size)}</p>
                        <p>Uploaded: {formatDate(doc.uploaded_at)}</p>
                      </div>
                      <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-800 text-sm leading-relaxed">
                          {doc.summary && doc.summary !== 'Summary not available' ? doc.summary : 'Short summary not available'}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleShowShortDescription(doc)}
                          className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition duration-300"
                        >
                          📄 Short Description
                        </button>
                        <button
                          onClick={() => handleViewDetailedSummary(doc.filename)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition duration-300"
                          disabled={loadingSummaries[doc.filename]}
                        >
                          {loadingSummaries[doc.filename] ? 'Generating...' : detailedSummaries[doc.filename] ? 'Hide Summary' : 'View Summary'}
                        </button>
                      </div>
                      {detailedSummaries[doc.filename] && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-300">
                          <h4 className="text-lg font-semibold text-black mb-2">📋 Summary</h4>
                          <p className="text-black text-sm leading-relaxed">{detailedSummaries[doc.filename]?.detailed_summary || detailedSummaries[doc.filename]}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Folder Documents View */}
        {selectedFolder && (
          <div className="mb-8">
            {selectedFolder.description && (
              <p className="text-gray-700 mb-6 text-lg">{selectedFolder.description}</p>
            )}

            {/* Selection Controls */}
            {folderDocuments.length > 0 && (
              <div className="mb-6 flex justify-center space-x-4">
                <button
                  onClick={() => setSelectedDocuments([])}
                  className="bg-white text-black border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100"
                >
                  Clear Selection ({selectedDocuments.length})
                </button>
                <button
                  onClick={handleCreateQuiz}
                  disabled={selectedDocuments.length === 0 || generatingQuiz}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingQuiz ? 'Generating Quiz...' : `Create Quiz (${selectedDocuments.length} docs)`}
                </button>
              </div>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {folderDocuments.map((doc, index) => (
                <div key={index} className="bg-gray-100 rounded-2xl shadow-xl p-6 border border-gray-300">
                  <h3 className="text-xl font-semibold text-black mb-2">📄 {doc.filename}</h3>
                  <div className="text-gray-700 text-sm space-y-1 mb-3">
                    <p>Size: {formatFileSize(doc.size)}</p>
                    <p>Uploaded: {formatDate(doc.uploaded_at)}</p>
                  </div>
                  <div className="mb-3 p-3 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-800 text-sm leading-relaxed">
                      {doc.summary && doc.summary !== 'Summary not available' ? doc.summary : 'Short summary not available'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleShowShortDescription(doc)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition duration-300"
                    >
                      📄 Short Description
                    </button>
                    <button
                      onClick={() => handleViewDetailedSummary(doc.filename)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition duration-300"
                      disabled={loadingSummaries[doc.filename]}
                    >
                      {loadingSummaries[doc.filename] ? 'Generating...' : detailedSummaries[doc.filename] ? 'Hide Summary' : 'View Summary'}
                    </button>
                  </div>
                  {detailedSummaries[doc.filename] && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-300">
                      <h4 className="text-lg font-semibold text-black mb-2">📋 Summary</h4>
                      <p className="text-black text-sm leading-relaxed">{detailedSummaries[doc.filename]?.detailed_summary || detailedSummaries[doc.filename]}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {folderDocuments.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📁</div>
                <h3 className="text-2xl font-bold text-black mb-2">No Documents in This Folder</h3>
                <p className="text-gray-700 mb-6">Upload documents to this folder to get started!</p>
                <button
                  onClick={() => navigate('/upload')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition duration-300 inline-block"
                >
                  Upload to This Folder
                </button>
              </div>
            )}
          </div>
        )}



        {/* Topic-based Documents */}
        {documents?.topics && Object.keys(documents.topics).length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-black mb-4">📁 Topic Folders</h2>
            <div className="space-y-8">
              {Object.entries(documents.topics).map(([topicName, topicData]) => (
                <div key={topicName} className="bg-gray-50 rounded-2xl p-6 border border-gray-300">
                  <h3 className="text-2xl font-semibold text-black mb-2">📂 {topicName}</h3>
                  {topicData.description && (
                    <p className="text-gray-700 mb-4">{topicData.description}</p>
                  )}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topicData.documents.map((doc, index) => (
                      <div key={index} className="bg-gray-100 rounded-xl p-4 border border-gray-300">
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={selectedDocuments.includes(doc.filename)}
                            onChange={() => handleDocumentSelect(doc.filename)}
                            className="mr-3"
                          />
                          <h4 className="text-lg font-medium text-black">📄 {doc.filename}</h4>
                        </div>
                        <div className="text-gray-700 text-sm space-y-1">
                          <p>Size: {formatFileSize(doc.size)}</p>
                          <p>Uploaded: {formatDate(doc.uploaded_at)}</p>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleShowShortDescription(doc)}
                            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition duration-300"
                          >
                            📄 Short Desc
                          </button>
                          <button
                            onClick={() => handleViewDetailedSummary(doc.filename)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition duration-300"
                            disabled={loadingSummaries[doc.filename]}
                          >
                            {loadingSummaries[doc.filename] ? 'Generating...' : detailedSummaries[doc.filename] ? 'Hide' : 'View Summary'}
                          </button>
                        </div>
                        {detailedSummaries[doc.filename] && (
                          <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-300">
                            <h5 className="text-sm font-semibold text-black mb-2">📋 Summary</h5>
                            <p className="text-gray-700 text-xs leading-relaxed">{detailedSummaries[doc.filename]?.detailed_summary || detailedSummaries[doc.filename]}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Similarity-based Documents */}
        {documents?.similarity_groups && documents.similarity_groups.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-black mb-4">Similarity-Based Categories</h2>
            <div className="space-y-8">
              {documents.similarity_groups.map((group, groupIndex) => (
                <div key={groupIndex} className="bg-gray-50 rounded-2xl p-6 border border-gray-300">
                  <h3 className="text-2xl font-semibold text-black mb-2">
                    {group.name}
                  </h3>
                  <p className="text-gray-700 mb-4">
                    {group.document_count} documents • {group.similarity_percentage}% average similarity
                  </p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.documents.map((docFilename, index) => {
                      // Find the document details from all_documents
                      const doc = documents.uncategorized?.find(d => d.filename === docFilename) ||
                                Object.values(documents.topics || {}).flatMap(t => t.documents).find(d => d.filename === docFilename);
                      return (
                        <div key={index} className="bg-gray-100 rounded-xl p-4 border border-gray-300">
                          <div className="flex items-center mb-2">
                            <input
                              type="checkbox"
                              checked={selectedDocuments.includes(docFilename)}
                              onChange={() => handleDocumentSelect(docFilename)}
                              className="mr-3"
                            />
                            <h4 className="text-lg font-medium text-black">{docFilename}</h4>
                          </div>
                          {doc && (
                            <div className="text-gray-700 text-sm space-y-1">
                              <p>Size: {formatFileSize(doc.size)}</p>
                              <p>Uploaded: {formatDate(doc.uploaded_at)}</p>
                            </div>
                          )}
                          <button
                            onClick={() => handleViewDetailedSummary(docFilename)}
                            className="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium transition duration-300"
                            disabled={loadingSummaries[docFilename]}
                          >
                            {loadingSummaries[docFilename] ? 'Generating...' : detailedSummaries[docFilename] ? 'Hide' : 'View Summary'}
                          </button>
                          {detailedSummaries[docFilename] && (
                            <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-300">
                              <h5 className="text-sm font-semibold text-black mb-2">📋 Summary</h5>
                              <p className="text-gray-700 text-xs leading-relaxed">{detailedSummaries[docFilename]?.detailed_summary || detailedSummaries[docFilename]}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedFolder && (!documents?.uncategorized || documents.uncategorized.length === 0) &&
         (!documents?.topics || Object.keys(documents.topics).length === 0) && folders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-2xl font-bold text-black mb-2">No Documents Yet</h3>
            <p className="text-gray-700 mb-6">Upload your first document to get started!</p>
            <button
              onClick={() => navigate('/upload')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition duration-300 inline-block"
            >
              Upload Document
            </button>
          </div>
        )}

        {/* Short Description Modal */}
        {showShortDescriptionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-black">📄 Short Description</h2>
                <button
                  onClick={() => setShowShortDescriptionModal(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-black mb-2">{showShortDescriptionModal.filename}</h3>
                <div className="text-sm text-gray-600 mb-4">
                  <p>Size: {formatFileSize(showShortDescriptionModal.size)}</p>
                  <p>Uploaded: {formatDate(showShortDescriptionModal.uploaded_at)}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-black text-base leading-relaxed">
                  {showShortDescriptionModal.summary && showShortDescriptionModal.summary !== 'Summary not available'
                    ? showShortDescriptionModal.summary
                    : 'This document provides valuable information and insights. The content has been processed and is available for detailed analysis and quiz generation.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
