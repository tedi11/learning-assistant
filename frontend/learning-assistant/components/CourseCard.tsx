import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    isSelectionMode?: boolean;
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

export const CourseCard: React.FC<CourseCardProps> = ({ 
    course, 
    onPress, 
    isSelected, 
    onSelect,
    isSelectionMode = false 
}) => {
    return (
        <TouchableOpacity 
            style={[
                styles.card,
                isSelected && styles.selectedCard
            ]} 
            onPress={onPress}
            onLongPress={onSelect}
            delayLongPress={200}
            activeOpacity={0.7}
        >
            {isSelectionMode && (
                <TouchableOpacity 
                    style={styles.selectionContainer}
                    onPress={onSelect}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <View style={[
                        styles.checkbox,
                        isSelected && styles.checkboxSelected
                    ]}>
                        {isSelected && (
                            <Ionicons 
                                name="checkmark" 
                                size={18} 
                                color="#fff" 
                            />
                        )}
                    </View>
                </TouchableOpacity>
            )}
            
            <View style={[
                styles.content,
                isSelectionMode && styles.contentWithSelection
            ]}>
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
                {isSelected && !isSelectionMode && (
                    <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                        <Text style={styles.selectedText}>Selected</Text>
                    </View>
                )}
                {!isSelectionMode && (
                    <Ionicons name="chevron-forward" size={20} color="#007AFF" />
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        marginHorizontal: 4,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    selectedCard: {
        borderWidth: 2,
        borderColor: '#007AFF',
        backgroundColor: '#007AFF08',
        shadowColor: '#007AFF',
        shadowOpacity: 0.15,
    },
    selectionContainer: {
        paddingRight: 16,
        paddingLeft: 4,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ddd',
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    content: {
        flex: 1,
    },
    contentWithSelection: {
        paddingLeft: 0,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
        color: '#1a1a1a',
        letterSpacing: 0.2,
    },
    description: {
        fontSize: 15,
        color: '#666',
        marginBottom: 12,
        fontWeight: '500',
        lineHeight: 22,
    },
    progressContainer: {
        height: 24,
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    progressBar: {
        height: '100%',
        position: 'absolute',
        left: 0,
        borderRadius: 12,
    },
    progressText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        lineHeight: 24,
        color: '#333',
        fontSize: 12,
        fontWeight: '700',
    },
    progressTextGray: {
        color: '#666',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 40,
    },
    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#007AFF15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#007AFF30',
    },
    selectedText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '700',
    },
}); 