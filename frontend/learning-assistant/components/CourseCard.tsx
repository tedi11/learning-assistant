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

const getProgressColor = (progress: number) => {
    if (progress === 0) return '#666'; // Gray for not started
    if (progress < 30) return '#FF4444'; // Red for early progress
    if (progress < 70) return '#FFBB33'; // Yellow for medium progress
    return '#00C851'; // Green for good progress
};

const getProgressText = (progress: number) => {
    if (progress === 0) return 'Not Started';
    if (progress === 100) return 'Completed';
    return `${progress}% Complete`;
};

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
                        <View 
                            style={[
                                styles.progressBar, 
                                { 
                                    width: `${course.progress}%`,
                                    backgroundColor: getProgressColor(course.progress)
                                }
                            ]} 
                        />
                        <Text style={[
                            styles.progressText,
                            course.progress === 0 && styles.progressTextGray
                        ]}>
                            {getProgressText(course.progress)}
                        </Text>
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
    progressTextGray: {
        color: '#666',
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