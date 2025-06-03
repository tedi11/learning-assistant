from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from .models import Item, CustomUser, Course, UserCourseProgress, Chapter, Note, Document, PDFAttachment, UserCorrectAnswer
from .serializers import (
    ItemSerializer, 
    UserRegistrationSerializer,
    UserSerializer,
    CourseSerializer,
    ChapterSerializer,
    NoteSerializer
)
from transformers import pipeline, AutoTokenizer
from bs4 import BeautifulSoup
import re
import PyPDF2
import io
from django.core.files.base import ContentFile
import fitz  # PyMuPDF
import os
from django.core.cache import cache
from django.utils.crypto import get_random_string
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEndpoint
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from typing import Iterable, Any, Dict
from langchain_core.documents import Document as LCDocument
import requests
import json
from langchain_core.runnables.base import Runnable

# Create your views here.

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]

class RegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        This view should return a list of all courses
        for the currently authenticated user.
        """
        return Course.objects.filter(owner=self.request.user).order_by('-updated_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Check if the user has access to this course
        if instance.owner != request.user:
            return Response(
                {"detail": "You do not have permission to access this course."},
                status=status.HTTP_403_FORBIDDEN
            )
            
        # Create or update progress when course is accessed
        progress, created = UserCourseProgress.objects.get_or_create(
            user=request.user,
            course=instance,
            defaults={'progress': 0}
        )
        if not created:
            progress.save()  # Updates last_accessed
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

class ChapterViewSet(viewsets.ModelViewSet):
    serializer_class = ChapterSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        course_id = self.kwargs.get('course_pk')
        if course_id is not None:
            # First check if the user owns the course
            try:
                course = Course.objects.get(id=course_id, owner=self.request.user)
                return Chapter.objects.filter(course=course).order_by('order', 'created_at')
            except Course.DoesNotExist:
                return Chapter.objects.none()
        return Chapter.objects.none()

    def perform_create(self, serializer):
        course_id = self.kwargs.get('course_pk')
        try:
            course = Course.objects.get(id=course_id, owner=self.request.user)
            # Get the highest order number and add 1
            last_order = Chapter.objects.filter(course=course).order_by('-order').first()
            new_order = (last_order.order + 1) if last_order else 0
            serializer.save(course=course, order=new_order)
        except Course.DoesNotExist:
            raise PermissionError("You do not have permission to add chapters to this course.")

class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        chapter_id = self.kwargs.get('chapter_pk')
        course_id = self.kwargs.get('course_pk')
        if chapter_id and course_id:
            # Check if user owns the course
            course = get_object_or_404(Course, id=course_id, owner=self.request.user)
            chapter = get_object_or_404(Chapter, id=chapter_id, course=course)
            return Note.objects.filter(chapter=chapter)
        return Note.objects.none()

    def perform_create(self, serializer):
        chapter_id = self.kwargs.get('chapter_pk')
        course_id = self.kwargs.get('course_pk')
        course = get_object_or_404(Course, id=course_id, owner=self.request.user)
        chapter = get_object_or_404(Chapter, id=chapter_id, course=course)
        # Delete any existing notes for this chapter (since we want only one note per chapter)
        Note.objects.filter(chapter=chapter).delete()
        # Create new note with progress explicitly set to 0
        note = serializer.save(chapter=chapter, progress=0)
        # Update course progress
        self.update_course_progress(course)

    def perform_update(self, serializer):
        # Ensure the user owns the course before allowing update
        note = self.get_object()
        if note.chapter.course.owner != self.request.user:
            raise PermissionError("You do not have permission to update this note.")
        
        # Get the progress value from the request data
        progress = self.request.data.get('progress')
        
        # Print debug information
        print(f"Updating note {note.id} with progress: {progress}")
        print(f"Request data: {self.request.data}")
        
        # If we're updating progress, make sure it's preserved
        if progress is not None:
            serializer.save(progress=progress)
        else:
            # If we're not updating progress, preserve the existing progress value
            serializer.save(progress=note.progress)
        
        # Update course progress
        self.update_course_progress(note.chapter.course)

    def update_course_progress(self, course):
        # Get all chapters for the course
        chapters = Chapter.objects.filter(course=course)
        total_chapters = chapters.count()
        
        if total_chapters == 0:
            return
        
        # Calculate average progress across all chapters
        total_progress = 0
        chapter_count = 0
        
        # Print debug information
        print(f"\nCalculating progress for course {course.id}:")
        
        for chapter in chapters:
            note = Note.objects.filter(chapter=chapter).first()
            if note:
                print(f"Chapter {chapter.id} progress: {note.progress}")
                total_progress += note.progress
                chapter_count += 1
        
        # Calculate overall course progress
        if chapter_count > 0:
            course_progress = int(total_progress / chapter_count)
        else:
            course_progress = 0
            
        print(f"Total progress: {total_progress}")
        print(f"Chapter count: {chapter_count}")
        print(f"Course progress: {course_progress}")
        
        # Update or create UserCourseProgress
        progress, _ = UserCourseProgress.objects.get_or_create(
            user=course.owner,
            course=course,
            defaults={'progress': course_progress}
        )
        progress.progress = course_progress
        progress.save()
        
        print(f"Updated UserCourseProgress for course {course.id} to {course_progress}%")

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def summarize_text(request):
    try:
        text = request.data.get('text', '')
        chapter_id = request.data.get('chapterId')
        course_id = request.data.get('courseId')
        summary_length = request.data.get('summaryLength', 'medium')  # 'short', 'medium', 'long'
        force_regenerate = request.data.get('forceRegenerate', False)  # Allow regenerating existing summaries
        
        # Text length threshold - minimum characters needed for summarization
        MIN_TEXT_LENGTH = 500  # Threshold for minimum text length
        
        # First check if we already have a summary and not forcing regeneration
        course = get_object_or_404(Course, id=course_id, owner=request.user)
        chapter = get_object_or_404(Chapter, id=chapter_id, course=course)
        note = Note.objects.filter(chapter=chapter).first()
        
        if note and note.summary and not force_regenerate:
            return Response({
                'summary': note.summary,
                'isExisting': True,
                'summaryLength': 'existing'
            })
        
        # Remove HTML tags and clean the text
        soup = BeautifulSoup(text, 'html.parser')
        clean_text = soup.get_text()
        # Remove extra whitespace
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        # Check if text is too short for summarization
        if len(clean_text) < MIN_TEXT_LENGTH:
            return Response({
                'error': 'TEXT_TOO_SHORT',
                'message': f'Text is too short for summarization. Minimum {MIN_TEXT_LENGTH} characters required, but only {len(clean_text)} characters found.',
                'textLength': len(clean_text),
                'minLength': MIN_TEXT_LENGTH
            }, status=400)
        
        # Calculate summary parameters based on text length and desired summary length
        text_word_count = len(clean_text.split())
        
        # Define summary length ratios and limits based on user selection
        if summary_length == 'short':
            # Short: 10-15% of original, max 200 words
            min_ratio = 0.10
            max_ratio = 0.15
            max_words = 200
            max_new_tokens = 250
        elif summary_length == 'long':
            # Long: 25-35% of original, max 800 words
            min_ratio = 0.25
            max_ratio = 0.35
            max_words = 800
            max_new_tokens = 1000
        else:  # medium (default)
            # Medium: 15-25% of original, max 500 words
            min_ratio = 0.15
            max_ratio = 0.25
            max_words = 500
            max_new_tokens = 600
        
        # Calculate actual min and max lengths
        calculated_min = max(30, int(text_word_count * min_ratio))  # At least 30 words
        calculated_max = min(max_words, int(text_word_count * max_ratio))
        
        # Ensure min is less than max
        if calculated_min >= calculated_max:
            calculated_min = max(30, calculated_max - 50)
        
        print(f"Text word count: {text_word_count}")
        print(f"Summary length: {summary_length}")
        print(f"Calculated min: {calculated_min}, max: {calculated_max}")
        
        # Initialize the summarization pipeline and tokenizer
        model_name = "sshleifer/distilbart-cnn-12-6"
        summarizer = pipeline('summarization', model=model_name)
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        
        # Split text into chunks if it's too long
        max_chunk_length = 1024  # Maximum tokens per chunk
        chunks = []
        words = clean_text.split()
        current_chunk = []
        current_length = 0
        
        for word in words:
            word_tokens = len(tokenizer.encode(word))
            if current_length + word_tokens > max_chunk_length:
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_length = word_tokens
            else:
                current_chunk.append(word)
                current_length += word_tokens
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        # Summarize each chunk and combine
        summaries = []
        for chunk in chunks:
            chunk_word_count = len(chunk.split())
            # Calculate proportional min/max for this chunk
            chunk_min = max(20, int(chunk_word_count * min_ratio))
            chunk_max = min(int(chunk_word_count * max_ratio), max_new_tokens // len(chunks))
            
            # Ensure chunk_min < chunk_max
            if chunk_min >= chunk_max:
                chunk_min = max(20, chunk_max - 10)
            
            chunk_summary = summarizer(chunk, 
                                    min_length=chunk_min,
                                    max_new_tokens=chunk_max,
                                    do_sample=False)[0]['summary_text']
            summaries.append(chunk_summary)
        
        # Combine summaries if there are multiple chunks
        final_summary = ' '.join(summaries)
        
        # If the combined summary is still too long, summarize it again
        if len(tokenizer.encode(final_summary)) > max_chunk_length:
            final_summary = summarizer(final_summary,
                                    min_length=calculated_min,
                                    max_new_tokens=calculated_max,
                                    do_sample=False)[0]['summary_text']
        
        # Save the summary
        if note:
            note.summary = final_summary
            note.save()
        
        return Response({
            'summary': final_summary,
            'isExisting': False,
            'summaryLength': summary_length,
            'textLength': len(clean_text),
            'summaryStats': {
                'originalWordCount': text_word_count,
                'summaryWordCount': len(final_summary.split()),
                'compressionRatio': round(len(final_summary.split()) / text_word_count * 100, 1)
            }
        })
    except Exception as e:
        print(f"Summarization error: {str(e)}")  # Add server-side logging
        return Response({
            'error': str(e)
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_pdf_info(request):
    """Get basic information about a PDF file before processing"""
    try:
        file = request.FILES.get('file')
        
        if not file:
            return Response({'error': 'No file provided'}, status=400)
        
        if not file.name.endswith('.pdf'):
            return Response({'error': 'Only PDF files are supported'}, status=400)

        file_content = file.read()
        
        # Get basic PDF info
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        total_pages = len(pdf_reader.pages)
        
        # Get some sample text from first page
        sample_text = ""
        if total_pages > 0:
            first_page = pdf_reader.pages[0]
            sample_text = first_page.extract_text()[:300] + "..." if len(first_page.extract_text()) > 300 else first_page.extract_text()

        return Response({
            'fileName': file.name,
            'totalPages': total_pages,
            'sampleText': sample_text,
            'maxAllowedPages': 10
        })

    except Exception as e:
        return Response({'error': f'Error reading PDF: {str(e)}'}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request):
    try:
        file = request.FILES.get('file')
        course_id = request.data.get('courseId')
        chapter_id = request.data.get('chapterId')
        create_new = request.data.get('createNew', False)
        new_course_title = request.data.get('newCourseTitle')
        new_chapter_title = request.data.get('newChapterTitle')
        force_upload = request.data.get('forceUpload', False)
        
        # New page range parameters
        start_page = request.data.get('startPage')
        end_page = request.data.get('endPage')

        if not file:
            return Response({'error': 'No file provided'}, status=400)
        
        if not file.name.endswith('.pdf'):
            return Response({'error': 'Only PDF files are supported'}, status=400)

        # Validate page range if provided
        if start_page is not None and end_page is not None:
            try:
                start_page = int(start_page)
                end_page = int(end_page)
                
                if start_page < 1:
                    return Response({'error': 'Start page must be 1 or greater'}, status=400)
                
                if end_page < start_page:
                    return Response({'error': 'End page must be greater than or equal to start page'}, status=400)
                
                if end_page - start_page + 1 > 10:
                    return Response({'error': 'Maximum 10 pages allowed'}, status=400)
                    
            except ValueError:
                return Response({'error': 'Invalid page numbers'}, status=400)

        # Generate a cache key based on file content and page range
        file_content = file.read()
        page_range_key = f"_{start_page}_{end_page}" if start_page and end_page else ""
        cache_key = f"pdf_content_{get_random_string(32)}{page_range_key}"
        
        # Try to get cached content
        cached_data = cache.get(cache_key)
        if cached_data:
            final_html, image_info = cached_data
        else:
            # Process the PDF with page range and cache the results
            final_html, image_info = process_pdf(file_content, start_page, end_page)
            cache.set(cache_key, (final_html, image_info), timeout=3600)  # Cache for 1 hour

        # Create new course if requested
        if create_new and new_course_title:
            course = Course.objects.create(
                title=new_course_title,
                owner=request.user
            )
            chapter = Chapter.objects.create(
                course=course,
                title=new_chapter_title or "Chapter 1"
            )
        else:
            course = get_object_or_404(Course, id=course_id, owner=request.user)
            if chapter_id:
                chapter = get_object_or_404(Chapter, id=chapter_id, course=course)
            else:
                chapter = Chapter.objects.create(
                    course=course,
                    title=new_chapter_title or "New Chapter"
                )

        # Check for existing document
        existing_document = Document.objects.filter(
            chapter=chapter,
            uploaded_by=request.user
        ).first()

        if existing_document and not force_upload:
            return Response({
                'warning': 'Document already exists for this chapter',
                'requiresConfirmation': True,
                'existingDocument': {
                    'id': existing_document.id,
                    'title': existing_document.title,
                    'created_at': existing_document.created_at
                }
            }, status=200)

        # Create or update note
        note, created = Note.objects.get_or_create(
            chapter=chapter,
            defaults={'content': final_html}
        )
        if not created:
            note.content = final_html
            note.summary = None  # Clear existing summary
            note.save()

        # Delete existing document and its attachments if it exists
        if existing_document:
            existing_document.delete()

        # Save the new document
        document = Document.objects.create(
            title=file.name,
            file=ContentFile(file_content, name=file.name),
            content=final_html,
            uploaded_by=request.user,
            course=course,
            chapter=chapter
        )

        # Save the extracted images
        image_count = 0
        for img_data in image_info:
            try:
                attachment = PDFAttachment(
                    document=document,
                    page_number=img_data['page_number'],
                    original_name=img_data['filename']
                )
                attachment.file.save(
                    img_data['filename'],
                    ContentFile(img_data['image_bytes']),
                    save=True
                )
                image_count += 1
            except Exception as e:
                print(f"Error saving image: {str(e)}")
                continue

        return Response({
            'message': 'Document uploaded successfully',
            'courseId': course.id,
            'chapterId': chapter.id,
            'documentId': document.id,
            'imageCount': image_count
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)

def process_pdf(file_content, start_page=None, end_page=None):
    """Process PDF content and return HTML and image information."""
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
    html_content = []
    current_font_size = None
    current_font_weight = None
    in_paragraph = False
    last_y = None
    last_text = ""
    
    total_pages = len(pdf_reader.pages)
    
    # Set default page range if not provided
    if start_page is None:
        start_page = 1
    if end_page is None:
        end_page = min(total_pages, 10)  # Default to first 10 pages max
    
    # Validate page range against actual PDF
    if start_page > total_pages:
        start_page = total_pages
    if end_page > total_pages:
        end_page = total_pages
    
    # Convert to 0-based indexing for processing
    start_idx = start_page - 1
    end_idx = end_page - 1

    # Extract text only from selected pages
    for page_num in range(start_idx, end_idx + 1):
        if page_num >= total_pages:
            break

        page = pdf_reader.pages[page_num]
        page_text = ""
        
        def visitor_body(text, cm, tm, font_dict, font_size):
            nonlocal page_text, current_font_size, current_font_weight, in_paragraph, last_y, last_text
            
            if len(text.strip()) == 0:
                return

            # Extract font properties
            font_name = font_dict.get('/BaseFont', '').lower() if font_dict else ''
            is_bold = 'bold' in font_name or 'black' in font_name
            
            if current_font_size is None:
                current_font_size = font_size
            
            is_heading = font_size > current_font_size + 2
            current_y = tm[5] if tm else 0

            if last_y is not None:
                y_diff = abs(current_y - last_y)
                if (y_diff > 15 or is_heading) and in_paragraph:
                    page_text += "</p>\n"
                    in_paragraph = False
                elif y_diff <= 12 and in_paragraph and not text.startswith(' ') and not last_text.endswith(' '):
                    page_text += " "

            if not in_paragraph:
                if is_heading:
                    heading_level = min(3, max(1, int(6 * (current_font_size / font_size))))
                    page_text += f"\n<h{heading_level}>"
                    page_text += text
                    page_text += f"</h{heading_level}>\n"
                else:
                    page_text += "\n<p>"
                    page_text += text
                    in_paragraph = True
            else:
                if is_bold:
                    page_text += f"<strong>{text}</strong>"
                else:
                    page_text += text

            last_y = current_y
            last_text = text
            current_font_size = font_size

        page.extract_text(visitor_text=visitor_body)
        if in_paragraph:
            page_text += "</p>\n"
            in_paragraph = False
        
        html_content.append(page_text)

    final_html = f"<div class='pdf-content'>\n<p><em>Pages {start_page}-{end_page} of {total_pages}</em></p>\n{''.join(html_content)}</div>"

    # Extract images only from selected pages
    image_info = []
    max_images = 20
    min_size = 100

    pdf_document = fitz.open(stream=file_content, filetype="pdf")
    
    for page_num in range(start_idx, end_idx + 1):
        if len(image_info) >= max_images or page_num >= pdf_document.page_count:
            break
            
        page = pdf_document[page_num]
        image_list = page.get_images()
        
        for img_index, img in enumerate(image_list):
            if len(image_info) >= max_images:
                break
                
            try:
                xref = img[0]
                base_image = pdf_document.extract_image(xref)
                
                if base_image.get("width", 0) < min_size or base_image.get("height", 0) < min_size:
                    continue
                
                image_filename = f"page_{page_num + 1}_image_{img_index + 1}.{base_image['ext']}"
                
                image_info.append({
                    'filename': image_filename,
                    'image_bytes': base_image["image"],
                    'page_number': page_num + 1
                })
            except Exception as e:
                print(f"Error extracting image: {str(e)}")
                continue

    pdf_document.close()
    return final_html, image_info

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_documents(request):
    documents = Document.objects.filter(uploaded_by=request.user).order_by('-created_at')
    data = [{
        'id': doc.id,
        'title': doc.title,
        'courseId': doc.course.id if doc.course else None,
        'courseName': doc.course.title if doc.course else None,
        'chapterId': doc.chapter.id if doc.chapter else None,
        'chapterName': doc.chapter.title if doc.chapter else None,
        'created_at': doc.created_at
    } for doc in documents]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_document_attachments(request, document_id):
    try:
        # First check if the document exists and belongs to the user
        try:
            document = Document.objects.get(id=document_id, uploaded_by=request.user)
        except Document.DoesNotExist:
            return Response({
                'error': 'Document not found or you do not have permission to access it'
            }, status=404)

        # Get all attachments for this document
        attachments = PDFAttachment.objects.filter(document=document).order_by('page_number')
        
        if not attachments:
            return Response([])  # Return empty list if no attachments
        
        # Build the response data
        data = [{
            'id': attachment.id,
            'url': request.build_absolute_uri(attachment.file.url),
            'page_number': attachment.page_number,
            'original_name': attachment.original_name,
            'created_at': attachment.created_at
        } for attachment in attachments]
        
        return Response(data)
        
    except Exception as e:
        print(f"Error in get_document_attachments: {str(e)}")  # Log the error
        return Response({
            'error': 'An error occurred while fetching attachments'
        }, status=500)

# Initialize embeddings model
HF_EMBED_MODEL_ID = "BAAI/bge-small-en-v1.5"
embeddings = HuggingFaceEmbeddings(model_name=HF_EMBED_MODEL_ID)

# Initialize LLM
HF_API_KEY = os.environ.get("HF_API_KEY")
HF_LLM_MODEL_ID = "mistralai/Mistral-7B-Instruct-v0.3"

print(f"DEBUG: Initializing LLM with model: {HF_LLM_MODEL_ID}")
print(f"DEBUG: API Key present: {bool(HF_API_KEY)}")
print(f"DEBUG: API Key length: {len(HF_API_KEY) if HF_API_KEY else 0}")

# Use conversational task for Instruct models
class HuggingFaceConversationalAPI(Runnable):
    """Wrapper for Hugging Face Inference API with conversational task"""
    
    def __init__(self, model_id, api_token):
        self.model_id = model_id
        self.api_token = api_token
        self.api_url = f"https://api-inference.huggingface.co/models/{model_id}"
        self.headers = {"Authorization": f"Bearer {api_token}"}
    
    def invoke(self, input: Any, config: Dict = None) -> str:
        """Send request to HF Inference API with conversational format"""
        # Handle both string input and dict input from LangChain
        if isinstance(input, dict):
            prompt = str(input)
        else:
            prompt = str(input)
            
        try:
            # Format as simple text input for conversational task
            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 600,     # Increased from 200 for question generation
                    "temperature": 0.3,        # Lower temperature for more consistent answers
                    "repetition_penalty": 1.1, # Reduced to avoid over-penalizing for questions
                    "do_sample": True,
                    "top_p": 0.85,             # Slightly more focused
                    "return_full_text": False,
                    "stop": ["Question:", "Context:", "Student Question:"]  # Removed aggressive stops
                }
            }
            
            print(f"DEBUG: Sending request to HF API: {self.api_url}")
            print(f"DEBUG: Payload: {payload}")
            response = requests.post(
                self.api_url, 
                headers=self.headers, 
                json=payload,
                timeout=60  # Reduced timeout to 60 seconds
            )
            
            print(f"DEBUG: HF API response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"DEBUG: HF API result: {result}")
                
                # Extract the generated response
                if isinstance(result, dict) and 'generated_text' in result:
                    return result['generated_text']
                elif isinstance(result, list) and len(result) > 0:
                    if 'generated_text' in result[0]:
                        return result[0]['generated_text']
                    elif 'conversation' in result[0]:
                        conv = result[0]['conversation']
                        if 'generated_responses' in conv and conv['generated_responses']:
                            return conv['generated_responses'][-1]
                
                # Fallback
                return str(result)
            else:
                error_msg = f"HF API error {response.status_code}: {response.text}"
                print(f"DEBUG: {error_msg}")
                return f"I apologize, but I'm currently unavailable. Please try again later."
                
        except Exception as e:
            print(f"DEBUG: HF API exception: {str(e)}")
            return f"I apologize, but I encountered an error: {str(e)}"

# Create the API wrapper
llm = HuggingFaceConversationalAPI(HF_LLM_MODEL_ID, HF_API_KEY)

def clean_repetitive_text(text):
    """Remove repetitive patterns from the generated text"""
    import re
    
    if not text:
        return ""
    
    # Remove common prefixes that the LLM might add
    text = re.sub(r'^(Answer:\s*|Response:\s*|Based on the context[,:\s]*)', '', text, flags=re.IGNORECASE)
    
    # Remove repeated phrases (3+ words repeated)
    text = re.sub(r'\b(\w+(?:\s+\w+){2,})\s+(?:\1\s*){2,}', r'\1', text, flags=re.IGNORECASE)
    
    # Remove repeated sentences
    sentences = text.split('.')
    unique_sentences = []
    seen = set()
    
    for sentence in sentences:
        sentence = sentence.strip()
        if sentence and sentence.lower() not in seen:
            unique_sentences.append(sentence)
            seen.add(sentence.lower())
    
    # Remove common repetitive patterns and artifacts
    cleaned_text = '. '.join(unique_sentences)
    cleaned_text = re.sub(r'(Source:\s*Context[.\s]*)+', '', cleaned_text, flags=re.IGNORECASE)
    cleaned_text = re.sub(r'(Answer:\s*)+', '', cleaned_text, flags=re.IGNORECASE)
    cleaned_text = re.sub(r'(Based on the context[,:\s]*)+', '', cleaned_text, flags=re.IGNORECASE)
    cleaned_text = re.sub(r'(According to the provided information[,:\s]*)+', '', cleaned_text, flags=re.IGNORECASE)
    cleaned_text = re.sub(r'\.{3,}', '...', cleaned_text)  # Replace multiple dots
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text)  # Remove extra whitespace
    
    # Clean up any leading/trailing periods or colons
    cleaned_text = re.sub(r'^[.:\s]+|[.:\s]+$', '', cleaned_text.strip())
    
    return cleaned_text.strip()

def format_docs(docs: Iterable[LCDocument]):
    # Increase context limit for better coverage and add better formatting
    context_parts = []
    total_length = 0
    max_context_length = 6000  # Increased from 3000 to 6000 for more comprehensive context
    
    docs_list = list(docs)  # Convert to list to check length
    print(f"DEBUG: format_docs received {len(docs_list)} documents")
    
    if len(docs_list) == 0:
        print("DEBUG: No documents provided to format_docs")
        return "No relevant content found."
    
    for i, doc in enumerate(docs_list):
        content = doc.page_content.strip()
        print(f"DEBUG: Processing doc {i+1}, content length: {len(content)}")
        if content and total_length + len(content) <= max_context_length:
            context_parts.append(f"Section {i+1}:\n{content}")
            total_length += len(content)
        elif content and total_length < max_context_length:
            # Add partial content if it fits
            remaining_space = max_context_length - total_length - 20  # Leave some buffer
            if remaining_space > 100:  # Only add if there's meaningful space
                truncated_content = content[:remaining_space] + "..."
                context_parts.append(f"Section {i+1}:\n{truncated_content}")
            break
        else:
            break
    
    result = "\n\n".join(context_parts) if context_parts else "No relevant content found."
    print(f"DEBUG: format_docs returning {len(result)} characters from {len(docs_list)} documents")
    return result

# Initialize text splitters
# For assistant - larger chunks for better context
assistant_text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1800,     # Increased from 1200 to 1800 for better context preservation
    chunk_overlap=300,   # Increased overlap for better continuity
    separators=["\n\n", "\n", ". ", " ", ""],
)

# For question generation - smaller chunks for focused questions
question_text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=600,      # Smaller chunks for focused question generation
    chunk_overlap=100,   # Moderate overlap
    separators=["\n\n", "\n", ". ", " ", ""],
)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ask_question(request):
    try:
        print(f"DEBUG: ask_question called with data: {request.data}")
        
        question = request.data.get('question')
        chapter_id = request.data.get('chapterId')
        
        print(f"DEBUG: Question: {question}")
        print(f"DEBUG: Chapter ID: {chapter_id}")
        
        if not question or not chapter_id:
            print("DEBUG: Missing question or chapter_id")
            return Response({
                'error': 'Question and chapter ID are required'
            }, status=400)

        print(f"DEBUG: Getting chapter with ID: {chapter_id}")
        # Get the chapter content
        chapter = get_object_or_404(Chapter, id=chapter_id)
        print(f"DEBUG: Found chapter: {chapter.title}")
        
        note = Note.objects.filter(chapter=chapter).first()
        print(f"DEBUG: Found note: {bool(note)}")
        
        if not note:
            print("DEBUG: No note found for chapter")
            return Response({
                'error': 'No content found for this chapter'
            }, status=404)

        # Get document if exists
        document = Document.objects.filter(chapter=chapter).first()
        print(f"DEBUG: Found document: {bool(document)}")
        
        # Prepare the content for RAG
        content = note.content
        if document:
            content += "\n\n" + document.content
        
        print(f"DEBUG: Content length: {len(content)}")

        # Clean HTML content
        soup = BeautifulSoup(content, 'html.parser')
        clean_text = soup.get_text()
        print(f"DEBUG: Clean text length: {len(clean_text)}")

        # Set content limit for 12 pages max (approximately 30,000 characters)
        max_content_length = 30000  # Optimized for 12 pages max (2500 chars/page average)
        if len(clean_text) > max_content_length:
            print(f"DEBUG: Content truncated from {len(clean_text)} to {max_content_length} characters (12 pages max)")
            clean_text = clean_text[:max_content_length] + "..."
        else:
            print(f"DEBUG: Using full content ({len(clean_text)} characters)")
        
        # Create document splits
        print("DEBUG: Creating document splits...")
        docs = [LCDocument(page_content=clean_text)]
        splits = assistant_text_splitter.split_documents(docs)
        print(f"DEBUG: Created {len(splits)} document splits")

        # Create vector store using FAISS
        print("DEBUG: Creating FAISS vector store...")
        vectorstore = FAISS.from_documents(splits, embeddings)
        print("DEBUG: Vector store created successfully")

        # Create retriever
        print("DEBUG: Creating retriever...")
        retriever = vectorstore.as_retriever(
            search_type="similarity", 
            search_kwargs={
                "k": 12,  # Increased from 8 to 12 for more context
            }
        )
        print("DEBUG: Retriever created successfully")

        # Create prompt template
        print("DEBUG: Creating prompt template...")
        prompt = PromptTemplate.from_template(
            """You are a helpful learning assistant. Use the provided context to answer the student's question clearly and concisely.

