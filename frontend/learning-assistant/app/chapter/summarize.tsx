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
                    <Text style={styles.modalTitle}>Text Size</Text>
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
                    max_length: 300
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
                <View style={styles.headerTop}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>← Back to Chapter</Text>
                    </TouchableOpacity>
                    <View style={styles.headerActions}>
                        {!loading && !summarizing && !summary && (
                            <TouchableOpacity
                                style={styles.summarizeButton}
                                onPress={handleSummarize}
                            >
                                <Text style={styles.summarizeButtonText}>Generate Summary</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.zoomButton}
                            onPress={() => setShowZoomModal(true)}
                        >
                            <Ionicons name="text" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>
                </View>
                <Text style={styles.title}>
                    {loading ? "Loading..." : (
                        <>
                            Chapter <Text style={styles.italicText}>{chapter?.title || "Chapter"}</Text> Summary
                        </>
                    )}
                </Text>
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
                <View style={styles.contentContainer}>
                    {loading || summarizing ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.loadingText}>
                                {summarizing ? 'Generating summary...' : 'Loading...'}
                            </Text>
                        </View>
                    ) : (
                        <RenderHtml
                            contentWidth={width}
                            source={{ html: summary || (initialContent as string) }}
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
                                }
                            }}
                            baseStyle={{
                                color: '#333',
                                fontSize: 16 * textScale,
                                lineHeight: 24 * textScale,
                            }}
                        />
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    contentContainer: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    italicText: {
        fontStyle: 'italic'
    },
    summarizeButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    summarizeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    zoomButton: {
        padding: 8,
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
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 24,
        textAlign: 'center',
    },
    scaleValue: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#007AFF',
        textAlign: 'center',
        marginBottom: 24,
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
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    applyButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
}); 