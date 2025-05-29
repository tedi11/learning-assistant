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
    notes: Array<{
        id: number;
        content: string;
        created_at: string;
        updated_at: string;
    }>;
}

interface Course {
    id: number;
    title: string;
    description: string;
    owner: string;
    chapters: Chapter[];
    progress?: number;
}

function ChapterCard({ chapter, onPress, isSelected, onSelect }: { 
    chapter: Chapter; 
    onPress: () => void; 
    isSelected: boolean;
    onSelect: () => void;
}) {
    // Get the most recent note's updated_at date
    const lastUpdateDate = chapter.notes && chapter.notes.length > 0
        ? chapter.notes[0].updated_at  // Since notes are ordered by updated_at desc
        : chapter.updated_at;  // Fallback to chapter date if no notes

    return (
        <TouchableOpacity 
            style={[
                styles.chapterCard,
                isSelected && styles.selectedChapter
            ]} 
            onPress={onPress}
            onLongPress={onSelect}
            delayLongPress={200}
        >
            <View style={styles.chapterContent}>
                <Text style={styles.chapterTitle}>{chapter.title}</Text>
                <Text style={styles.chapterMeta}>
                    Last updated: {new Date(lastUpdateDate).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </Text>
            </View>
            <View style={styles.chapterActions}>
                {isSelected && (
                    <Text style={styles.selectedText}>Selected</Text>
                )}
                <Text style={styles.chapterArrow}>→</Text>
            </View>
        </TouchableOpacity>
    );
}

export default function CourseScreen() {
    const router = useRouter();
    const { id, refresh } = useLocalSearchParams();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);
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

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchCourse();
        setRefreshing(false);
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

    const handleDeleteSelected = () => {
        if (!selectedChapterId) {
            Alert.alert('Error', 'Please select a chapter to delete');
            return;
        }

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
                                `http://192.168.1.135:8000/api/courses/${id}/chapters/${selectedChapterId}/`,
                                {
                                    headers: {
                                        'Authorization': `Bearer ${token}`
                                    }
                                }
                            );
                            setSelectedChapterId(null);
                            fetchCourse();
                        } catch (error) {
                            console.error('Error deleting chapter:', error);
                            Alert.alert('Error', 'Failed to delete chapter');
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
                    <Text style={styles.title}>📚 Course Not Found</Text>
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
                    {selectedChapterId && course?.chapters.length > 0 && (
                        <TouchableOpacity
                            onPress={handleDeleteSelected}
                            style={styles.deleteButton}
                        >
                            <Text style={styles.deleteButtonText}>Delete Selected</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={styles.headerBottom}>
                    <View style={styles.courseInfo}>
                        <Text style={styles.title}>📚 {course?.title}</Text>
                        {course?.description && (
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
                        colors={["#007AFF"]}
                        progressBackgroundColor="#fff"
                    />
                }
            >
                {(!course?.chapters || course.chapters.length === 0) ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateIcon}>📖</Text>
                        <Text style={styles.emptyStateText}>No chapters yet</Text>
                        <Text style={styles.emptyStateSubtext}>Create your first chapter to start building your course content</Text>
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
                            isSelected={selectedChapterId === chapter.id}
                            onSelect={() => setSelectedChapterId(
                                selectedChapterId === chapter.id ? null : chapter.id
                            )}
                        />
                    ))
                )}
            </ScrollView>
            {course?.chapters.length > 0 && (
                <View style={styles.hintContainer}>
                    <Text style={styles.hintText}>
                        💡 Tip: Long press on a chapter to select it for deletion
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
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingBottom: 12,
    },
    headerBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: 20,
        paddingTop: 8,
    },
    courseInfo: {
        flex: 1,
        marginRight: 20,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    description: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
        marginBottom: 0,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 20,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyStateIcon: {
        fontSize: 64,
        marginBottom: 20,
    },
    emptyStateText: {
        fontSize: 20,
        color: '#666',
        marginBottom: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 16,
        color: '#999',
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '400',
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
        paddingVertical: 12,
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
        fontSize: 16,
        fontWeight: '700',
    },
    chapterCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    selectedChapter: {
        borderWidth: 2,
        borderColor: '#007AFF',
        backgroundColor: '#007AFF05',
    },
    chapterContent: {
        flex: 1,
    },
    chapterTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    chapterMeta: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    chapterActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectedText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    chapterArrow: {
        fontSize: 20,
        color: '#007AFF',
        fontWeight: '600',
    },
    deleteButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#ff3b30',
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    hintContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(248, 249, 250, 0.95)',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    hintText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
}); 