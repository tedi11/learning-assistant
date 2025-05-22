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
                    progress: existingProgress // Preserve progress when updating
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
                <Text style={styles.title}>
                    {initialContent ? 'Edit Content' : 'Add Content'}
                </Text>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.editorContainer}
                keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 80}
            >
                <ScrollView style={styles.editor} contentContainerStyle={styles.editorContent}>
                    <RichEditor
                        ref={richText}
                        onChange={setContent}
                        initialContentHTML={content}
                        placeholder="Start typing your content here..."
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

                <TouchableOpacity 
                    style={[
                        styles.submitButton,
                        loading && styles.submitButtonDisabled
                    ]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    <Text style={styles.submitButtonText}>
                        {loading ? 'Saving...' : 'Save Content'}
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
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
    editorContainer: {
        flex: 1,
        padding: 16,
    },
    editor: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 16,
    },
    editorContent: {
        paddingBottom: 16,
    },
    richEditor: {
        minHeight: 200,
        flex: 1,
    },
    toolbar: {
        backgroundColor: '#f8f8f8',
        borderRadius: 8,
        marginBottom: 16,
    },
    submitButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    toolbarButton: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666666',
    },
}); 