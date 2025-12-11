import React from 'react';
import ChatInterface from '../components/ChatInterface';

const Chat = () => {
  return (
    <div className="container mx-auto px-6 py-8 h-screen flex flex-col bg-dark">
      <h1 className="text-3xl font-bold text-center mb-8 text-light font-roboto">AI Assisstant</h1>
      <h2 className="text-2xl font-bold text-center mb-8 text-light">Shoot your Questions</h2>
      <div className="flex-1 backdrop-blur-lg bg-light/30 rounded-2xl shadow-xl overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
};

export default Chat;
