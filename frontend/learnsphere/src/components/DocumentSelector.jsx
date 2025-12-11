import React, { useState, useEffect } from 'react';
import { getDocuments } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function DocumentSelector({ selectedDocuments, onSelectionChange, maxSelection = null }) {
  const [documents, setDocuments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    uncategorized: true,
    topics: true,
    folders: true,
    similarity: true
  });
  const { userData } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const userId = userData?.id || 'default_user';
      const response = await getDocuments(userId);
      setDocuments(response);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSelectAll = (documentList) => {
    const currentlySelected = selectedDocuments.filter(doc => documentList.includes(doc));
    const remainingSlots = maxSelection ? maxSelection - (selectedDocuments.length - currentlySelected.length) : documentList.length;

    if (currentlySelected.length === documentList.length) {
      // All selected, deselect all
      const newSelection = selectedDocuments.filter(doc => !documentList.includes(doc));
      onSelectionChange(newSelection);
    } else {
      // Select remaining slots
      const unselected = documentList.filter(doc => !selectedDocuments.includes(doc));
      const toSelect = unselected.slice(0, remainingSlots);
      const newSelection = [...selectedDocuments, ...toSelect];
      onSelectionChange(newSelection);
    }
  };

  const handleDocumentToggle = (filename) => {
    if (selectedDocuments.includes(filename)) {
      onSelectionChange(selectedDocuments.filter(doc => doc !== filename));
    } else {
      if (maxSelection && selectedDocuments.length >= maxSelection) {
        return; // Don't add if at max
      }
      onSelectionChange([...selectedDocuments, filename]);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const DocumentCheckbox = ({ filename, size, disabled }) => (
    <div className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
      <input
        type="checkbox"
        checked={selectedDocuments.includes(filename)}
        onChange={() => handleDocumentToggle(filename)}
        disabled={disabled}
        className="text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <span className="text-sm font-medium text-gray-900">{filename}</span>
        {size && <span className="text-xs text-gray-500 ml-2">({formatFileSize(size)})</span>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchDocuments}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
        >
          Retry
        </button>
      </div>
    );
  }

  const hasDocuments = documents?.uncategorized?.length > 0 ||
                      documents?.topics && Object.keys(documents.topics).length > 0 ||
                      documents?.folders && Object.keys(documents.folders).length > 0 ||
                      documents?.similarity_groups?.length > 0;

  if (!hasDocuments) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No documents available. Please upload some documents first.</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto border rounded-lg">
      {/* Uncategorized Documents */}
      {documents?.uncategorized && documents.uncategorized.length > 0 && (
        <div className="border-b">
          <div
            className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleSection('uncategorized')}
          >
            <h3 className="font-medium text-gray-900">
              Uploaded Documents ({documents.uncategorized.length})
            </h3>
            <button className="text-gray-500">
              {expandedSections.uncategorized ? '−' : '+'}
            </button>
          </div>
          {expandedSections.uncategorized && (
            <div className="p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-black-600">
                  {selectedDocuments.filter(doc => documents.uncategorized.some(d => d.filename === doc)).length} of {documents.uncategorized.length} selected
                </span>
                <button
                  onClick={() => handleSelectAll(documents.uncategorized.map(d => d.filename))}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {selectedDocuments.filter(doc => documents.uncategorized.some(d => d.filename === doc)).length === documents.uncategorized.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              {documents.uncategorized.map((doc) => (
                <DocumentCheckbox
                  key={doc.filename}
                  filename={doc.filename}
                  size={doc.size}
                  disabled={maxSelection && selectedDocuments.length >= maxSelection && !selectedDocuments.includes(doc.filename)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Topic-based Documents */}
      {documents?.topics && Object.keys(documents.topics).length > 0 && (
        <div className="border-b">
          <div
            className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleSection('topics')}
          >
            <h3 className="font-medium text-gray-900">
              Documents by Topic ({Object.keys(documents.topics).length} topics)
            </h3>
            <button className="text-gray-500">
              {expandedSections.topics ? '−' : '+'}
            </button>
          </div>
          {expandedSections.topics && (
            <div className="p-2">
              {Object.entries(documents.topics).map(([topicName, topicData]) => {
                const topicDocs = topicData.documents.map(d => d.filename);
                const selectedInTopic = selectedDocuments.filter(doc => topicDocs.includes(doc)).length;

                return (
                  <div key={topicName} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{topicName}</span>
                      <button
                        onClick={() => handleSelectAll(topicDocs)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {selectedInTopic === topicDocs.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {selectedInTopic} of {topicDocs.length} selected
                    </div>
                    {topicData.documents.map((doc) => (
                      <DocumentCheckbox
                        key={doc.filename}
                        filename={doc.filename}
                        size={doc.size}
                        disabled={maxSelection && selectedDocuments.length >= maxSelection && !selectedDocuments.includes(doc.filename)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Folder-based Documents */}
      {documents?.folders && Object.keys(documents.folders).length > 0 && (
        <div className="border-b">
          <div
            className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleSection('folders')}
          >
            <h3 className="font-medium text-gray-900">
              Documents by Folder ({Object.keys(documents.folders).length} folders)
            </h3>
            <button className="text-gray-500">
              {expandedSections.folders ? '−' : '+'}
            </button>
          </div>
          {expandedSections.folders && (
            <div className="p-2">
              {Object.entries(documents.folders).map(([folderName, folderData]) => {
                const folderDocs = folderData.documents.map(d => d.filename);
                const selectedInFolder = selectedDocuments.filter(doc => folderDocs.includes(doc)).length;

                return (
                  <div key={folderName} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">{folderName}</span>
                      <button
                        onClick={() => handleSelectAll(folderDocs)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {selectedInFolder === folderDocs.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {selectedInFolder} of {folderDocs.length} selected
                    </div>
                    {folderData.documents.map((doc) => (
                      <DocumentCheckbox
                        key={doc.filename}
                        filename={doc.filename}
                        size={doc.size}
                        disabled={maxSelection && selectedDocuments.length >= maxSelection && !selectedDocuments.includes(doc.filename)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Similarity Groups */}
      {documents?.similarity_groups && documents.similarity_groups.length > 0 && (
        <div>
          <div
            className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleSection('similarity')}
          >
            <h3 className="font-medium text-gray-900">
              Similarity Groups ({documents.similarity_groups.length} groups)
            </h3>
            <button className="text-gray-500">
              {expandedSections.similarity ? '−' : '+'}
            </button>
          </div>
          {expandedSections.similarity && (
            <div className="p-2">
              {documents.similarity_groups.map((group, groupIndex) => {
                const groupDocs = group.documents;
                const selectedInGroup = selectedDocuments.filter(doc => groupDocs.includes(doc)).length;

                return (
                  <div key={groupIndex} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        Group {groupIndex + 1} ({group.similarity_percentage}% similar)
                      </span>
                      <button
                        onClick={() => handleSelectAll(groupDocs)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        {selectedInGroup === groupDocs.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {selectedInGroup} of {groupDocs.length} selected
                    </div>
                    {groupDocs.map((filename) => {
                      // Find document details
                      const doc = documents.uncategorized?.find(d => d.filename === filename) ||
                                Object.values(documents.topics || {}).flatMap(t => t.documents).find(d => d.filename === filename) ||
                                Object.values(documents.folders || {}).flatMap(f => f.documents).find(d => d.filename === filename);
                      return (
                        <DocumentCheckbox
                          key={filename}
                          filename={filename}
                          size={doc?.size}
                          disabled={maxSelection && selectedDocuments.length >= maxSelection && !selectedDocuments.includes(filename)}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DocumentSelector;
