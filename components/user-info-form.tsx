import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, Modal, FlatList } from 'react-native';
import { UserInfo } from '@/types';
import { COUNTRIES } from '@/lib/constants';

interface UserInfoFormProps {
  onSubmit: (userInfo: UserInfo) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

interface PasswordRequirementProps {
  met: boolean;
  text: string;
}

function PasswordRequirement({ met, text }: PasswordRequirementProps) {
  return (
    <View style={styles.requirementRow}>
      <Text style={[styles.requirementIcon, met && styles.requirementIconMet]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
        {text}
      </Text>
    </View>
  );
}

export default function UserInfoForm({
  onSubmit,
  onBack,
  isSubmitting = false
}: UserInfoFormProps) {
  const [formData, setFormData] = useState<UserInfo>({
    firstName: '',
    lastName: '',
    email: '',
    location: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof UserInfo, string>>>({});
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const getPasswordRequirements = () => {
    const password = formData.password;
    return {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
    };
  };

  const isPasswordValid = () => {
    const requirements = getPasswordRequirements();
    return requirements.minLength && requirements.hasUpperCase &&
           requirements.hasLowerCase && requirements.hasNumber;
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof UserInfo, string>> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Country is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isPasswordValid()) {
      newErrors.password = 'Password does not meet requirements';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <Text style={styles.title}>Almost done!</Text>
        <Text style={styles.subtitle}>
          Enter your details to create your account and see your results.
        </Text>
      </View>

      {/* First Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={[styles.input, errors.firstName && styles.inputError]}
          placeholder="John"
          value={formData.firstName}
          onChangeText={(text) => setFormData({ ...formData, firstName: text })}
          autoCapitalize="words"
          editable={!isSubmitting}
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
      </View>

      {/* Last Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={[styles.input, errors.lastName && styles.inputError]}
          placeholder="Doe"
          value={formData.lastName}
          onChangeText={(text) => setFormData({ ...formData, lastName: text })}
          autoCapitalize="words"
          editable={!isSubmitting}
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
      </View>

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="john@example.com"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isSubmitting}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      {/* Country */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Country</Text>
        <Pressable
          style={[styles.input, errors.location && styles.inputError, styles.pickerButton]}
          onPress={() => !isSubmitting && setShowCountryPicker(true)}
          disabled={isSubmitting}
        >
          <Text style={[styles.pickerButtonText, !formData.location && styles.placeholderText]}>
            {formData.location || 'Select your country'}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </Pressable>
        {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
      </View>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <Pressable onPress={() => setShowCountryPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.countryItem,
                    formData.location === item && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, location: item });
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={[
                    styles.countryItemText,
                    formData.location === item && styles.countryItemTextSelected
                  ]}>
                    {item}
                  </Text>
                  {formData.location === item && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Password */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.passwordInput, errors.password && styles.inputError]}
            placeholder="Create a secure password"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isSubmitting}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
          />
          <Pressable
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
          </Pressable>
        </View>

        {/* Live Password Requirements */}
        {(passwordFocused || formData.password) && (
          <View style={styles.passwordRequirements}>
            <PasswordRequirement
              met={getPasswordRequirements().minLength}
              text="At least 8 characters"
            />
            <PasswordRequirement
              met={getPasswordRequirements().hasUpperCase}
              text="One uppercase letter"
            />
            <PasswordRequirement
              met={getPasswordRequirements().hasLowerCase}
              text="One lowercase letter"
            />
            <PasswordRequirement
              met={getPasswordRequirements().hasNumber}
              text="One number"
            />
          </View>
        )}
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.backButton]}
          onPress={onBack}
          disabled={isSubmitting}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.submitButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Creating Account...' : 'See My Results'}
          </Text>
        </Pressable>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  chevron: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalClose: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  countryItemSelected: {
    backgroundColor: '#F3F4F6',
  },
  countryItemText: {
    fontSize: 16,
    color: '#111827',
  },
  countryItemTextSelected: {
    fontWeight: '600',
    color: '#01B2FE',
  },
  checkmark: {
    fontSize: 18,
    color: '#01B2FE',
    fontWeight: '600',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    padding: 12,
    paddingRight: 48,
    fontSize: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeIconText: {
    fontSize: 20,
  },
  passwordRequirements: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementIcon: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
  },
  requirementIconMet: {
    color: '#FF7A1A',
  },
  requirementText: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  requirementTextMet: {
    color: '#FF7A1A',
    fontWeight: '500',
    opacity: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#FCA5A5',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  submitButton: {
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
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#01B2FE',
  },
});
