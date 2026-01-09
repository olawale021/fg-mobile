import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePasswordScreen() {
  const { updatePassword, verifyPassword } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [formData, setFormData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PasswordData, string>>>({});

  const getPasswordRequirements = () => {
    const password = formData.newPassword;
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  };

  const isPasswordValid = () => {
    const requirements = getPasswordRequirements();
    return (
      requirements.minLength &&
      requirements.hasUpperCase &&
      requirements.hasLowerCase &&
      requirements.hasNumber
    );
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PasswordData, string>> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!isPasswordValid()) {
      newErrors.newPassword = 'Password does not meet requirements';
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);

    try {
      // First verify the current password
      const { error: verifyError } = await verifyPassword(formData.currentPassword);

      if (verifyError) {
        setErrors({ ...errors, currentPassword: 'Current password is incorrect' });
        setSaving(false);
        return;
      }

      // If verification passed, update the password
      const { error } = await updatePassword(formData.newPassword);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to update password. Please try again.');
        setSaving(false);
        return;
      }

      Alert.alert('Success', 'Your password has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('Change password error:', error);
    } finally {
      setSaving(false);
    }
  };

  const PasswordRequirement = ({
    met,
    text,
  }: {
    met: boolean;
    text: string;
  }) => (
    <View style={styles.requirementRow}>
      <Text style={[styles.requirementIcon, met && styles.requirementMet]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[styles.requirementText, met && styles.requirementMet]}>{text}</Text>
    </View>
  );

  const requirements = getPasswordRequirements();
  const showRequirements = passwordFocused || formData.newPassword.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
            <Text style={styles.title}>Change Password</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Create a strong password with at least 8 characters including uppercase,
              lowercase, and numbers.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Current Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.currentPassword && styles.inputError]}
                  value={formData.currentPassword}
                  onChangeText={(text) => {
                    setFormData({ ...formData, currentPassword: text });
                    if (errors.currentPassword) setErrors({ ...errors, currentPassword: undefined });
                  }}
                  placeholder="Enter current password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  editable={!saving}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  <Text style={styles.eyeIcon}>{showCurrentPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {errors.currentPassword && <Text style={styles.errorText}>{errors.currentPassword}</Text>}
            </View>

            {/* New Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.newPassword && styles.inputError]}
                  value={formData.newPassword}
                  onChangeText={(text) => {
                    setFormData({ ...formData, newPassword: text });
                    if (errors.newPassword) setErrors({ ...errors, newPassword: undefined });
                  }}
                  placeholder="Enter new password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  editable={!saving}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <Text style={styles.eyeIcon}>{showNewPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}

              {/* Password Requirements */}
              {showRequirements && (
                <View style={styles.requirements}>
                  <PasswordRequirement met={requirements.minLength} text="At least 8 characters" />
                  <PasswordRequirement met={requirements.hasUpperCase} text="One uppercase letter" />
                  <PasswordRequirement met={requirements.hasLowerCase} text="One lowercase letter" />
                  <PasswordRequirement met={requirements.hasNumber} text="One number" />
                </View>
              )}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.confirmPassword && styles.inputError]}
                  value={formData.confirmPassword}
                  onChangeText={(text) => {
                    setFormData({ ...formData, confirmPassword: text });
                    if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                  }}
                  placeholder="Confirm new password"
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!saving}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                </Pressable>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <Pressable
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#192B47" />
              ) : (
                <Text style={styles.saveButtonText}>Update Password</Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: '#192B47',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Medium',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  eyeIcon: {
    fontSize: 20,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FCA5A5',
    marginTop: 6,
  },
  requirements: {
    marginTop: 12,
    gap: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementIcon: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  requirementText: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  requirementMet: {
    color: '#10B981',
  },
  buttons: {
    marginTop: 32,
    gap: 12,
  },
  saveButton: {
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
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#192B47',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
