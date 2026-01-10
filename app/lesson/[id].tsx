import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator, Modal, Animated, Image } from 'react-native';

const checkmarkIcon = require('../../assets/images/checkmark.png');
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { getLessonById, getAllLessons } from '@/lib/lessons';
import { isLessonUnlocked, getUnlockedLessons, markLessonCompleted, isLessonCompleted, ScoreProgressionResult, saveLessonTime, incrementLessonReadCount } from '@/lib/lesson-unlocks';
import { useScreenTimeTracker } from '@/hooks/use-screen-time-tracker';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { user } = useAuth();
  const lesson = getLessonById(id as string);

  const [completedPoints, setCompletedPoints] = useState<Set<number>>(new Set());
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [unlockedLessonIds, setUnlockedLessonIds] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreProgressionResult | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);
  const [hasIncrementedReadCount, setHasIncrementedReadCount] = useState(false);

  // Screen time tracking
  const handleSaveTime = useCallback(async (timeSeconds: number) => {
    if (user?.id) {
      await saveLessonTime(user.id, id as string, timeSeconds);
    }
  }, [user?.id, id]);

  const { forceSave } = useScreenTimeTracker({
    userId: user?.id,
    contentSlug: id as string,
    saveIntervalMs: 30000,
    onSave: handleSaveTime,
  });

  // Check if lesson is unlocked and completed
  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setIsUnlocked(false);
        return;
      }

      const unlocked = await isLessonUnlocked(user.id, id as string);
      setIsUnlocked(unlocked);

      // Get all unlocked lessons for navigation
      const unlockedSlugs = await getUnlockedLessons(user.id);
      setUnlockedLessonIds(unlockedSlugs);

      // Check if lesson was already completed
      const completed = await isLessonCompleted(user.id, id as string);
      setWasAlreadyCompleted(completed);

      // If already completed, mark all points as completed
      if (completed && lesson) {
        const allPoints = new Set(lesson.quickBreakdown.map((_, index) => index));
        setCompletedPoints(allPoints);
      }
    }
    checkAccess();
  }, [user, id, lesson]);

  // Increment read count once when revisiting a completed lesson
  useEffect(() => {
    if (wasAlreadyCompleted && user && !hasIncrementedReadCount) {
      setHasIncrementedReadCount(true);
      incrementLessonReadCount(user.id, id as string);
    }
  }, [wasAlreadyCompleted, user, id, hasIncrementedReadCount]);

  // Calculate navigation based on unlocked lessons
  const currentIndex = unlockedLessonIds.indexOf(id as string);
  const hasNextLesson = currentIndex >= 0 && currentIndex < unlockedLessonIds.length - 1;
  const hasPrevLesson = currentIndex > 0;

  // Show loading while checking unlock status
  if (isUnlocked === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Show locked state if lesson is not unlocked
  if (isUnlocked === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.errorContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={[styles.errorText, { color: colors.text }]}>This lesson is not yet unlocked</Text>
          <Text style={[styles.lockedSubtext, { color: colors.textSecondary }]}>
            New lessons unlock daily at 8am
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.back()}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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

  const handleNextLesson = async () => {
    // Save accumulated screen time before leaving
    await forceSave();

    // Mark lesson as completed when moving to next
    if (allPointsCompleted && user) {
      setIsCompleting(true);
      try {
        const result = await markLessonCompleted(user.id, id as string);
        if (result) {
          // Show completion modal with score info
          setScoreResult(result);
          setShowCompletionModal(true);
          // Store where we should navigate after modal
          if (hasNextLesson) {
            setPendingNavigation(unlockedLessonIds[currentIndex + 1]);
          } else {
            setPendingNavigation('back');
          }
          setIsCompleting(false);
          return; // Don't navigate yet, wait for modal
        }
      } catch (error) {
        console.error('Error marking lesson complete:', error);
      }
      setIsCompleting(false);
    }

    // If no result (already completed or error), navigate directly
    if (hasNextLesson) {
      const nextLessonId = unlockedLessonIds[currentIndex + 1];
      setCompletedPoints(new Set());
      router.replace(`/lesson/${nextLessonId}`);
    } else {
      router.back();
    }
  };

  const handleModalContinue = () => {
    setShowCompletionModal(false);
    setScoreResult(null);

    if (pendingNavigation === 'back') {
      router.back();
    } else if (pendingNavigation) {
      setCompletedPoints(new Set());
      router.replace(`/lesson/${pendingNavigation}`);
    }
    setPendingNavigation(null);
  };

  const handlePrevLesson = async () => {
    // Save accumulated screen time before leaving
    await forceSave();

    if (hasPrevLesson) {
      const prevLessonId = unlockedLessonIds[currentIndex - 1];
      setCompletedPoints(new Set());
      router.replace(`/lesson/${prevLessonId}`);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#192B47" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={async () => { await forceSave(); router.back(); }} style={styles.backButton}>
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
                disabled={wasAlreadyCompleted}
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
          style={[
            styles.nextButton,
            allPointsCompleted && styles.nextButtonActive,
            wasAlreadyCompleted && !hasNextLesson && styles.nextButtonCompleted
          ]}
          onPress={handleNextLesson}
          disabled={isCompleting || (wasAlreadyCompleted && !hasNextLesson)}
        >
          <Text style={styles.nextButtonText}>
            {isCompleting ? 'Saving...' : hasNextLesson ? 'Next Lesson →' : wasAlreadyCompleted ? 'Completed ✓' : 'Complete'}
          </Text>
        </Pressable>
      </View>

      {/* Completion Modal */}
      <Modal
        visible={showCompletionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalContinue}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {scoreResult && (
              <>
                {scoreResult.scoreBand === 'ready' ? (
                  <>
                    <Text style={styles.celebrationEmoji}>🎉</Text>
                    <Text style={styles.modalTitle}>Founder Ready!</Text>
                    <Text style={styles.modalSubtitle}>
                      Congratulations! You've reached the top tier.
                    </Text>
                  </>
                ) : (
                  <>
                    <Image source={checkmarkIcon} style={styles.checkmarkIcon} />
                    <Text style={styles.modalTitle}>Lesson Completed!</Text>
                  </>
                )}

                <View style={styles.scoreBreakdown}>
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Points Earned</Text>
                    <Text style={styles.scoreValue}>+{scoreResult.pointsEarned}</Text>
                  </View>

                  {scoreResult.streakBonus > 0 && (
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreLabel}>Streak Bonus</Text>
                      <Text style={styles.streakBonusValue}>+{scoreResult.streakBonus}</Text>
                    </View>
                  )}

                  <View style={styles.divider} />

                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Current Score</Text>
                    <Text style={styles.newScoreValue}>{scoreResult.newScore}/100</Text>
                  </View>

                  <View style={styles.streakRow}>
                    <Text style={styles.streakEmoji}>🔥</Text>
                    <Text style={styles.streakText}>
                      {scoreResult.currentStreak} day{scoreResult.currentStreak !== 1 ? 's' : ''} streak
                    </Text>
                  </View>
                </View>

                <Pressable style={styles.continueButton} onPress={handleModalContinue}>
                  <Text style={styles.continueButtonText}>
                    {pendingNavigation === 'back' ? 'Back to Library' : 'Continue'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  lockedIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  lockedSubtext: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-SemiBold',
    marginBottom: 8,
    textAlign: 'center',
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
  nextButtonCompleted: {
    backgroundColor: '#10B981',
    opacity: 0.8,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  checkmarkIcon: {
    width: 64,
    height: 64,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
    color: '#192B47',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  scoreBreakdown: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
  },
  scoreValue: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Bold',
    color: '#10B981',
  },
  streakBonusValue: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Bold',
    color: '#F59E0B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  newScoreValue: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-Bold',
    color: '#192B47',
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  streakEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  streakText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#F59E0B',
  },
  continueButton: {
    backgroundColor: '#192B47',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  continueButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
