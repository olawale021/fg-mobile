import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { getLessonById, getAllLessons } from '@/lib/lessons';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const lesson = getLessonById(id as string);
  const allLessons = getAllLessons();
  const currentIndex = allLessons.findIndex(l => l.id === id);

  const [completedPoints, setCompletedPoints] = useState<Set<number>>(new Set());

  const hasNextLesson = currentIndex < allLessons.length - 1;
  const hasPrevLesson = currentIndex > 0;

  if (!lesson) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Lesson not found</Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleCompletePoint = (index: number) => {
    setCompletedPoints(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const allPointsCompleted = completedPoints.size === lesson.quickBreakdown.length;

  const handleNextLesson = () => {
    if (hasNextLesson) {
      const nextLesson = allLessons[currentIndex + 1];
      setCompletedPoints(new Set());
      router.replace(`/lesson/${nextLesson.id}`);
    } else {
      router.back();
    }
  };

  const handlePrevLesson = () => {
    if (hasPrevLesson) {
      const prevLesson = allLessons[currentIndex - 1];
      setCompletedPoints(new Set());
      router.replace(`/lesson/${prevLesson.id}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#192B47" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.lessonCategory}>{lesson.category}</Text>
          <Text style={styles.headerDuration}>{lesson.duration}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(completedPoints.size / lesson.quickBreakdown.length) * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {completedPoints.size} of {lesson.quickBreakdown.length} completed
        </Text>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Card */}
        <View style={styles.titleCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>LESSON</Text>
          </View>
          <Text style={styles.mainTitle}>{lesson.title}</Text>
          <Text style={styles.description}>{lesson.description}</Text>
        </View>

        {/* Intro Section */}
        <View style={styles.introCard}>
          <Text style={styles.introText}>{lesson.intro}</Text>
        </View>

        {/* Quick Breakdown Label */}
        <Text style={styles.sectionLabel}>Quick Breakdown:</Text>

        {/* Breakdown Points - Each in its own card */}
        {lesson.quickBreakdown.map((point, index) => {
          const isCompleted = completedPoints.has(index);
          return (
            <View
              key={index}
              style={[
                styles.breakdownCard,
                isCompleted && styles.breakdownCardCompleted
              ]}
            >
              <View style={styles.breakdownHeader}>
                <View style={[styles.pointNumber, isCompleted && styles.pointNumberCompleted]}>
                  <Text style={styles.pointNumberText}>
                    {isCompleted ? '✓' : index + 1}
                  </Text>
                </View>
                <Text style={[styles.breakdownTitle, isCompleted && styles.breakdownTitleCompleted]}>
                  {point.title}
                </Text>
              </View>
              <Text style={[styles.breakdownDescription, isCompleted && styles.breakdownDescriptionCompleted]}>
                {point.description}
              </Text>
              <Pressable
                style={[
                  styles.completeButton,
                  isCompleted && styles.completeButtonCompleted
                ]}
                onPress={() => handleCompletePoint(index)}
              >
                <Text style={[
                  styles.completeButtonText,
                  isCompleted && styles.completeButtonTextCompleted
                ]}>
                  {isCompleted ? 'Completed ✓' : 'Mark Complete'}
                </Text>
              </Pressable>
            </View>
          );
        })}

        {/* Remember This */}
        <View style={styles.rememberCard}>
          <Text style={styles.rememberTitle}>{lesson.rememberThis.title}</Text>
          <Text style={styles.rememberContent}>{lesson.rememberThis.content}</Text>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <Pressable
          style={[styles.navButton, !hasPrevLesson && styles.navButtonDisabled]}
          onPress={handlePrevLesson}
          disabled={!hasPrevLesson}
        >
          <Text style={[styles.navButtonText, !hasPrevLesson && styles.navButtonTextDisabled]}>
            ← Previous
          </Text>
        </Pressable>

        <Pressable
          style={[styles.nextButton, allPointsCompleted && styles.nextButtonActive]}
          onPress={handleNextLesson}
        >
          <Text style={styles.nextButtonText}>
            {hasNextLesson ? 'Next Lesson →' : 'Complete ✓'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-Regular',
    marginBottom: 20,
  },
  header: {
    backgroundColor: '#192B47',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonCategory: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerDuration: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  progressContainer: {
    backgroundColor: '#192B47',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  titleCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  badge: {
    backgroundColor: '#192B47',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
    color: '#192B47',
    marginBottom: 8,
    lineHeight: 32,
  },
  description: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
    lineHeight: 22,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  introText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#374151',
    lineHeight: 26,
  },
  sectionLabel: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  breakdownCardCompleted: {
    backgroundColor: '#EFF6FF',
    borderColor: '#192B47',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pointNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#192B47',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pointNumberCompleted: {
    backgroundColor: '#192B47',
  },
  pointNumberText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
  },
  breakdownTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'HostGrotesk-Bold',
    color: '#192B47',
  },
  breakdownTitleCompleted: {
    color: '#192B47',
  },
  breakdownDescription: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Regular',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  breakdownDescriptionCompleted: {
    color: '#1E3A5F',
  },
  completeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  completeButtonCompleted: {
    backgroundColor: '#192B47',
    borderColor: '#192B47',
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#192B47',
  },
  completeButtonTextCompleted: {
    color: '#FFFFFF',
  },
  rememberCard: {
    backgroundColor: '#EFF6FF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#192B47',
  },
  rememberTitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Bold',
    color: '#192B47',
    marginBottom: 8,
  },
  rememberContent: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Medium',
    color: '#1E3A5F',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    paddingBottom: 32,
  },
  navButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#192B47',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  nextButton: {
    flex: 2,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonActive: {
    backgroundColor: '#192B47',
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#192B47',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
});
