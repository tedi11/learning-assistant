import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Course {
    id: number;
    title: string;
    description: string;
    progress?: number;
}

interface CourseCardProps {
    course: Course;
    onPress: () => void;
    onDelete: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onPress, onDelete }) => {
    return (
        <View style={styles.card}>
            <TouchableOpacity style={styles.content} onPress={onPress}>
                <Text style={styles.title}>{course.title}</Text>
                <Text style={styles.description} numberOfLines={2}>
                    {course.description}
                </Text>
                {course.progress !== undefined && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${course.progress}%` }]} />
                        <Text style={styles.progressText}>{course.progress}% Complete</Text>
                    </View>
                )}
            </TouchableOpacity>
            <TouchableOpacity 
                style={styles.deleteButton}
                onPress={onDelete}
            >
                <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    progressContainer: {
        height: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        overflow: 'hidden',
        marginTop: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
        position: 'absolute',
        left: 0,
    },
    progressText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        lineHeight: 20,
        color: '#333',
        fontSize: 12,
        fontWeight: 'bold',
    },
    deleteButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        marginRight: 16,
    },
    deleteButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
}); 