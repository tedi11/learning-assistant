import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import authService from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';

interface Course {
    id: number;
    title: string;
}

export default function ChatbotScreen() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCourseSelector, setShowCourseSelector] = useState(false);

    const fetchCourses = useCallback(async () => {
        try {
            const token = await authService.getToken();
            if (!token) return;

            const response = await axios.get('http://192.168.1.135:8000/api/courses/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setCourses(response.data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchCourses();
        }, [fetchCourses])
    );

    const CourseSelector = () => (
        <View style={[
            styles.courseSelectorContainer,
            showCourseSelector && styles.courseSelectorExpanded
        ]}>
            {courses.map(course => (
                <TouchableOpacity
                    key={course.id}
                    style={[
                        styles.courseOption,
                        selectedCourse?.id === course.id && styles.selectedCourseOption
                    ]}
                    onPress={() => {
                        setSelectedCourse(course);
                        setShowCourseSelector(false);
                    }}
                >
                    <Text style={[
                        styles.courseOptionText,
                        selectedCourse?.id === course.id && styles.selectedCourseOptionText
                    ]}>
                        {course.title}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>AI Assistant</Text>
                <TouchableOpacity
                    style={styles.courseSelector}
                    onPress={() => setShowCourseSelector(!showCourseSelector)}
                >
                    <Text style={styles.courseSelectorText}>
                        {selectedCourse ? selectedCourse.title : 'Select a course'}
                    </Text>
                    <Ionicons
                        name={showCourseSelector ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#007AFF"
                    />
                </TouchableOpacity>
            </View>

            {showCourseSelector && <CourseSelector />}

            <View style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#007AFF" />
                ) : selectedCourse ? (
                    <Text style={styles.placeholder}>
                        Ready to help you with {selectedCourse.title}
                    </Text>
                ) : (
                    <Text style={styles.placeholder}>
                        Please select a course to start
                    </Text>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    courseSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    courseSelectorText: {
        fontSize: 16,
        color: '#007AFF',
    },
    courseSelectorContainer: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        maxHeight: 0,
        overflow: 'hidden',
    },
    courseSelectorExpanded: {
        maxHeight: 300,
    },
    courseOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedCourseOption: {
        backgroundColor: '#f0f8ff',
    },
    courseOptionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedCourseOptionText: {
        color: '#007AFF',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    placeholder: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
}); 