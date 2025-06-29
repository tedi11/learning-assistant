import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import authService from '@/services/authService';
import { api } from '@/services/api';
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

interface PDFInfo {
    fileName: string;
    totalPages: number;
    sampleText: string;
    maxAllowedPages: number;
}

interface PageRange {
    startPage: number;
    endPage: number;
}

// Separate Modal Component
const CourseSelectionModal = React.memo(({ 
    visible, 
    courses, 
    onClose, 
    onSubmit,
    loading,
    coursesLoading 
}: {
    visible: boolean;
    courses: Course[];
    onClose: () => void;
    onSubmit: (data: { courseId?: number; chapterId?: number; newCourseTitle?: string; newChapterTitle?: string; createNew: boolean }) => void;
    loading: boolean;
    coursesLoading: boolean;
}) => {
    const [localState, setLocalState] = useState({
        createNew: false,
        selectedCourse: null as Course | null,
        selectedChapter: null as Chapter | null,
        newCourseTitle: '',
        newChapterTitle: ''
    });

    // Reset state when modal becomes visible
    React.useEffect(() => {
        if (visible) {
            setLocalState({
                createNew: false,
                selectedCourse: null,
                selectedChapter: null,
                newCourseTitle: '',
                newChapterTitle: ''
            });
        }
    }, [visible]);

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
        // Validation
        if (localState.createNew) {
            if (!localState.newCourseTitle.trim()) {
                Alert.alert('Error', 'Please enter a course title');
                return;
            }
        } else {
            if (!localState.selectedCourse) {
                Alert.alert('Error', 'Please select a course');
                return;
            }
            if (!localState.selectedChapter && !localState.newChapterTitle.trim()) {
                Alert.alert('Error', 'Please select a chapter or enter a new chapter title');
                return;
            }
        }

        onSubmit({
            courseId: localState.selectedCourse?.id,
            chapterId: localState.selectedChapter?.id,
            newCourseTitle: localState.createNew ? localState.newCourseTitle.trim() : undefined,
            newChapterTitle: localState.newChapterTitle.trim() || undefined,
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
                            {coursesLoading ? (
                                <View style={styles.emptyCourseState}>
                                    <Text style={styles.emptyCourseText}>Loading courses...</Text>
                                </View>
                            ) : courses.length === 0 ? (
                                <View style={styles.emptyCourseState}>
                                    <Text style={styles.emptyCourseText}>
                                        No courses available. Create a new course to continue.
                                    </Text>
                                </View>
                            ) : (
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
                            )}
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

// Page Range Selection Modal
const PageRangeModal = React.memo(({ 
    visible, 
    pdfInfo, 
    onClose, 
    onConfirm,
    loading 
}: {
    visible: boolean;
    pdfInfo: PDFInfo | null;
    onClose: () => void;
    onConfirm: (range: PageRange) => void;
    loading: boolean;
}) => {
    const [pageRange, setPageRange] = useState<PageRange>({
        startPage: 1,
        endPage: 1
    });
    const [startPageText, setStartPageText] = useState('1');
    const [endPageText, setEndPageText] = useState('1');

    React.useEffect(() => {
        if (pdfInfo) {
            const maxEnd = Math.min(pdfInfo.totalPages, pdfInfo.maxAllowedPages);
            setPageRange({
                startPage: 1,
                endPage: maxEnd
            });
            setStartPageText('1');
            setEndPageText(maxEnd.toString());
        }
    }, [pdfInfo]);

    const handleStartPageChange = (text: string) => {
        setStartPageText(text);
        if (text.trim() === '') {
            setPageRange(prev => ({ ...prev, startPage: 1 }));
        } else {
            const num = parseInt(text) || 1;
            const validNum = Math.max(1, Math.min(num, pdfInfo?.totalPages || 1));
            setPageRange(prev => ({ ...prev, startPage: validNum }));
        }
    };

    const handleEndPageChange = (text: string) => {
        setEndPageText(text);
        if (text.trim() === '') {
            setPageRange(prev => ({ ...prev, endPage: prev.startPage }));
        } else {
            const num = parseInt(text) || 1;
            const validNum = Math.max(pageRange.startPage, Math.min(num, pdfInfo?.totalPages || 1));
            setPageRange(prev => ({ ...prev, endPage: validNum }));
        }
    };

    const handleConfirm = () => {
        // Validate range
        if (pageRange.startPage < 1 || pageRange.startPage > (pdfInfo?.totalPages || 1)) {
            Alert.alert('Error', 'Start page is invalid');
            return;
        }
        if (pageRange.endPage < pageRange.startPage || pageRange.endPage > (pdfInfo?.totalPages || 1)) {
            Alert.alert('Error', 'End page is invalid');
            return;
        }
        if (pageRange.endPage - pageRange.startPage + 1 > (pdfInfo?.maxAllowedPages || 10)) {
            Alert.alert('Error', `Maximum ${pdfInfo?.maxAllowedPages || 10} pages allowed`);
            return;
        }

        onConfirm(pageRange);
    };

    if (!pdfInfo) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <TouchableOpacity 
                style={styles.modalOverlay} 
                activeOpacity={1}
                onPress={() => {
                    Keyboard.dismiss();
                    onClose();
                }}
            >
                <TouchableOpacity 
                    style={styles.pageRangeModalContent} 
                    activeOpacity={1}
                    onPress={() => {
                        Keyboard.dismiss();
                    }}
                >
                    <Text style={styles.modalTitle}>Select Page Range</Text>
                    
                    <View style={styles.pdfInfoContainer}>
                        <Text style={styles.pdfFileName}>{pdfInfo.fileName}</Text>
                        <Text style={styles.pdfPages}>Total Pages: {pdfInfo.totalPages}</Text>
                        <Text style={styles.maxPagesText}>
                            Maximum {pdfInfo.maxAllowedPages} pages allowed
                        </Text>
                    </View>

                    <View style={styles.sampleTextContainer}>
                        <Text style={styles.sampleLabel}>Sample text:</Text>
                        <Text style={styles.sampleText} numberOfLines={3}>
                            {pdfInfo.sampleText}
                        </Text>
                    </View>

                    <View style={styles.pageRangeContainer}>
                        <View style={styles.pageInputContainer}>
                            <Text style={styles.inputLabel}>Start:</Text>
                            <TextInput
                                style={styles.pageInput}
                                value={startPageText}
                                onChangeText={handleStartPageChange}
                                onBlur={() => {
                                    setStartPageText(pageRange.startPage.toString());
                                }}
                                keyboardType="numeric"
                                placeholder="1"
                                selectTextOnFocus={true}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={styles.pageInputContainer}>
                            <Text style={styles.inputLabel}>End:</Text>
                            <TextInput
                                style={styles.pageInput}
                                value={endPageText}
                                onChangeText={handleEndPageChange}
                                onBlur={() => {
                                    setEndPageText(pageRange.endPage.toString());
                                }}
                                keyboardType="numeric"
                                placeholder="1"
                                selectTextOnFocus={true}
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    <View style={styles.rangeInfoContainer}>
                        <Text style={styles.rangeInfo}>
                            Selected: {pageRange.endPage - pageRange.startPage + 1} pages
                        </Text>
                        {pageRange.endPage - pageRange.startPage + 1 > pdfInfo.maxAllowedPages && (
                            <Text style={styles.errorText}>
                                Too many pages! Max {pdfInfo.maxAllowedPages}.
                            </Text>
                        )}
                    </View>

                    <View style={styles.modalActions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                Keyboard.dismiss();
                                onClose();
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmButton, loading && styles.buttonDisabled]}
                            onPress={() => {
                                Keyboard.dismiss();
                                handleConfirm();
                            }}
                            disabled={loading || pageRange.endPage - pageRange.startPage + 1 > pdfInfo.maxAllowedPages}
                        >
                            <Text style={styles.confirmButtonText}>
                                {loading ? 'Processing...' : 'Continue'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
});

export default function LoadDocumentsScreen() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerResult | null>(null);
    
    // New state for PDF page range selection
    const [showPageRangeModal, setShowPageRangeModal] = useState(false);
    const [pdfInfo, setPdfInfo] = useState<PDFInfo | null>(null);
    const [selectedPageRange, setSelectedPageRange] = useState<PageRange | null>(null);

    const fetchDocuments = async () => {
        try {
            const response = await api.get('/documents/');
            setDocuments(response.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    };

    const fetchCourses = async () => {
        try {
            const response = await api.get('/courses/');
            setCourses(response.data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchDocuments();
            fetchCourses(); // Always fetch courses when screen is focused
        }, [])
    );

    const getPdfInfo = async (file: DocumentPicker.DocumentPickerAsset) => {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            type: 'application/pdf',
            name: file.name || 'document.pdf'
        } as any);

        try {
            const response = await api.post('/documents/pdf-info/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error getting PDF info:', error);
            throw error;
        }
    };

    const handleUpload = async () => {
        try {
            // Ensure courses are available (they should be loaded on screen focus)
            if (courses.length === 0) {
                console.log('Courses not loaded, fetching...');
                await fetchCourses();
            }

            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true
            });

            if (result.canceled) {
                return;
            }

            setSelectedFile(result);
            
            // Get PDF info first
            setLoading(true);
            const info = await getPdfInfo(result.assets[0]);
            setLoading(false);
            
            if (info) {
                setPdfInfo(info);
                setShowPageRangeModal(true);
                // Dismiss keyboard when modal opens
                Keyboard.dismiss();
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert('Error', 'Failed to select document');
            setLoading(false);
        }
    };

    const handlePageRangeConfirm = (range: PageRange) => {
        setSelectedPageRange(range);
        setShowPageRangeModal(false);
        setShowCourseModal(true);
    };

    const handlePageRangeCancel = () => {
        setShowPageRangeModal(false);
        setSelectedFile(null);
        setPdfInfo(null);
        setSelectedPageRange(null);
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

            // Add page range if selected
            if (selectedPageRange) {
                formData.append('startPage', selectedPageRange.startPage.toString());
                formData.append('endPage', selectedPageRange.endPage.toString());
            }

            const response = await api.post('/documents/upload/', formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                }
            });

            // Check if we received a warning about existing document
            if (response.data.requiresConfirmation) {
                setLoading(false);
                Alert.alert(
                    'Warning',
                    'A document already exists for this chapter. Do you want to replace it?',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => {
                                setShowCourseModal(false);
                                setSelectedFile(null);
                                setPdfInfo(null);
                                setSelectedPageRange(null);
                            }
                        },
                        {
                            text: 'Replace',
                            style: 'destructive',
                            onPress: async () => {
                                setLoading(true);
                                try {
                                    // Add forceUpload flag to formData
                                    formData.append('forceUpload', 'true');
                                    
                                    // Retry the upload with force flag
                                    await api.post('/documents/upload/', formData, {
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'multipart/form-data',
                                        }
                                    });

                                    setShowCourseModal(false);
                                    setSelectedFile(null);
                                    setPdfInfo(null);
                                    setSelectedPageRange(null);
                                    fetchDocuments();
                                    Alert.alert('Success', 'Document uploaded successfully');
                                } catch (error) {
                                    console.error('Error uploading document:', error);
                                    Alert.alert('Error', 'Failed to upload document');
                                } finally {
                                    setLoading(false);
                                }
                            }
                        }
                    ]
                );
                return;
            }

            setShowCourseModal(false);
            setSelectedFile(null);
            setPdfInfo(null);
            setSelectedPageRange(null);
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
                <Text style={styles.title}>📄 Load Documents</Text>
                <Text style={styles.subtitle}>Upload PDF documents to enhance your learning</Text>
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
                    setPdfInfo(null);
                    setSelectedPageRange(null);
                }}
                onSubmit={handleConfirmUpload}
                loading={loading}
                coursesLoading={coursesLoading}
            />

            <PageRangeModal
                visible={showPageRangeModal}
                pdfInfo={pdfInfo}
                onClose={handlePageRangeCancel}
                onConfirm={handlePageRangeConfirm}
                loading={loading}
            />
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
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
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
        marginBottom: 20,
        textAlign: 'center',
        fontWeight: '500',
    },
    uploadButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    uploadButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyStateText: {
        fontSize: 20,
        color: '#666',
        marginTop: 20,
        marginBottom: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '400',
    },
    documentList: {
        padding: 20,
    },
    documentItem: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    documentInfo: {
        flex: 1,
    },
    documentTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    documentMeta: {
        fontSize: 15,
        color: '#666',
        marginBottom: 4,
        fontWeight: '500',
    },
    documentDate: {
        fontSize: 13,
        color: '#999',
        fontWeight: '400',
    },
    documentArrow: {
        marginLeft: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 20,
        color: '#1a1a1a',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    courseList: {
        maxHeight: 400,
    },
    courseOption: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    selectedOption: {
        backgroundColor: '#007AFF15',
        borderColor: '#007AFF',
    },
    courseTitle: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
    chapterList: {
        marginLeft: 20,
        marginBottom: 12,
    },
    chapterOption: {
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    chapterTitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    input: {
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        fontSize: 16,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 24,
        gap: 16,
    },
    cancelButton: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    confirmButton: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#007AFF',
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
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    optionButton: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#e9ecef',
    },
    optionText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        fontWeight: '600',
    },
    pdfInfoContainer: {
        marginBottom: 16,
    },
    pdfFileName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    pdfPages: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
        marginBottom: 2,
    },
    maxPagesText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    sampleTextContainer: {
        marginBottom: 16,
    },
    sampleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    sampleText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
        lineHeight: 16,
    },
    pageRangeContainer: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    pageInputContainer: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    pageInput: {
        borderWidth: 2,
        borderColor: '#e9ecef',
        borderRadius: 10,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#fff',
        textAlign: 'center',
        fontWeight: '600',
    },
    rangeInfoContainer: {
        marginBottom: 16,
        alignItems: 'center',
    },
    rangeInfo: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
        marginBottom: 4,
    },
    errorText: {
        fontSize: 12,
        color: '#FF3B30',
        fontWeight: '600',
        textAlign: 'center',
    },
    pageRangeModalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        width: '85%',
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    emptyCourseState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 60,
    },
    emptyCourseText: {
        fontSize: 20,
        color: '#666',
        marginTop: 20,
        marginBottom: 12,
        fontWeight: '600',
        textAlign: 'center',
    },
}); 