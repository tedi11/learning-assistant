import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView, TouchableOpacity, useWindowDimensions, Alert, Modal, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import RenderHtml from 'react-native-render-html';
import authService from '@/services/authService';
import { api } from '@/services/api';
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

interface SummaryLengthModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (length: 'short' | 'medium' | 'long') => void;
    textLength: number;
}

const SummaryLengthModal: React.FC<SummaryLengthModalProps> = ({ visible, onClose, onSelect, textLength }) => {
    const wordCount = Math.round(textLength / 5); // Rough estimation: 5 chars per word

    const lengthOptions = [
        {
            key: 'short' as const,
            title: '📝 Short Summary',
            description: 'Quick overview of key points',
            estimatedWords: `~${Math.round(wordCount * 0.12)} words`,
            percentage: '10-15%',
            icon: '⚡',
            color: '#34C759'
        },
        {
            key: 'medium' as const,
            title: '📖 Medium Summary',
            description: 'Balanced coverage of main topics',
            estimatedWords: `~${Math.round(wordCount * 0.20)} words`,
            percentage: '15-25%',
            icon: '⚖️',
            color: '#007AFF'
        },
        {
            key: 'long' as const,
            title: '📚 Detailed Summary',
            description: 'Comprehensive overview with details',
            estimatedWords: `~${Math.round(wordCount * 0.30)} words`,
            percentage: '25-35%',
            icon: '🔍',
            color: '#FF9500'
        }
    ];

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.summaryModalContent}>
                    <View style={styles.summaryModalHeader}>
                        <Text style={styles.summaryModalTitle}>📊 Choose Summary Length</Text>
                        <Text style={styles.summaryModalSubtitle}>
                            Original text: ~{wordCount} words
                        </Text>
                        <TouchableOpacity
                            style={styles.summaryModalCloseButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.summaryOptionsContainer}>
                        {lengthOptions.map((option) => (
                            <TouchableOpacity
                                key={option.key}
                                style={[styles.summaryOption, { borderColor: option.color }]}
                                onPress={() => onSelect(option.key)}
                            >
                                <View style={styles.summaryOptionHeader}>
                                    <Text style={styles.summaryOptionIcon}>{option.icon}</Text>
                                    <Text style={[styles.summaryOptionTitle, { color: option.color }]}>
                                        {option.title}
                                    </Text>
                                </View>
                                <Text style={styles.summaryOptionDescription}>
                                    {option.description}
                                </Text>
                                <View style={styles.summaryOptionStats}>
                                    <Text style={styles.summaryOptionEstimate}>
                                        {option.estimatedWords} ({option.percentage} of original)
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
};

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
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [textScale, setTextScale] = useState(1);
    const [summaryStats, setSummaryStats] = useState<any>(null);

    const fetchChapter = useCallback(async () => {
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await api.get(`/courses/${courseId}/chapters/${chapterId}/`, {
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

    const handleSummarize = async (summaryLength: 'short' | 'medium' | 'long' = 'medium', forceRegenerate: boolean = false) => {
        try {
            setSummarizing(true);
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            const response = await api.post(
                '/summarize/',
                {
                    text: initialContent,
                    courseId,
                    chapterId,
                    summaryLength,
                    forceRegenerate
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.data.summary) {
                setSummary(response.data.summary);
                setSummaryStats(response.data.summaryStats);
            } else {
                throw new Error('No summary was generated');
            }
        } catch (error: any) {
            console.error('Error summarizing text:', error);
            
            if (axios.isAxiosError(error) && error.response?.data?.error === 'TEXT_TOO_SHORT') {
                const errorData = error.response.data;
                Alert.alert(
                    'Text Too Short',
                    `Sorry, this text is too short to generate a meaningful summary.\n\nMinimum required: ${errorData.minLength} characters\nCurrent text: ${errorData.textLength} characters\n\nPlease add more content to this chapter before generating a summary.`,
                    [{ text: 'OK' }]
                );
            } else {
                let errorMessage = 'Failed to summarize the text. Please try again.';
                if (axios.isAxiosError(error) && error.response?.data?.error) {
                    errorMessage = `Error: ${error.response.data.error}`;
                }
                Alert.alert('Error', errorMessage);
            }
            setSummary(null);
        } finally {
            setSummarizing(false);
        }
    };

    const handleSummaryLengthSelect = (length: 'short' | 'medium' | 'long') => {
        setShowSummaryModal(false);
        handleSummarize(length, true); // Force regenerate when user selects length
    };

    const showSummaryOptions = () => {
        if (!initialContent || typeof initialContent !== 'string') {
            Alert.alert('Error', 'No content available to summarize');
            return;
        }
        
        // Check if content is long enough (rough check)
        const cleanText = initialContent.replace(/<[^>]*>/g, '').trim();
        if (cleanText.length < 500) {
            Alert.alert(
                'Text Too Short',
                `This text is too short to generate a meaningful summary.\n\nMinimum required: 500 characters\nCurrent text: ${cleanText.length} characters\n\nPlease add more content to this chapter before generating a summary.`,
                [{ text: 'OK' }]
            );
            return;
        }
        
        setShowSummaryModal(true);
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
                            onPress={showSummaryOptions}
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
            
            <SummaryLengthModal
                visible={showSummaryModal}
                onClose={() => setShowSummaryModal(false)}
                onSelect={handleSummaryLengthSelect}
                textLength={initialContent ? initialContent.length : 0}
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
                                        marginVertical: 8,
                                        marginTop: 12,
                                        letterSpacing: 0.3,
                                    },
                                    h2: {
                                        fontSize: 24 * textScale,
                                        fontWeight: '700',
                                        color: '#1a1a1a',
                                        marginVertical: 6,
                                        marginTop: 10,
                                        letterSpacing: 0.2,
                                    },
                                    h3: {
                                        fontSize: 20 * textScale,
                                        fontWeight: '600',
                                        color: '#1a1a1a',
                                        marginVertical: 4,
                                        marginTop: 8,
                                        letterSpacing: 0.1,
                                    },
                                    p: {
                                        fontSize: 16 * textScale,
                                        color: '#333',
                                        lineHeight: 26 * textScale,
                                        marginVertical: 4,
                                        fontWeight: '400',
                                    },
                                    ul: {
                                        marginVertical: 4,
                                        marginLeft: 20,
                                    },
                                    ol: {
                                        marginVertical: 4,
                                        marginLeft: 20,
                                    },
                                    li: {
                                        fontSize: 16 * textScale,
                                        color: '#333',
                                        lineHeight: 24 * textScale,
                                        marginVertical: 2,
                                    },
                                    strong: {
                                        fontWeight: '700',
                                        color: '#1a1a1a',
                                    },
                                    em: {
                                        fontStyle: 'italic',
                                        color: '#555',
                                    },
                                    pre: {
                                        backgroundColor: '#f5f5f5',
                                        padding: 16,
                                        borderRadius: 8,
                                        marginVertical: 8,
                                        fontSize: 14 * textScale,
                                    },
                                    img: {
                                        borderRadius: 8,
                                        marginVertical: 12,
                                    }
                                }}
                                baseStyle={{
                                    color: '#333',
                                    fontSize: 16 * textScale,
                                    lineHeight: 26 * textScale,
                                    fontWeight: '400',
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
                                    },
                                    'pdf-body': {
                                        backgroundColor: 'transparent',
                                    }
                                }}
                            />
                        )}
                    </View>
                    
                    {summary && !loading && !summarizing && (
                        <View style={styles.regenerateContainer}>
                            <TouchableOpacity
                                style={styles.regenerateButton}
                                onPress={showSummaryOptions}
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
    summaryModalContent: {
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
    summaryModalHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    summaryModalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    summaryModalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 24,
    },
    summaryModalCloseButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#f8f9fa',
        borderRadius: 20,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryOptionsContainer: {
        paddingHorizontal: 4,
    },
    summaryOption: {
        padding: 16,
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: '#fafbfc',
    },
    summaryOptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    summaryOptionIcon: {
        fontSize: 22,
        marginRight: 12,
    },
    summaryOptionTitle: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    summaryOptionDescription: {
        fontSize: 16,
        color: '#666',
        lineHeight: 22,
        marginBottom: 8,
    },
    summaryOptionStats: {
        marginTop: 8,
    },
    summaryOptionEstimate: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
}); 