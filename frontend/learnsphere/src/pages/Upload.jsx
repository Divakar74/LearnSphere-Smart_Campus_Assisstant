import React, { useState } from 'react';
import FileUpload from '../components/FileUpload';

const Upload = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-dark min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-light">Upload Documents</h1>
      <div className="backdrop-blur-lg bg-light/30 rounded-2xl shadow-xl p-8">
        <FileUpload onUploadSuccess={handleUploadSuccess} key={refreshKey} />
      </div>
    </div>
  );
};

export default Upload;
