import { StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';

interface ChapterData {
  title: string;
  content: string;
}

interface CourseChapters {
  [key: string]: ChapterData;
}

interface ChapterContent {
  [key: string]: CourseChapters;
}

// Sample chapter content - you would typically fetch this based on the course and chapter IDs
const chapterContent: ChapterContent = {
  ai: {
    intro: {
      title: 'Introduction to AI',
      content: `Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that can perform tasks that typically require human intelligence.

Key Concepts:
• Definition and scope of AI
• History and evolution of AI
• Types of AI: Narrow vs General AI
• Core components of AI systems
• Applications in real world

Current State of AI:
• Machine learning revolution
• Deep learning breakthroughs
• Natural language processing advances
• Computer vision achievements
• Robotics integration

Challenges and Considerations:
• Ethical implications
• Technical limitations
• Future directions
• Impact on society
• Role in different industries`
    },
    ml: {
      title: 'Machine Learning Fundamentals',
      content: `Machine Learning is a subset of AI that focuses on developing systems that can learn from and make decisions based on data.

Key Concepts:
• Types of Machine Learning
• Supervised Learning
• Unsupervised Learning
• Reinforcement Learning
• Feature Engineering

Core Components:
• Data preprocessing
• Model selection
• Training process
• Evaluation metrics
• Validation techniques`
    }
    // Add more chapters as needed
  }
};

export default function ChapterScreen() {
  const { courseId, chapterId } = useLocalSearchParams();
  const chapter = chapterContent[courseId as string]?.[chapterId as string];

  if (!chapter) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <ThemedText type="title">Chapter not found</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">{chapter.title}</ThemedText>
      </ThemedView>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.contentContainer}>
          <ThemedText style={styles.content}>{chapter.content}</ThemedText>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  contentContainer: {
    gap: 16,
  },
  content: {
    lineHeight: 24,
  },
}); 