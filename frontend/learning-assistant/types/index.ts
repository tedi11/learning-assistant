export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_picture?: string;
  date_joined: string;
  courses_count: number;
}

export interface Course {
  id: number;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  owner: string;
  progress?: number;
  last_accessed?: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: number;
  title: string;
  order: number;
  created_at: string;
  updated_at: string;
  notes?: Note[];
}

export interface Note {
  id: number;
  content: string;
  summary?: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  chapter: number;
  file: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentAttachment {
  id: number;
  document: number;
  file: string;
  page_number: number;
  created_at: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: number;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
  options: QuestionOption[];
  answer: string;
  userAnswer?: string;
  isCorrect?: boolean;
}

export interface QuestionSet {
  questions: Question[];
  chapter_title: string;
} 