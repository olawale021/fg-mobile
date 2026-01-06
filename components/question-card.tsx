import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Question } from '@/types';

interface QuestionCardProps {
  question: Question;
  currentQuestion: number;
  totalQuestions: number;
  selectedValue: number | string | undefined;
  onSelect: (value: number | string) => void;
}

export default function QuestionCard({
  question,
  currentQuestion,
  totalQuestions,
  selectedValue,
  onSelect,
}: QuestionCardProps) {
  const progressPercentage = (currentQuestion / totalQuestions) * 100;

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            Question {currentQuestion} of {totalQuestions}
          </Text>
          <Text style={styles.progressPercentage}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progressPercentage}%` }]}
          />
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{question.question}</Text>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option) => (
          <Pressable
            key={String(option.value)}
            style={[
              styles.option,
              selectedValue === option.value && styles.optionSelected,
            ]}
            onPress={() => onSelect(option.value)}
          >
            <View
              style={[
                styles.radio,
                selectedValue === option.value && styles.radioSelected,
              ]}
            >
              {selectedValue === option.value && (
                <View style={styles.radioInner} />
              )}
            </View>
            <Text style={styles.optionText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  progressContainer: {
    marginBottom: 32,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  progressPercentage: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Medium',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  question: {
    fontSize: 28,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 32,
    lineHeight: 36,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  optionSelected: {
    borderColor: '#192B47',
    backgroundColor: '#FFFFFF',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#192B47',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#192B47',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#192B47',
    flex: 1,
  },
});
