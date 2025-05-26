import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, RefreshControl, TouchableOpacity, Alert, useWindowDimensions, Modal, Pressable, Platform, Image } from 'react-native';
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

interface Attachment {
    id: number;
    url: string;
    page_number: number;
    original_name: string;
    created_at: string;
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
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [documentId, setDocumentId] = useState<number | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [contentChunkIndex, setContentChunkIndex] = useState(0);
    const CHUNK_SIZE = 2000; // Show 2000 characters per chunk

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

            // Fetch the document ID for this chapter
            const documentsResponse = await axios.get(`http://192.168.1.135:8000/api/documents/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const chapterDocument = documentsResponse.data.find(
                (doc: any) => doc.chapterId === Number(id)
            );
            
            if (chapterDocument) {
                setDocumentId(chapterDocument.id);
            }
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

    const fetchAttachments = useCallback(async () => {
        try {
            if (!documentId) return;
            
            const token = await authService.getToken();
            if (!token) return;

            const response = await axios.get(`http://192.168.1.135:8000/api/documents/${documentId}/attachments/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setAttachments(response.data);
        } catch (error) {
            console.error('Error fetching attachments:', error);
        }
    }, [documentId]);

    useFocusEffect(
        useCallback(() => {
            if (id && courseId) {
                fetchChapter();
            }
        }, [id, courseId])
    );

    useEffect(() => {
        if (documentId) {
            fetchAttachments();
        }
    }, [documentId, fetchAttachments]);

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

    // Function to split content into chunks
    const getContentChunks = useCallback((htmlContent: string) => {
        const closingTags = ['</p>', '</h1>', '</h2>', '</h3>', '</div>'];
        const chunks = [];
        let remainingContent = htmlContent;
        
        while (remainingContent.length > 0) {
            if (remainingContent.length <= CHUNK_SIZE) {
                chunks.push(remainingContent);
                break;
            }

            let chunk = remainingContent.substring(0, CHUNK_SIZE);
            let cutoffPoint = 0;
            
            // Find the last complete tag in this chunk
            let lastCompleteTag = -1;
            for (const tag of closingTags) {
                const lastIndex = chunk.lastIndexOf(tag);
                if (lastIndex > lastCompleteTag) {
                    lastCompleteTag = lastIndex;
                    cutoffPoint = lastIndex + tag.length;
                }
            }
            
            if (lastCompleteTag === -1) {
                // If no complete tag found, cut at the last space
                const lastSpace = chunk.lastIndexOf(' ');
                cutoffPoint = lastSpace > 0 ? lastSpace : CHUNK_SIZE;
            }
            
            chunks.push(remainingContent.substring(0, cutoffPoint));
            remainingContent = remainingContent.substring(cutoffPoint);
        }
        
        return chunks;
    }, []);

    // Function to get current visible content
    const getVisibleContent = useCallback((htmlContent: string) => {
        const chunks = getContentChunks(htmlContent);
        return chunks.slice(0, contentChunkIndex + 1).join('');
    }, [contentChunkIndex, getContentChunks]);

    // Function to check if there's more content
    const hasMoreContent = useCallback((htmlContent: string) => {
        const chunks = getContentChunks(htmlContent);
        return contentChunkIndex < chunks.length - 1;
    }, [contentChunkIndex, getContentChunks]);

    // Function to handle See More/Less
    const handleSeeMore = useCallback(() => {
        setContentChunkIndex(prev => prev + 1);
    }, []);

    const handleSeeLess = useCallback(() => {
        setContentChunkIndex(prev => Math.max(0, prev - 1));
    }, []);

    // Function to handle See All/Hide All
    const handleSeeAll = useCallback((htmlContent: string) => {
        const chunks = getContentChunks(htmlContent);
        setContentChunkIndex(chunks.length - 1);
    }, [getContentChunks]);

    const handleHideAll = useCallback(() => {
        setContentChunkIndex(0);
    }, []);

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

    const ImagePreviewModal = () => (
        <Modal
            visible={!!selectedImage}
            transparent={true}
            onRequestClose={() => setSelectedImage(null)}
        >
            <View style={styles.imagePreviewOverlay}>
                <TouchableOpacity
                    style={styles.imagePreviewCloseButton}
                    onPress={() => setSelectedImage(null)}
                >
                    <View style={styles.closeButtonContainer}>
                        <Ionicons name="close-circle" size={32} color="#fff" />
                    </View>
                </TouchableOpacity>
                {selectedImage && (
                    <Image
                        source={{ uri: selectedImage }}
                        style={styles.imagePreview}
                        resizeMode="contain"
                    />
                )}
            </View>
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
                    <>
                        {chapter.notes.map(note => {
                            const visibleContent = getVisibleContent(note.content);
                            const chunks = getContentChunks(note.content);
                            const showMore = hasMoreContent(note.content);
                            const showLess = contentChunkIndex > 0;
                            const isShowingAll = contentChunkIndex === chunks.length - 1;
                            const isShowingFirst = contentChunkIndex === 0;

                            return (
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
                                        source={{ html: visibleContent }}
                                        tagsStyles={{
                                            div: {
                                                marginVertical: 8,
                                            },
                                            'div.pdf-content': {
                                                paddingHorizontal: 16,
                                            },
                                            h1: {
                                                fontSize: 28 * textScale,
                                                fontWeight: 'bold',
                                                color: '#333',
                                                marginVertical: 24,
                                                marginTop: 32,
                                            },
                                            h2: {
                                                fontSize: 24 * textScale,
                                                fontWeight: 'bold',
                                                color: '#333',
                                                marginVertical: 20,
                                                marginTop: 28,
                                            },
                                            h3: {
                                                fontSize: 20 * textScale,
                                                fontWeight: 'bold',
                                                color: '#333',
                                                marginVertical: 16,
                                                marginTop: 24,
                                            },
                                            p: {
                                                fontSize: 16 * textScale,
                                                color: '#333',
                                                lineHeight: 24 * textScale,
                                                marginVertical: 0,
                                                textAlign: 'justify',
                                                paddingVertical: 2,
                                            },
                                            ul: {
                                                marginLeft: 20,
                                                marginVertical: 8,
                                            },
                                            ol: {
                                                marginLeft: 20,
                                                marginVertical: 8,
                                            },
                                            li: {
                                                fontSize: 16 * textScale,
                                                color: '#333',
                                                lineHeight: 24 * textScale,
                                                marginVertical: 2,
                                            },
                                            strong: {
                                                fontWeight: 'bold',
                                                color: '#222',
                                            },
                                            pre: {
                                                backgroundColor: '#f5f5f5',
                                                padding: 16,
                                                borderRadius: 8,
                                                marginVertical: 12,
                                                fontSize: 14 * textScale,
                                            },
                                            img: {
                                                borderRadius: 8,
                                                marginVertical: 16,
                                            }
                                        }}
                                        enableExperimentalBRCollapsing={true}
                                        enableExperimentalGhostLinesPrevention={true}
                                        baseStyle={{
                                            color: '#333',
                                            fontSize: 16 * textScale,
                                            lineHeight: 24 * textScale,
                                            fontFamily: Platform.select({
                                                ios: 'System',
                                                android: 'Roboto'
                                            }),
                                        }}
                                        classesStyles={{
                                            'pdf-content': {
                                                backgroundColor: '#ffffff',
                                                borderRadius: 12,
                                                padding: 20,
                                                shadowColor: '#000',
                                                shadowOffset: {
                                                    width: 0,
                                                    height: 2,
                                                },
                                                shadowOpacity: 0.1,
                                                shadowRadius: 4,
                                                elevation: 3,
                                            }
                                        }}
                                    />
                                    <View style={styles.contentNavigation}>
                                        <View style={styles.navigationRow}>
                                            {showLess && (
                                                <TouchableOpacity
                                                    style={[styles.navigationButton, styles.seeLessButton]}
                                                    onPress={handleSeeLess}
                                                >
                                                    <Ionicons name="chevron-up" size={20} color="#007AFF" />
                                                    <Text style={styles.navigationButtonText}>See Less</Text>
                                                </TouchableOpacity>
                                            )}
                                            {showMore && (
                                                <TouchableOpacity
                                                    style={[styles.navigationButton, styles.seeMoreButton]}
                                                    onPress={handleSeeMore}
                                                >
                                                    <Text style={styles.navigationButtonText}>See More</Text>
                                                    <Ionicons name="chevron-down" size={20} color="#007AFF" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                        <View style={styles.navigationRow}>
                                            {!isShowingAll && chunks.length > 1 && (
                                                <TouchableOpacity
                                                    style={[styles.navigationButton, styles.seeAllButton]}
                                                    onPress={() => handleSeeAll(note.content)}
                                                >
                                                    <Ionicons name="expand" size={20} color="#007AFF" />
                                                    <Text style={styles.navigationButtonText}>See All</Text>
                                                </TouchableOpacity>
                                            )}
                                            {!isShowingFirst && (
                                                <TouchableOpacity
                                                    style={[styles.navigationButton, styles.hideAllButton]}
                                                    onPress={handleHideAll}
                                                >
                                                    <Ionicons name="contract" size={20} color="#007AFF" />
                                                    <Text style={styles.navigationButtonText}>Hide All</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                        
                        {attachments.length > 0 && (
                            <View style={styles.attachmentsContainer}>
                                <Text style={styles.attachmentsTitle}>
                                    Attachments ({attachments.length})
                                </Text>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false}
                                    style={styles.attachmentsScroll}
                                >
                                    {attachments.map((attachment) => (
                                        <TouchableOpacity
                                            key={attachment.id}
                                            style={styles.attachmentItem}
                                            onPress={() => setSelectedImage(attachment.url)}
                                        >
                                            <Image
                                                source={{ uri: attachment.url }}
                                                style={styles.attachmentThumbnail}
                                            />
                                            <Text style={styles.attachmentPage}>
                                                Page {attachment.page_number}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
            
            <ImagePreviewModal />
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
    },
    attachmentsContainer: {
        marginTop: 20,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    attachmentsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    attachmentsScroll: {
        flexGrow: 0,
    },
    attachmentItem: {
        marginRight: 12,
        alignItems: 'center',
    },
    attachmentThumbnail: {
        width: 120,
        height: 160,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    attachmentPage: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    imagePreviewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewCloseButton: {
        position: 'absolute',
        top: '15%',
        right: 20,
        zIndex: 1,
        padding: 8,
    },
    closeButtonContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreview: {
        width: '100%',
        height: '80%',
    },
    contentNavigation: {
        marginTop: 16,
        gap: 12,
    },
    navigationRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    navigationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        backgroundColor: '#f8f8f8',
        minWidth: 120,
        justifyContent: 'center',
    },
    seeLessButton: {
        backgroundColor: '#f0f0f0',
    },
    seeMoreButton: {
        backgroundColor: '#f0f0f0',
    },
    seeAllButton: {
        backgroundColor: '#e8f0ff',
    },
    hideAllButton: {
        backgroundColor: '#fff0f0',
    },
    navigationButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '500',
        marginHorizontal: 4,
    },
}); 