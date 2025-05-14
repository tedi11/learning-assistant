from rest_framework import serializers
from .models import Item, CustomUser, Course, UserCourseProgress, Chapter, Note

class ItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    class Meta:
        model = CustomUser
        fields = ['email', 'username', 'password', 'password2']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = CustomUser.objects.create_user(**validated_data)
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'username', 'bio', 'profile_picture']

class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ['id', 'content', 'created_at', 'updated_at']

class ChapterSerializer(serializers.ModelSerializer):
    notes = NoteSerializer(many=True, read_only=True)
    
    class Meta:
        model = Chapter
        fields = ['id', 'title', 'order', 'created_at', 'updated_at', 'notes']

class CourseSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source='owner.username')
    progress = serializers.IntegerField(read_only=True, required=False)
    last_accessed = serializers.DateTimeField(read_only=True, required=False)
    chapters = ChapterSerializer(many=True, read_only=True)

    class Meta:
        model = Course
        fields = ['id', 'title', 'description', 'created_at', 'updated_at', 'owner', 'progress', 'last_accessed', 'chapters']
        read_only_fields = ['created_at', 'updated_at', 'owner']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            progress = UserCourseProgress.objects.filter(
                user=request.user,
                course=instance
            ).first()
            if progress:
                data['progress'] = progress.progress
                data['last_accessed'] = progress.last_accessed
        return data 