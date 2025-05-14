from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, status, generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from .models import Item, CustomUser, Course, UserCourseProgress, Chapter, Note
from .serializers import (
    ItemSerializer, 
    UserRegistrationSerializer,
    UserSerializer,
    CourseSerializer,
    ChapterSerializer,
    NoteSerializer
)

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
        serializer.save(chapter=chapter)

    def perform_update(self, serializer):
        # Ensure the user owns the course before allowing update
        note = self.get_object()
        if note.chapter.course.owner != self.request.user:
            raise PermissionError("You do not have permission to update this note.")
        serializer.save()