Context:
{context}

Student Question: {question}

Instructions:
- Answer the question directly using ONLY the information from the context above
- Keep your response clear and focused (under 150 words)
- If the context doesn't contain relevant information, say "I don't have enough information in the provided material to answer this question accurately. Please check if this topic is covered in the current chapter or try asking about a different aspect."
- Do NOT start your response with "Answer:" or similar prefixes
- Write in a conversational, helpful tone as if explaining to a student

Answer:"""
        )
        print("DEBUG: Prompt template created successfully")

        # Create RAG chain
        print("DEBUG: Creating RAG chain...")
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        print("DEBUG: RAG chain created successfully")
        
        # Debug: Test retrieval quality
        print("DEBUG: Testing retrieval...")
        retrieved_docs = []
        try:
            retrieved_docs = retriever.invoke(question)
            print(f"DEBUG: Retrieved {len(retrieved_docs)} documents")
            if len(retrieved_docs) == 0:
                print("DEBUG: No documents retrieved - this is the problem!")
                print(f"DEBUG: Original content length: {len(clean_text)}")
                print(f"DEBUG: Number of splits: {len(splits)}")
                for i, split in enumerate(splits[:3]):  # Show first 3 splits
                    print(f"DEBUG: Split {i+1} length: {len(split.page_content)}")
                    print(f"DEBUG: Split {i+1} preview: {split.page_content[:200]}...")
            else:
                for i, doc in enumerate(retrieved_docs[:3]):  # Show first 3 docs
                    print(f"DEBUG: Doc {i+1} length: {len(doc.page_content)}")
                    print(f"DEBUG: Doc {i+1} preview: {doc.page_content[:100]}...")
        except Exception as e:
            print(f"DEBUG: Retrieval test failed: {e}")

        # Get answer
        print(f"DEBUG: Invoking RAG chain with question: {question}")
        try:
            print("DEBUG: About to call rag_chain.invoke...")
            import time
            start_time = time.time()
            answer = rag_chain.invoke(question)
            end_time = time.time()
            print(f"DEBUG: RAG chain completed in {end_time - start_time:.2f} seconds")
            print(f"DEBUG: Got answer: {answer}")
            
            # Check if we got a "no relevant content" response and try direct approach
            if ("no relevant content" in answer.lower() or 
                "don't have enough information" in answer.lower() or 
                len(retrieved_docs) == 0):
                print("DEBUG: RAG returned no content, trying direct approach...")
                
                # Use more of the original content directly (up to 10,000 chars for direct approach)
                direct_context = clean_text[:10000]  # About 4 pages worth for direct approach
                direct_prompt = f"""Based on the following material, answer the student's question clearly and concisely.

