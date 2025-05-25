import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import authService from '@/services/authService';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

interface Document {
    id: number;
    title: string;
    courseId: number | null;
    courseName: string | null;
    chapterId: number | null;
    chapterName: string | null;
    created_at: string;
}

interface Course {
    id: number;
    title: string;
    chapters: Chapter[];
}

interface Chapter {
    id: number;
    title: string;
}

// Separate Modal Component
const CourseSelectionModal = React.memo(({ 
    visible, 
    courses, 
    onClose, 
    onSubmit,
    loading 
}: {
    visible: boolean;
    courses: Course[];
    onClose: () => void;
    onSubmit: (data: { courseId?: number; chapterId?: number; newCourseTitle?: string; newChapterTitle?: string; createNew: boolean }) => void;
    loading: boolean;
}) => {
    const [localState, setLocalState] = useState({
        createNew: false,
        selectedCourse: null as Course | null,
        selectedChapter: null as Chapter | null,
        newCourseTitle: '',
        newChapterTitle: ''
    });

    const resetLocalState = () => {
        setLocalState({
            createNew: false,
            selectedCourse: null,
            selectedChapter: null,
            newCourseTitle: '',
            newChapterTitle: ''
        });
    };

    const handleClose = () => {
        resetLocalState();
        onClose();
    };

    const handleSubmit = () => {
        onSubmit({
            courseId: localState.selectedCourse?.id,
            chapterId: localState.selectedChapter?.id,
            newCourseTitle: localState.createNew ? localState.newCourseTitle : undefined,
            newChapterTitle: localState.newChapterTitle || undefined,
            createNew: localState.createNew
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Select Course</Text>
                    
                    <TouchableOpacity
                        style={[styles.optionButton, localState.createNew && styles.selectedOption]}
                        onPress={() => setLocalState(prev => ({
                            ...prev,
                            createNew: true,
                            selectedCourse: null,
                            selectedChapter: null
                        }))}
                    >
                        <Text style={styles.optionText}>Create New Course</Text>
                    </TouchableOpacity>

                    {localState.createNew ? (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter course title"
                                value={localState.newCourseTitle}
                                onChangeText={(text) => setLocalState(prev => ({ ...prev, newCourseTitle: text }))}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Enter chapter title (optional)"
                                value={localState.newChapterTitle}
                                onChangeText={(text) => setLocalState(prev => ({ ...prev, newChapterTitle: text }))}
                            />
                        </>
                    ) : (
                        <>
                            <ScrollView style={styles.courseList}>
                                {courses.map(course => (
                                    <View key={course.id}>
                                        <TouchableOpacity
                                            style={[
                                                styles.courseOption,
                                                localState.selectedCourse?.id === course.id && styles.selectedOption
                                            ]}
                                            onPress={() => setLocalState(prev => ({
                                                ...prev,
                                                selectedCourse: course,
                                                selectedChapter: null,
                                                createNew: false
                                            }))}
                                        >
                                            <Text style={styles.courseTitle}>{course.title}</Text>
                                        </TouchableOpacity>

                                        {localState.selectedCourse?.id === course.id && (
                                            <View style={styles.chapterList}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.chapterOption,
                                                        !localState.selectedChapter && styles.selectedOption
                                                    ]}
                                                    onPress={() => setLocalState(prev => ({
                                                        ...prev,
                                                        selectedChapter: null,
                                                        newChapterTitle: ''
                                                    }))}
                                                >
                                                    <Text style={styles.chapterTitle}>Create New Chapter</Text>
                                                </TouchableOpacity>
                                                {!localState.selectedChapter && (
                                                    <TextInput
                                                        style={styles.input}
                                                        placeholder="Enter new chapter title"
                                                        value={localState.newChapterTitle}
                                                        onChangeText={(text) => setLocalState(prev => ({ ...prev, newChapterTitle: text }))}
                                                    />
                                                )}
                                                {course.chapters.map(chapter => (
                                                    <TouchableOpacity
                                                        key={chapter.id}
                                                        style={[
                                                            styles.chapterOption,
                                                            localState.selectedChapter?.id === chapter.id && styles.selectedOption
                                                        ]}
                                                        onPress={() => setLocalState(prev => ({
                                                            ...prev,
                                                            selectedChapter: chapter,
                                                            newChapterTitle: ''
                                                        }))}
                                                    >
                                                        <Text style={styles.chapterTitle}>{chapter.title}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </>
                    )}

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={handleClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmButton, loading && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.confirmButtonText}>
                                {loading ? 'Uploading...' : 'Upload'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

export default function LoadDocumentsScreen() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);

    const fetchDocuments = async () => {
        try {
            const token = await authService.getToken();
            if (!token) return;

            const response = await axios.get('http://192.168.1.135:8000/api/documents/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setDocuments(response.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            const token = await authService.getToken();
            if (!token) return;

            const response = await axios.get('http://192.168.1.135:8000/api/courses/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            setCourses(response.data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDocuments();
            fetchCourses();
        }, [])
    );

    const handleUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true
            });

            if (result.canceled) {
                return;
            }

            setSelectedFile(result);
            setShowCourseModal(true);
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to select document');
        }
    };

    const handleConfirmUpload = async (data: { courseId?: number; chapterId?: number; newCourseTitle?: string; newChapterTitle?: string; createNew: boolean }) => {
        if (!selectedFile || selectedFile.canceled) {
            Alert.alert('Error', 'Please select a file first');
            return;
        }

        if (!data.createNew && !data.courseId) {
            Alert.alert('Error', 'Please select a course or create a new one');
            return;
        }

        if (data.createNew && !data.newCourseTitle) {
            Alert.alert('Error', 'Please enter a course title');
            return;
        }

        setLoading(true);
        try {
            const token = await authService.getToken();
            if (!token) return;

            const formData = new FormData();
            formData.append('file', {
                uri: selectedFile.assets[0].uri,
                type: 'application/pdf',
                name: selectedFile.assets[0].name
            } as any);

            if (data.createNew) {
                formData.append('createNew', 'true');
                formData.append('newCourseTitle', data.newCourseTitle!);
                if (data.newChapterTitle) {
                    formData.append('newChapterTitle', data.newChapterTitle);
                }
            } else {
                formData.append('courseId', data.courseId!.toString());
                if (data.chapterId) {
                    formData.append('chapterId', data.chapterId.toString());
                } else if (data.newChapterTitle) {
                    formData.append('newChapterTitle', data.newChapterTitle);
                }
            }

            await axios.post('http://192.168.1.135:8000/api/documents/upload/', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }
            });

            setShowCourseModal(false);
            setSelectedFile(null);
            fetchDocuments();
            Alert.alert('Success', 'Document uploaded successfully');
        } catch (error) {
            console.error('Error uploading document:', error);
            Alert.alert('Error', 'Failed to upload document');
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentPress = (courseId: number, chapterId: number) => {
        router.push({
            pathname: "/chapter/[id]",
            params: { 
                id: chapterId.toString(),
                courseId: courseId.toString()
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Load Documents</Text>
                <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={handleUpload}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={styles.uploadButtonText}>Upload PDF</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {documents.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-outline" size={48} color="#666" />
                        <Text style={styles.emptyStateText}>
                            No documents uploaded yet
                        </Text>
                        <Text style={styles.emptyStateSubtext}>
                            Upload PDF documents to enhance your learning experience
                        </Text>
                    </View>
                ) : (
                    <View style={styles.documentList}>
                        {documents.map(doc => (
                            <TouchableOpacity
                                key={doc.id}
                                style={styles.documentItem}
                                onPress={() => {
                                    if (doc.courseId && doc.chapterId) {
                                        handleDocumentPress(doc.courseId, doc.chapterId);
                                    }
                                }}
                                disabled={!doc.courseId || !doc.chapterId}
                            >
                                <View style={styles.documentInfo}>
                                    <Text style={styles.documentTitle}>{doc.title}</Text>
                                    <Text style={styles.documentMeta}>
                                        {doc.courseName} {doc.chapterName ? `• ${doc.chapterName}` : ''}
                                    </Text>
                                    <Text style={styles.documentDate}>
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </Text>
                                </View>
                                {doc.courseId && doc.chapterId && (
                                    <Ionicons 
                                        name="chevron-forward" 
                                        size={20} 
                                        color="#999"
                                        style={styles.documentArrow}
                                    />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            <CourseSelectionModal
                visible={showCourseModal}
                courses={courses}
                onClose={() => {
                    setShowCourseModal(false);
                    setSelectedFile(null);
                }}
                onSubmit={handleConfirmUpload}
                loading={loading}
            />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    uploadButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 8,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        marginTop: 100,
    },
    emptyStateText: {
        fontSize: 18,
        color: '#666',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
    },
    documentList: {
        padding: 16,
    },
    documentItem: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    documentInfo: {
        flex: 1,
    },
    documentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    documentMeta: {
        fontSize: 14,
        color: '#666',
        marginBottom: 2,
    },
    documentDate: {
        fontSize: 12,
        color: '#999',
    },
    documentArrow: {
        marginLeft: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#333',
    },
    courseList: {
        maxHeight: 400,
    },
    courseOption: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#f5f5f5',
    },
    selectedOption: {
        backgroundColor: '#e3f2fd',
        borderColor: '#007AFF',
        borderWidth: 1,
    },
    courseTitle: {
        fontSize: 16,
        color: '#333',
    },
    chapterList: {
        marginLeft: 16,
        marginBottom: 8,
    },
    chapterOption: {
        padding: 8,
        borderRadius: 6,
        marginBottom: 6,
        backgroundColor: '#f8f8f8',
    },
    chapterTitle: {
        fontSize: 14,
        color: '#666',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        gap: 12,
    },
    cancelButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    confirmButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#007AFF',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    optionButton: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        backgroundColor: '#f5f5f5',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
}); 