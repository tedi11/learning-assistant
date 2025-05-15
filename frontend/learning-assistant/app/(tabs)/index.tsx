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

interface UserProfile {
    id: number;
    email: string;
    username: string;
}

export default function HomeScreen() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const fetchUserProfile = async () => {
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.get('http://192.168.1.135:8000/api/profile/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setUserProfile(response.data);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                router.replace('/(auth)/login');
            }
        }
    };

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
        Promise.all([fetchCourses(), fetchUserProfile()]);
    }, []);

    useEffect(() => {
        fetchUserProfile();
        fetchCourses();
    }, []);

    const handleLogout = async () => {
        await authService.logout();
        router.replace('/(auth)/login');
    };

    const handleCoursePress = (course: Course) => {
        router.push(`/course/${course.id}`);
    };

    const handleDeleteCourse = async (course: Course) => {
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
                                `http://192.168.1.135:8000/api/courses/${course.id}/`,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                }
                            );
                            fetchCourses(); // Refresh the course list
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
                    <Text style={styles.welcomeText}>
                        Welcome, {userProfile?.username || 'User'}
                    </Text>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerBottom}>
                    <Text style={styles.title}>My Courses</Text>
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
                        colors={["#007AFF"]} // Android
                        progressBackgroundColor="#fff" // Android
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
                            onDelete={() => handleDeleteCourse(course)}
                        />
                    ))
                )}
            </ScrollView>
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
        paddingTop: 20, // Extra padding for notch
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 8,
    },
    welcomeText: {
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    scrollView: {
        flex: 1,
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
    logoutButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#ff3b30',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
