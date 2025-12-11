import React from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ease-in-out">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 ease-in-out scale-100 opacity-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors duration-200 z-10"
        >
          ×
        </button>
        <div className="p-8 md:p-12">
          <h2 className="text-2xl md:text-3xl font-light text-gray-800 mb-8 leading-tight">{title}</h2>
          <div className="text-gray-700 leading-relaxed text-base md:text-lg space-y-6 max-w-3xl prose prose-gray">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;