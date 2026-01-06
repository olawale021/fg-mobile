import { useState, useEffect } from 'react';
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
  Modal,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { COUNTRIES } from '@/lib/constants';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  location: string;
}

export default function EditProfileScreen() {
  const { user, updateEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    location: '',
  });
  const [originalEmail, setOriginalEmail] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileData, string>>>({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('first_name, last_name, email, location')
        .eq('id', user.id)
        .single();

      if (data) {
        setFormData({
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          email: data.email || user.email || '',
          location: data.location || '',
        });
        setOriginalEmail(data.email || user.email || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileData, string>> = {};

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

    if (!formData.location) {
      newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;

    setSaving(true);

    try {
      // Update profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          location: formData.location,
        })
        .eq('id', user.id);

      if (profileError) {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
        setSaving(false);
        return;
      }

      // Check if email changed
      if (formData.email.toLowerCase() !== originalEmail.toLowerCase()) {
        const { error: emailError, requiresConfirmation } = await updateEmail(formData.email);

        if (emailError) {
          Alert.alert('Email Update Failed', emailError.message);
          setSaving(false);
          return;
        }

        if (requiresConfirmation) {
          Alert.alert(
            'Verify New Email',
            `We've sent a confirmation link to ${formData.email}. Please check your inbox to verify your new email address.`,
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
      }

      Alert.alert('Success', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      console.error('Save profile error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Edit Profile</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                value={formData.firstName}
                onChangeText={(text) => {
                  setFormData({ ...formData, firstName: text });
                  if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                }}
                placeholder="Enter your first name"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="words"
                editable={!saving}
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                value={formData.lastName}
                onChangeText={(text) => {
                  setFormData({ ...formData, lastName: text });
                  if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                }}
                placeholder="Enter your last name"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                autoCapitalize="words"
                editable={!saving}
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(text) => {
                  setFormData({ ...formData, email: text });
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              {formData.email.toLowerCase() !== originalEmail.toLowerCase() && (
                <Text style={styles.infoText}>
                  Changing your email will require verification
                </Text>
              )}
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <Pressable
                style={[styles.input, styles.selectInput, errors.location && styles.inputError]}
                onPress={() => !saving && setShowCountryPicker(true)}
              >
                <Text
                  style={[
                    styles.selectText,
                    !formData.location && styles.placeholderText,
                  ]}
                >
                  {formData.location || 'Select your country'}
                </Text>
                <Text style={styles.selectArrow}>▼</Text>
              </Pressable>
              {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
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
                <Text style={styles.saveButtonText}>Save Changes</Text>
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
                    formData.location === item && styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, location: item });
                    if (errors.location) setErrors({ ...errors, location: undefined });
                    setShowCountryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.countryText,
                      formData.location === item && styles.countryTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {formData.location === item && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#192B47',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 32,
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
  inputError: {
    borderColor: '#EF4444',
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  selectArrow: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FCA5A5',
    marginTop: 6,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
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
    fontSize: 18,
    fontFamily: 'HostGrotesk-Bold',
    color: '#192B47',
  },
  modalClose: {
    fontSize: 20,
    color: '#6B7280',
    padding: 4,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  countryItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  countryText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#374151',
  },
  countryTextSelected: {
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#192B47',
  },
  checkmark: {
    fontSize: 18,
    color: '#192B47',
    fontFamily: 'HostGrotesk-Bold',
  },
});
