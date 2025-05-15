import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
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
            <ScrollView style={styles.scrollView}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Create New Course</Text>
                </View>
                
                <View style={styles.form}>
                    <Text style={styles.label}>Course Title</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Enter course title"
                        placeholderTextColor="#999"
                        editable={!loading}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Enter course description"
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                        editable={!loading}
                    />

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
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        padding: 16,
        paddingTop: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        marginRight: 16,
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
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    textArea: {
        height: 120,
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
        height: 50,
        justifyContent: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 