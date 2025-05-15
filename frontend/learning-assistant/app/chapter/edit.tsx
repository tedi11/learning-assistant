import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import authService from '@/services/authService';
import axios from 'axios';

export default function EditChapterScreen() {
    const router = useRouter();
    const { courseId, chapterId, initialContent } = useLocalSearchParams();
    const [content, setContent] = useState(initialContent as string || '');
    const [loading, setLoading] = useState(false);

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

            await axios({
                method,
                url,
                data: { content: content.trim() },
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

            <View style={styles.form}>
                <TextInput
                    style={styles.input}
                    value={content}
                    onChangeText={setContent}
                    placeholder="Enter chapter content..."
                    placeholderTextColor="#999"
                    multiline
                    textAlignVertical="top"
                    numberOfLines={10}
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
            </View>
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
    form: {
        padding: 16,
        flex: 1,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 20,
        minHeight: 200,
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
}); 