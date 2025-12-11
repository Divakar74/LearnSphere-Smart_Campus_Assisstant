import React, { createContext, useState, useContext, useEffect } from 'react';
import { login as apiLogin, register as apiRegister } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate token and userData from localStorage ONLY on first render
    const storedToken = localStorage.getItem('token');
    const storedUserData = JSON.parse(localStorage.getItem('userData') || 'null');

    console.log('DEBUG: AuthContext useEffect - storedToken:', !!storedToken, 'storedUserData:', !!storedUserData);
    console.log('DEBUG: AuthContext useEffect - storedToken value:', storedToken ? storedToken.substring(0, 20) + '...' : 'null');
    console.log('DEBUG: AuthContext useEffect - storedUserData:', storedUserData);
    if (storedToken && storedUserData) {
      setToken(storedToken);
      setUserData(storedUserData);
    }
    setLoading(false);
  }, []);

  // Debug: Log authentication state changes
  useEffect(() => {
    console.log('DEBUG: AuthContext - userData state changed:', userData ? userData.username : 'null');
    console.log('DEBUG: AuthContext - isAuthenticated:', !!token && !!userData);
  }, [userData, token]);


  const login = async (username, password) => {
    try {
      console.log('DEBUG: AuthContext login - attempting login for username:', username);
      const response = await apiLogin(username, password);
      console.log('DEBUG: AuthContext login - apiLogin response:', response);
      const { access_token, user: userData } = response;

      console.log('DEBUG: AuthContext login - access_token:', access_token);
      console.log('DEBUG: AuthContext login - userData:', userData);
      console.log('DEBUG: AuthContext login - storing token and user data');
      localStorage.setItem('token', access_token);
      localStorage.setItem('userData', JSON.stringify(userData));
      console.log('DEBUG: Token stored in localStorage:', access_token);
      setToken(access_token);
      setUserData(userData);

      // Wait for state update to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      console.log('DEBUG: AuthContext login - user state set, returning success');
      return { success: true };
    } catch (error) {
      console.log('DEBUG: AuthContext login - login error:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (username, email, password) => {
    try {
      console.log('DEBUG: AuthContext register - attempting register');
      const response = await apiRegister(username, email, password);
      console.log('DEBUG: AuthContext register - register response:', response);
      const { access_token, user: userData } = response;

      console.log('DEBUG: AuthContext register - storing token and user data');
      localStorage.setItem('token', access_token);
      localStorage.setItem('userData', JSON.stringify(userData));
      setToken(access_token);
      setUserData(userData);

      console.log('DEBUG: AuthContext register - user set, returning success');
      return { success: true };
    } catch (error) {
      console.log('DEBUG: AuthContext register - register error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    console.log('DEBUG: AuthContext logout - logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setToken(null);
    setUserData(null);
  };

  const value = {
    userData,
    token,
    login,
    register,
    logout,
    isAuthenticated: !!token && !!userData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
