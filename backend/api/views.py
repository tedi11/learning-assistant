from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from .models import Item, CustomUser, Course, UserCourseProgress, Chapter, Note, Document
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

        if not file:
            return Response({'error': 'No file provided'}, status=400)
        
        if not file.name.endswith('.pdf'):
            return Response({'error': 'Only PDF files are supported'}, status=400)

        # Extract text from PDF
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
        text_content = ""
        for page in pdf_reader.pages:
            text_content += page.extract_text()

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
                # Create new chapter in existing course
                chapter = Chapter.objects.create(
                    course=course,
                    title=new_chapter_title or "New Chapter"
                )

        # Create or update note
        note, created = Note.objects.get_or_create(
            chapter=chapter,
            defaults={'content': text_content}
        )
        if not created:
            note.content = text_content
            note.summary = None  # Clear existing summary
            note.save()

        # Save the document
        document = Document.objects.create(
            title=file.name,
            file=file,
            content=text_content,
            uploaded_by=request.user,
            course=course,
            chapter=chapter
        )

        return Response({
            'message': 'Document uploaded successfully',
            'courseId': course.id,
            'chapterId': chapter.id,
            'documentId': document.id
        })

    except Exception as e:
        return Response({'error': str(e)}, status=500)

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
