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
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);

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
        setSelectedCourseId(null);
        fetchCourses();
    }, []);

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleCoursePress = (course: Course) => {
        router.push(`/course/${course.id}`);
    };

    const handleDeleteSelected = async () => {
        if (!selectedCourseId) {
            Alert.alert('Error', 'Please select a course to delete');
            return;
        }

        Alert.alert(
            'Delete Course',
            'Are you sure you want to delete this course? This will also delete all chapters and content within the course.',
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
                            await axios.delete(
                                `http://192.168.1.135:8000/api/courses/${selectedCourseId}/`,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                }
                            );
                            setSelectedCourseId(null);
                            fetchCourses();
                        } catch (error) {
                            console.error('Error deleting course:', error);
                            Alert.alert('Error', 'Failed to delete course');
                        }
                    }
                }
            ]
        );
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
                <View style={styles.headerTop}>
                    <Text style={styles.title}>My Courses</Text>
                    {selectedCourseId && courses.length > 0 && (
                        <TouchableOpacity
                            onPress={handleDeleteSelected}
                            style={styles.deleteButton}
                        >
                            <Text style={styles.deleteButtonText}>Delete Selected</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.headerBottom}>
                    <TouchableOpacity 
                        style={styles.createButton} 
                        onPress={() => router.push('/create-course')}
                    >
                        <Text style={styles.createButtonText}>Create Course</Text>
                    </TouchableOpacity>
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
                            isSelected={selectedCourseId === course.id}
                            onSelect={() => setSelectedCourseId(
                                selectedCourseId === course.id ? null : course.id
                            )}
                        />
                    ))
                )}
            </ScrollView>
            {courses.length > 0 && (
                <View style={styles.hintContainer}>
                    <Text style={styles.hintText}>
                        Tip: Long press on a course to select it for deletion
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingTop: 20,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
        gap: 8,
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 16,
        paddingTop: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
    },
    scrollView: {
        flex: 1,
        marginBottom: 75,
    },
    scrollContent: {
        paddingVertical: 8,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 50,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    emptyStateButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
    },
    emptyStateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    createButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#007AFF',
    },
    createButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    deleteButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#FF3B30',
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    hintContainer: {
        position: 'absolute',
        bottom: 85,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(245, 245, 245, 0.95)',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    hintText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
