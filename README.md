# Learning Assistant App Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Components](#backend-components)
4. [Frontend Components](#frontend-components)
5. [AI/ML Features](#aiml-features)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Authentication System](#authentication-system)
9. [File Upload & Processing](#file-upload--processing)
10. [User Interface Components](#user-interface-components)
11. [Features Summary](#features-summary)

## Overview

The Learning Assistant App is a comprehensive educational platform that combines traditional learning management with AI-powered features. The application allows users to create courses, upload documents (PDFs), generate summaries, ask questions to an AI assistant, and take AI-generated quizzes.

### Tech Stack
- **Backend**: Django REST Framework (Python)
- **Frontend**: React Native with Expo
- **AI/ML**: HuggingFace Transformers, LangChain, FAISS Vector DB
- **Database**: SQLite (development)
- **Authentication**: JWT tokens
- **File Processing**: PyMuPDF, PyPDF2, BeautifulSoup

## Architecture

### High-Level Architecture
```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│  React Native   │ ◄─────────────► │   Django REST   │
│   Frontend      │     API Calls   │     Backend     │
│   (Expo)        │                 │                 │
└─────────────────┘                 └─────────────────┘
                                            │
                                            │
                                    ┌───────▼───────┐
                                    │   AI Services │
                                    │ HuggingFace   │
                                    │  LangChain    │
                                    │   FAISS DB    │
                                    └───────────────┘
```

### Project Structure
```
Licenta/
├── backend/                 # Django REST API
│   ├── api/                # Main API app
│   ├── backend/            # Django settings
│   ├── media/              # Uploaded files
│   └── manage.py
├── frontend/
│   └── learning-assistant/ # React Native Expo app
└── env/                    # Python virtual environment
```

## Backend Components

### Models (`backend/api/models.py`)

#### 1. CustomUser
- **Purpose**: Extended Django user model with additional profile fields
- **Key Fields**:
  - `email`: Primary login field (unique)
  - `bio`: User biography
  - `profile_picture`: User avatar
- **Features**: Email-based authentication instead of username

#### 2. Course
- **Purpose**: Represents a learning course created by users
- **Key Fields**:
  - `title`: Course name
  - `description`: Course description
  - `owner`: Foreign key to CustomUser
  - `created_at/updated_at`: Timestamps
- **Relationships**: One-to-many with Chapters

#### 3. Chapter
- **Purpose**: Individual chapters within a course
- **Key Fields**:
  - `course`: Foreign key to Course
  - `title`: Chapter name
  - `order`: Chapter sequence number
- **Relationships**: One-to-many with Notes

#### 4. Note
- **Purpose**: Stores chapter content and AI-generated summaries
- **Key Fields**:
  - `chapter`: Foreign key to Chapter
  - `content`: HTML content (from PDFs or manual input)
  - `summary`: AI-generated summary
  - `progress`: Completion percentage (0-100)
- **Features**: Automatic progress tracking and summary generation

#### 5. Document
- **Purpose**: Manages uploaded PDF files
- **Key Fields**:
  - `title`: Document name
  - `file`: PDF file storage
  - `content`: Extracted text content
  - `uploaded_by`: User who uploaded
  - `course/chapter`: Associated course and chapter
- **Features**: Automatic text extraction and HTML conversion

#### 6. PDFAttachment
- **Purpose**: Stores extracted images from PDF documents
- **Key Fields**:
  - `document`: Foreign key to Document
  - `file`: Image file (PNG/JPEG)
  - `page_number`: Source page in PDF
  - `original_name`: Generated filename
- **Features**: Automatic image extraction during PDF processing

#### 7. UserCorrectAnswer
- **Purpose**: Tracks correctly answered questions to avoid repetition
- **Key Fields**:
  - `user`: User who answered
  - `note`: Associated note/chapter
  - `question_text`: The question
  - `question_type`: Type of question
  - `answer`: Correct answer
- **Features**: Prevents regenerating already mastered questions

### ViewSets and API Views

#### 1. CourseViewSet
- **CRUD operations** for courses
- **Access control**: Users can only access their own courses
- **Progress tracking**: Updates `UserCourseProgress` on access
- **Features**: Automatic progress calculation based on chapter completion

#### 2. ChapterViewSet
- **CRUD operations** for chapters
- **Auto-ordering**: Assigns sequential order numbers
- **Nested routing**: Accessible via `/courses/{id}/chapters/`
- **Permission checks**: Ensures user owns the parent course

#### 3. NoteViewSet
- **Content management** for chapters
- **Progress tracking**: Updates individual note progress
- **Course progress calculation**: Aggregates chapter progress to course level
- **One note per chapter**: Replaces existing notes on creation

### AI-Powered Endpoints

#### 1. Text Summarization (`/summarize-text/`)
- **Model**: `sshleifer/distilbart-cnn-12-6` (DistilBart)
- **Features**:
  - Three length options: short (10-15%), medium (15-25%), long (25-35%)
  - Intelligent chunking for long texts
  - HTML content cleaning
  - Minimum text length validation (500 characters)
  - Force regeneration option
- **Process**:
  1. Clean HTML and extract text
  2. Validate minimum length
  3. Split into chunks if needed
  4. Summarize each chunk
  5. Combine and post-process
  6. Save to database

#### 2. Question & Answer System (`/ask-question/`)
- **Technology**: RAG (Retrieval-Augmented Generation)
- **Components**:
  - **Embeddings**: `BAAI/bge-small-en-v1.5`
  - **Vector DB**: FAISS
  - **LLM**: `mistralai/Mistral-7B-Instruct-v0.3`
- **Process**:
  1. Extract and clean chapter content
  2. Split text into chunks (1800 chars with 300 overlap)
  3. Create vector embeddings
  4. Retrieve relevant chunks (top 12)
  5. Generate contextual answer
  6. Clean and validate response
- **Fallback mechanisms**: Direct LLM call if RAG fails

#### 3. Question Generation (`/generate-questions/`)
- **Types**: Multiple choice, True/False, Short answer, Mixed
- **Features**:
  - Avoids previously answered questions
  - Multiple generation attempts with different text sections
  - Intelligent parsing of LLM responses
  - Fallback question generation
- **Question Types**:
  - **Multiple Choice**: 2-4 options with distractor generation
  - **True/False**: Statement validation with strategic false statements
  - **Short Answer**: Open-ended questions requiring written responses
- **Quality Control**: Filters repetitive content and validates structure

### Document Processing System

#### PDF Processing (`process_pdf()`)
- **Text Extraction**:
  - Uses PyPDF2 for text extraction
  - Visitor pattern for font and layout analysis
  - HTML conversion with heading detection
  - Page range selection (1-10 pages max)
- **Image Extraction**:
  - PyMuPDF for high-quality image extraction
  - Minimum size filtering (100px)
  - Maximum image limit (20 images)
  - Automatic filename generation
- **HTML Generation**:
  - Font size analysis for heading detection
  - Paragraph grouping based on positioning
  - Bold text preservation
  - Clean HTML structure

#### Upload Workflow
1. **PDF Info Extraction**: Basic metadata (pages, sample text)
2. **Page Range Selection**: User chooses specific pages
3. **Content Processing**: Text and image extraction
4. **Conflict Resolution**: Handle existing documents
5. **Database Storage**: Save document and attachments
6. **Note Creation**: Create/update chapter content

## Frontend Components

### Authentication System (`hooks/useAuth.ts`)

#### AuthProvider
- **JWT Token Management**: Automatic refresh and storage
- **Persistent Sessions**: AsyncStorage for token persistence  
- **Auto-logout**: Token expiration handling
- **Registration Flow**: Complete user registration process

#### Login/Register Screens
- **Login** (`app/(auth)/login.tsx`):
  - Email/password authentication
  - Loading states and error handling
  - Automatic navigation on success
- **Register** (`app/screens/RegisterScreen.tsx`):
  - Multi-field form validation
  - Password confirmation
  - Real-time error feedback

### Navigation Structure

#### Tab Navigation (`app/(tabs)/_layout.tsx`)
- **Home**: Course listing and management
- **Create Course**: New course creation
- **Assistant**: AI-powered Q&A interface
- **Questions**: Quiz generation and taking
- **Profile**: User account management

#### Stack Navigation
- **Course Detail**: Individual course view with chapters
- **Chapter Detail**: Content viewing and editing
- **Chapter Creation**: New chapter forms
- **Document Upload**: PDF upload interface

### Course Management

#### Home Screen (`app/(tabs)/index.tsx`)
- **Course Grid**: Visual course cards with progress indicators
- **Selection Mode**: Multi-select for bulk operations
- **Progress Tracking**: Visual progress bars
- **Quick Actions**: Course access and management

#### Course Detail (`app/(tabs)/course/[id].tsx`)
- **Chapter Listing**: Ordered chapter display
- **Chapter Management**: Create, edit, delete chapters
- **Progress Overview**: Course-wide progress tracking
- **Selection System**: Long-press chapter selection

#### Chapter Views
- **Chapter Detail** (`app/chapter/[id].tsx`):
  - Rich text content display
  - Note editing with progress tracking
  - Image attachments viewing
  - Action menu (summarize, edit, delete)
- **Chapter Creation** (`app/chapter/create.tsx`):
  - Simple title input form
  - Automatic course association
- **Chapter Editing** (`app/chapter/edit.tsx`):
  - Title modification
  - Content preservation

### Document Management

#### Upload Interface (`app/(tabs)/load_documents.tsx`)
- **PDF Selection**: Document picker integration
- **PDF Preview**: Basic info display (pages, sample text)
- **Page Range**: Selective page processing (1-10 pages)
- **Course/Chapter Assignment**: Flexible content organization
- **Progress Tracking**: Upload status and completion
- **Conflict Resolution**: Handle existing documents

### AI Features Interface

#### Assistant Screen (`app/(tabs)/assistant.tsx`)
- **Course/Chapter Selection**: Hierarchical content selection
- **Question Input**: Multi-line text input with validation
- **Context Awareness**: Content availability checking
- **Response Display**: Formatted AI answers
- **Auto-population**: URL parameter support from questions screen
- **Loading States**: Processing indicators

#### Questions Screen (`app/(tabs)/questions.tsx`)
- **Question Generation**: AI-powered quiz creation
- **Question Types**: Multiple choice, true/false, short answer
- **Interactive Quiz**: Real-time answer checking
- **Progress Tracking**: Question completion status
- **Results Analysis**: Score calculation and feedback
- **Deep Linking**: Integration with assistant for follow-up questions

#### Summarization (`app/chapter/summarize.tsx`)
- **Length Selection**: Short, medium, long options
- **Content Analysis**: Word count and complexity assessment
- **Summary Display**: Formatted output with statistics
- **Regeneration**: Force new summary creation
- **Progress Integration**: Automatic progress updates

### UI Components

#### Custom Components (`components/ui/`)
- **Text**: Styled text component with consistent typography
- **Button**: Interactive button with loading states and disabled states
- **TextInput**: Form input with validation styling

#### Specialized Components
- **CourseCard** (`components/CourseCard.tsx`):
  - Progress visualization
  - Selection states
  - Action handling
- **ChapterPicker** (`components/ChapterPicker.tsx`):
  - Hierarchical chapter selection
  - Course filtering
  - Dynamic loading
- **CustomTabBar** (`components/CustomTabBar.tsx`):
  - Icon-based navigation
  - Active state indicators

### State Management

#### API Service (`services/api.ts`)
- **Base URL Configuration**: Environment-specific endpoints
- **Request Interceptors**: Automatic token attachment
- **Response Handling**: Error processing and data transformation
- **Specialized APIs**: Course, chapter, document, and AI endpoints

#### Authentication Service (`services/authService.ts`)
- **Token Management**: JWT storage and refresh
- **User Profile**: Current user data fetching
- **Session Validation**: Token expiration checking
- **Logout Handling**: Clean session termination

## AI/ML Features

### Text Summarization
- **Model**: DistilBart CNN (optimized for summarization)
- **Approach**: Extractive and abstractive summarization
- **Features**:
  - Variable length control
  - Content quality validation
  - Chunk processing for long texts
  - HTML content cleaning

### Question Generation
- **Technology**: Large Language Model with structured prompts
- **Capabilities**:
  - Multiple question types
  - Context-aware generation
  - Difficulty balancing
  - Duplicate avoidance
- **Quality Control**:
  - Response parsing and validation
  - Fallback generation
  - Content filtering

### RAG System (Retrieval-Augmented Generation)
- **Vector Database**: FAISS for similarity search
- **Embeddings**: BGE small model for efficient processing
- **Retrieval**: Top-k similar chunks
- **Generation**: Contextual answer synthesis
- **Optimization**: Content length limits and chunking strategies

## API Endpoints

### Authentication
- `POST /api/register/` - User registration
- `POST /api/token/` - Login (JWT token generation)
- `POST /api/token/refresh/` - Token refresh
- `GET /api/user/profile/` - User profile
- `PUT /api/user/profile/` - Update profile

### Course Management
- `GET /api/courses/` - List user courses
- `POST /api/courses/` - Create course
- `GET /api/courses/{id}/` - Course detail
- `PUT /api/courses/{id}/` - Update course
- `DELETE /api/courses/{id}/` - Delete course

### Chapter Management
- `GET /api/courses/{id}/chapters/` - List chapters
- `POST /api/courses/{id}/chapters/` - Create chapter
- `GET /api/courses/{id}/chapters/{id}/` - Chapter detail
- `PUT /api/courses/{id}/chapters/{id}/` - Update chapter
- `DELETE /api/courses/{id}/chapters/{id}/` - Delete chapter

### Notes Management
- `GET /api/courses/{id}/chapters/{id}/notes/` - List notes
- `POST /api/courses/{id}/chapters/{id}/notes/` - Create note
- `PUT /api/courses/{id}/chapters/{id}/notes/{id}/` - Update note

### Document Management
- `POST /api/get-pdf-info/` - PDF metadata extraction
- `POST /api/upload-document/` - Document upload and processing
- `GET /api/documents/` - List user documents
- `GET /api/documents/{id}/attachments/` - Document images

### AI Services
- `POST /api/summarize-text/` - Text summarization
- `POST /api/ask-question/` - AI question answering
- `POST /api/generate-questions/` - Question generation
- `POST /api/save-correct-answers/` - Save quiz results

## Database Schema

### Relationships
```
CustomUser 1──▶ ∞ Course
Course 1──▶ ∞ Chapter  
Chapter 1──▶ ∞ Note
Chapter 1──▶ ∞ Document
Document 1──▶ ∞ PDFAttachment
CustomUser + Course ──▶ UserCourseProgress
CustomUser + Note ──▶ ∞ UserCorrectAnswer
```

### Key Indexes
- User email (unique)
- Course owner + updated_at
- Chapter course + order
- Document chapter + uploaded_by
- UserCorrectAnswer user + note + question_text (unique)

## Authentication System

### JWT Implementation
- **Access Tokens**: Short-lived (15 minutes)
- **Refresh Tokens**: Long-lived (7 days)
- **Auto-refresh**: Transparent token renewal
- **Storage**: Secure AsyncStorage on mobile

### Permission System
- **Owner-based Access**: Users can only access their own content
- **Nested Permissions**: Course ownership propagates to chapters/notes
- **API Protection**: All endpoints require authentication
- **Frontend Guards**: Route protection for unauthenticated users

## File Upload & Processing

### PDF Processing Pipeline
1. **Upload Validation**: File type and size checks
2. **Metadata Extraction**: Page count, sample text
3. **Page Selection**: User chooses range (1-10 pages)
4. **Content Processing**: 
   - Text extraction with formatting
   - Image extraction and optimization
   - HTML generation
5. **Storage**: File system storage with database references
6. **Integration**: Automatic note creation/update

### File Management
- **Storage**: Local file system in `media/` directory
- **Organization**: Separate folders for documents and images
- **Cleanup**: Automatic file deletion on record removal
- **Security**: User-based access control

## User Interface Components

### Design System
- **Typography**: Consistent font weights and sizes
- **Colors**: Primary blue theme with semantic colors
- **Spacing**: 4px grid system
- **Shadows**: Layered elevation system

### Responsive Design
- **Mobile-first**: Optimized for mobile devices
- **Web Support**: Cross-platform compatibility
- **Accessibility**: Screen reader support and contrast compliance

### User Experience
- **Loading States**: Clear feedback during operations
- **Error Handling**: User-friendly error messages
- **Navigation**: Intuitive tab and stack navigation
- **Gestures**: Long-press for selection, pull-to-refresh

## Features Summary

### Core Features
1. **Course Management**: Create, organize, and track learning courses
2. **Document Upload**: PDF processing with text and image extraction
3. **Content Creation**: Rich text editing and note-taking
4. **Progress Tracking**: Automatic progress calculation and visualization

### AI-Powered Features
1. **Text Summarization**: Variable-length summary generation
2. **Question Answering**: Context-aware AI assistant
3. **Quiz Generation**: Automatic question creation with multiple types
4. **Smart Learning**: Adaptive question generation avoiding repetition

### Advanced Features
1. **Vector Search**: Semantic similarity search for relevant content
2. **Multi-modal Processing**: Text and image content handling
3. **Real-time Updates**: Live progress and content synchronization
4. **Cross-platform Support**: Mobile and web compatibility

### User Experience Features
1. **Offline Capability**: Local storage for seamless experience
2. **Deep Linking**: URL-based navigation and sharing
3. **Bulk Operations**: Multi-select for efficient management
4. **Auto-save**: Automatic content preservation

This learning assistant app represents a comprehensive educational platform that combines traditional learning management with cutting-edge AI technologies to provide an intelligent, adaptive learning experience. 
