import React, { useState, useEffect, createContext, useContext, PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '@/services/authService';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, username: string, firstName: string, lastName: string, password: string, password2: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      console.log('Starting authentication check...');
      
      // First check if we have valid tokens at all
      const hasValidTokens = await authService.hasValidTokens();
      if (!hasValidTokens) {
        console.log('No valid tokens found');
        setLoading(false);
        return;
      }

      // Try to get current user - the api interceptor will handle token refresh if needed
      console.log('Valid tokens found, checking user profile...');
      const response = await authService.getCurrentUser();
      setUser(response.data);
      console.log('Authentication check successful');
    } catch (error: any) {
      console.log('Authentication check failed:', error.message);
      
      // Clear invalid tokens - this handles both expired and invalid tokens
      await authService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await authService.login(email, password);
      await checkAuth();
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const register = async (email: string, username: string, firstName: string, lastName: string, password: string, password2: string) => {
    try {
      await authService.register(email, username, firstName, lastName, password, password2);
      await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    register,
  };

  return React.createElement(AuthContext.Provider, { value: contextValue }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 