Material:
{direct_context}

Student Question: {question}

Please provide a helpful answer based on the material above. If the specific information isn't in the material, say so politely.

Answer:"""
                
                direct_answer = llm.invoke(direct_prompt)
                print(f"DEBUG: Direct approach answer: {direct_answer}")
                answer = direct_answer
            
            # Validate the answer quality
            if not answer or len(answer.strip()) < 10:
                print("DEBUG: Answer too short, trying fallback...")
                raise Exception("Answer too short or empty")
                
        except Exception as llm_error:
            print(f"DEBUG: LLM invocation failed: {str(llm_error)}")
            print(f"DEBUG: LLM error type: {type(llm_error).__name__}")
            # Try a simpler approach without RAG
            print("DEBUG: Trying simple LLM call without RAG...")
            try:
                simple_prompt = f"""You are a helpful learning assistant. Answer the student's question based on the provided material.

Material: {clean_text[:15000]}

Student Question: {question}

Please provide a clear, helpful answer. If the material doesn't contain enough information to answer the question, say "I don't have enough information in the provided material to answer this question accurately."

Answer:"""
                answer = llm.invoke(simple_prompt)
                print(f"DEBUG: Simple LLM call succeeded: {answer}")
            except Exception as simple_error:
                print(f"DEBUG: Simple LLM call also failed: {str(simple_error)}")
                return Response({
                    'error': f'AI model is currently unavailable: {str(simple_error)}'
                }, status=503)

        # Clean repetitive text and validate
        cleaned_answer = clean_repetitive_text(answer)
        
        # Final validation
        if not cleaned_answer or len(cleaned_answer.strip()) < 5:
            cleaned_answer = "I apologize, but I'm having trouble processing your question right now. Please try rephrasing your question or check if the topic is covered in the current chapter."

        return Response({
            'answer': cleaned_answer
        })

    except Exception as e:
        print(f"ERROR in ask_question: {str(e)}")
        print(f"ERROR type: {type(e).__name__}")
        import traceback
        print(f"ERROR traceback: {traceback.format_exc()}")
        return Response({
            'error': 'An error occurred while processing your question'
        }, status=500)

def get_exclusion_prompt(previously_answered_questions):
    """Generate a prompt section to help the LLM avoid previously answered questions"""
    if not previously_answered_questions:
        return ""
    
    exclusion_text = "\nIMPORTANT: Do NOT create questions similar to these previously answered questions:\n"
    for i, prev_q in enumerate(previously_answered_questions[:5], 1):  # Limit to 5 to avoid prompt overload
        exclusion_text += f"- {prev_q['question']} (Type: {prev_q['type']})\n"
    exclusion_text += "\nGenerate completely NEW and DIFFERENT questions that cover other aspects of the content.\n"
    
    return exclusion_text

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_questions(request):
    try:
        print(f"DEBUG: generate_questions called with data: {request.data}")
        
        chapter_id = request.data.get('chapterId')
        question_count = request.data.get('questionCount', 5)  # Default to 5 questions
        question_type = request.data.get('questionType', 'mixed')  # Default to mixed
        
        print(f"DEBUG: Chapter ID: {chapter_id}")
        print(f"DEBUG: Question count: {question_count}")
        print(f"DEBUG: Question type: {question_type}")
        
        if not chapter_id:
            print("DEBUG: Missing chapter_id")
            return Response({
                'error': 'Chapter ID is required'
            }, status=400)

        print(f"DEBUG: Getting chapter with ID: {chapter_id}")
        # Get the chapter content
        chapter = get_object_or_404(Chapter, id=chapter_id)
        print(f"DEBUG: Found chapter: {chapter.title}")
        
        note = Note.objects.filter(chapter=chapter).first()
        print(f"DEBUG: Found note: {bool(note)}")
        
        if not note:
            print("DEBUG: No note found for chapter")
            return Response({
                'error': 'No content found for this chapter'
            }, status=404)

        # Get document if exists
        document = Document.objects.filter(chapter=chapter).first()
        print(f"DEBUG: Found document: {bool(document)}")
        
        # Prepare the content for question generation
        content = note.content
        if document:
            content += "\n\n" + document.content
        
        print(f"DEBUG: Content length: {len(content)}")

        # Clean HTML content
        soup = BeautifulSoup(content, 'html.parser')
        clean_text = soup.get_text()
        print(f"DEBUG: Clean text length: {len(clean_text)}")

        # Get previously correctly answered questions for this note
        previous_correct_answers = UserCorrectAnswer.objects.filter(
            user=request.user,
            note=note
        ).order_by('-answered_at')
        
        previously_answered_questions = []
        for prev_answer in previous_correct_answers:
            previously_answered_questions.append({
                'question': prev_answer.question_text,
                'type': prev_answer.question_type,
                'answer': prev_answer.answer
            })
        
        print(f"DEBUG: Found {len(previously_answered_questions)} previously answered questions")

        print("DEBUG: Generating questions...")
        
        # Try multiple attempts with different sections of text if needed
        attempts = [
            {"start": 0, "length": 1200, "description": "first section (1200 chars)"},
            {"start": 1200, "length": 1500, "description": "second section (1500 chars)"}, 
            {"start": 2700, "length": 1800, "description": "third section (1800 chars)"},
        ]
        
        parsed_questions = []
        
        for attempt_num, attempt in enumerate(attempts, 1):
            # Prepare context for this attempt - use different sections
            start_pos = attempt["start"]
            length = attempt["length"]
            
            # Make sure we don't go beyond the available text
            if start_pos >= len(clean_text):
                print(f"DEBUG: Attempt {attempt_num} skipped - start position {start_pos} beyond text length {len(clean_text)}")
                break
                
            end_pos = min(start_pos + length, len(clean_text))
            attempt_text = clean_text[start_pos:end_pos]
            
            # Skip if this section is too short to be useful
            if len(attempt_text) < 500:
                print(f"DEBUG: Attempt {attempt_num} skipped - section too short ({len(attempt_text)} chars)")
                break
            
            print(f"DEBUG: Attempt {attempt_num} with {attempt['description']} (chars {start_pos}-{end_pos}, {len(attempt_text)} chars)")
            
            # Create question generation prompt based on type
            if question_type == 'true_false':
                question_prompt = f"""Create {min(question_count, 5)} TRUE/FALSE questions from this text:

