import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import authService from '@/services/authService';
import axios from 'axios';

interface Chapter {
    id: number;
    title: string;
    order: number;
    created_at: string;
    updated_at: string;
}

interface Course {
    id: number;
    title: string;
    description: string;
    owner: string;
    chapters: Chapter[];
    progress?: number;
}

function ChapterCard({ chapter, onPress, onDelete }: { chapter: Chapter; onPress: () => void; onDelete: () => void }) {
    return (
        <TouchableOpacity style={styles.chapterCard} onPress={onPress}>
            <View style={styles.chapterContent}>
                <Text style={styles.chapterTitle}>{chapter.title}</Text>
                <Text style={styles.chapterMeta}>
                    Last updated: {new Date(chapter.updated_at).toLocaleDateString()}
                </Text>
            </View>
            <Text style={styles.chapterArrow}>→</Text>
            <TouchableOpacity 
                style={styles.deleteButton}
                onPress={onDelete}
            >
                <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export default function CourseScreen() {
    const router = useRouter();
    const { id, refresh } = useLocalSearchParams();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const lastFetchRef = useRef<string | null>(null);
    const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchCourse = useCallback(async () => {
        // Don't fetch if we're already loading this course
        if (lastFetchRef.current === id) {
            return;
        }

        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            lastFetchRef.current = id as string;
            const response = await axios.get(`http://192.168.1.135:8000/api/courses/${id}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setCourse(response.data);
        } catch (error) {
            console.error('Error fetching course:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    router.replace('/(auth)/login');
                } else if (error.response?.status === 403) {
                    router.back();
                    Alert.alert('Error', 'You do not have permission to access this course.');
                }
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    const debouncedFetchCourse = useCallback(() => {
        if (fetchTimeoutRef.current) {
            clearTimeout(fetchTimeoutRef.current);
        }
        
        fetchTimeoutRef.current = setTimeout(() => {
            if (id) {
                fetchCourse();
            }
        }, 100);
    }, [id, fetchCourse]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        lastFetchRef.current = null; // Reset last fetch to force a refresh
        fetchCourse();
    }, [fetchCourse]);

    useFocusEffect(
        useCallback(() => {
            if (id) {
                setLoading(true);
                debouncedFetchCourse();
            }
            return () => {
                if (fetchTimeoutRef.current) {
                    clearTimeout(fetchTimeoutRef.current);
                }
                lastFetchRef.current = null;
            };
        }, [id, refresh, debouncedFetchCourse])
    );

    const handleCreateChapter = () => {
        router.push({
            pathname: '/chapter/create',
            params: { courseId: id }
        });
    };

    const handleChapterPress = (chapter: Chapter) => {
        router.push({
            pathname: "/chapter/[id]",
            params: { id: chapter.id, courseId: id }
        });
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    if (!course) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.push("/(tabs)")}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Course Not Found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.push("/(tabs)")}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.headerBottom}>
                    <View style={styles.courseInfo}>
                        <Text style={styles.title}>{course.title}</Text>
                        {course.description && (
                            <Text style={styles.description}>{course.description}</Text>
                        )}
                    </View>
                    <TouchableOpacity 
                        style={styles.createButton} 
                        onPress={handleCreateChapter}
                    >
                        <Text style={styles.createButtonText}>Add Chapter</Text>
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
                {(!course.chapters || course.chapters.length === 0) ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No chapters yet</Text>
                        <TouchableOpacity 
                            style={styles.emptyStateButton}
                            onPress={handleCreateChapter}
                        >
                            <Text style={styles.emptyStateButtonText}>Create First Chapter</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    course.chapters.map(chapter => (
                        <ChapterCard
                            key={chapter.id}
                            chapter={chapter}
                            onPress={() => handleChapterPress(chapter)}
                            onDelete={async () => {
                                Alert.alert(
                                    'Delete Chapter',
                                    'Are you sure you want to delete this chapter? This will also delete all content within the chapter.',
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
                                                        `http://192.168.1.135:8000/api/courses/${id}/chapters/${chapter.id}/`,
                                                        {
                                                            headers: {
                                                                'Authorization': `Bearer ${token}`
                                                            }
                                                        }
                                                    );
                                                    fetchCourse();
                                                } catch (error) {
                                                    console.error('Error deleting chapter:', error);
                                                    Alert.alert('Error', 'Failed to delete chapter');
                                                }
                                            }
                                        }
                                    ]
                                );
                            }}
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
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 16,
        paddingTop: 8,
    },
    courseInfo: {
        flex: 1,
        marginRight: 16,
    },
    backButton: {
        marginRight: 16,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    description: {
        fontSize: 14,
        color: '#666',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
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
    chapterCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    chapterContent: {
        flex: 1,
    },
    chapterTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    chapterMeta: {
        fontSize: 12,
        color: '#666',
    },
    chapterArrow: {
        fontSize: 20,
        color: '#007AFF',
        marginLeft: 8,
    },
    deleteButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        marginLeft: 8,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
}); 