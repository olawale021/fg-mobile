import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox, SkeletonLine } from '@/components/skeleton-loader';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useTestStore } from '@/store/test-store';
import { supabase } from '@/lib/supabase/client';
import { questions } from '@/lib/questions';
import { getScoreBandLabel } from '@/lib/scoring';

interface TestResponse {
  q1: string;
  q2: string;
  q3: string;
  q4: string;
  q5: string;
  q6: string;
  q7: string;
  q8: string;
  q9: string;
  q10: string;
  created_at: string;
  lessons_completed_at_assessment: number | null;
  base_score: number;
  score_band: string;
}

interface UserScores {
  current_score: number;  // Current total score (includes lessons, streaks)
  current_score_band: string;
}

interface InitialAssessment {
  base_score: number;
  score_band: string;
}

const LESSONS_REQUIRED_FOR_RETAKE = 5;

export default function AssessmentDetailsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { setIsRetake } = useTestStore();
  const [loading, setLoading] = useState(true);
  const [testResponse, setTestResponse] = useState<TestResponse | null>(null);
  const [userScores, setUserScores] = useState<UserScores | null>(null);
  const [initialAssessment, setInitialAssessment] = useState<InitialAssessment | null>(null);
  const [completedLessonsCount, setCompletedLessonsCount] = useState(0);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch current score from users table (latest_score includes lessons + streaks)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('base_score, score_band, latest_score, latest_score_band')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user scores:', userError);
        } else if (userData) {
          setUserScores({
            current_score: userData.latest_score ?? userData.base_score,
            current_score_band: userData.latest_score_band ?? userData.score_band,
          });
        }

        // Fetch FIRST test response (oldest) to get initial assessment score
        const { data: firstAssessment, error: firstError } = await supabase
          .from('test_responses')
          .select('base_score, score_band')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (firstError && firstError.code !== 'PGRST116') {
          console.error('Error fetching first assessment:', firstError);
        } else if (firstAssessment) {
          setInitialAssessment(firstAssessment);
        }

        // Fetch latest test response for answers display
        const { data: testData, error: testError } = await supabase
          .from('test_responses')
          .select('q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, created_at, lessons_completed_at_assessment, base_score, score_band')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (testError && testError.code !== 'PGRST116') {
          console.error('Error fetching test response:', testError);
        }

        setTestResponse(testData);

        // Fetch completed lessons count
        const { count, error: countError } = await supabase
          .from('user_lesson_completions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'completed');

        if (countError) {
          console.error('Error fetching completed lessons count:', countError);
        } else {
          setCompletedLessonsCount(count || 0);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Check lessons completed SINCE last assessment (not total)
  const lessonsAtLastAssessment = testResponse?.lessons_completed_at_assessment || 0;
  const lessonsSinceLastAssessment = completedLessonsCount - lessonsAtLastAssessment;
  const canRetakeAssessment = lessonsSinceLastAssessment >= LESSONS_REQUIRED_FOR_RETAKE;
  const lessonsRemaining = Math.max(0, LESSONS_REQUIRED_FOR_RETAKE - lessonsSinceLastAssessment);

  const handleRetakeAssessment = () => {
    setIsRetake(true);
    router.push('/test-intro');
  };

  const getScoreColor = (answer: string) => {
    const highScoreAnswers = ['Yes', 'Very clear', 'Yes, many', 'Yes, working', 'Yes, measurable'];
    const lowScoreAnswers = ['No', 'Not clear', 'Solo'];

    if (highScoreAnswers.includes(answer)) return '#FF7A1A';
    if (lowScoreAnswers.includes(answer)) return '#EF4444';
    return '#F59E0B';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#01B2FE' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#01B2FE" />
        {/* Header bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }}>
          <SkeletonBox width={40} height={40} borderRadius={8} />
          <SkeletonLine width="40%" />
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 20 }}>
          {/* Info card */}
          <SkeletonBox height={60} borderRadius={12} style={{ marginBottom: 20 }} />
          {/* Score comparison card */}
          <SkeletonBox height={140} borderRadius={12} style={{ marginBottom: 20 }} />
          {/* Section title */}
          <SkeletonLine width="30%" style={{ marginBottom: 12 }} />
          {/* Question cards */}
          <SkeletonBox height={70} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonBox height={70} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonBox height={70} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!testResponse) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#01B2FE' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#01B2FE" />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: '#FFFFFF' }]}>←</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Assessment Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: '#FFFFFF' }]}>No assessment found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const scoredQuestions = questions.filter(q => q.isScored);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#01B2FE' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#01B2FE" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: '#FFFFFF' }]}>←</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Assessment Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: '#FFFFFF', borderColor: colors.cardBorder }]}>
          <Text style={[styles.infoTitle, { color: '#111827' }]}>Your Founder Assessment</Text>
          <Text style={[styles.infoSubtitle, { color: '#6B7280' }]}>
            Review your answers and track your progress
          </Text>
        </View>

        {/* Score Comparison Card */}
        {initialAssessment && userScores && (
          <View style={[styles.scoreCard, { backgroundColor: '#FFFFFF', borderColor: colors.cardBorder }]}>
            <Text style={[styles.scoreCardTitle, { color: '#111827' }]}>Your Scores</Text>
            <View style={styles.scoresRow}>
              {/* Initial Assessment Score */}
              <View style={styles.scoreItem}>
                <Text style={[styles.scoreLabel, { color: '#6B7280' }]}>Initial Score</Text>
                <Text style={[styles.scoreValue, { color: '#111827' }]}>{initialAssessment.base_score}</Text>
                <View style={[styles.scoreBandPill, { backgroundColor: '#E5E7EB' }]}>
                  <Text style={[styles.scoreBandText, { color: '#374151' }]}>
                    {getScoreBandLabel(initialAssessment.score_band as any)}
                  </Text>
                </View>
              </View>

              {/* Arrow - show if scores are different */}
              {userScores.current_score !== initialAssessment.base_score && (
                <View style={styles.scoreArrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              )}

              {/* Current Score (includes lessons + streaks) - only show if different */}
              {userScores.current_score !== initialAssessment.base_score && (
                <View style={styles.scoreItem}>
                  <Text style={[styles.scoreLabel, { color: '#6B7280' }]}>Current Score</Text>
                  <Text style={[styles.scoreValue, { color: '#111827' }]}>{userScores.current_score}</Text>
                  <View style={[styles.scoreBandPill, { backgroundColor: '#01B2FE' }]}>
                    <Text style={[styles.scoreBandText, { color: '#FFFFFF' }]}>
                      {getScoreBandLabel(userScores.current_score_band as any)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Score Change */}
            {userScores.current_score !== initialAssessment.base_score && (
              <View style={[
                styles.scoreChangeContainer,
                { backgroundColor: userScores.current_score > initialAssessment.base_score ? 'rgba(255, 122, 26, 0.15)' : 'rgba(239, 68, 68, 0.1)' }
              ]}>
                <Text style={[
                  styles.scoreChangeText,
                  { color: userScores.current_score > initialAssessment.base_score ? '#FF7A1A' : '#EF4444' }
                ]}>
                  {userScores.current_score > initialAssessment.base_score
                    ? `+${userScores.current_score - initialAssessment.base_score} points improvement!`
                    : `${userScores.current_score - initialAssessment.base_score} points`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* How Score Works */}
        <View style={[styles.explanationCard, { backgroundColor: '#FFFFFF', borderColor: colors.cardBorder }]}>
          <Text style={[styles.explanationTitle, { color: '#111827' }]}>How Your Score Works</Text>

          <View style={styles.explanationItem}>
            <Image source={require('@/assets/images/earnings.png')} style={styles.explanationImage} />
            <View style={styles.explanationContent}>
              <Text style={[styles.explanationHeading, { color: '#111827' }]}>Earning Points</Text>
              <Text style={[styles.explanationText, { color: '#6B7280' }]}>
                Your Founder Score grows as you learn. Each lesson you complete adds 1 point to your score.
              </Text>
            </View>
          </View>

          <View style={styles.explanationItem}>
            <Text style={styles.explanationIcon}>🔥</Text>
            <View style={styles.explanationContent}>
              <Text style={[styles.explanationHeading, { color: '#111827' }]}>Streak Bonus</Text>
              <Text style={[styles.explanationText, { color: '#6B7280' }]}>
                Complete lessons on consecutive days to build a streak. Every 3 days of streak gives you +1 bonus point per lesson!
              </Text>
            </View>
          </View>

          <View style={styles.explanationItem}>
            <Image source={require('@/assets/images/time.png')} style={styles.explanationImage} />
            <View style={styles.explanationContent}>
              <Text style={[styles.explanationHeading, { color: '#111827' }]}>Grace Period</Text>
              <Text style={[styles.explanationText, { color: '#6B7280' }]}>
                Miss a day? No worries! You have a 1-day grace period to keep your streak alive.
              </Text>
            </View>
          </View>

          <View style={styles.explanationItem}>
            <Image source={require('@/assets/images/champion.png')} style={styles.explanationImage} />
            <View style={styles.explanationContent}>
              <Text style={[styles.explanationHeading, { color: '#111827' }]}>Score Bands</Text>
              <Text style={[styles.explanationText, { color: '#6B7280' }]}>
                Your score determines your band:{'\n'}• 0-40: Early Stage{'\n'}• 41-70: Developing{'\n'}• 71-90: Strong{'\n'}• 91-100: Founder Ready!
              </Text>
            </View>
          </View>
        </View>

        {/* Retake Assessment Card */}
        <View style={[styles.retakeCard, { backgroundColor: '#FFFFFF', borderColor: colors.cardBorder }]}>
          <Text style={[styles.retakeTitle, { color: '#111827' }]}>Retake Assessment</Text>
          {canRetakeAssessment ? (
            <>
              <Text style={[styles.retakeText, { color: '#6B7280' }]}>
                You've completed {lessonsSinceLastAssessment} lessons since your last assessment! You can now retake it to see how much you've improved.
              </Text>
              <Pressable style={styles.retakeButton} onPress={handleRetakeAssessment}>
                <Text style={styles.retakeButtonText}>Retake Assessment</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.retakeText, { color: '#6B7280' }]}>
              Complete {lessonsRemaining} more lesson{lessonsRemaining !== 1 ? 's' : ''} to unlock the ability to retake your assessment and measure your progress.
            </Text>
          )}
        </View>

        {/* Section Label */}
        <Text style={[styles.sectionLabel, { color: '#111827' }]}>Your Answers</Text>

        {/* Questions List */}
        {scoredQuestions.map((question, index) => {
          const questionKey = `q${index + 1}` as keyof TestResponse;
          const answer = testResponse[questionKey];

          return (
            <View
              key={question.id}
              style={[styles.questionCard, { backgroundColor: '#FFFFFF', borderColor: colors.cardBorder }]}
            >
              <View style={styles.questionHeader}>
                <View style={[styles.questionNumber, { backgroundColor: colors.primary }]}>
                  <Text style={styles.questionNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.questionText, { color: '#111827' }]}>{question.question}</Text>
              </View>

              <View style={styles.answerContainer}>
                <Text style={[styles.answerLabel, { color: '#6B7280' }]}>Your answer:</Text>
                <View style={[styles.answerBadge, { backgroundColor: '#01B2FE' }]}>
                  <Text style={[styles.answerText, { color: '#FFFFFF' }]}>{answer}</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Preference Question */}
        <View style={[styles.questionCard, { backgroundColor: '#FFFFFF', borderColor: colors.cardBorder }]}>
          <View style={styles.questionHeader}>
            <View style={[styles.questionNumber, { backgroundColor: colors.textSecondary }]}>
              <Text style={styles.questionNumberText}>P</Text>
            </View>
            <Text style={[styles.questionText, { color: '#111827' }]}>Preferred learning format</Text>
          </View>

          <View style={styles.answerContainer}>
            <Text style={[styles.answerLabel, { color: '#6B7280' }]}>Your preference:</Text>
            <View style={[styles.answerBadge, { backgroundColor: '#01B2FE' }]}>
              <Text style={[styles.answerText, { color: '#FFFFFF' }]}>{testResponse.q10}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#01B2FE',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-SemiBold',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
  },
  scoreCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  scoreCardTitle: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 8,
  },
  scoreBandPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBandText: {
    fontSize: 10,
    fontFamily: 'HostGrotesk-SemiBold',
    textTransform: 'uppercase',
  },
  scoreArrow: {
    paddingHorizontal: 16,
  },
  arrowText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  scoreChangeContainer: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  scoreChangeText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    textAlign: 'center',
  },
  explanationCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  explanationTitle: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 16,
  },
  explanationItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  explanationIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
  },
  explanationImage: {
    width: 28,
    height: 28,
    marginRight: 12,
  },
  explanationContent: {
    flex: 1,
  },
  explanationHeading: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-SemiBold',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    marginBottom: 12,
  },
  questionCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionNumberText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'HostGrotesk-Medium',
    lineHeight: 22,
  },
  answerContainer: {
    marginLeft: 40,
  },
  answerLabel: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    marginBottom: 6,
  },
  answerBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  answerText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
  },
  bottomSpacer: {
    height: 20,
  },
  retakeCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  retakeTitle: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 8,
  },
  retakeText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    lineHeight: 20,
  },
  retakeButton: {
    backgroundColor: '#01B2FE',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  retakeButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
});
