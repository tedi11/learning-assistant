import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LoadDocumentsScreen() {
    const [documents, setDocuments] = useState<string[]>([]);

    const handleUpload = () => {
        // TODO: Implement document upload functionality
        console.log('Upload document');
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
                    <Text style={styles.uploadButtonText}>Upload</Text>
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
                            Upload documents to enhance your learning experience
                        </Text>
                    </View>
                ) : (
                    <View style={styles.documentList}>
                        {/* Document list will go here */}
                    </View>
                )}
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
}); 