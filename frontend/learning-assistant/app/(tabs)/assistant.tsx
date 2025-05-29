import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform, Modal, TouchableOpacity, FlatList, SafeAreaView, RefreshControl, KeyboardAvoidingView } from 'react-native';
import { Text, Button, TextInput } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { api, courseApi } from '@/services/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChapterPicker } from '@/components/ChapterPicker';
import { Chapter, Course } from '@/types';
import { Colors } from '@/constants/Colors';

export default function AssistantScreen() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Get URL parameters for auto-population
  const { courseId, chapterId, questionText } = useLocalSearchParams();

  const fetchCourses = useCallback(async () => {
    try {
      setError(null);
      const response = await courseApi.getCourses();
      setCourses(response.data);
    } catch (error) {
      setError('Failed to load courses. Please try again.');
    } finally {
      setLoadingCourses(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchCourses();
    } else {
      setLoadingCourses(false);
    }
  }, [user, fetchCourses]);

  // Auto-populate fields when URL parameters are provided
  useEffect(() => {
    if (courses.length > 0 && courseId && chapterId) {
      // Find and set the course
      const course = courses.find(c => c.id.toString() === courseId.toString());
      if (course) {
        setSelectedCourse(course);
        
        // Find and set the chapter
        const chapter = course.chapters?.find(ch => ch.id.toString() === chapterId.toString());
        if (chapter) {
          setSelectedChapter(chapter);
        }
      }
    }
    
    // Set the question text if provided and clear any existing answer
    if (questionText && typeof questionText === 'string') {
      setQuestion(questionText);
      setAnswer(''); // Clear any existing answer
      setError(null); // Clear any existing error
    }
  }, [courses, courseId, chapterId, questionText]);

  const onRefresh = useCallback(() => {
    if (!user) return;
    setRefreshing(true);
    fetchCourses();
  }, [user, fetchCourses]);

  const handleAskQuestion = useCallback(async () => {
    if (!selectedChapter || !question.trim()) {
      return;
    }

    // Check if the chapter has notes with content
    if (!selectedChapter.notes || selectedChapter.notes.length === 0) {
      setError('This chapter has no content yet. Please add some content before asking questions.');
      setAnswer('');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/ask-question/', {
        question: question.trim(),
        chapterId: selectedChapter.id
      });

      setAnswer(response.data.answer);
      setError(null);
    } catch (error) {
      setError('Failed to process your question. Please try again.');
      setAnswer('');
    } finally {
      setLoading(false);
    }
  }, [question, selectedChapter]);

  const handleCourseSelect = useCallback((course: Course | null) => {
    setSelectedCourse(course);
    setSelectedChapter(null);
    setAnswer('');
    setError(null);
    setIsDropdownVisible(false);
  }, []);

  const toggleDropdown = () => setIsDropdownVisible(!isDropdownVisible);

  const isQuestionInputDisabled = !selectedChapter || !selectedChapter.notes || selectedChapter.notes.length === 0;
  const questionPlaceholder = useMemo(() => {
    if (!selectedCourse) return "Select a course first...";
    if (!selectedChapter) return "Select a chapter first...";
    if (!selectedChapter.notes || selectedChapter.notes.length === 0) return "This chapter has no content yet...";
    return "Type your question here...";
  }, [selectedCourse, selectedChapter]);

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Please log in to use the assistant.</Text>
          <Button 
            onPress={() => router.push('/login')}
            style={styles.loginButton}
          >
            Log In
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        enabled={Platform.OS === "ios"}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.contentContainer,
            Platform.OS === 'web' && styles.webContentContainer
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.light.primary]} // Android
              tintColor={Colors.light.primary} // iOS
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>AI Learning Assistant</Text>
            <Text style={styles.subtitle}>Your personal study companion</Text>
            {(courseId || chapterId || questionText) && (
              <View style={styles.autopopulatedBanner}>
                <Text style={styles.autopopulatedText}>
                  🎯 Pre-filled from Questions screen
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Select Course</Text>
            {loadingCourses ? (
              <ActivityIndicator size="small" color={Colors.light.primary} />
            ) : error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <Button 
                  onPress={() => window.location.reload()}
                  style={styles.retryButton}
                >
                  Retry
                </Button>
              </View>
            ) : courses.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No courses found. Please create a course first.</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.dropdownButton} 
                  onPress={toggleDropdown}
                >
                  <Text style={styles.dropdownButtonText}>
                    {selectedCourse ? selectedCourse.title : 'Select a course...'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>

                <Modal
                  visible={isDropdownVisible}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setIsDropdownVisible(false)}
                >
                  <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsDropdownVisible(false)}
                  >
                    <View style={[styles.dropdownList, Platform.OS === 'web' && styles.webDropdownList]}>
                      <TouchableOpacity
                        style={styles.dropdownItem}
                        onPress={() => handleCourseSelect(null)}
                      >
                        <Text style={styles.dropdownItemText}>Select a course...</Text>
                      </TouchableOpacity>
                      {courses.map((course) => (
                        <TouchableOpacity
                          key={course.id}
                          style={[
                            styles.dropdownItem,
                            selectedCourse?.id === course.id && styles.selectedDropdownItem
                          ]}
                          onPress={() => handleCourseSelect(course)}
                        >
                          <Text style={[
                            styles.dropdownItemText,
                            selectedCourse?.id === course.id && styles.selectedDropdownItemText
                          ]}>
                            {course.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Modal>
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 Select Chapter</Text>
            <ChapterPicker
              selectedChapter={selectedChapter}
              onSelectChapter={setSelectedChapter}
              selectedCourse={selectedCourse}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 Ask a Question</Text>
            {selectedChapter && (!selectedChapter.notes || selectedChapter.notes.length === 0) && (
              <View style={styles.warningContainer}>
                <Text style={styles.warningText}>⚠️ No content available in this chapter</Text>
              </View>
            )}
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder={questionPlaceholder}
              multiline
              numberOfLines={3}
              style={[
                styles.input,
                isQuestionInputDisabled && styles.inputDisabled
              ]}
              editable={!isQuestionInputDisabled}
            />
            <Button
              onPress={handleAskQuestion}
              disabled={!selectedChapter || !question.trim() || loading || !selectedChapter.notes || selectedChapter.notes.length === 0}
              style={[styles.askButton, (!selectedChapter || !question.trim() || loading || !selectedChapter.notes || selectedChapter.notes.length === 0) && styles.disabledButton]}
            >
              {loading ? 'Thinking...' : 'Ask Question'}
            </Button>
            
            {/* Clear button when auto-populated */}
            {(courseId || chapterId || questionText) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setSelectedCourse(null);
                  setSelectedChapter(null);
                  setQuestion('');
                  setAnswer('');
                  setError(null);
                  // Navigate back to clean assistant without parameters
                  router.replace('/assistant');
                }}
              >
                <Text style={styles.clearButtonText}>🗑️ Clear Form</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={styles.loadingText}>Processing your question...</Text>
            </View>
          )}

          {error && (
            <View style={[styles.section, styles.errorSection]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {answer && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💡 Answer</Text>
              <View style={styles.answerContainer}>
                <Text style={styles.answerText}>{answer}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
  },
  webContentContainer: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.primary,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 18,
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  courseList: {
    paddingVertical: 8,
  },
  courseButton: {
    marginRight: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  courseButtonText: {
    fontSize: 16,
    color: '#666',
  },
  selectedCourse: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  selectedCourseText: {
    color: '#fff',
  },
  input: {
    marginBottom: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputDisabled: {
    backgroundColor: '#f8f9fa',
    opacity: 0.7,
    borderColor: '#dee2e6',
  },
  askButton: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 16,
    backgroundColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 24,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.primary,
    fontWeight: '500',
  },
  answerContainer: {
    backgroundColor: '#f8f9fa',
    padding: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  answerText: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
    fontWeight: '400',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fff3f3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorSection: {
    backgroundColor: '#fff3f3',
    borderColor: '#ffcdd2',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#d32f2f',
  },
  emptyStateContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginText: {
    fontSize: 18,
    marginBottom: 20,
    color: '#666',
  },
  loginButton: {
    width: 200,
    borderRadius: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownIcon: {
    fontSize: 14,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 8,
    width: '85%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  webDropdownList: {
    width: '100%',
    maxWidth: 450,
  },
  dropdownItem: {
    padding: 18,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedDropdownItem: {
    backgroundColor: Colors.light.primary + '10',
    borderBottomColor: Colors.light.primary + '20',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedDropdownItemText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffc107',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  autopopulatedBanner: {
    backgroundColor: Colors.light.primary + '10',
    borderColor: Colors.light.primary,
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.primary,
  },
  autopopulatedText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.gray,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.light.gray,
    fontWeight: '500',
  },
}); 