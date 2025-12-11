import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDocument, getFolders } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import FolderCreation from './FolderCreation';

const FileUpload = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [summary, setSummary] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const { userData, logout } = useAuth();

  useEffect(() => {
    fetchFolders();
  }, [userData]);

  const fetchFolders = async () => {
    try {
      console.log('DEBUG: FileUpload - fetching folders');
      const foldersData = await getFolders();
      console.log('DEBUG: FileUpload - folders fetched:', foldersData);
      setFolders(foldersData);
    } catch (error) {
      console.error('Error fetching folders:', error);
      if (error.message.includes('status: 401')) {
        logout();
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      try {
        const userId = userData?.id || 'default_user';
        const response = await uploadDocument(file, userId, selectedFolderId || null);
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          status: 'success',
          summary: response.summary,
          aiMode: response.ai_mode
        }]);
        setSummary(response.summary);
        setAiMode(response.ai_mode === 'active');
        onUploadSuccess();
      } catch (error) {
        setUploadedFiles(prev => [...prev, { name: file.name, status: 'error' }]);
      }
    }
    setUploading(false);
  }, [onUploadSuccess, userData, selectedFolderId]);

  const handleFolderCreated = (newFolder) => {
    setFolders(prev => [...prev, newFolder]);
    setSelectedFolderId(newFolder.id.toString());
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: selectedFolderId ? {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt']
    } : {},
    maxSize: 16 * 1024 * 1024, // 16MB
    noDrag: !selectedFolderId
  });

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Folder Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Choose a Folder for Your Documents
        </label>
        {folders.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id.toString())}
                className={`p-3 border-2 rounded-lg text-left transition-all duration-200 ${
                  selectedFolderId === folder.id.toString()
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">📁</span>
                  <span className="font-medium truncate">{folder.name}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{folder.description || 'No description'}</p>
              </button>
            ))}
            <button
              onClick={() => setShowCreateFolder(true)}
              className="p-3 border-2 border-dashed border-green-300 rounded-lg text-green-600 hover:bg-green-50 transition-all duration-200 flex flex-col items-center justify-center min-h-[60px]"
            >
              <span className="text-2xl mb-1">+</span>
              <span className="text-sm font-medium">New Folder</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 mb-4">No folders yet. Create your first folder to organize your documents.</p>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition duration-300"
            >
              Create Your First Folder
            </button>
          </div>
        )}
        {selectedFolderId && (
          <p className="text-sm text-blue-600 text-center">
            Selected: {folders.find(f => f.id.toString() === selectedFolderId)?.name}
          </p>
        )}
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          !selectedFolderId
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            : isDragActive
            ? 'border-primary-500 bg-primary-50 scale-105 cursor-pointer hover:shadow-lg'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50 cursor-pointer hover:shadow-lg'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="text-6xl">
            {isDragActive ? '📂' : selectedFolderId ? '📄' : '📁'}
          </div>
          {!selectedFolderId ? (
            <div>
              <p className="text-xl font-semibold text-gray-700">Select a folder first</p>
              <p className="text-gray-500 mt-1">Choose a folder above to start uploading documents</p>
            </div>
          ) : isDragActive ? (
            <div>
              <p className="text-xl font-semibold text-primary-700">Drop your documents here!</p>
              <p className="text-sm text-primary-600 mt-1">Release to start processing</p>
            </div>
          ) : (
            <div>
              <p className="text-xl font-semibold text-primary-900">Drag & drop your documents</p>
              <p className="text-primary-700 mt-1">or click to browse files</p>
            </div>
          )}
          {selectedFolderId && (
            <>
              <div className="flex justify-center space-x-4 text-sm text-gray-500">
                <span className="bg-gray-100 px-3 py-1 rounded-full">PDF</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">DOCX</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">PPTX</span>
                <span className="bg-gray-100 px-3 py-1 rounded-full">TXT</span>
              </div>
              <p className="text-xs text-gray-400">Maximum file size: 16MB</p>
            </>
          )}
        </div>
      </div>

      {/* Folder Creation Modal */}
      <FolderCreation
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onFolderCreated={handleFolderCreated}
      />

      {uploading && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="font-medium">Processing document...</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Extracting text, generating summary, and creating embeddings</p>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-semibold text-gray-800">Processing Results</h3>
          {uploadedFiles.map((file, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">{file.name}</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  file.status === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {file.status === 'success' ? '✅ Processed' : '❌ Failed'}
                </span>
              </div>
              {file.summary && (
                <div className="mt-3 p-3 bg-primary-50 rounded-lg">
                  <p className="text-sm font-medium text-primary-800 mb-1">AI Summary:</p>
                  <p className="text-sm text-primary-700 leading-relaxed">{file.summary}</p>
                </div>
              )}
              {file.aiMode && (
                <div className="mt-2 flex items-center text-sm text-green-600">
                  <span className="mr-1">🤖</span>
                  AI Assistant ready for questions
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
