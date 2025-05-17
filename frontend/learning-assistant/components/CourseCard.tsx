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
    isSelected: boolean;
    onSelect: () => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, onPress, isSelected, onSelect }) => {
    return (
        <TouchableOpacity 
            style={[
                styles.card,
                isSelected && styles.selectedCard
            ]} 
            onPress={onPress}
            onLongPress={onSelect}
            delayLongPress={200}
        >
            <View style={styles.content}>
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
            </View>
            <View style={styles.actions}>
                {isSelected && (
                    <Text style={styles.selectedText}>Selected</Text>
                )}
                <Text style={styles.arrow}>→</Text>
            </View>
        </TouchableOpacity>
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
        padding: 16,
    },
    selectedCard: {
        borderWidth: 2,
        borderColor: '#007AFF',
    },
    content: {
        flex: 1,
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
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    selectedText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    arrow: {
        fontSize: 20,
        color: '#007AFF',
        marginLeft: 8,
    },
}); 