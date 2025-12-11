import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { isAuthenticated, logout, userData } = useAuth();

  return (
    <nav className="bg-dark shadow-lg border-b border-darker">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-light hover:text-accent transition duration-300">LearnSphere</Link>
          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link to="/" className="text-light hover:text-accent transition duration-300 font-medium">Home</Link>
                <Link to="/dashboard" className="text-light hover:text-accent transition duration-300 font-medium">Dashboard</Link>
                <span className="text-light">Welcome, {userData?.username}</span>
                <button
                  onClick={logout}
                  className="bg-accent text-dark px-4 py-2 rounded hover:bg-darker transition duration-300 font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-light hover:text-accent transition duration-300 font-medium">Login</Link>
                <Link to="/register" className="bg-accent text-dark px-4 py-2 rounded hover:bg-darker transition duration-300 font-medium">Register</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
