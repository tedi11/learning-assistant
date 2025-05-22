from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import ItemViewSet, RegisterView, UserProfileView, CourseViewSet, ChapterViewSet, NoteViewSet, summarize_text

router = DefaultRouter()
router.register(r'items', ItemViewSet)
router.register(r'courses', CourseViewSet, basename='course')

# Create a nested router for chapters within courses
courses_router = routers.NestedSimpleRouter(router, r'courses', lookup='course')
courses_router.register(r'chapters', ChapterViewSet, basename='course-chapters')

# Create a nested router for notes within chapters
chapters_router = routers.NestedSimpleRouter(courses_router, r'chapters', lookup='chapter')
chapters_router.register(r'notes', NoteViewSet, basename='chapter-notes')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(courses_router.urls)),
    path('', include(chapters_router.urls)),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileView.as_view(), name='user_profile'),
    path('summarize/', summarize_text, name='summarize-text'),
] 