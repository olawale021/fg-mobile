import { View, Text, StyleSheet, Pressable, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useResultsStore } from '@/store/results-store';
import { getScoreBandLabel, getScoreBandDescription } from '@/lib/scoring';

export default function ResultsScreen() {
  const { scoreResult } = useResultsStore();

  const handleContinue = () => {
    // Navigate to dashboard or home screen
    router.replace('/(tabs)');
  };

  // If no score result, redirect back to test
  if (!scoreResult) {
    router.replace('/test-intro');
    return null;
  }

  const { baseScore, scoreBand } = scoreResult;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎉</Text>
        </View>

        <Text style={styles.title}>Your Founder Score</Text>

        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{baseScore}</Text>
          <Text style={styles.scoreLabel}>out of 100</Text>
        </View>

        <View style={styles.bandContainer}>
          <Text style={styles.bandLabel}>{getScoreBandLabel(scoreBand)}</Text>
          <Text style={styles.bandDescription}>
            {getScoreBandDescription(scoreBand)}
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What's next?</Text>
          <Text style={styles.infoText}>
            We've personalized your learning journey based on your assessment.
            Start exploring curated content to strengthen your founder skills.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
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
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  score: {
    fontSize: 72,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  bandContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 24,
  },
  bandLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bandDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#192B47',
  },
});
