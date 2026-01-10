import { useState } from 'react';
import { View, StyleSheet, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import UserInfoForm from '@/components/user-info-form';
import { useTestStore } from '@/store/test-store';
import { useResultsStore } from '@/store/results-store';
import { UserInfo } from '@/types';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { questions } from '@/lib/questions';
import { analyzeWeakAreas } from '@/lib/weak-areas';
import { initializeLessonQueue } from '@/lib/lesson-unlocks';
import { subscribeToMailchimp } from '@/lib/mailchimp';

export default function UserInfoScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { answers, resetTest } = useTestStore();
  const { scoreResult } = useResultsStore();
  const { signUp } = useAuth();

  const handleSubmit = async (userInfo: UserInfo) => {
    setIsSubmitting(true);

    try {
      // Score is already calculated in test screen - safety check
      if (!scoreResult || scoreResult.baseScore >= 87) {
        setIsSubmitting(false);
        router.replace('/results');
        return;
      }

      // Create user account using auth context
      const { error, requiresEmailConfirmation, email, userId } = await signUp(userInfo.email, userInfo.password, {
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        location: userInfo.location,
        base_score: scoreResult.baseScore,
        score_band: scoreResult.scoreBand,
        learning_preference: answers.q10,
      });

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
        setIsSubmitting(false);
        return;
      }

      // Check if email confirmation is required
      if (requiresEmailConfirmation) {
        Alert.alert(
          'Verify Your Email',
          `We've sent a confirmation email to ${email}. Please check your inbox and click the link to verify your account, then sign in.`,
          [{ text: 'OK', onPress: () => router.replace('/') }]
        );
        setIsSubmitting(false);
        return;
      }

      // User profile is automatically created by database trigger
      // Auth context handles session management

      // Subscribe user to Mailchimp mailing list (non-blocking)
      subscribeToMailchimp({
        email: userInfo.email,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        location: userInfo.location,
      });

      // Create test_responses record with user_id and analyze weak areas
      if (userId) {
        try {
          const getAnswerLabel = (questionId: string, answerValue: any): string => {
            const question = questions.find(q => q.id === questionId);
            if (!question) return String(answerValue);

            const option = question.options.find(opt => opt.value === answerValue);
            return option ? option.label : String(answerValue);
          };

          const { data: testResponseData, error: testResponseError } = await supabase
            .from('test_responses')
            .insert({
              user_id: userId,
            email: userInfo.email,
            first_name: userInfo.firstName,
            last_name: userInfo.lastName,
            location: userInfo.location,
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
          })
          .select()
          .single();

          if (testResponseError) {
            console.error('Error creating test response:', testResponseError);
            // Don't block the user, just log the error
          } else if (testResponseData) {
            // Analyze weak areas using the service
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

              await analyzeWeakAreas(userId, testResponseData.id, answersForAnalysis);

              // Initialize lesson queue and unlock first lesson
              await initializeLessonQueue(userId);
            } catch (weakAreasError) {
              console.error('Error analyzing weak areas or initializing queue:', weakAreasError);
              // Don't block the user, just log the error
            }
          }
        } catch (testError) {
          console.error('Failed to create test response:', testError);
          // Don't block the user, just log the error
        }
      }

      // Navigate to results screen
      router.replace('/results');
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('Sign up error:', error);
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <UserInfoForm
        onSubmit={handleSubmit}
        onBack={handleBack}
        isSubmitting={isSubmitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#192B47',
  },
});
