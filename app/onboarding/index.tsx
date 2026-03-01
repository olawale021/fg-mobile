import { View, Text, StyleSheet, Pressable, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function OnboardingScreen1() {
  const handleNext = () => {
    router.push('/onboarding/step2');
  };

  const handleSkip = () => {
    router.push('/test-intro');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image
              source={require('../../assets/logos/Podium_Mark_TranspBG.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>Welcome to{'\n'}Podium</Text>
            <Text style={styles.description}>
              An institute for people starting from zero, teaching first-time founders how to think, speak, and operate with discipline.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#01B2FE',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'HostGrotesk-Medium',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  imageContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logo: {
    width: 280,
    height: 200,
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
    paddingHorizontal: 32,
    paddingBottom: 32,
    gap: 24,
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
    color: '#01B2FE',
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
