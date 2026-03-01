import { useState } from 'react';
import { View, StyleSheet, Pressable, Text, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTestStore } from '@/store/test-store';
import { useResultsStore } from '@/store/results-store';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { questions } from '@/lib/questions';
import QuestionCard from '@/components/question-card';
import { calculateScore } from '@/lib/scoring';
import { analyzeWeakAreas } from '@/lib/weak-areas';
import { LearningFormat, TestAnswers } from '@/types';

export default function TestQuestionScreen() {
  const { questionId } = useLocalSearchParams<{ questionId: string }>();
  const currentQuestionIndex = parseInt(questionId) - 1;
  const question = questions[currentQuestionIndex];

  const { user } = useAuth();
  const { answers, isRetake, setAnswer, resetTest } = useTestStore();
  const { setScoreResult, setRetakeData } = useResultsStore();
  const selectedValue = answers[question.id];
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = (value: number | string) => {
    setAnswer(question.id, value as number | LearningFormat);
  };

  // Helper to get answer label from question options
  const getAnswerLabel = (questionId: string, answerValue: any): string => {
    const q = questions.find(q => q.id === questionId);
    if (!q) return String(answerValue);
    const option = q.options.find(opt => opt.value === answerValue);
    return option ? option.label : String(answerValue);
  };

  const handleNext = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      router.push(`/test/${currentQuestionIndex + 2}`);
    } else {
      // Calculate score before navigating
      const scoreResult = calculateScore(answers as TestAnswers);
      setScoreResult(scoreResult);

      // Check if this is a retake by a logged-in user
      if (isRetake && user) {
        setIsSubmitting(true);
        try {
          // Fetch user profile data for required fields + current scores
          const { data: userProfile } = await supabase
            .from('users')
            .select('first_name, last_name, location, latest_score, base_score')
            .eq('id', user.id)
            .single();

          // Fetch previous assessment with all answers
          const { data: previousAssessment } = await supabase
            .from('test_responses')
            .select('base_score, score_band, attempt_number, q1, q2, q3, q4, q5, q6, q7, q8, q9, q10')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Fetch current completed lessons count for tracking
          const { count: completedLessonsCount } = await supabase
            .from('user_lesson_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'completed');

          const attemptNumber = (previousAssessment?.attempt_number || 1) + 1;
          const previousAssessmentScore = previousAssessment?.base_score || 0;

          // Get current latest_score (includes lesson points)
          const currentLatestScore = userProfile?.latest_score ?? userProfile?.base_score ?? 0;

          // Calculate lesson points earned (current score - previous assessment score)
          const lessonPoints = Math.max(0, currentLatestScore - previousAssessmentScore);

          // New latest_score = new assessment score + lesson points (capped at 100)
          const newLatestScore = Math.min(100, scoreResult.baseScore + lessonPoints);

          // Determine new score band
          const newScoreBand = newLatestScore <= 40 ? 'early-stage'
            : newLatestScore <= 70 ? 'developing'
            : newLatestScore <= 90 ? 'strong'
            : 'ready';

          // Score change for results display (compared to previous latest_score)
          const scoreChangeFromLatest = newLatestScore - currentLatestScore;

          // Save retake test_response with NEW answers + PREVIOUS answers
          const { data: testResponseData, error: insertError } = await supabase.from('test_responses').insert({
            user_id: user.id,
            email: user.email,
            first_name: userProfile?.first_name || '',
            last_name: userProfile?.last_name || '',
            location: userProfile?.location || '',
            // NEW answers
            q1: getAnswerLabel('q1', answers.q1),
            q1_label: getAnswerLabel('q1', answers.q1),
            q2: getAnswerLabel('q2', answers.q2),
            q2_label: getAnswerLabel('q2', answers.q2),
            q3: getAnswerLabel('q3', answers.q3),
            q3_label: getAnswerLabel('q3', answers.q3),
            q4: getAnswerLabel('q4', answers.q4),
            q4_label: getAnswerLabel('q4', answers.q4),
            q5: getAnswerLabel('q5', answers.q5),
            q5_label: getAnswerLabel('q5', answers.q5),
            q6: getAnswerLabel('q6', answers.q6),
            q6_label: getAnswerLabel('q6', answers.q6),
            q7: getAnswerLabel('q7', answers.q7),
            q7_label: getAnswerLabel('q7', answers.q7),
            q8: getAnswerLabel('q8', answers.q8),
            q8_label: getAnswerLabel('q8', answers.q8),
            q9: getAnswerLabel('q9', answers.q9),
            q9_label: getAnswerLabel('q9', answers.q9),
            q10: getAnswerLabel('q10', answers.q10),
            q10_label: getAnswerLabel('q10', answers.q10),
            base_score: scoreResult.baseScore,
            score_band: scoreResult.scoreBand,
            // Retake metadata
            is_retake: true,
            attempt_number: attemptNumber,
            previous_score: currentLatestScore,  // Store previous latest_score (with lesson points)
            previous_score_band: previousAssessment?.score_band,
            score_change: scoreChangeFromLatest,
            lessons_completed_at_assessment: completedLessonsCount || 0,
            // PREVIOUS answers
            prev_q1: previousAssessment?.q1,
            prev_q2: previousAssessment?.q2,
            prev_q3: previousAssessment?.q3,
            prev_q4: previousAssessment?.q4,
            prev_q5: previousAssessment?.q5,
            prev_q6: previousAssessment?.q6,
            prev_q7: previousAssessment?.q7,
            prev_q8: previousAssessment?.q8,
            prev_q9: previousAssessment?.q9,
            prev_q10: previousAssessment?.q10,
          })
          .select()
          .single();

          if (insertError) {
            console.error('Error saving retake test response:', insertError);
          }

          // Update users table with calculated latest score (assessment + lesson points)
          await supabase.from('users').update({
            latest_score: newLatestScore,
            latest_score_band: newScoreBand,
            assessment_count: attemptNumber,
          }).eq('id', user.id);

          // Analyze weak areas with new answers
          if (testResponseData) {
            try {
              const answersForAnalysis = {
                q1: getAnswerLabel('q1', answers.q1),
                q2: getAnswerLabel('q2', answers.q2),
                q3: getAnswerLabel('q3', answers.q3),
                q4: getAnswerLabel('q4', answers.q4),
                q5: getAnswerLabel('q5', answers.q5),
                q6: getAnswerLabel('q6', answers.q6),
                q7: getAnswerLabel('q7', answers.q7),
                q8: getAnswerLabel('q8', answers.q8),
                q9: getAnswerLabel('q9', answers.q9),
              };
              await analyzeWeakAreas(user.id, testResponseData.id, answersForAnalysis);
            } catch (weakAreasError) {
              console.error('Error analyzing weak areas:', weakAreasError);
            }
          }

          // Set retake data in results store for display (uses previous latest_score)
          setRetakeData(true, currentLatestScore, scoreChangeFromLatest, newLatestScore, newScoreBand);

          // Reset test store and navigate to results
          resetTest();
          router.replace('/results');
        } catch (error) {
          console.error('Error processing retake:', error);
          setIsSubmitting(false);
        }
      } else if (scoreResult.baseScore >= 87) {
        // High scorer - skip signup
        router.replace('/results');
      } else {
        // First time user - go to signup
        router.push('/user-info');
      }
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      router.back();
    } else {
      router.back(); // Go to test intro
    }
  };

  const canProceed = selectedValue !== undefined;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <QuestionCard
          question={question}
          currentQuestion={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          selectedValue={selectedValue}
          onSelect={handleSelect}
        />
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, styles.backButton]}
          onPress={handleBack}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.nextButton, (!canProceed || isSubmitting) && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canProceed || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#01B2FE" />
          ) : (
            <Text style={styles.nextButtonText}>
              {currentQuestionIndex === questions.length - 1 ? 'Continue' : 'Next'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#01B2FE',
  },
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  nextButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#01B2FE',
  },
});
