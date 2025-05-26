from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from .models import Item, CustomUser, Course, UserCourseProgress, Chapter, Note, Document, PDFAttachment
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
from typing import Iterable
from langchain_core.documents import Document as LCDocument

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
        min_length = request.data.get('min_length', 30)
        max_new_tokens = request.data.get('max_length', 500)  # We'll use this as max_new_tokens
        
        # First check if we already have a summary
        course = get_object_or_404(Course, id=course_id, owner=request.user)
        chapter = get_object_or_404(Chapter, id=chapter_id, course=course)
        note = Note.objects.filter(chapter=chapter).first()
        
        if note and note.summary:
            return Response({
                'summary': note.summary,
                'isExisting': True
            })
        
        # If no existing summary, generate a new one
        # Remove HTML tags and clean the text
        soup = BeautifulSoup(text, 'html.parser')
        clean_text = soup.get_text()
        # Remove extra whitespace
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
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
            chunk_summary = summarizer(chunk, 
                                    min_length=min(len(chunk.split()) // 4, min_length),
                                    max_new_tokens=min(len(chunk.split()) // 2, max_new_tokens),
                                    do_sample=False)[0]['summary_text']
            summaries.append(chunk_summary)
        
        # Combine summaries if there are multiple chunks
        final_summary = ' '.join(summaries)
        
        # If the combined summary is still too long, summarize it again
        if len(tokenizer.encode(final_summary)) > max_chunk_length:
            final_summary = summarizer(final_summary,
                                    min_length=min_length,
                                    max_new_tokens=max_new_tokens,
                                    do_sample=False)[0]['summary_text']
        
        # Save the summary
        if note:
            note.summary = final_summary
            note.save()
        
        return Response({
            'summary': final_summary,
            'isExisting': False
        })
    except Exception as e:
        print(f"Summarization error: {str(e)}")  # Add server-side logging
        return Response({
            'error': str(e)
        }, status=500)

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

        if not file:
            return Response({'error': 'No file provided'}, status=400)
        
        if not file.name.endswith('.pdf'):
            return Response({'error': 'Only PDF files are supported'}, status=400)

        # Generate a cache key based on file content
        file_content = file.read()
        cache_key = f"pdf_content_{get_random_string(32)}"
        
        # Try to get cached content
        cached_data = cache.get(cache_key)
        if cached_data:
            final_html, image_info = cached_data
        else:
            # Process the PDF and cache the results
            final_html, image_info = process_pdf(file_content)
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

def process_pdf(file_content):
    """Process PDF content and return HTML and image information."""
    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
    html_content = []
    current_font_size = None
    current_font_weight = None
    in_paragraph = False
    last_y = None
    last_text = ""
    max_pages = 50

    # Extract text
    for page_num, page in enumerate(pdf_reader.pages):
        if page_num >= max_pages:
            html_content.append("<p>[Document truncated due to length. Only first 50 pages are shown.]</p>")
            break

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

    final_html = f"<div class='pdf-content'>\n{''.join(html_content)}</div>"

    # Extract images
    image_info = []
    max_images = 20
    min_size = 100

    pdf_document = fitz.open(stream=file_content, filetype="pdf")
    
    for page_num in range(pdf_document.page_count):
        if len(image_info) >= max_images:
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

llm = HuggingFaceEndpoint(
    repo_id=HF_LLM_MODEL_ID,
    huggingfacehub_api_token=HF_API_KEY,
)

def format_docs(docs: Iterable[LCDocument]):
    return "\n\n".join(doc.page_content for doc in docs)

# Initialize text splitter
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ask_question(request):
    try:
        question = request.data.get('question')
        chapter_id = request.data.get('chapterId')
        
        if not question or not chapter_id:
            return Response({
                'error': 'Question and chapter ID are required'
            }, status=400)

        # Get the chapter content
        chapter = get_object_or_404(Chapter, id=chapter_id)
        note = Note.objects.filter(chapter=chapter).first()
        
        if not note:
            return Response({
                'error': 'No content found for this chapter'
            }, status=404)

        # Get document if exists
        document = Document.objects.filter(chapter=chapter).first()
        
        # Prepare the content for RAG
        content = note.content
        if document:
            content += "\n\n" + document.content

        # Clean HTML content
        soup = BeautifulSoup(content, 'html.parser')
        clean_text = soup.get_text()

        # Create document splits
        docs = [LCDocument(page_content=clean_text)]
        splits = text_splitter.split_documents(docs)

        # Create vector store using FAISS
        vectorstore = FAISS.from_documents(splits, embeddings)

        # Create retriever
        retriever = vectorstore.as_retriever()

        # Create prompt template
        prompt = PromptTemplate.from_template(
            "Context information is below.\n---------------------\n{context}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: {question}\nAnswer:\n"
        )

        # Create RAG chain
        rag_chain = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

        # Get answer
        answer = rag_chain.invoke(question)

        return Response({
            'answer': answer
        })

    except Exception as e:
        print(f"Error in ask_question: {str(e)}")
        return Response({
            'error': 'An error occurred while processing your question'
        }, status=500)