{attempt_text}

{get_exclusion_prompt(previously_answered_questions)}

Format exactly:
Q1: [Statement here]
Type: true_false
Answer: True

Q2: [Statement here] 
Type: true_false
Answer: False

Make some True and some False. Keep questions clear and simple."""

            elif question_type == 'short_answer':
                question_prompt = f"""Create {min(question_count, 5)} SHORT ANSWER questions from this text:

{attempt_text}

{get_exclusion_prompt(previously_answered_questions)}

Format exactly:
Q1: [Question here]
Type: short_answer
Answer: [Answer here]

Q2: [Question here]
Type: short_answer
Answer: [Answer here]

Keep questions and answers concise."""

            elif question_type == 'multiple_choice':
                question_prompt = f"""Create {min(question_count, 4)} MULTIPLE CHOICE questions from this text:

{attempt_text}

{get_exclusion_prompt(previously_answered_questions)}

Format exactly:
Q1: [Question here]
Type: multiple_choice
Options: A) [Option A] B) [Option B] C) [Option C] D) [Option D]
Answer: A

Q2: [Question here]
Type: multiple_choice
Options: A) [Option A] B) [Option B] C) [Option C] D) [Option D]
Answer: B

Keep questions clear and options concise."""

            else:  # mixed type
                question_prompt = f"""Create {min(question_count, 4)} MIXED questions from this text:

