import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import authService from '@/services/authService';
import axios from 'axios';

export default function EditChapterScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const courseId = typeof params.courseId === 'string' ? params.courseId : '';
    const chapterId = typeof params.chapterId === 'string' ? params.chapterId : '';
    const initialContent = typeof params.initialContent === 'string' ? params.initialContent : '';
    const [content, setContent] = useState(initialContent || '');
    const [loading, setLoading] = useState(false);
    const richText = useRef<RichEditor>(null);

    const handleSave = async () => {
        if (!content.trim()) {
            Alert.alert('Error', 'Please enter some content');
            return;
        }

        setLoading(true);
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            // Get the first note if it exists (since we only allow one note per chapter)
            const response = await axios.get(`http://192.168.1.135:8000/api/courses/${courseId}/chapters/${chapterId}/notes/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const notes = response.data;
            const method = notes.length > 0 ? 'put' : 'post';
            const url = notes.length > 0 
                ? `http://192.168.1.135:8000/api/courses/${courseId}/chapters/${chapterId}/notes/${notes[0].id}/`
                : `http://192.168.1.135:8000/api/courses/${courseId}/chapters/${chapterId}/notes/`;

            // Preserve the existing progress value if updating
            const existingProgress = notes.length > 0 ? notes[0].progress : 0;

            await axios({
                method,
                url,
                data: { 
                    content: content.trim(),
                    progress: existingProgress, // Preserve progress when updating
                    summary: null // Clear the summary when content is edited
                },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            router.push({
                pathname: "/chapter/[id]",
                params: { id: chapterId, courseId }
            });
        } catch (error) {
            console.error('Error saving content:', error);
            Alert.alert(
                'Error',
                'Failed to save content. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.push({
                        pathname: "/chapter/[id]",
                        params: { id: chapterId, courseId }
                    })}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        {initialContent ? '✏️ Edit Content' : '📝 Add Content'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {initialContent ? 'Update your chapter content' : 'Create rich content for your chapter'}
                    </Text>
                </View>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.editorContainer}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 80}
            >
                <View style={styles.editorSection}>
                    <Text style={styles.sectionTitle}>✍️ Content Editor</Text>
                    
                    <View style={styles.editorWrapper}>
                        <ScrollView style={styles.editor} contentContainerStyle={styles.editorContent}>
                            <RichEditor
                                ref={richText}
                                onChange={setContent}
                                initialContentHTML={content}
                                placeholder="Start typing your content here... Use the toolbar below to format your text."
                                style={styles.richEditor}
                            />
                        </ScrollView>
                        
                        <RichToolbar
                            editor={richText}
                            actions={[
                                // Headings
                                actions.heading2,
                                actions.heading3,
                                '|', // separator
                                // Text formatting
                                actions.setBold,
                                actions.setItalic,
                                '|', // separator
                                // Lists
                                actions.insertBulletsList,
                                actions.insertOrderedList,
                                '|', // separator
                                // Undo/Redo
                                actions.undo,
                                actions.redo,
                            ]}
                            iconMap={{
                                [actions.heading2]: ({ tintColor }: { tintColor: string }) => (
                                    <Text style={[styles.toolbarButton, { color: tintColor }]}>H1</Text>
                                ),
                                [actions.heading3]: ({ tintColor }: { tintColor: string }) => (
                                    <Text style={[styles.toolbarButton, { color: tintColor }]}>H2</Text>
                                ),
                            }}
                            selectedIconTint="#007AFF"
                            iconTint="#666666"
                            style={styles.toolbar}
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    style={[
                        styles.submitButton,
                        (!content.trim() || loading) && styles.submitButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={!content.trim() || loading}
                >
                    <Text style={styles.submitButtonText}>
                        {loading ? '💾 Saving Content...' : '🚀 Save Content'}
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
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
        paddingBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 24,
    },
    editorContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        padding: 20,
    },
    editorSection: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
        letterSpacing: 0.3,
    },
    editorWrapper: {
        flex: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#e9ecef',
        overflow: 'hidden',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    editor: {
        flex: 1,
        backgroundColor: '#fff',
        minHeight: 300,
    },
    editorContent: {
        padding: 16,
        paddingBottom: 32,
    },
    richEditor: {
        minHeight: 250,
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
    },
    toolbar: {
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#e9ecef',
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    toolbarButton: {
        fontSize: 14,
        fontWeight: '700',
        color: '#666666',
    },
}); 