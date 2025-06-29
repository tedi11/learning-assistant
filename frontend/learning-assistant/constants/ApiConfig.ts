// API Configuration - Centralized configuration for all API endpoints
// Update this URL when you get a new ngrok tunnel

export const API_CONFIG = {
  // Ngrok URL - Update this when you get a new tunnel
  BASE_URL: ' https://d66a-2a02-2f00-6200-fa00-75b7-4693-802f-3643.ngrok-free.app',
  
  // Timeout settings
  TIMEOUT: 120000, // 120 seconds
  
  // Headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Helper function to get the full API URL for an endpoint
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.BASE_URL}/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/login/',
  REGISTER: '/register/',
  REFRESH_TOKEN: '/login/refresh/',
  
  // User Profile
  PROFILE: '/profile/',
  
  // Courses
  COURSES: '/courses/',
  COURSE_DETAIL: (id: number) => `/courses/${id}/`,
  
  // Chapters
  CHAPTERS: (courseId: number) => `/courses/${courseId}/chapters/`,
  CHAPTER_DETAIL: (courseId: number, chapterId: number) => `/courses/${courseId}/chapters/${chapterId}/`,
  
  // Notes
  NOTES: (courseId: number, chapterId: number) => `/courses/${courseId}/chapters/${chapterId}/notes/`,
  NOTE_DETAIL: (courseId: number, chapterId: number, noteId: number) => `/courses/${courseId}/chapters/${chapterId}/notes/${noteId}/`,
  
  // Documents
  DOCUMENTS: '/documents/',
  DOCUMENT_UPLOAD: '/documents/upload/',
  DOCUMENT_PDF_INFO: '/documents/pdf-info/',
  DOCUMENT_ATTACHMENTS: (documentId: number) => `/documents/${documentId}/attachments/`,
  
  // AI Features
  ASK_QUESTION: '/ask-question/',
  GENERATE_QUESTIONS: '/generate-questions/',
  SAVE_CORRECT_ANSWERS: '/save-correct-answers/',
  SUMMARIZE_TEXT: '/summarize/',
}; 