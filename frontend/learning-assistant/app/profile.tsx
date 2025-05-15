import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ThemedView style={styles.header}>
        <ThemedView style={styles.headerContent}>
          <ThemedText type="title">Profile</ThemedText>
        </ThemedView>
      </ThemedView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.avatarContainer}>
            <IconSymbol size={80} name="person.circle.fill" color="white" />
          </ThemedView>

          <ThemedView style={styles.infoContainer}>
            <ThemedView style={styles.infoRow}>
              <ThemedText type="subtitle">Name</ThemedText>
              <ThemedText>John Doe</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText type="subtitle">Student ID</ThemedText>
              <ThemedText>12345678</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText type="subtitle">Faculty</ThemedText>
              <ThemedText>Faculty of Mathematics and Computer Science</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText type="subtitle">Year</ThemedText>
              <ThemedText>3rd Year</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText type="subtitle">Email</ThemedText>
              <ThemedText>john.doe@s.unibuc.ro</ThemedText>
            </ThemedView>

            {/* Adding more info rows to demonstrate scrolling */}
            <ThemedView style={styles.infoRow}>
              <ThemedText type="subtitle">Study Program</ThemedText>
              <ThemedText>Computer Science</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText type="subtitle">Specialization</ThemedText>
              <ThemedText>Software Engineering</ThemedText>
            </ThemedView>

            <ThemedView style={styles.infoRow}>
              <ThemedText type="subtitle">Academic Status</ThemedText>
              <ThemedText>Full-time Student</ThemedText>
            </ThemedView>
          </ThemedView>
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
  headerContent: {
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  infoContainer: {
    gap: 16,
  },
  infoRow: {
    gap: 4,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
}); 