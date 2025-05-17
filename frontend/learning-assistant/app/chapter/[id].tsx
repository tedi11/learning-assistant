import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import RenderHtml from 'react-native-render-html';
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
    const { width } = useWindowDimensions();
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
                <View style={styles.headerTop}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.push({
                            pathname: "/course/[id]",
                            params: { id: courseId as string }
                        })}
                    >
                        <Text style={styles.backButtonText}>← Back to Course</Text>
                    </TouchableOpacity>
                    {chapter?.notes.length > 0 && (
                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                onPress={() => {
                                    router.push({
                                        pathname: "/chapter/edit",
                                        params: {
                                            courseId,
                                            chapterId: id,
                                            initialContent: chapter.notes[0]?.content
                                        }
                                    });
                                }}
                                style={styles.headerButton}
                            >
                                <Text style={styles.editButton}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <Text style={styles.title}>{chapter?.title}</Text>
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
                {(!chapter?.notes || chapter.notes.length === 0) ? (
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
                        <View 
                            key={note.id} 
                            style={styles.noteContainer}
                        >
                            <Text style={styles.lastUpdated}>
                                Last updated: {new Date(note.updated_at).toLocaleDateString()}
                            </Text>
                            <RenderHtml
                                contentWidth={width}
                                source={{ html: note.content }}
                                tagsStyles={{
                                    h1: {
                                        fontSize: 28,
                                        fontWeight: 'bold',
                                        color: '#333',
                                        marginVertical: 16,
                                    },
                                    h2: {
                                        fontSize: 24,
                                        fontWeight: 'bold',
                                        color: '#333',
                                        marginVertical: 12,
                                    },
                                    h3: {
                                        fontSize: 20,
                                        fontWeight: 'bold',
                                        color: '#333',
                                        marginVertical: 8,
                                    },
                                    p: {
                                        fontSize: 16,
                                        color: '#333',
                                        lineHeight: 24,
                                        marginVertical: 8,
                                    },
                                    ul: {
                                        marginLeft: 20,
                                    },
                                    ol: {
                                        marginLeft: 20,
                                    },
                                    li: {
                                        fontSize: 16,
                                        color: '#333',
                                        lineHeight: 24,
                                    },
                                    strong: {
                                        fontWeight: 'bold',
                                    },
                                    b: {
                                        fontWeight: 'bold',
                                    },
                                    em: {
                                        fontStyle: 'italic',
                                    },
                                    i: {
                                        fontStyle: 'italic',
                                    },
                                    u: {
                                        textDecorationLine: 'underline',
                                    },
                                    strike: {
                                        textDecorationLine: 'line-through',
                                    },
                                    a: {
                                        color: '#007AFF',
                                        textDecorationLine: 'underline',
                                    },
                                    blockquote: {
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#666',
                                        paddingLeft: 16,
                                        marginLeft: 0,
                                        fontStyle: 'italic',
                                    },
                                    code: {
                                        fontFamily: 'monospace',
                                        backgroundColor: '#f5f5f5',
                                        padding: 4,
                                        borderRadius: 4,
                                    },
                                    pre: {
                                        backgroundColor: '#f5f5f5',
                                        padding: 8,
                                        borderRadius: 4,
                                        marginVertical: 8,
                                    }
                                }}
                                enableExperimentalBRCollapsing={true}
                                enableExperimentalGhostLinesPrevention={true}
                                baseStyle={{
                                    color: '#333',
                                    fontSize: 16,
                                    lineHeight: 24,
                                }}
                            />
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
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
    },
    headerButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    backButton: {
        marginBottom: 0,
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
        marginTop: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    noteContainer: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    lastUpdated: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 16,
    },
    emptyStateButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    emptyStateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    editButton: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
}); 