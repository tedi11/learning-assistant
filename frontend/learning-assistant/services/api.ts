import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Course, Chapter } from '@/types';
import { API_CONFIG, API_ENDPOINTS } from '@/constants/ApiConfig';

// Use the centralized API configuration
const BASE_URL = API_CONFIG.BASE_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: API_CONFIG.DEFAULT_HEADERS,
  timeout: API_CONFIG.TIMEOUT,
});

// API methods for courses
export const courseApi = {
  getCourses: () => api.get<Course[]>(API_ENDPOINTS.COURSES),
  getCourse: (id: number) => api.get<Course>(API_ENDPOINTS.COURSE_DETAIL(id)),
  createCourse: (data: Partial<Course>) => api.post<Course>(API_ENDPOINTS.COURSES, data),
  updateCourse: (id: number, data: Partial<Course>) => api.put<Course>(API_ENDPOINTS.COURSE_DETAIL(id), data),
  deleteCourse: (id: number) => api.delete(API_ENDPOINTS.COURSE_DETAIL(id)),
};

// API methods for chapters
export const chapterApi = {
  getChapters: (courseId: number) => {
    console.log('Fetching chapters for course:', courseId);
    return api.get<Chapter[]>(API_ENDPOINTS.CHAPTERS(courseId));
  },
  getChapter: (courseId: number, chapterId: number) => 
    api.get<Chapter>(API_ENDPOINTS.CHAPTER_DETAIL(courseId, chapterId)),
  createChapter: (courseId: number, data: Partial<Chapter>) => 
    api.post<Chapter>(API_ENDPOINTS.CHAPTERS(courseId), data),
  updateChapter: (courseId: number, chapterId: number, data: Partial<Chapter>) => 
    api.put<Chapter>(API_ENDPOINTS.CHAPTER_DETAIL(courseId, chapterId), data),
  deleteChapter: (courseId: number, chapterId: number) => 
    api.delete(API_ENDPOINTS.CHAPTER_DETAIL(courseId, chapterId)),
};

// API methods for questions
export const questionApi = {
  generateQuestions: (chapterId: number, questionCount: number = 5, questionType: string = 'mixed') => 
    api.post(API_ENDPOINTS.GENERATE_QUESTIONS, { chapterId, questionCount, questionType }),
  saveCorrectAnswers: (chapterId: number, correctAnswers: Array<{questionText: string, questionType: string, answer: string}>) => {
    console.log('=== API CALL: saveCorrectAnswers ===');
    console.log('Request data:', { chapterId, correctAnswers });
    console.log('Request URL:', API_ENDPOINTS.SAVE_CORRECT_ANSWERS);
    return api.post(API_ENDPOINTS.SAVE_CORRECT_ANSWERS, { chapterId, correctAnswers });
  },
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
        if (!refreshToken) {
          // No refresh token available, clear tokens and reject
          console.log('No refresh token available, clearing tokens');
          await AsyncStorage.multiRemove(['token', 'refreshToken']);
          return Promise.reject(error);
        }

        console.log('Attempting to refresh token...');
        const response = await axios.post(`${BASE_URL}${API_ENDPOINTS.REFRESH_TOKEN}`, {
          refresh: refreshToken,
        });

        if (response.data?.access) {
          const { access } = response.data;
          await AsyncStorage.setItem('token', access);
          
          // Update the original request with the new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          console.log('Token refreshed successfully, retrying original request');
          
          // Retry the original request
          return api(originalRequest);
        } else {
          // Invalid refresh response
          console.log('Invalid refresh response, clearing tokens');
          await AsyncStorage.multiRemove(['token', 'refreshToken']);
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // If refresh fails, clear tokens and reject the original error
        await AsyncStorage.multiRemove(['token', 'refreshToken']);
        return Promise.reject(error); // Return original error, not refresh error
      }
    }

    return Promise.reject(error);
  }
); 