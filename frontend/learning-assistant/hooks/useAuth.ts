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
      const token = await authService.getToken();
      if (token) {
        // Try to get current user - the api interceptor will handle token refresh if needed
        const response = await authService.getCurrentUser();
        setUser(response.data);
      }
    } catch (error: any) {
      // Only log non-401 errors to reduce noise
      if (error.response?.status !== 401) {
        console.error('Auth check failed:', error);
      }
      // Clear invalid tokens silently
      await authService.logout();
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