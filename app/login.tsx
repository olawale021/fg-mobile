import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';

const logo = require('../assets/logos/Podium_Mark_TranspBG.png');
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }

    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      Alert.alert('Login Failed', error.message);
      setLoading(false);
      return;
    }

    // Navigation is handled by AuthContext and dashboard
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#01B2FE" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Image source={logo} style={styles.logo} />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue your journey</Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  editable={!loading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Coming Soon', 'Password reset will be available soon')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>

            <Pressable
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>New to Podium?</Text>
            <Pressable onPress={() => router.push('/onboarding')}>
              <Text style={styles.signupLink}>Take the Assessment</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#01B2FE',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  eyeIcon: {
    fontSize: 20,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#01B2FE',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.7,
    paddingHorizontal: 16,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  signupText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  signupLink: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
