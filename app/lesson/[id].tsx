import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, ActivityIndicator, Modal, Animated, Image, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';

const checkmarkIcon = require('../../assets/images/checkmark.png');
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkeletonBox, SkeletonLine } from '@/components/skeleton-loader';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/contexts/subscription-context';
import { PaywallModal } from '@/components/paywall-modal';
import { FREE_LESSON_LIMIT } from '@/lib/revenucat';
import { getLessonBySlug, getLessonById, Lesson } from '@/lib/lessons';
import { isLessonUnlocked, getUnlockedLessons, markLessonCompleted, isLessonCompleted, ScoreProgressionResult, saveLessonTime, incrementLessonReadCount } from '@/lib/lesson-unlocks';
import { useScreenTimeTracker } from '@/hooks/use-screen-time-tracker';
import { supabase } from '@/lib/supabase/client';
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = (_event: string, _cb: any) => {};
try {
  const mod = require('@jamsch/expo-speech-recognition');
  ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
} catch {
  // Native module not available — speech-to-text disabled until rebuild
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const insets = useSafeAreaInsets();

  const [lesson, setLesson] = useState<Lesson | undefined>(getLessonById(id as string));
  const [lessonLoading, setLessonLoading] = useState(!lesson);
  const [completedPoints, setCompletedPoints] = useState<Set<number>>(new Set());
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [unlockedLessonIds, setUnlockedLessonIds] = useState<string[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreProgressionResult | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [wasAlreadyCompleted, setWasAlreadyCompleted] = useState(false);
  const [hasIncrementedReadCount, setHasIncrementedReadCount] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results[0]?.transcript;
    if (transcript) {
      setQuestionText(transcript);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.error('Speech recognition error:', event.error);
    setIsListening(false);
  });

  // Load lesson asynchronously (generated lessons need DB fetch)
  useEffect(() => {
    async function loadLesson() {
      if (!user) return;
      const fetched = await getLessonBySlug(user.id, id as string);
      if (fetched) {
        setLesson(fetched);
      }
      setLessonLoading(false);
    }
    loadLesson();
  }, [user, id]);

  const speechAvailable = !!ExpoSpeechRecognitionModule;

  const toggleListening = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert('Not Available', 'Voice input requires a new app build.');
      return;
    }
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permission Required', 'Microphone access is needed for voice input.');
      return;
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
    });
    setIsListening(true);
  };

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

      // Get all unlocked lessons for navigation
      const unlockedSlugs = await getUnlockedLessons(user.id);

      // If not premium and lesson is beyond free cap, treat as locked
      const lessonIndex = unlockedSlugs.indexOf(id as string);
      if (!isPremium && lessonIndex >= FREE_LESSON_LIMIT) {
        setIsUnlocked(false);
        setUnlockedLessonIds(unlockedSlugs);
        return;
      }

      setIsUnlocked(unlocked);
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
  }, [user, id, lesson, isPremium]);

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

  // Show loading while checking unlock status or loading lesson
  if (isUnlocked === null || lessonLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle="light-content" />
        {/* Header bar */}
        <View style={{ backgroundColor: '#01B2FE', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
          <SkeletonBox width={40} height={40} borderRadius={8} />
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 8 }}>
            <SkeletonLine width="35%" />
            <SkeletonLine width="20%" />
          </View>
        </View>
        {/* Progress bar */}
        <View style={{ backgroundColor: '#01B2FE', paddingHorizontal: 16, paddingBottom: 16 }}>
          <SkeletonBox height={6} borderRadius={3} />
        </View>
        <View style={{ padding: 16 }}>
          {/* Title card */}
          <SkeletonBox height={100} borderRadius={12} style={{ marginBottom: 16 }} />
          {/* Intro card */}
          <SkeletonBox height={80} borderRadius={12} style={{ marginBottom: 16 }} />
          {/* Section label */}
          <SkeletonLine width="35%" style={{ marginBottom: 12 }} />
          {/* Breakdown points */}
          <SkeletonBox height={70} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonBox height={70} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonBox height={70} borderRadius={12} />
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
          <Text style={[styles.errorText, { color: '#FFFFFF' }]}>This lesson is not yet unlocked</Text>
          <Text style={[styles.lockedSubtext, { color: '#FFFFFF' }]}>
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
          <Text style={[styles.errorText, { color: '#FFFFFF' }]}>Lesson not found</Text>
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

  const handleSubmitQuestion = async () => {
    if (!questionText.trim() || !user || !lesson) return;
    setSubmittingQuestion(true);
    setAiAnswer('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ask-lesson-question`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            question: questionText.trim(),
            lessonTitle: lesson.title,
            lessonDescription: lesson.description,
            lessonIntro: lesson.intro,
            lessonBreakdown: lesson.quickBreakdown.map(p => `${p.title}: ${p.description}`).join('\n'),
            rememberThis: lesson.rememberThis.content,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
      setAiAnswer(data.answer);
    } catch (error) {
      console.error('Error getting AI answer:', error);
      setAiAnswer('Sorry, something went wrong. Please try again.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#01B2FE" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={async () => { await forceSave(); router.back(); }} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={styles.lessonCategory}>{lesson.category}</Text>
          <Text style={styles.headerDuration}>{lesson.duration}</Text>
        </View>
        <Pressable style={styles.questionButton} onPress={() => isPremium ? setShowQuestionModal(true) : setShowPaywall(true)}>
          <Text style={styles.questionButtonText}>?</Text>
        </Pressable>
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

      {/* Question Modal */}
      <Modal
        visible={showQuestionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => { setShowQuestionModal(false); setAiAnswer(''); setQuestionText(''); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.questionOverlay}>
            <Pressable style={styles.questionOverlayDismiss} onPress={() => { setShowQuestionModal(false); setAiAnswer(''); setQuestionText(''); }} />
            <View style={[styles.questionSheet, { paddingBottom: insets.bottom + 20 }]}>
            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            {/* Lesson context tag */}
            <View style={styles.lessonTag}>
              <Text style={styles.lessonTagText}>{lesson.title}</Text>
            </View>

            {aiAnswer ? (
              /* Answer view */
              <View style={styles.answerView}>
                <View style={styles.questionBubble}>
                  <Text style={styles.questionLabel}>Your question</Text>
                  <Text style={styles.questionBubbleText}>{questionText}</Text>
                </View>

                <View style={styles.answerCard}>
                  <View style={styles.aiLabelRow}>
                    <View style={styles.aiDot} />
                    <Text style={styles.aiLabel}>AI Assistant</Text>
                  </View>
                  <Text style={styles.answerText}>{aiAnswer}</Text>
                </View>

                <Pressable
                  style={styles.doneButton}
                  onPress={() => { setShowQuestionModal(false); setAiAnswer(''); setQuestionText(''); }}
                >
                  <Text style={styles.doneButtonText}>Got it</Text>
                </Pressable>
              </View>
            ) : (
              /* Input view */
              <View style={styles.inputView}>
                <Text style={styles.sheetTitle}>What do you want to know?</Text>
                <Text style={styles.sheetSubtitle}>
                  Ask about this lesson and get an instant answer
                </Text>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.questionInput}
                    placeholder="Type your question..."
                    placeholderTextColor="#9CA3AF"
                    value={questionText}
                    onChangeText={setQuestionText}
                    multiline
                    textAlignVertical="top"
                  />
                  {speechAvailable && (
                    <Pressable
                      style={[styles.micIconButton, isListening && styles.micIconButtonActive]}
                      onPress={toggleListening}
                    >
                      <Text style={styles.micIconText}>{isListening ? '■' : '🎤'}</Text>
                    </Pressable>
                  )}
                </View>

                {submittingQuestion ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#01B2FE" />
                    <Text style={styles.loadingText}>Thinking...</Text>
                  </View>
                ) : (
                  <Pressable
                    style={[styles.askButton, !questionText.trim() && styles.askButtonDisabled]}
                    onPress={handleSubmitQuestion}
                    disabled={!questionText.trim()}
                  >
                    <Text style={styles.askButtonText}>Ask</Text>
                  </Pressable>
                )}
              </View>
            )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Paywall Modal */}
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />

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
    backgroundColor: '#01B2FE',
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
    backgroundColor: '#01B2FE',
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
    backgroundColor: '#01B2FE',
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
    color: '#111827',
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
    borderColor: '#01B2FE',
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
    backgroundColor: '#01B2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pointNumberCompleted: {
    backgroundColor: '#01B2FE',
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
    color: '#111827',
  },
  breakdownTitleCompleted: {
    color: '#111827',
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
    backgroundColor: '#01B2FE',
    borderColor: '#01B2FE',
  },
  completeButtonText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#111827',
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
    borderColor: '#01B2FE',
  },
  rememberTitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Bold',
    color: '#111827',
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
    color: '#111827',
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
    backgroundColor: '#01B2FE',
  },
  nextButtonCompleted: {
    backgroundColor: '#FF7A1A',
    opacity: 0.8,
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#01B2FE',
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
    color: '#111827',
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
    color: '#FF7A1A',
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
    color: '#111827',
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
    backgroundColor: '#01B2FE',
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
  questionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  questionButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
  },
  questionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  questionOverlayDismiss: {
    flex: 1,
  },
  questionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  lessonTag: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  lessonTagText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#111827',
  },
  inputView: {},
  sheetTitle: {
    fontSize: 22,
    fontFamily: 'HostGrotesk-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
    marginBottom: 20,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  questionInput: {
    padding: 16,
    fontSize: 15,
    fontFamily: 'HostGrotesk-Regular',
    color: '#111827',
    minHeight: 100,
  },
  micIconButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIconButtonActive: {
    backgroundColor: '#DC2626',
  },
  micIconText: {
    fontSize: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  loadingText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Medium',
    color: '#111827',
  },
  askButton: {
    backgroundColor: '#01B2FE',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  askButtonDisabled: {
    opacity: 0.4,
  },
  askButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  answerView: {},
  questionBubble: {
    marginBottom: 16,
  },
  questionLabel: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  questionBubbleText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Medium',
    color: '#111827',
    lineHeight: 22,
  },
  answerCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7A1A',
    marginRight: 8,
  },
  aiLabel: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#6B7280',
  },
  answerText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Regular',
    color: '#374151',
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: '#01B2FE',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
});
