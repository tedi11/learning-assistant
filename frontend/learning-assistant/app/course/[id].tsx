import { StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

// Sample course content with chapters
const courseContent = {
  ai: {
    title: 'Artificial Intelligence',
    description: 'Advanced AI concepts, machine learning, and neural networks',
    chapters: [
      {
        id: 'intro',
        title: 'Introduction to AI',
        summary: 'Basic concepts and history of artificial intelligence'
      },
      {
        id: 'ml',
        title: 'Machine Learning Fundamentals',
        summary: 'Core concepts of machine learning and types of learning'
      },
      {
        id: 'nn',
        title: 'Neural Networks',
        summary: 'Architecture and principles of neural networks'
      },
      {
        id: 'nlp',
        title: 'Natural Language Processing',
        summary: 'Processing and understanding human language'
      },
      {
        id: 'dl',
        title: 'Deep Learning',
        summary: 'Advanced neural networks and deep learning architectures'
      }
    ]
  },
  os: {
    title: 'Operating Systems',
    description: 'System architecture, processes, memory management, and file systems',
    chapters: [
      {
        id: 'arch',
        title: 'System Architecture',
        summary: 'Core components and design of operating systems'
      },
      {
        id: 'proc',
        title: 'Process Management',
        summary: 'Process scheduling, synchronization, and communication'
      },
      {
        id: 'mem',
        title: 'Memory Management',
        summary: 'Virtual memory, paging, and memory allocation'
      },
      {
        id: 'fs',
        title: 'File Systems',
        summary: 'File organization, storage, and management'
      }
    ]
  },
  networks: {
    title: 'Computer Networks',
    description: 'Network protocols, architecture, and security principles',
    chapters: [
      {
        id: 'arch',
        title: 'Network Architecture',
        summary: 'Layered network models and protocols'
      },
      {
        id: 'tcp',
        title: 'TCP/IP Protocol Suite',
        summary: 'Internet protocols and their implementation'
      },
      {
        id: 'sec',
        title: 'Network Security',
        summary: 'Security threats, encryption, and protection mechanisms'
      },
      {
        id: 'wireless',
        title: 'Wireless Networks',
        summary: 'Mobile and wireless communication systems'
      }
    ]
  },
  db: {
    title: 'Database Systems',
    description: 'Database design, SQL, and data management concepts',
    chapters: [
      {
        id: 'design',
        title: 'Database Design',
        summary: 'Data modeling and database architecture'
      },
      {
        id: 'sql',
        title: 'SQL Fundamentals',
        summary: 'SQL queries and database manipulation'
      },
      {
        id: 'model',
        title: 'Data Modeling',
        summary: 'Entity-relationship models and normalization'
      },
      {
        id: 'trans',
        title: 'Transaction Management',
        summary: 'ACID properties and concurrency control'
      }
    ]
  }
};

export default function CourseScreen() {
  const { id } = useLocalSearchParams();
  const course = courseContent[id as keyof typeof courseContent];

  if (!course) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ThemedText type="title">Course not found</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">{course.title}</ThemedText>
        <ThemedText style={styles.description}>{course.description}</ThemedText>
      </ThemedView>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">Chapters</ThemedText>
          {course.chapters.map((chapter, index) => (
            <Pressable
              key={index}
              onPress={() => router.push({
                pathname: "/chapter/[courseId]/[chapterId]" as any,
                params: { courseId: id, chapterId: chapter.id }
              })}>
              <ThemedView style={styles.chapterCard}>
                <ThemedText type="subtitle">{chapter.title}</ThemedText>
                <ThemedText style={styles.summary}>{chapter.summary}</ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  description: {
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    gap: 12,
  },
  chapterCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4,
  },
  summary: {
    opacity: 0.7,
    fontSize: 14,
  },
}); 