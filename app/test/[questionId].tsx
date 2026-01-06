import { View, StyleSheet, Pressable, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTestStore } from '@/store/test-store';
import { questions } from '@/lib/questions';
import QuestionCard from '@/components/question-card';
import { LearningFormat } from '@/types';

export default function TestQuestionScreen() {
  const { questionId } = useLocalSearchParams<{ questionId: string }>();
  const currentQuestionIndex = parseInt(questionId) - 1;
  const question = questions[currentQuestionIndex];

  const { answers, setAnswer } = useTestStore();
  const selectedValue = answers[question.id];

  const handleSelect = (value: number | string) => {
    setAnswer(question.id, value as number | LearningFormat);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      router.push(`/test/${currentQuestionIndex + 2}`);
    } else {
      router.push('/user-info');
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
          style={[styles.button, styles.nextButton, !canProceed && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex === questions.length - 1 ? 'Continue' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#192B47',
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
    color: '#192B47',
  },
});