{attempt_text}

{get_exclusion_prompt(previously_answered_questions)}

Format exactly:
Q1: [Question here]
Type: multiple_choice
Options: A) [Option A] B) [Option B] C) [Option C] D) [Option D]
Answer: A

Q2: [Statement here]
Type: true_false
Answer: True

Q3: [Question here]
Type: short_answer
Answer: [Answer here]

Mix the types and keep everything concise."""

            # Generate questions using the LLM
            try:
                print(f"DEBUG: Calling LLM for question generation (attempt {attempt_num})...")
                print(f"DEBUG: Prompt length: {len(question_prompt)}")
                print(f"DEBUG: Context length: {len(attempt_text)}")
                
                questions_response = llm.invoke(question_prompt)
                print(f"DEBUG: Raw LLM response length: {len(questions_response)}")
                
                # Check if the response looks like an error message
                if "apologize" in questions_response.lower() or "error" in questions_response.lower() or "timeout" in questions_response.lower():
                    print(f"DEBUG: LLM returned error message on attempt {attempt_num}, trying next attempt")
                    continue
                
                # Parse the questions directly - don't clean the LLM's good structured output
                print(f"DEBUG: Using raw LLM response for parsing (attempt {attempt_num})")
                
                # Parse the questions into structured format
                new_questions = parse_questions(questions_response)
                
                print(f"DEBUG: Parsed {len(new_questions)} questions from LLM (attempt {attempt_num})")
                
                # Add the new questions to our list, updating their IDs to avoid conflicts
                for new_question in new_questions:
                    new_question['id'] = len(parsed_questions) + 1
                    parsed_questions.append(new_question)
                
                print(f"DEBUG: Total questions accumulated: {len(parsed_questions)}")
                
                # Check if we have enough questions
                if len(parsed_questions) >= question_count:
                    print(f"DEBUG: Got enough questions ({len(parsed_questions)}) on attempt {attempt_num}, stopping")
                    break
                else:
                    print(f"DEBUG: Got {len(parsed_questions)} total questions after attempt {attempt_num}, need {question_count}, trying next attempt")
                    continue
                    
            except Exception as llm_error:
                print(f"DEBUG: LLM error on attempt {attempt_num}: {str(llm_error)}")
                if attempt_num < len(attempts):
                    print(f"DEBUG: Trying next attempt...")
                    continue
                else:
                    print(f"DEBUG: All LLM attempts failed, will use fallback")
                    break
        
        # If we still don't have enough questions after all attempts, add fallback questions
        if len(parsed_questions) < question_count:
            print(f"DEBUG: Only got {len(parsed_questions)} questions after all attempts, need {question_count}, adding fallback")
            # Start fallback question IDs after the last LLM question ID
            start_id = len(parsed_questions) + 1
            fallback_questions = create_fallback_questions(clean_text, question_count - len(parsed_questions), question_type, start_id)
            parsed_questions.extend(fallback_questions)
        
        return Response({
            'questions': parsed_questions[:question_count],  # Ensure we return exactly the requested count
            'chapter_title': chapter.title
        })

    except Exception as e:
        print(f"ERROR in generate_questions: {str(e)}")
        print(f"ERROR type: {type(e).__name__}")
        import traceback
        print(f"ERROR traceback: {traceback.format_exc()}")
        return Response({
            'error': 'An error occurred while generating questions'
        }, status=500)

def parse_questions(questions_text):
    """Parse the generated questions text into structured format - handle both line-by-line and concatenated formats"""
    import re
    
    questions = []
    
    print(f"DEBUG: Parsing questions from text: {questions_text}")
    
    # Split by Q1:, Q2:, Q3:, etc. to get individual question blocks
    question_blocks = re.split(r'Q\d+:', questions_text)
    
    for i, block in enumerate(question_blocks[1:], 1):  # Skip first empty block
        if not block.strip():
            continue
            
        print(f"DEBUG: Processing block {i}: {block}")
        
        # Initialize defaults
        question_text = ""
        question_type = "short_answer"  # Default fallback
        options = []
        answer = ""
        
        # Clean the block text
        block_text = block.strip()
        
        # Extract question type using regex (case insensitive)
        type_match = re.search(r'Type:\s*([\w_-]+)', block_text, re.IGNORECASE)
        if type_match:
            question_type = type_match.group(1).strip().lower()
            print(f"DEBUG: Found type: '{question_type}'")
        
        # Extract options using regex
        options_match = re.search(r'Options:\s*(.+?)(?=Answer:|$)', block_text, re.IGNORECASE | re.DOTALL)
        if options_match:
            options_text = options_match.group(1).strip()
            print(f"DEBUG: Found options text: '{options_text}'")
            
            # Parse options: A) text B) text C) text D) text
            # Split by option letters and process each part
            option_parts = re.split(r'\s*([A-D])\)\s*', options_text)
            
            # option_parts will be like: ['', 'A', 'Madrid ', 'B', 'Valencia ', 'C', 'Bilbao ', 'D', 'Rosario, Argentina']
            for j in range(1, len(option_parts), 2):  # Skip empty first element, then take every other pair
                if j + 1 < len(option_parts):
                    letter = option_parts[j]
                    text = option_parts[j + 1].strip()
                    if text:  # Only add non-empty options
                        options.append({
                            'id': letter,
                            'text': text
                        })
            print(f"DEBUG: Parsed {len(options)} options")
            for opt in options:
                print(f"  {opt['id']}) {opt['text'][:50]}...")
        
        # Extract answer using regex
        answer_match = re.search(r'Answer:\s*([^\n\r]+)', block_text, re.IGNORECASE)
        if answer_match:
            answer = answer_match.group(1).strip()
            print(f"DEBUG: Found answer: '{answer}'")
        
        # Extract question text - everything before "Type:" or at the beginning
        question_match = re.search(r'^(.*?)(?=Type:|Options:|Answer:|$)', block_text, re.IGNORECASE | re.DOTALL)
        if question_match:
            question_text = question_match.group(1).strip()
            # Clean up question text
            question_text = re.sub(r'\s+', ' ', question_text)  # Normalize whitespace
            print(f"DEBUG: Found question text: '{question_text[:50]}...'")
        
        # Validate and normalize question type
        if question_type in ['multiple_choice', 'multiplechoice', 'multiple-choice']:
            question_type = 'multiple_choice'
        elif question_type in ['true_false', 'truefalse', 'true-false', 'tf']:
            question_type = 'true_false'
        elif question_type in ['short_answer', 'shortanswer', 'short-answer', 'sa']:
            question_type = 'short_answer'
        else:
            # Try to infer type from content if not explicitly found
            if options:
                question_type = 'multiple_choice'
                print(f"DEBUG: Inferred type as multiple_choice due to options")
            elif answer.lower() in ['true', 'false']:
                question_type = 'true_false'
                print(f"DEBUG: Inferred type as true_false due to answer")
            else:
                question_type = 'short_answer'
                print(f"DEBUG: Defaulted to short_answer")
        
        # Ensure we have basic data
        if not question_text:
            question_text = f"Question {i}"
        if not answer:
            if question_type == 'true_false':
                answer = 'True'
            elif question_type == 'multiple_choice' and options:
                answer = options[0]['id']
            else:
                answer = 'Please refer to the study material.'
        
        # For multiple choice questions, preserve LLM's original options exactly as generated
        if question_type == 'multiple_choice':
            # Sort existing options by ID to ensure correct order
            options.sort(key=lambda x: x['id'])
            
            # DON'T add missing options - preserve LLM's original choices
            # The LLM generates high-quality options, so keep them as-is
            
            # Only validate that answer corresponds to an existing option
            existing_ids = [opt['id'] for opt in options]
            if answer not in existing_ids and options:
                # If answer doesn't match any option ID, default to first option
                answer = options[0]['id']
                print(f"DEBUG: Answer '{answer}' not found in options, defaulting to '{options[0]['id']}'")
        
        # For true/false questions, ensure answer is valid
        if question_type == 'true_false':
            if answer.lower() not in ['true', 'false']:
                # Try to extract True/False from the end of the block
                tf_match = re.search(r'\b(True|False)\b', block_text, re.IGNORECASE)
                if tf_match:
                    answer = tf_match.group(1).title()
                else:
                    answer = 'True'  # Default fallback
        
        # Create the question object
        question_obj = {
            'id': i,
            'question': question_text,
            'type': question_type,
            'options': options,
            'answer': answer
        }
        
        questions.append(question_obj)
        print(f"DEBUG: Created question {i}: Type='{question_type}', Question='{question_text[:50]}...', Answer='{answer}', Options={len(options)}")
    
    print(f"DEBUG: Total questions parsed: {len(questions)}")
    
    return questions

def create_fallback_questions(text, question_count, question_type, start_id):
    """Create fallback questions if the LLM fails to generate enough questions"""
    import re
    
    # Clean and analyze the text
    text = re.sub(r'https?://\S+', '', text)  # Remove URLs
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    text = re.sub(r'[^\w\s.,!?;:]', '', text)  # Remove special characters except basic punctuation
    
    # Extract meaningful sentences (avoid very short or URL-heavy sentences)
    sentences = re.split(r'[.!?]+', text)
    meaningful_sentences = []
    
    for sentence in sentences:
        sentence = sentence.strip()
        # Filter out sentences that are too short, too long, or contain mostly symbols
        if (25 <= len(sentence) <= 200 and 
            not re.search(r'https?://', sentence) and
            len(re.findall(r'[a-zA-Z]', sentence)) > len(sentence) * 0.7 and
            not sentence.lower().startswith(('figure', 'table', 'page', 'see', 'ref'))):
            meaningful_sentences.append(sentence)
    
    # Extract key terms and concepts
    # Look for capitalized words, technical terms, and important concepts
    important_words = re.findall(r'\b[A-Z][a-z]{2,}\b', text)  # Capitalized words
    technical_terms = re.findall(r'\b[a-z]{5,}\b', text.lower())  # Longer words (likely technical)
    
    # Count word frequency to find key concepts
    word_freq = {}
    all_words = important_words + [word.title() for word in technical_terms]
    
    for word in all_words:
        if (word.lower() not in ['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'were', 'said', 'when', 'where', 'what', 'which', 'would', 'could', 'should', 'there', 'their', 'these', 'those'] and
            len(word) > 3):
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Get top keywords (most frequent important terms)
    key_terms = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:15]
    key_words = [term[0] for term in key_terms if term[1] > 1]  # Only words that appear multiple times
    
    # Extract numbers and dates that might be important
    numbers = re.findall(r'\b\d{1,4}\b', text)
    years = [num for num in numbers if 1900 <= int(num) <= 2030]
    
    print(f"DEBUG: Fallback generation - Found {len(meaningful_sentences)} sentences, {len(key_words)} key terms")
    
    fallback_questions = []
    
    for i in range(question_count):
        question_id = i + start_id
        
        if question_type == 'true_false' or (question_type == 'mixed' and i % 3 == 1):
            # Create true/false questions with better variety
            if i < len(meaningful_sentences):
                sentence = meaningful_sentences[i]
                
                # Create more sophisticated true/false questions with better variety
                if i % 3 == 0:  # Make 1/3 false
                    if key_words and len(key_words) > 1:
                        # Replace a key term with another to make it false
                        original_term = key_words[0]
                        replacement_term = key_words[1] if len(key_words) > 1 else "incorrect concept"
                        if original_term.lower() in sentence.lower():
                            question_text = sentence.replace(original_term, replacement_term)
                            answer = 'False'
                        else:
                            question_text = f"The text states that {key_words[0]} is not mentioned in the content"
                            answer = 'False'
                    else:
                        question_text = f"According to the text: {sentence}"
                        answer = 'False' if 'not' in sentence.lower() else 'True'
                elif i % 3 == 1:  # Make 1/3 false (different pattern)
                    question_text = f"The text never mentions {key_words[i % len(key_words)] if key_words else 'important concepts'}"
                    answer = 'False'
                else:  # Make 1/3 true
                    # Make it true by using actual content
                    if key_words:
                        question_text = f"The text discusses concepts related to {key_words[i % len(key_words)]}"
                    else:
                        question_text = f"The following statement is from the text: {sentence[:100]}"
                    answer = 'True'
            else:
                # Ensure variety even when we don't have enough sentences
                if i % 2 == 0:
                    if key_words:
                        question_text = f"The content mentions {key_words[i % len(key_words)]}"
                        answer = 'True'
                    else:
                        question_text = "The text contains educational content"
                        answer = 'True'
                else:
                    if key_words:
                        question_text = f"The text states that {key_words[i % len(key_words)]} is irrelevant to the topic"
                        answer = 'False'
                    else:
                        question_text = "The document contains no useful information"
                        answer = 'False'
            
            fallback_questions.append({
                'id': question_id,
                'question': question_text,
                'type': 'true_false',
                'options': [],
                'answer': answer
            })
            
        elif question_type == 'multiple_choice' or (question_type == 'mixed' and i % 3 == 0):
            # Create multiple choice questions
            if meaningful_sentences and key_words:
                # Create questions based on key concepts
                main_concept = key_words[i % len(key_words)]
                
                if i % 3 == 0:
                    question_text = f"What is the primary focus when discussing {main_concept}?"
                    options = [
                        {'id': 'A', 'text': f'The theoretical aspects of {main_concept}'},
                        {'id': 'B', 'text': f'The practical applications of {main_concept}'},
                        {'id': 'C', 'text': f'The historical development of {main_concept}'},
                        {'id': 'D', 'text': 'Other'}
                    ]
                elif i % 3 == 1:
                    question_text = f"According to the text, which aspect of {main_concept} is emphasized?"
                    options = [
                        {'id': 'A', 'text': f'Its importance in the field'},
                        {'id': 'B', 'text': f'Its technical complexity'},
                        {'id': 'C', 'text': f'Its practical benefits'},
                        {'id': 'D', 'text': 'Other'}
                    ]
                else:
                    question_text = "Which of the following concepts is mentioned in the text?"
                    # Use actual key terms as options - ensure we have 4
                    if len(key_words) >= 4:
                        options = [
                            {'id': 'A', 'text': key_words[0]},
                            {'id': 'B', 'text': key_words[1]},
                            {'id': 'C', 'text': key_words[2]},
                            {'id': 'D', 'text': key_words[3]}
                        ]
                    elif len(key_words) >= 3:
                        options = [
                            {'id': 'A', 'text': key_words[0]},
                            {'id': 'B', 'text': key_words[1]},
                            {'id': 'C', 'text': key_words[2]},
                            {'id': 'D', 'text': 'Other'}
                        ]
                    elif len(key_words) >= 2:
                        options = [
                            {'id': 'A', 'text': key_words[0]},
                            {'id': 'B', 'text': key_words[1]},
                            {'id': 'C', 'text': 'Related concept'},
                            {'id': 'D', 'text': 'Other'}
                        ]
                    else:
                        options = [
                            {'id': 'A', 'text': key_words[0] if key_words else 'Primary concept'},
                            {'id': 'B', 'text': 'Secondary concept'},
                            {'id': 'C', 'text': 'Related topic'},
                            {'id': 'D', 'text': 'Other'}
                        ]
                
            else:
                question_text = "What is the main topic discussed in this content?"
                options = [
                    {'id': 'A', 'text': 'Educational concepts and theories'},
                    {'id': 'B', 'text': 'Practical applications and methods'},
                    {'id': 'C', 'text': 'Historical background and context'},
                    {'id': 'D', 'text': 'Other'}
                ]
            
            # Don't force 4 options - keep what we have (2-3 options is fine)
            # Sort options by ID to ensure correct order
            options.sort(key=lambda x: x['id'])
            
            fallback_questions.append({
                'id': question_id,
                'question': question_text,
                'type': 'multiple_choice',
                'options': options,
                'answer': 'A'
            })
            
        else:
            # Create short answer questions
            if meaningful_sentences and key_words:
                main_concept = key_words[i % len(key_words)]
                
                if i % 4 == 0:
                    question_text = f"Define {main_concept} as described in the text."
                    answer = f"{main_concept} is a key concept that plays an important role in the subject matter discussed."
                elif i % 4 == 1:
                    question_text = f"Explain the significance of {main_concept} mentioned in the content."
                    answer = f"The significance of {main_concept} lies in its contribution to understanding the main topics covered."
                elif i % 4 == 2:
                    question_text = f"How does {main_concept} relate to the overall theme of the text?"
                    answer = f"{main_concept} relates to the overall theme by providing essential context and supporting the main arguments."
                else:
                    question_text = "Summarize the key points discussed in this section."
                    answer = f"The key points include discussions about {', '.join(key_words[:3]) if key_words else 'important concepts'} and their applications."
            else:
                question_text = "What are the main learning objectives covered in this content?"
                answer = "The main learning objectives focus on understanding core concepts and their practical applications."
            
            fallback_questions.append({
                'id': question_id,
                'question': question_text,
                'type': 'short_answer',
                'options': [],
                'answer': answer
            })
    
    return fallback_questions

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_correct_answers(request):
    """Save questions that the user answered correctly to avoid regenerating them"""
    try:
        print(f"DEBUG: save_correct_answers called with data: {request.data}")
        print(f"DEBUG: User: {request.user}")
        
        chapter_id = request.data.get('chapterId')
        correct_answers = request.data.get('correctAnswers', [])
        
        print(f"DEBUG: Chapter ID: {chapter_id}")
        print(f"DEBUG: Correct answers count: {len(correct_answers)}")
        print(f"DEBUG: Correct answers data: {correct_answers}")
        
        if not chapter_id:
            print("DEBUG: Missing chapter_id")
            return Response({
                'error': 'Chapter ID is required'
            }, status=400)
        
        if not correct_answers:
            print("DEBUG: No correct answers provided")
            return Response({
                'message': 'No correct answers to save'
            })
        
        # Get the chapter and note
        chapter = get_object_or_404(Chapter, id=chapter_id)
        print(f"DEBUG: Found chapter: {chapter.title}")
        
        note = Note.objects.filter(chapter=chapter).first()
        print(f"DEBUG: Found note: {bool(note)}")
        
        if not note:
            print("DEBUG: No note found for chapter")
            return Response({
                'error': 'No note found for this chapter'
            }, status=404)
        
        saved_count = 0
        
        for i, answer_data in enumerate(correct_answers):
            print(f"DEBUG: Processing answer {i+1}: {answer_data}")
            
            question_text = answer_data.get('questionText', '')
            question_type = answer_data.get('questionType', '')
            answer = answer_data.get('answer', '')
            
            print(f"DEBUG: Question text: {question_text}")
            print(f"DEBUG: Question type: {question_type}")
            print(f"DEBUG: Answer: {answer}")
            
            if question_text and question_type:
                # Create or get the correct answer record
                correct_answer, created = UserCorrectAnswer.objects.get_or_create(
                    user=request.user,
                    note=note,
                    question_text=question_text,
                    defaults={
                        'question_type': question_type,
                        'answer': answer
                    }
                )
                print(f"DEBUG: UserCorrectAnswer created: {created}, ID: {correct_answer.id}")
                if created:
                    saved_count += 1
            else:
                print(f"DEBUG: Skipping answer {i+1} - missing required fields")
        
        print(f"DEBUG: Total saved: {saved_count}")
        
        return Response({
            'message': f'Saved {saved_count} correct answers',
            'savedCount': saved_count
        })
        
    except Exception as e:
        print(f"ERROR in save_correct_answers: {str(e)}")
        import traceback
        print(f"ERROR traceback: {traceback.format_exc()}")
        return Response({
            'error': 'Failed to save correct answers'
        }, status=500)
