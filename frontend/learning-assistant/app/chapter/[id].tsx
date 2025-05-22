import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl, TouchableOpacity, Alert, useWindowDimensions, Modal, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import RenderHtml from 'react-native-render-html';
import authService from '@/services/authService';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { CustomTabBar } from '@/components/CustomTabBar';

interface Note {
    id: number;
    content: string;
    summary: string | null;
    progress: number;
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

const ProgressModal = React.memo(({ 
    visible, 
    onClose, 
    onSave, 
    initialProgress 
}: { 
    visible: boolean; 
    onClose: () => void; 
    onSave: (value: number) => void; 
    initialProgress: number;
}) => {
    const [localProgress, setLocalProgress] = useState(initialProgress);

    useEffect(() => {
        if (visible) {
            setLocalProgress(initialProgress);
        }
    }, [visible, initialProgress]);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.progressModalOverlay}>
                <View style={styles.progressModalContainer}>
                    <Text style={styles.progressTitle}>Study Progress</Text>
                    <Text style={styles.progressValue}>{localProgress}%</Text>
                    <View style={styles.sliderContainer}>
                        <Slider
                            style={styles.slider}
                            minimumValue={0}
                            maximumValue={100}
                            step={1}
                            value={localProgress}
                            onValueChange={setLocalProgress}
                            minimumTrackTintColor="#007AFF"
                            maximumTrackTintColor="#DEDEDE"
                            thumbTintColor="#007AFF"
                        />
                    </View>
                    <View style={styles.progressButtons}>
                        <TouchableOpacity
                            style={[styles.progressButton, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.progressButton, styles.saveButton]}
                            onPress={() => onSave(localProgress)}
                        >
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Pressable 
                    style={StyleSheet.absoluteFill} 
                    onPress={onClose}
                />
            </View>
        </Modal>
    );
});

const ZoomModal = React.memo(({ 
    visible, 
    onClose, 
    onSave, 
    initialScale 
}: { 
    visible: boolean; 
    onClose: () => void; 
    onSave: (value: number) => void; 
    initialScale: number;
}) => {
    const [localScale, setLocalScale] = useState(initialScale);

    useEffect(() => {
        if (visible) {
            setLocalScale(initialScale);
        }
    }, [visible, initialScale]);

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.progressModalOverlay}>
                <View style={styles.progressModalContainer}>
                    <Text style={styles.progressTitle}>Text Size</Text>
                    <Text style={styles.progressValue}>{Math.round(localScale * 100)}%</Text>
                    <View style={styles.sliderContainer}>
                        <Slider
                            style={styles.slider}
                            minimumValue={0.5}
                            maximumValue={2}
                            step={0.1}
                            value={localScale}
                            onValueChange={setLocalScale}
                            minimumTrackTintColor="#007AFF"
                            maximumTrackTintColor="#DEDEDE"
                            thumbTintColor="#007AFF"
                        />
                    </View>
                    <View style={styles.progressButtons}>
                        <TouchableOpacity
                            style={[styles.progressButton, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.progressButton, styles.saveButton]}
                            onPress={() => onSave(localScale)}
                        >
                            <Text style={styles.saveButtonText}>Apply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <Pressable 
                    style={StyleSheet.absoluteFill} 
                    onPress={onClose}
                />
            </View>
        </Modal>
    );
});

