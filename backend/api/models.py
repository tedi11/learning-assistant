from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

# Create your models here.

class CustomUser(AbstractUser):
    email = models.EmailField(_('email address'), unique=True)
    # Add any additional fields you want
    bio = models.TextField(max_length=500, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pics/', null=True, blank=True)
    
    # Make email the required field for login instead of username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email

class Course(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='courses')

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-updated_at']

class Chapter(models.Model):
    course = models.ForeignKey(Course, related_name='chapters', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.course.title} - {self.title}"

    class Meta:
        ordering = ['order', '-updated_at']

class Note(models.Model):
    chapter = models.ForeignKey(Chapter, related_name='notes', on_delete=models.CASCADE)
    content = models.TextField()
    summary = models.TextField(null=True, blank=True)
    progress = models.IntegerField(default=0)  # Progress percentage from 0 to 100
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note for {self.chapter.title}"

    class Meta:
        ordering = ['-updated_at']

class UserCourseProgress(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    progress = models.IntegerField(default=0)  # Percentage from 0 to 100
    last_accessed = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['user', 'course']

    def __str__(self):
        return f"{self.user.username} - {self.course.title} - {self.progress}%"

class Item(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Document(models.Model):
    title = models.CharField(max_length=200)
    file = models.FileField(upload_to='documents/')
    content = models.TextField(blank=True)  # Extracted text from PDF
    uploaded_by = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, null=True, blank=True)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    def delete(self, *args, **kwargs):
        # Delete the associated file
        if self.file:
            self.file.delete()
        super().delete(*args, **kwargs)

    class Meta:
        ordering = ['-updated_at']

class PDFAttachment(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='attachments')
    file = models.ImageField(upload_to='pdf_attachments/')
    page_number = models.IntegerField()
    original_name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment from {self.document.title} - Page {self.page_number}"

    def delete(self, *args, **kwargs):
        # Delete the associated file
        if self.file:
            self.file.delete()
        super().delete(*args, **kwargs)

    class Meta:
        ordering = ['page_number', 'created_at']

class UserCorrectAnswer(models.Model):
    """Store questions that users have answered correctly to avoid regenerating them"""
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='correct_answers')
    note = models.ForeignKey(Note, on_delete=models.CASCADE, related_name='correct_answers') 
    question_text = models.TextField()
    question_type = models.CharField(max_length=20, choices=[
        ('true_false', 'True/False'),
        ('multiple_choice', 'Multiple Choice'),
        ('short_answer', 'Short Answer'),
        ('mixed', 'Mixed')
    ])
    answer = models.TextField()  # Store the correct answer
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'note', 'question_text']  # Prevent duplicate entries
        ordering = ['-answered_at']

    def __str__(self):
        return f"{self.user.username} - {self.note.chapter.title} - {self.question_type}"
