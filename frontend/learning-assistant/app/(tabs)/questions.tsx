import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform, Modal, TouchableOpacity, SafeAreaView, RefreshControl, TextInput } from 'react-native';
import { Text, Button } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { courseApi, questionApi } from '@/services/api';
import { useRouter } from 'expo-router';
import { ChapterPicker } from '@/components/ChapterPicker';
import { Chapter, Course, Question, QuestionSet } from '@/types';
import { Colors } from '@/constants/Colors';

export default function QuestionsScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState<{[key: number]: boolean}>({});
  const [userAnswers, setUserAnswers] = useState<{[key: number]: string}>({});
  const [questionCount, setQuestionCount] = useState(5);
  const { user } = useAuth();
  const router = useRouter();
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<string>('mixed'); // 'mixed', 'true_false', 'short_answer', 'multiple_choice'

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

  const onRefresh = useCallback(() => {
    if (!user) return;
    setRefreshing(true);
    fetchCourses();
  }, [user, fetchCourses]);

  const handleGenerateQuestions = useCallback(async () => {
    if (!selectedChapter) {
      return;
    }

    // Check if the chapter has notes with content
    if (!selectedChapter.notes || selectedChapter.notes.length === 0) {
      setError('This chapter has no content yet. Please add some content before generating questions.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      console.log('Generating questions for chapter:', selectedChapter.id);
      const response = await questionApi.generateQuestions(selectedChapter.id, questionCount, selectedQuestionType);
      
      console.log('Questions response:', response.data);
      
      if (response.data.questions && response.data.questions.length > 0) {
        setQuestions(response.data.questions);
        setCurrentQuestionIndex(0);
        setShowAnswers({});
        setUserAnswers({});
      } else {
        setError('No questions were generated. Please try again.');
      }
    } catch (error: any) {
      console.error('Question generation error:', error);
      setError(error.response?.data?.error || 'Failed to generate questions. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [selectedChapter, questionCount, selectedQuestionType]);

  const handleCourseSelect = useCallback((course: Course | null) => {
    setSelectedCourse(course);
    setSelectedChapter(null);
    setError(null);
    setQuestions([]);
    setIsDropdownVisible(false);
  }, []);

  const handleAnswerSelect = useCallback((questionId: number, answer: string) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Automatically show answer for true/false and multiple choice questions
    const question = questions.find(q => q.id === questionId);
    if (question && (question.type === 'true_false' || question.type === 'multiple_choice')) {
      setShowAnswers(prev => ({
        ...prev,
        [questionId]: true
      }));
    }
  }, [questions]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const handlePreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const handleShowAnswers = useCallback((questionId: number) => {
    setShowAnswers(prev => ({
      ...prev,
      [questionId]: true
    }));
  }, []);

  const handleResetQuiz = useCallback(() => {
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setShowAnswers({});
  }, []);

  const toggleDropdown = () => setIsDropdownVisible(!isDropdownVisible);

  const isGenerateDisabled = !selectedChapter || !selectedChapter.notes || selectedChapter.notes.length === 0;

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Please log in to generate questions.</Text>
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
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS === 'web' && styles.webContentContainer
        ]}
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
          <Text style={styles.title}>Study Questions</Text>
          <Text style={styles.subtitle}>Generate personalized flashcards to test your knowledge</Text>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 Select Course</Text>
          {loadingCourses ? (
            <ActivityIndicator size="small" color={Colors.light.primary} />
          ) : error && !selectedCourse ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <Button 
                onPress={fetchCourses}
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
          <Text style={styles.sectionTitle}>⚡ Generate Questions</Text>
          {selectedChapter && (!selectedChapter.notes || selectedChapter.notes.length === 0) && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>⚠️ No content available in this chapter</Text>
            </View>
          )}

          <View style={styles.questionCountContainer}>
            <Text style={styles.questionCountLabel}>Number of Questions:</Text>
            <View style={styles.questionCountButtons}>
              {[3, 5, 7, 10].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.questionCountButton,
                    questionCount === count && styles.selectedQuestionCount
                  ]}
                  onPress={() => setQuestionCount(count)}
                >
                  <Text style={[
                    styles.questionCountButtonText,
                    questionCount === count && styles.selectedQuestionCountText
                  ]}>
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.questionTypeSelectorContainer}>
            <Text style={styles.questionTypeLabel}>Question Type:</Text>
            <View style={styles.questionTypeButtons}>
              {[
                { key: 'mixed', label: 'Mixed' },
                { key: 'true_false', label: 'True/False' },
                { key: 'short_answer', label: 'Short Answer' },
                { key: 'multiple_choice', label: 'Multiple Choice' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.questionTypeButton,
                    selectedQuestionType === type.key && styles.selectedQuestionType
                  ]}
                  onPress={() => setSelectedQuestionType(type.key)}
                >
                  <Text style={[
                    styles.questionTypeButtonText,
                    selectedQuestionType === type.key && styles.selectedQuestionTypeText
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button
            onPress={handleGenerateQuestions}
            disabled={isGenerateDisabled || generating}
            style={[styles.generateButton, (isGenerateDisabled || generating) && styles.disabledButton]}
          >
            {generating ? 'Generating Questions...' : 'Generate Questions'}
          </Button>
        </View>

        {generating && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Creating your study questions...</Text>
          </View>
        )}

        {error && selectedChapter && (
          <View style={[styles.section, styles.errorSection]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Questions Display */}
        {questions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.questionHeader}>
              <Text style={styles.questionCounter}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </Text>
              <View style={styles.questionTypeBadge}>
                <Text style={styles.questionType}>
                  {questions[currentQuestionIndex].type.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionText}>
                {questions[currentQuestionIndex].question}
              </Text>

              {/* Multiple Choice Options */}
              {questions[currentQuestionIndex].type === 'multiple_choice' && (
                <View style={styles.optionsContainer}>
                  {questions[currentQuestionIndex].options.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionButton,
                        userAnswers[questions[currentQuestionIndex].id] === option.id && styles.selectedOption,
                        showAnswers[questions[currentQuestionIndex].id] && questions[currentQuestionIndex].answer === option.id && styles.correctOption,
                        showAnswers[questions[currentQuestionIndex].id] && userAnswers[questions[currentQuestionIndex].id] === option.id && 
                        questions[currentQuestionIndex].answer !== option.id && styles.incorrectOption
                      ]}
                      onPress={() => !showAnswers[questions[currentQuestionIndex].id] && handleAnswerSelect(questions[currentQuestionIndex].id, option.id)}
                      disabled={showAnswers[questions[currentQuestionIndex].id]}
                    >
                      <Text style={[
                        styles.optionText,
                        userAnswers[questions[currentQuestionIndex].id] === option.id && styles.selectedOptionText,
                        showAnswers[questions[currentQuestionIndex].id] && questions[currentQuestionIndex].answer === option.id && styles.correctOptionText,
                        showAnswers[questions[currentQuestionIndex].id] && userAnswers[questions[currentQuestionIndex].id] === option.id && 
                        questions[currentQuestionIndex].answer !== option.id && styles.incorrectOptionText
                      ]}>
                        {option.id}) {option.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* True/False Options */}
              {questions[currentQuestionIndex].type === 'true_false' && (
                <View style={styles.trueFalseContainer}>
                  {['True', 'False'].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.trueFalseButton,
                        userAnswers[questions[currentQuestionIndex].id] === option && styles.selectedTrueFalse,
                        showAnswers[questions[currentQuestionIndex].id] && questions[currentQuestionIndex].answer.toLowerCase() === option.toLowerCase() && styles.correctTrueFalse,
                        showAnswers[questions[currentQuestionIndex].id] && userAnswers[questions[currentQuestionIndex].id] === option && 
                        questions[currentQuestionIndex].answer.toLowerCase() !== option.toLowerCase() && styles.incorrectTrueFalse
                      ]}
                      onPress={() => !showAnswers[questions[currentQuestionIndex].id] && handleAnswerSelect(questions[currentQuestionIndex].id, option)}
                      disabled={showAnswers[questions[currentQuestionIndex].id]}
                    >
                      <Text style={[
                        styles.trueFalseText,
                        userAnswers[questions[currentQuestionIndex].id] === option && styles.selectedTrueFalseText,
                        showAnswers[questions[currentQuestionIndex].id] && questions[currentQuestionIndex].answer.toLowerCase() === option.toLowerCase() && styles.correctOptionText,
                        showAnswers[questions[currentQuestionIndex].id] && userAnswers[questions[currentQuestionIndex].id] === option && 
                        questions[currentQuestionIndex].answer.toLowerCase() !== option.toLowerCase() && styles.incorrectOptionText
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Short Answer Input */}
              {(questions[currentQuestionIndex].type === 'short_answer' || questions[currentQuestionIndex].type === 'fill_blank') && (
                <View style={styles.answerInputContainer}>
                  <TextInput
                    style={[
                      styles.answerInput,
                      showAnswers[questions[currentQuestionIndex].id] && styles.disabledInput
                    ]}
                    placeholder="Type your answer here..."
                    value={userAnswers[questions[currentQuestionIndex].id] || ''}
                    onChangeText={(text) => handleAnswerSelect(questions[currentQuestionIndex].id, text)}
                    editable={!showAnswers[questions[currentQuestionIndex].id]}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}

              {/* Show Answer */}
              {showAnswers[questions[currentQuestionIndex].id] && (
                <View style={styles.answerRevealContainer}>
                  <Text style={styles.answerLabel}>Correct Answer:</Text>
                  <View style={styles.correctAnswerBox}>
                    <Text style={styles.answerText}>{questions[currentQuestionIndex].answer}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {currentQuestionIndex + 1} / {questions.length}
              </Text>
            </View>

            {/* Navigation Controls */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                onPress={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                style={[
                  styles.navButton, 
                  styles.prevButton,
                  currentQuestionIndex === 0 && styles.disabledNavButton
                ]}
              >
                <Text style={[
                  styles.navButtonText,
                  currentQuestionIndex === 0 && styles.disabledNavButtonText
                ]}>
                  ← Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.centerButtonContainer}>
                {!showAnswers[questions[currentQuestionIndex].id] ? (
                  <TouchableOpacity
                    onPress={() => handleShowAnswers(questions[currentQuestionIndex].id)}
                    style={styles.showAnswerButton}
                  >
                    <Text style={styles.showAnswerButtonText}>Show Answer</Text>
                  </TouchableOpacity>
                ) : (
                  // Only show reset button if all questions have been answered AND we're on the last question
                  Object.keys(showAnswers).length === questions.length && 
                  Object.keys(userAnswers).length === questions.length &&
                  currentQuestionIndex === questions.length - 1 ? (
                    <TouchableOpacity
                      onPress={handleResetQuiz}
                      style={styles.resetButton}
                    >
                      <Text style={styles.resetButtonText}>Reset Quiz</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.answeredIndicator}>
                      <Text style={styles.answeredText}>✓ Answered</Text>
                    </View>
                  )
                )}
              </View>

              <TouchableOpacity
                onPress={handleNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                style={[
                  styles.navButton, 
                  styles.nextButton,
                  currentQuestionIndex === questions.length - 1 && styles.disabledNavButton
                ]}
              >
                <Text style={[
                  styles.navButtonText,
                  currentQuestionIndex === questions.length - 1 && styles.disabledNavButtonText
                ]}>
                  Next →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Placeholder for when no questions are generated */}
        {questions.length === 0 && !generating && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Questions</Text>
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                📚 Questions will appear here once generated
              </Text>
              <Text style={styles.placeholderSubtext}>
                Select a chapter and click "Generate Questions" to create your personalized study flashcards
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
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
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: Colors.light.gray,
  },
  loginButton: {
    paddingHorizontal: 30,
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
    flex: 1,
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
    maxHeight: 300,
    width: '85%',
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
    maxWidth: 450,
  },
  dropdownItem: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedDropdownItem: {
    backgroundColor: Colors.light.primary + '10',
    borderBottomColor: Colors.light.primary + '20',
  },
  selectedDropdownItemText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: Colors.light.gray,
    fontSize: 16,
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    color: '#856404',
    fontSize: 14,
  },
  questionCountContainer: {
    backgroundColor: '#f8f9fa',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  questionCountLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  questionCountButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  questionCountButton: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#fff',
    flex: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedQuestionCount: {
    backgroundColor: Colors.light.primary + '15',
    borderColor: Colors.light.primary,
  },
  questionCountButtonText: {
    fontSize: 16,
    color: '#333',
  },
  selectedQuestionCountText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionCounter: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  optionsContainer: {
    marginBottom: 16,
  },
  optionButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedOption: {
    backgroundColor: Colors.light.primary + '20',
  },
  correctOption: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  incorrectOption: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  answerInputContainer: {
    marginBottom: 16,
  },
  answerInput: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
  },
  answerRevealContainer: {
    marginBottom: 16,
  },
  answerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 16,
    color: '#333',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  prevButton: {
    backgroundColor: Colors.light.primary,
  },
  nextButton: {
    backgroundColor: Colors.light.primary,
  },
  disabledNavButton: {
    backgroundColor: '#ccc',
  },
  disabledNavButtonText: {
    color: '#ccc',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  showAnswerButton: {
    backgroundColor: Colors.light.primary,
  },
  showAnswerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resetButton: {
    backgroundColor: '#dc3545',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  centerButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    height: 20,
    marginBottom: 8,
  },
  progressFill: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    height: '100%',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trueFalseContainer: {
    marginBottom: 16,
  },
  trueFalseButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    marginRight: 4,
  },
  selectedTrueFalse: {
    backgroundColor: Colors.light.primary + '20',
  },
  correctTrueFalse: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
  },
  incorrectTrueFalse: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
  },
  trueFalseText: {
    fontSize: 16,
    color: '#333',
  },
  selectedTrueFalseText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  correctOptionText: {
    color: '#28a745',
    fontWeight: '600',
  },
  incorrectOptionText: {
    color: '#dc3545',
    fontWeight: '600',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
  },
  correctAnswerBox: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#c3e6cb',
    borderRadius: 8,
  },
  questionType: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  questionTypeSelectorContainer: {
    backgroundColor: '#f8f9fa',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  questionTypeLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  questionTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  questionTypeButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    backgroundColor: '#fff',
    width: '48.5%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  selectedQuestionType: {
    backgroundColor: Colors.light.primary + '15',
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.2,
  },
  questionTypeButtonText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  selectedQuestionTypeText: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  questionTypeBadge: {
    backgroundColor: Colors.light.primary + '20',
    padding: 4,
    borderRadius: 8,
  },
  answeredIndicator: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#28a745',
    borderRadius: 8,
  },
  answeredText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
  },
  placeholderContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 18,
    color: Colors.light.gray,
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: Colors.light.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 18,
    borderRadius: 12,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.light.gray,
  },
  errorSection: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
}); 