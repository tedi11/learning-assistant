import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity, useWindowDimensions, Alert, Modal, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import RenderHtml from 'react-native-render-html';
import authService from '@/services/authService';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

interface Chapter {
    id: number;
    title: string;
    notes: Array<{
        id: number;
        content: string;
        summary: string | null;
    }>;
}

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
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>📏 Text Size</Text>
                    <Text style={styles.scaleValue}>{Math.round(localScale * 100)}%</Text>
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
                    <View style={styles.modalButtons}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.applyButton]}
                            onPress={() => onSave(localScale)}
                        >
                            <Text style={styles.applyButtonText}>Apply</Text>
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

export default function SummarizeScreen() {
    const router = useRouter();
    const { courseId, chapterId, initialContent } = useLocalSearchParams();
    const { width } = useWindowDimensions();
    const [loading, setLoading] = useState(true);
    const [chapter, setChapter] = useState<Chapter | null>(null);
    const [summarizing, setSummarizing] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [showZoomModal, setShowZoomModal] = useState(false);
    const [textScale, setTextScale] = useState(1);

    const fetchChapter = useCallback(async () => {
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.get(`http://192.168.1.135:8000/api/courses/${courseId}/chapters/${chapterId}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setChapter(response.data);
            // If there's an existing summary, set it
            if (response.data.notes && response.data.notes[0]?.summary) {
                setSummary(response.data.notes[0].summary);
            }
        } catch (error) {
            console.error('Error fetching chapter:', error);
        } finally {
            setLoading(false);
        }
    }, [courseId, chapterId]);

    const handleSummarize = async () => {
        try {
            setSummarizing(true);
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.post(
                'http://192.168.1.135:8000/api/summarize/',
                {
                    text: initialContent,
                    courseId,
                    chapterId,
                    min_length: 100,
                    max_length: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.summary) {
                setSummary(response.data.summary);
            } else {
                throw new Error('No summary was generated');
            }
        } catch (error) {
            console.error('Error summarizing text:', error);
            let errorMessage = 'Failed to summarize the text. Please try again.';
            if (axios.isAxiosError(error) && error.response?.data?.error) {
                errorMessage = `Error: ${error.response.data.error}`;
            }
            Alert.alert('Error', errorMessage);
            setSummary(null);
        } finally {
            setSummarizing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (courseId && chapterId) {
                fetchChapter();
            }
        }, [fetchChapter])
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {loading ? "🔄 Loading..." : (
                            <>
                                📊 <Text style={styles.chapterTitle}>{chapter?.title || "Chapter"}</Text> Summary
                            </>
                        )}
                    </Text>
                    <Text style={styles.subtitle}>
                        {summary ? "AI-generated summary of your chapter content" : "View your chapter content and generate an AI summary"}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    {!loading && !summarizing && !summary && (
                        <TouchableOpacity
                            style={styles.summarizeButton}
                            onPress={handleSummarize}
                        >
                            <Text style={styles.summarizeButtonText}>🤖 Generate Summary</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        style={styles.zoomButton}
                        onPress={() => setShowZoomModal(true)}
                    >
                        <Ionicons name="text" size={20} color="#007AFF" />
                    </TouchableOpacity>
                </View>
            </View>
            
            <ZoomModal 
                visible={showZoomModal}
                onClose={() => setShowZoomModal(false)}
                onSave={(value) => {
                    setTextScale(value);
                    setShowZoomModal(false);
                }}
                initialScale={textScale}
            />
            
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.contentSection}>
                    <Text style={styles.sectionTitle}>
                        {summary ? "📝 Chapter Summary" : "📖 Chapter Content"}
                    </Text>
                    <View style={styles.contentContainer}>
                        {loading || summarizing ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#007AFF" />
                                <Text style={styles.loadingText}>
                                    {summarizing ? '🤖 Generating summary...' : '📚 Loading content...'}
                                </Text>
                            </View>
                        ) : (
                            <RenderHtml
                                contentWidth={width - 80}
                                source={{ html: summary || (initialContent as string) }}
                                tagsStyles={{
                                    h1: {
                                        fontSize: 28 * textScale,
                                        fontWeight: '800',
                                        color: '#1a1a1a',
                                        marginVertical: 16,
                                        letterSpacing: 0.3,
                                    },
                                    h2: {
                                        fontSize: 24 * textScale,
                                        fontWeight: '700',
                                        color: '#1a1a1a',
                                        marginVertical: 12,
                                        letterSpacing: 0.2,
                                    },
                                    h3: {
                                        fontSize: 20 * textScale,
                                        fontWeight: '600',
                                        color: '#1a1a1a',
                                        marginVertical: 8,
                                        letterSpacing: 0.1,
                                    },
                                    p: {
                                        fontSize: 16 * textScale,
                                        color: '#333',
                                        lineHeight: 26 * textScale,
                                        marginVertical: 8,
                                        fontWeight: '400',
                                    },
                                    ul: {
                                        marginVertical: 8,
                                    },
                                    li: {
                                        fontSize: 16 * textScale,
                                        color: '#333',
                                        lineHeight: 24 * textScale,
                                        marginVertical: 4,
                                    },
                                    strong: {
                                        fontWeight: '700',
                                        color: '#1a1a1a',
                                    },
                                    em: {
                                        fontStyle: 'italic',
                                        color: '#555',
                                    }
                                }}
                                baseStyle={{
                                    color: '#333',
                                    fontSize: 16 * textScale,
                                    lineHeight: 26 * textScale,
                                    fontWeight: '400',
                                }}
                            />
                        )}
                    </View>
                    
                    {summary && !loading && !summarizing && (
                        <View style={styles.regenerateContainer}>
                            <TouchableOpacity
                                style={styles.regenerateButton}
                                onPress={handleSummarize}
                            >
                                <Text style={styles.regenerateButtonText}>🔄 Regenerate Summary</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    backButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginBottom: 8,
    },
    backButtonText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
    headerContent: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    chapterTitle: {
        fontStyle: 'italic',
        color: '#007AFF',
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 24,
        marginBottom: 12,
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 16,
    },
    summarizeButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    summarizeButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    zoomButton: {
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    scrollView: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    contentSection: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 20,
        letterSpacing: 0.3,
    },
    contentContainer: {
        backgroundColor: '#fafbfc',
        padding: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
        minHeight: 200,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: 16,
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    regenerateContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    regenerateButton: {
        backgroundColor: '#f8f9fa',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#007AFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    regenerateButtonText: {
        color: '#007AFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        backgroundColor: '#fff',
        width: '90%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        zIndex: 2,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 24,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    scaleValue: {
        fontSize: 48,
        fontWeight: '800',
        color: '#007AFF',
        textAlign: 'center',
        marginBottom: 24,
        letterSpacing: 0.5,
    },
    sliderContainer: {
        width: '100%',
        paddingVertical: 10,
        zIndex: 1,
    },
    slider: {
        width: '100%',
        height: 40,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
        marginTop: 8,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cancelButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    applyButton: {
        backgroundColor: '#007AFF',
        shadowColor: '#007AFF',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
}); 