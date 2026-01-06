import { View, Text, StyleSheet, Pressable, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function OnboardingScreen2() {
  const handleNext = () => {
    router.push('/onboarding/step3');
  };

  const handleSkip = () => {
    router.push('/test-intro');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Skip button overlay */}
      <SafeAreaView style={styles.skipContainer}>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </SafeAreaView>

      {/* Image - top half */}
      <Image
        source={require('../../assets/images/onboarding-illustration.jpg')}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Content - bottom half */}
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>The Groundworks{'\n'}Method™</Text>
          <Text style={styles.description}>
            Learn through three proven phases: Foundations of Thinking, Practical Structure, and Communication & Presence.
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.pagination}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
          </View>

          <Pressable style={styles.button} onPress={handleNext}>
            <Text style={styles.buttonText}>Next</Text>
          </Pressable>

          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Pressable onPress={() => router.push('/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#192B47',
    fontFamily: 'HostGrotesk-Medium',
  },
  image: {
    width: '100%',
    height: '50%',
  },
  content: {
    height: '50%',
    backgroundColor: '#192B47',
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'center',
    gap: 20,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  description: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  footer: {
    gap: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
  },
  dotActive: {
    width: 24,
    opacity: 1,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#192B47',
    fontSize: 18,
    fontFamily: 'HostGrotesk-SemiBold',
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  loginText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  loginLink: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
});
