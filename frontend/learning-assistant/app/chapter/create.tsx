import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
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
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Create New Chapter</Text>
            </View>

            <View style={styles.form}>
                <Text style={styles.label}>Chapter Title</Text>
                <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Enter chapter title"
                    placeholderTextColor="#999"
                />

                <TouchableOpacity 
                    style={[
                        styles.submitButton,
                        loading && styles.submitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text style={styles.submitButtonText}>
                        {loading ? 'Creating...' : 'Create Chapter'}
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
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 20,
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