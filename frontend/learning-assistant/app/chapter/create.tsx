import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import authService from '@/services/authService';

export default function CreateChapterScreen() {
    const router = useRouter();
    const { courseId } = useLocalSearchParams();
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a chapter title');
            return;
        }

        setLoading(true);
        try {
            const token = await authService.getToken();
            if (!token) {
                router.replace('/(auth)/login');
                return;
            }

            console.log('Creating chapter:', {
                courseId,
                title: title.trim(),
                url: `http://192.168.1.135:8000/api/courses/${courseId}/chapters/`
            });

            const response = await axios.post(`http://192.168.1.135:8000/api/courses/${courseId}/chapters/`, {
                title: title.trim(),
            }, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Chapter created:', response.data);

            // Navigate to content editor
            router.push({
                pathname: "/chapter/edit",
                params: { 
                    courseId,
                    chapterId: response.data.id
                }
            });
        } catch (error) {
            console.error('Error creating chapter:', error);
            if (axios.isAxiosError(error)) {
                console.error('API Error:', error.response?.data);
            }
            Alert.alert(
                'Error',
                'Failed to create chapter. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.keyboardAvoidingView}
            >
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>📖 Create New Chapter</Text>
                        <Text style={styles.subtitle}>Add a new chapter to organize your learning content</Text>
                    </View>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📝 Chapter Details</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Chapter Title</Text>
                            <TextInput
                                style={styles.input}
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Enter chapter title (e.g., Introduction to React)"
                                placeholderTextColor="#999"
                                autoFocus={true}
                                maxLength={100}
                            />
                            <Text style={styles.helperText}>Choose a clear and descriptive title for your chapter</Text>
                        </View>

                        <TouchableOpacity 
                            style={[
                                styles.submitButton,
                                (!title.trim() || loading) && styles.submitButtonDisabled
                            ]}
                            onPress={handleSubmit}
                            disabled={!title.trim() || loading}
                        >
                            <Text style={styles.submitButtonText}>
                                {loading ? '✨ Creating Chapter...' : '🚀 Create Chapter'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    keyboardAvoidingView: {
        flex: 1,
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
    scrollView: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
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
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 18,
        fontSize: 16,
        borderWidth: 2,
        borderColor: '#e9ecef',
        marginBottom: 8,
        color: '#1a1a1a',
        fontWeight: '500',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    helperText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        fontWeight: '400',
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
}); 