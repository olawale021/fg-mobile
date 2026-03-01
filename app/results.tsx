import { View, Text, StyleSheet, Pressable, StatusBar, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useResultsStore } from '@/store/results-store';
import { getScoreBandLabel, getScoreBandDescription } from '@/lib/scoring';

export default function ResultsScreen() {
  const { scoreResult, isRetake, previousScore, scoreChange, currentScore, currentScoreBand, clearResults } = useResultsStore();

  const handleContinue = () => {
    // Navigate to dashboard first, then clear results
    router.replace('/(tabs)');
    // Clear results after navigation starts
    setTimeout(() => clearResults(), 100);
  };

  const handleBackToStart = () => {
    // Navigate back to the start for high scorers
    router.replace('/');
    // Clear results after navigation starts
    setTimeout(() => clearResults(), 100);
  };

  // If no score result, redirect back to test
  if (!scoreResult) {
    router.replace('/test-intro');
    return null;
  }

  const { baseScore, scoreBand } = scoreResult;
  // For retakes, use currentScore (includes lesson points), otherwise use assessment baseScore
  const displayScore = isRetake && currentScore !== null ? currentScore : baseScore;
  const displayBand = isRetake && currentScoreBand !== null ? currentScoreBand : scoreBand;
  const isHighScorer = baseScore >= 87 && !isRetake; // High scorer logic only for first-time users

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Image
              source={require('@/assets/images/congratulatiobns.png')}
              style={styles.iconImage}
            />
          </View>

          <Text style={styles.title}>Your Founder Score</Text>

        <View style={styles.scoreContainer}>
          <Text style={styles.score}>{displayScore}</Text>
          <Text style={styles.scoreLabel}>out of 100</Text>
        </View>

        <View style={styles.bandContainer}>
          <Text style={styles.bandLabel}>{getScoreBandLabel(displayBand)}</Text>
          <Text style={styles.bandDescription}>
            {getScoreBandDescription(displayBand)}
          </Text>
        </View>

        {/* Score Comparison Card for Retakes */}
        {isRetake && previousScore !== null && scoreChange !== null && (
          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonTitle}>Score Comparison</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Previous</Text>
                <Text style={styles.comparisonValue}>{previousScore}</Text>
              </View>
              <View style={styles.comparisonArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>Current</Text>
                <Text style={styles.comparisonValue}>{displayScore}</Text>
              </View>
            </View>
            <View style={[
              styles.changeContainer,
              { backgroundColor: scoreChange > 0 ? 'rgba(255, 122, 26, 0.2)' : scoreChange < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)' }
            ]}>
              <Text style={[
                styles.changeText,
                { color: scoreChange > 0 ? '#FF7A1A' : scoreChange < 0 ? '#EF4444' : '#FFFFFF' }
              ]}>
                {scoreChange > 0 ? `+${scoreChange} points improvement!` :
                 scoreChange < 0 ? `${scoreChange} points` : 'Same score'}
              </Text>
            </View>
          </View>
        )}

        {isRetake ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>
              {scoreChange !== null && scoreChange > 0 ? 'Great progress!' : 'Assessment Complete'}
            </Text>
            <Text style={styles.infoText}>
              {scoreChange !== null && scoreChange > 0
                ? 'Your hard work is paying off! Keep learning to continue improving your founder skills.'
                : 'Continue your learning journey to strengthen your founder skills.'}
            </Text>
          </View>
        ) : isHighScorer ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>You're already founder-ready!</Text>
            <Text style={styles.infoText}>
              Your score indicates you've already developed the core competencies we teach.
              You don't need our course - you're ahead of most founders we work with.
            </Text>
            <Text style={[styles.infoText, { marginTop: 12 }]}>
              If you'd like to stay connected, follow us on social media or check our website for advanced resources.
            </Text>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>What's next?</Text>
            <Text style={styles.infoText}>
              We've personalized your learning journey based on your assessment.
              Start exploring curated content to strengthen your founder skills.
            </Text>
          </View>
        )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {isHighScorer && !isRetake ? (
          <Pressable
            style={styles.continueButton}
            onPress={handleBackToStart}
          >
            <Text style={styles.continueButtonText}>Back to Start</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#01B2FE',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  iconImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
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
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
    fontFamily: 'HostGrotesk-Medium',
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
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bandDescription: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
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
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
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
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#01B2FE',
  },
  comparisonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 24,
  },
  comparisonTitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
  },
  comparisonArrow: {
    paddingHorizontal: 24,
  },
  arrowText: {
    fontSize: 24,
    color: '#FFFFFF',
    opacity: 0.5,
  },
  changeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
  },
  changeText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    textAlign: 'center',
  },
});
