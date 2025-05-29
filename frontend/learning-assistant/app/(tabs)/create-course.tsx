import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import authService from '@/services/authService';

export default function CreateCourseScreen() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateCourse = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a course title');
            return;
        }

        setLoading(true);
        try {
            const token = await authService.getToken();
            if (!token) {
                Alert.alert('Error', 'You are not authenticated');
                router.replace('/(auth)/login');
                return;
            }

            const response = await axios.post(
                'http://192.168.1.135:8000/api/courses/',
                {
                    title: title.trim(),
                    description: description.trim() || '' // Ensure description is never undefined
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            
            if (response.status === 201 || response.status === 200) {
                Alert.alert('Success', 'Course created successfully', [{
                    text: 'OK',
                    onPress: () => {
                        // Refresh the course list by navigating back
                        router.back();
                    }
                }]);
            } else {
                throw new Error('Unexpected response status');
            }
        } catch (error: any) {
            console.error('Error creating course:', error.response?.data || error);
            let errorMessage = 'Failed to create course';
            
            if (error.response) {
                // Server responded with an error
                if (error.response.status === 401) {
                    errorMessage = 'Session expired. Please login again.';
                    router.replace('/(auth)/login');
                } else if (error.response.data) {
                    // Try to get a meaningful error message from the response
                    errorMessage = typeof error.response.data === 'object' 
                        ? Object.values(error.response.data).flat().join('\n')
                        : error.response.data.toString();
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
            >
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>✨ Create New Course</Text>
                        <Text style={styles.subtitle}>Build your personalized learning journey</Text>
                    </View>
                </View>
                
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.form}>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>📚 Course Details</Text>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Course Title *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={title}
                                    onChangeText={setTitle}
                                    placeholder="Enter course title"
                                    placeholderTextColor="#999"
                                    editable={!loading}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={description}
                                    onChangeText={setDescription}
                                    placeholder="Enter course description (optional)"
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    editable={!loading}
                                />
                            </View>

                            <TouchableOpacity 
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleCreateCourse}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? 'Creating...' : 'Create Course'}
                                </Text>
                            </TouchableOpacity>
                        </View>
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
    scrollView: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        padding: 20,
        paddingTop: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'column',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    headerContent: {
        alignItems: 'center',
        marginTop: 16,
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
    form: {
        flex: 1,
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
        marginBottom: 20,
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
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderRadius: 12,
        padding: 18,
        fontSize: 16,
        color: '#1a1a1a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    textArea: {
        height: 120,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#007AFF',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.6,
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
}); 