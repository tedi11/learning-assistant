import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import authService from '@/services/authService';
import axios from 'axios';

interface Note {
    id: number;
    content: string;
    created_at: string;
    updated_at: string;
}

interface Chapter {
    id: number;
    title: string;
    order: number;
    notes: Note[];
    created_at: string;
    updated_at: string;
}

export default function ChapterScreen() {
    const router = useRouter();
    const { id, courseId } = useLocalSearchParams();
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchChapter = useCallback(async () => {
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.get(`http://192.168.1.135:8000/api/courses/${courseId}/chapters/${id}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setChapter(response.data);
        } catch (error) {
            console.error('Error fetching chapter:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    router.replace('/(auth)/login');
                } else if (error.response?.status === 403) {
                    router.push({
                        pathname: "/course/[id]",
                        params: { id: courseId as string }
                    });
                    Alert.alert('Error', 'You do not have permission to access this chapter.');
                }
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, courseId]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchChapter();
    }, [fetchChapter]);

    useFocusEffect(
        useCallback(() => {
            if (id && courseId) {
                fetchChapter();
            }
        }, [id, courseId])
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </SafeAreaView>
        );
    }

    if (!chapter) {
        return (
            <SafeAreaView style={styles.container}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.push({
                        pathname: "/course/[id]",
                        params: { id: courseId as string }
                    })}
                >
                    <Text style={styles.backButtonText}>← Back to Course</Text>
                </TouchableOpacity>
                <Text style={styles.errorText}>Chapter Not Found</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.push({
                        pathname: "/course/[id]",
                        params: { id: courseId as string }
                    })}
                >
                    <Text style={styles.backButtonText}>← Back to Course</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{chapter.title}</Text>
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
                {chapter.notes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No content yet</Text>
                        <TouchableOpacity 
                            style={styles.emptyStateButton}
                            onPress={() => {
                                router.push({
                                    pathname: "/chapter/edit",
                                    params: {
                                        courseId,
                                        chapterId: id
                                    }
                                });
                            }}
                        >
                            <Text style={styles.emptyStateButtonText}>Add Content</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    chapter.notes.map(note => (
                        <View key={note.id} style={styles.noteCard}>
                            <View style={styles.noteHeader}>
                                <Text style={styles.noteMeta}>
                                    Last updated: {new Date(note.updated_at).toLocaleDateString()}
                                </Text>
                                <View style={styles.noteActions}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            router.push({
                                                pathname: "/chapter/edit",
                                                params: {
                                                    courseId,
                                                    chapterId: id,
                                                    initialContent: note.content
                                                }
                                            });
                                        }}
                                    >
                                        <Text style={styles.editButton}>Edit</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            Alert.alert(
                                                'Delete Content',
                                                'Are you sure you want to delete this content?',
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
                                                                    `http://192.168.1.135:8000/api/courses/${courseId}/chapters/${id}/notes/${note.id}/`,
                                                                    {
                                                                        headers: {
                                                                            'Authorization': `Bearer ${token}`
                                                                        }
                                                                    }
                                                                );
                                                                fetchChapter();
                                                            } catch (error) {
                                                                console.error('Error deleting note:', error);
                                                                Alert.alert('Error', 'Failed to delete content');
                                                            }
                                                        }
                                                    }
                                                ]
                                            );
                                        }}
                                    >
                                        <Text style={styles.deleteButton}>Delete</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <Text style={styles.noteContent}>{note.content}</Text>
                        </View>
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
        padding: 16,
    },
    backButton: {
        marginBottom: 16,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    errorText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingTop: 0,
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
    noteCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    noteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    noteContent: {
        fontSize: 16,
        color: '#333',
        marginBottom: 8,
    },
    noteMeta: {
        fontSize: 12,
        color: '#666',
    },
    noteActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    editButton: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        color: '#FF3B30',
        fontSize: 14,
        fontWeight: '600',
    },
}); 