export default function ChapterScreen() {
    const router = useRouter();
    const { id, courseId } = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [textScale, setTextScale] = useState(1);

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

    const handleProgressSave = useCallback(async (newProgress: number) => {
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const noteId = chapter?.notes[0]?.id;
            if (!noteId) return;

            await axios.patch(
                `http://192.168.1.135:8000/api/courses/${courseId}/chapters/${id}/notes/${noteId}/`,
                { progress: newProgress },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            // Update local state
            if (chapter && chapter.notes.length > 0) {
                const updatedChapter = {
                    ...chapter,
                    notes: chapter.notes.map(note => ({
                        ...note,
                        progress: newProgress
                    }))
                };
                setChapter(updatedChapter);
            }
            setShowProgressModal(false);
        } catch (error) {
            console.error('Error updating progress:', error);
            Alert.alert('Error', 'Failed to update progress. Please try again.');
        }
    }, [chapter, courseId, id, router]);

    const ChapterOptions = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={showOptions}
            onRequestClose={() => setShowOptions(false)}
        >
            <TouchableOpacity 
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowOptions(false)}
            >
                <View style={styles.optionsContainer}>
                    <TouchableOpacity
                        style={styles.optionItem}
                        onPress={() => {
                            setShowOptions(false);
                            router.push({
                                pathname: "/chapter/edit",
                                params: {
                                    courseId,
                                    chapterId: id,
                                    initialContent: chapter?.notes[0]?.content
                                }
                            });
                        }}
                    >
                        <Ionicons name="pencil" size={20} color="#007AFF" />
                        <Text style={styles.optionText}>Edit Chapter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionItem}
                        onPress={() => {
                            setShowOptions(false);
                            router.push({
                                pathname: "/chapter/summarize",
                                params: {
                                    courseId,
                                    chapterId: id,
                                    initialContent: chapter?.notes[0]?.content
                                }
                            });
                        }}
                    >
                        <Ionicons name="document-text" size={20} color="#007AFF" />
                        <Text style={styles.optionText}>View Summary</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionItem}
                        onPress={() => {
                            setShowOptions(false);
                            setShowProgressModal(true);
                        }}
                    >
                        <Ionicons name="bar-chart" size={20} color="#007AFF" />
                        <Text style={styles.optionText}>Set Progress</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.optionItem}
                        onPress={() => {
                            setShowOptions(false);
                            setShowZoomModal(true);
                        }}
                    >
                        <Ionicons name="text" size={20} color="#007AFF" />
                        <Text style={styles.optionText}>Text Size</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
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
                        <TouchableOpacity
                            onPress={() => setShowOptions(true)}
                            style={styles.optionsButton}
                        >
                            <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    )}
                </View>
                <Text style={styles.title}>{chapter?.title}</Text>
            </View>
            
            <ProgressModal 
                visible={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                onSave={handleProgressSave}
                initialProgress={chapter?.notes[0]?.progress || 0}
            />
            
            <ZoomModal 
                visible={showZoomModal}
                onClose={() => setShowZoomModal(false)}
                onSave={(value) => {
                    setTextScale(value);
                    setShowZoomModal(false);
                }}
                initialScale={textScale}
            />
            
            <ChapterOptions />
            
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
                                Last updated: {new Date(note.updated_at).toLocaleString(undefined, {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                            <RenderHtml
                                contentWidth={width}
                                source={{ html: note.content }}
                                tagsStyles={{
                                    h1: {
                                        fontSize: 28 * textScale,
                                        fontWeight: 'bold',
                                        color: '#333',
                                        marginVertical: 16,
                                    },
                                    h2: {
                                        fontSize: 24 * textScale,
                                        fontWeight: 'bold',
                                        color: '#333',
                                        marginVertical: 12,
                                    },
                                    h3: {
                                        fontSize: 20 * textScale,
                                        fontWeight: 'bold',
                                        color: '#333',
                                        marginVertical: 8,
                                    },
                                    p: {
                                        fontSize: 16 * textScale,
                                        color: '#333',
                                        lineHeight: 24 * textScale,
                                        marginVertical: 8,
                                    },
                                    ul: {
                                        marginLeft: 20,
                                    },
                                    ol: {
                                        marginLeft: 20,
                                    },
                                    li: {
                                        fontSize: 16 * textScale,
                                        color: '#333',
                                        lineHeight: 24 * textScale,
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
                                        fontSize: 16 * textScale,
                                    },
                                    blockquote: {
                                        borderLeftWidth: 4,
                                        borderLeftColor: '#666',
                                        paddingLeft: 16,
                                        marginLeft: 0,
                                        fontStyle: 'italic',
                                        fontSize: 16 * textScale,
                                    },
                                    code: {
                                        fontFamily: 'monospace',
                                        backgroundColor: '#f5f5f5',
                                        padding: 4,
                                        borderRadius: 4,
                                        fontSize: 14 * textScale,
                                    },
                                    pre: {
                                        backgroundColor: '#f5f5f5',
                                        padding: 8,
                                        borderRadius: 4,
                                        marginVertical: 8,
                                        fontSize: 14 * textScale,
                                    }
                                }}
                                enableExperimentalBRCollapsing={true}
                                enableExperimentalGhostLinesPrevention={true}
                                baseStyle={{
                                    color: '#333',
                                    fontSize: 16 * textScale,
                                    lineHeight: 24 * textScale,
                                }}
                            />
                        </View>
                    ))
                )}
            </ScrollView>
            <CustomTabBar />
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
        marginBottom: Platform.OS === 'ios' ? 15 : 45,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
    },
    optionsContainer: {
        backgroundColor: '#fff',
        marginTop: 60,
        marginHorizontal: 20,
        borderRadius: 12,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    optionText: {
        fontSize: 16,
        color: '#007AFF',
    },
    optionsButton: {
        padding: 8,
    },
    sliderContainer: {
        width: '100%',
        paddingVertical: 10,
        zIndex: 1,
    },
    progressModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressModalContainer: {
        backgroundColor: '#fff',
        width: '90%',
        maxWidth: 400,
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 2,
    },
    progressTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 24,
        textAlign: 'center',
    },
    progressValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#007AFF',
        textAlign: 'center',
        marginBottom: 24,
    },
    slider: {
        width: '100%',
        height: 40,
        marginBottom: 24,
    },
    progressButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 8,
    },
    progressButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    saveButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    }
}); 