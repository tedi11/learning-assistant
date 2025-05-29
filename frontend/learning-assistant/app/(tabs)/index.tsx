import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import authService from '@/services/authService';
import { CourseCard } from '@/components/CourseCard';
import axios from 'axios';

interface Course {
    id: number;
    title: string;
    description: string;
    owner: string;
    progress?: number;
}

export default function HomeScreen() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);

    const fetchCourses = async () => {
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.get('http://192.168.1.135:8000/api/courses/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setCourses(response.data);
        } catch (error) {
            console.error('Error fetching courses:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                router.replace('/(auth)/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setSelectedCourseIds([]);
        fetchCourses();
    }, []);

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleCoursePress = (course: Course) => {
        if (selectedCourseIds.length > 0) {
            // If in selection mode, toggle selection instead of navigating
            handleCourseSelect(course.id);
        } else {
            // Normal navigation
            router.push(`/course/${course.id}`);
        }
    };

    const handleCourseSelect = (courseId: number) => {
        setSelectedCourseIds(prev => {
            if (prev.includes(courseId)) {
                return prev.filter(id => id !== courseId);
            } else {
                return [...prev, courseId];
            }
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedCourseIds.length === 0) {
            Alert.alert('Error', 'Please select courses to delete');
            return;
        }

        const courseCount = selectedCourseIds.length;
        const coursePlural = courseCount === 1 ? 'course' : 'courses';

        Alert.alert(
            'Delete Courses',
            `Are you sure you want to delete ${courseCount} ${coursePlural}? This will also delete all chapters and content within the selected ${coursePlural}.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await authService.getToken();
                            
                            // Delete all selected courses
                            await Promise.all(
                                selectedCourseIds.map(courseId =>
                                    axios.delete(
                                        `http://192.168.1.135:8000/api/courses/${courseId}/`,
                                        {
                                            headers: {
                                                'Authorization': `Bearer ${token}`
                                            }
                                        }
                                    )
                                )
                            );
                            
                            setSelectedCourseIds([]);
                            fetchCourses();
                            Alert.alert('Success', `${courseCount} ${coursePlural} deleted successfully`);
                        } catch (error) {
                            console.error('Error deleting courses:', error);
                            Alert.alert('Error', 'Failed to delete some courses');
                        }
                    }
                }
            ]
        );
    };

    const handleClearSelection = () => {
        setSelectedCourseIds([]);
    };

    const handleSelectAll = () => {
        if (selectedCourseIds.length === courses.length) {
            // If all are selected, deselect all
            setSelectedCourseIds([]);
        } else {
            // Otherwise, select all
            setSelectedCourseIds(courses.map(course => course.id));
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>🏠 My Courses</Text>
                    <Text style={styles.subtitle}>Manage and explore your learning journey</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity 
                        style={styles.createButton} 
                        onPress={() => router.push('/create-course')}
                    >
                        <Text style={styles.createButtonText}>+ Create Course</Text>
                    </TouchableOpacity>
                    {selectedCourseIds.length > 0 && (
                        <>
                            <TouchableOpacity
                                onPress={handleSelectAll}
                                style={[styles.selectionButton, styles.selectAllButton]}
                            >
                                <Text style={styles.selectAllButtonText}>
                                    {selectedCourseIds.length === courses.length ? 'Deselect All' : 'Select All'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleDeleteSelected}
                                style={[styles.selectionButton, styles.deleteButton]}
                            >
                                <Text style={styles.deleteButtonText}>
                                    Delete ({selectedCourseIds.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleClearSelection}
                                style={[styles.selectionButton, styles.cancelButton]}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
            
            <ScrollView 
                style={styles.scrollView} 
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#007AFF"
                        colors={["#007AFF"]}
                        progressBackgroundColor="#fff"
                    />
                }
            >
                {courses.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>You haven't created any courses yet</Text>
                        <TouchableOpacity 
                            style={styles.emptyStateButton}
                            onPress={() => router.push('/create-course')}
                        >
                            <Text style={styles.emptyStateButtonText}>Create Your First Course</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    courses.map(course => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            onPress={() => handleCoursePress(course)}
                            isSelected={selectedCourseIds.includes(course.id)}
                            onSelect={() => handleCourseSelect(course.id)}
                            isSelectionMode={selectedCourseIds.length > 0}
                        />
                    ))
                )}
            </ScrollView>
            {courses.length > 0 && selectedCourseIds.length === 0 && (
                <View style={styles.hintContainer}>
                    <Text style={styles.hintText}>
                        💡 Tip: Long press on a course to select it for deletion
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    header: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerContent: {
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 17,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 24,
    },
    headerActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingTop: 8,
        gap: 12,
    },
    scrollView: {
        flex: 1,
        marginBottom: 32,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyStateText: {
        fontSize: 20,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 28,
    },
    emptyStateButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    emptyStateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    createButton: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#007AFF',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    selectionButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    selectAllButton: {
        backgroundColor: '#34C759',
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
    },
    cancelButton: {
        backgroundColor: '#8E8E93',
    },
    selectAllButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    cancelButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    hintContainer: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    hintText: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        fontWeight: '500',
    },
});
