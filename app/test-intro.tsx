import { View, Text, StyleSheet, Pressable, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const reportCardIcon = require('../assets/images/report-card.png');

export default function TestIntroScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Image source={reportCardIcon} style={styles.icon} />
        </View>

        <Text style={styles.title}>Quick Assessment</Text>

        <Text style={styles.description}>
          We'll ask you 9 quick questions to understand where you are in your founder journey.
          This helps us personalize your learning experience.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What to expect:</Text>
          <Text style={styles.infoItem}>• 9 questions about your startup</Text>
          <Text style={styles.infoItem}>• Takes about 2-3 minutes</Text>
          <Text style={styles.infoItem}>• No right or wrong answers</Text>
          <Text style={styles.infoItem}>• Get your founder readiness score</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/test/1')}
        >
          <Text style={styles.primaryButtonText}>Start Assessment</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
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
    width: 48,
    height: 48,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#01B2FE',
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#01B2FE',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
});
