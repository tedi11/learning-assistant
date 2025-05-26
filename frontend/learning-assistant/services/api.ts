import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Course, Chapter } from '@/types';

// Get the correct API URL based on platform
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api'; // Android emulator
  } else if (Platform.OS === 'ios') {
    return 'http://192.168.1.135:8000/api'; // iOS simulator
  } else {
    return 'http://192.168.1.135:8000/api'; // Web/desktop
  }
};

const BASE_URL = getApiUrl();

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// API methods for courses
export const courseApi = {
  getCourses: () => api.get<Course[]>('/courses/'),
  getCourse: (id: number) => api.get<Course>(`/courses/${id}/`),
  createCourse: (data: Partial<Course>) => api.post<Course>('/courses/', data),
  updateCourse: (id: number, data: Partial<Course>) => api.put<Course>(`/courses/${id}/`, data),
  deleteCourse: (id: number) => api.delete(`/courses/${id}/`),
};

// API methods for chapters
export const chapterApi = {
  getChapters: (courseId: number) => {
    console.log('Fetching chapters for course:', courseId);
    return api.get<Chapter[]>(`/courses/${courseId}/chapters/`);
  },
  getChapter: (courseId: number, chapterId: number) => 
    api.get<Chapter>(`/courses/${courseId}/chapters/${chapterId}/`),
  createChapter: (courseId: number, data: Partial<Chapter>) => 
    api.post<Chapter>(`/courses/${courseId}/chapters/`, data),
  updateChapter: (courseId: number, chapterId: number, data: Partial<Chapter>) => 
    api.put<Chapter>(`/courses/${courseId}/chapters/${chapterId}/`, data),
  deleteChapter: (courseId: number, chapterId: number) => 
    api.delete(`/courses/${courseId}/chapters/${chapterId}/`),
};

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log('API Request:', {
        method: config.method,
        url: config.url,
        headers: config.headers,
        baseURL: config.baseURL,
      });
      return config;
    } catch (error) {
      console.error('Error in request interceptor:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log the error for debugging
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      config: error.config,
      message: error.message,
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const response = await axios.post(`${BASE_URL}/login/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        await AsyncStorage.setItem('token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear tokens and redirect to login
        await AsyncStorage.multiRemove(['token', 'refreshToken']);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
); 