import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useColorScheme, ActivityIndicator } from 'react-native';
import { Text, Button } from '@/components/ui';
import { chapterApi } from '@/services/api';
import { Chapter, Course } from '@/types';
import { Colors } from '@/constants/Colors';

interface ChapterPickerProps {
  selectedChapter: Chapter | null;
  onSelectChapter: (chapter: Chapter) => void;
  selectedCourse?: Course | null;
}

export const ChapterPicker: React.FC<ChapterPickerProps> = ({
  selectedChapter,
  onSelectChapter,
  selectedCourse,
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';

  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedCourse?.id) {
        setChapters([]);
        return;
      }

      setLoading(true);
      try {
        console.log('Fetching chapters for course:', selectedCourse.id);
        const response = await chapterApi.getChapters(selectedCourse.id);
        console.log('Fetched chapters:', response.data);
        setChapters(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching chapters:', err.response || err);
        setError('Failed to load chapters');
        setChapters([]);
      } finally {
        setLoading(false);
      }
    };

    fetchChapters();
  }, [selectedCourse?.id]); // Only re-run when course ID changes

  if (!selectedCourse) {
    return (
      <View style={styles.container}>
        <Text>Please select a course first</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={Colors[colorScheme].primary} />
        <Text style={styles.loadingText}>Loading chapters...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          onPress={() => {
            setError(null);
            setLoading(true);
            chapterApi.getChapters(selectedCourse.id)
              .then(response => {
                setChapters(response.data);
                setError(null);
              })
              .catch(err => {
                console.error('Error retrying chapter fetch:', err);
                setError('Failed to load chapters');
                setChapters([]);
              })
              .finally(() => setLoading(false));
          }}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  if (chapters.length === 0) {
    return (
      <View style={styles.container}>
        <Text>No chapters found for this course</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {chapters.map((chapter) => (
        <Button
          key={chapter.id}
          onPress={() => onSelectChapter(chapter)}
          style={[
            styles.chapterButton(colorScheme),
            selectedChapter?.id === chapter.id && styles.selectedChapter(colorScheme),
          ]}
        >
          {chapter.title}
        </Button>
      ))}
    </ScrollView>
  );
};

const styles = {
  container: StyleSheet.create({
    container: {
      marginVertical: 8,
    },
  }).container,
  chapterButton: (colorScheme: 'light' | 'dark') => StyleSheet.create({
    chapterButton: {
      marginRight: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: Colors[colorScheme].background,
      borderWidth: 1,
      borderColor: Colors[colorScheme].border,
      borderRadius: 8,
    },
  }).chapterButton,
  selectedChapter: (colorScheme: 'light' | 'dark') => StyleSheet.create({
    selectedChapter: {
      backgroundColor: Colors[colorScheme].primary,
      borderColor: Colors[colorScheme].primary,
    },
  }).selectedChapter,
  errorText: StyleSheet.create({
    errorText: {
      color: 'red',
      marginBottom: 10,
      textAlign: 'center',
    },
  }).errorText,
  loadingText: StyleSheet.create({
    loadingText: {
      marginTop: 8,
      textAlign: 'center',
    },
  }).loadingText,
  retryButton: StyleSheet.create({
    retryButton: {
      marginTop: 8,
    },
  }).retryButton,
}; 