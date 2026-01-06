import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Switch, Linking, StatusBar, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { supabase } from '@/lib/supabase/client';
import { getScoreBandLabel } from '@/lib/scoring';

const LEARNING_FORMATS = [
  { id: 'lessons', label: 'Lessons', description: 'Structured learning content' },
  { id: 'articles', label: 'Articles', description: 'In-depth written content' },
  { id: 'stories', label: 'Stories', description: 'Real founder experiences' },
  { id: 'debates', label: 'Debates', description: 'Different perspectives' },
  { id: 'conversations', label: 'Conversations', description: 'Interactive discussions' },
];

interface UserProfile {
  first_name: string;
  last_name: string;
  base_score: number;
  score_band: string;
  is_premium: boolean;
}

export default function ProfileScreen() {
  const { user, signOut, deleteAccount } = useAuth();
  const { mode, setMode, isDark, colors } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showLearningFormatModal, setShowLearningFormatModal] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['lessons', 'stories']);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('users')
      .select('first_name, last_name, base_score, score_band, is_premium')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This will permanently delete your account and all associated data. This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Permanently',
                  style: 'destructive',
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      const { error } = await deleteAccount();
                      if (error) {
                        Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Something went wrong. Please try again.');
                    } finally {
                      setDeletingAccount(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const toggleLearningFormat = (formatId: string) => {
    setSelectedFormats((current) => {
      if (current.includes(formatId)) {
        // Don't allow deselecting all formats
        if (current.length === 1) return current;
        return current.filter((id) => id !== formatId);
      }
      return [...current, formatId];
    });
  };

  const getSelectedFormatsLabel = () => {
    if (selectedFormats.length === 0) return 'None selected';
    if (selectedFormats.length === LEARNING_FORMATS.length) return 'All formats';
    const labels = selectedFormats.map(
      (id) => LEARNING_FORMATS.find((f) => f.id === id)?.label
    ).filter(Boolean);
    return labels.join(', ');
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightElement
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightElement?: React.ReactNode;
  }) => (
    <Pressable
      style={[styles.settingRow, { borderBottomColor: '#E5E7EB' }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: '#192B47' }]}>{title}</Text>
          {subtitle && <Text style={[styles.settingSubtitle, { color: '#6B7280' }]}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (showArrow && <Text style={[styles.settingArrow, { color: '#6B7280' }]}>›</Text>)}
    </Pressable>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{title}</Text>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#FFFFFF' : colors.primary }]}>
            <Text style={[styles.avatarText, { color: isDark ? colors.primary : '#FFFFFF' }]}>
              {profile ? `${profile.first_name[0]}${profile.last_name[0]}` : 'U'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>
            {profile ? `${profile.first_name} ${profile.last_name}` : 'User'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>

          {profile && (
            <View style={styles.scoreContainer}>
              <View style={[styles.scoreBadge, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
                <Text style={[styles.scoreValue, { color: '#192B47' }]}>{profile.base_score}</Text>
                <Text style={[styles.scoreLabel, { color: '#6B7280' }]}>Founder Score</Text>
              </View>
              <View style={[styles.bandBadge, { backgroundColor: '#192B47' }]}>
                <Text style={[styles.bandText, { color: '#FFFFFF' }]}>
                  {getScoreBandLabel(profile.score_band as any)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Account Settings */}
        <SectionHeader title="Account" />
        <View style={[styles.section, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <SettingRow
            icon="👤"
            title="Edit Profile"
            subtitle="Update your personal information"
            onPress={() => router.push('/edit-profile')}
          />
          <SettingRow
            icon="🔒"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => router.push('/change-password')}
          />
          {profile && !profile.is_premium && (
            <SettingRow
              icon="⭐"
              title="Upgrade to Premium"
              subtitle="Unlock all content and features"
              onPress={() => Alert.alert('Premium', 'Premium features coming soon!')}
            />
          )}
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={[styles.section, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <SettingRow
            icon="🔔"
            title="Push Notifications"
            subtitle="Get notified about new content"
            showArrow={false}
            rightElement={
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            }
          />
          <SettingRow
            icon="📧"
            title="Email Updates"
            subtitle="Receive weekly learning tips"
            showArrow={false}
            rightElement={
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            }
          />
        </View>

        {/* App Preferences */}
        <SectionHeader title="Preferences" />
        <View style={[styles.section, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <SettingRow
            icon="🌙"
            title="Dark Mode"
            subtitle={mode === 'system' ? 'System default' : mode === 'dark' ? 'On' : 'Off'}
            showArrow={false}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={(value) => setMode(value ? 'dark' : 'light')}
                trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DB"
              />
            }
          />
          <SettingRow
            icon="📚"
            title="Learning Format"
            subtitle={getSelectedFormatsLabel()}
            onPress={() => setShowLearningFormatModal(true)}
          />
        </View>

        {/* Privacy & Security */}
        <SectionHeader title="Privacy & Security" />
        <View style={[styles.section, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <SettingRow
            icon="🔐"
            title="Privacy Policy"
            onPress={() => Linking.openURL('https://foundergroundworks.com/privacy')}
          />
          <SettingRow
            icon="📜"
            title="Terms of Service"
            onPress={() => Linking.openURL('https://foundergroundworks.com/terms')}
          />
          <SettingRow
            icon="🗑️"
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={handleDeleteAccount}
          />
        </View>

        {/* Support & Help */}
        <SectionHeader title="Support" />
        <View style={[styles.section, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <SettingRow
            icon="💬"
            title="Contact Support"
            onPress={() => Linking.openURL('mailto:support@foundergroundworks.com')}
          />
          <SettingRow
            icon="🐛"
            title="Report a Bug"
            onPress={() => Linking.openURL('mailto:support@foundergroundworks.com?subject=Bug Report')}
          />
        </View>

        {/* Sign Out Button */}
        <Pressable style={[styles.signOutButton, { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.2)' : '#DC2626', borderColor: isDark ? 'rgba(220, 38, 38, 0.5)' : '#DC2626' }]} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.text }]}>Founder Groundworks</Text>
          <Text style={[styles.footerSubtext, { color: colors.textSecondary }]}>Empowering founders to succeed</Text>
        </View>
      </ScrollView>

      {/* Learning Format Modal */}
      <Modal
        visible={showLearningFormatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLearningFormatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Learning Formats</Text>
              <Pressable onPress={() => setShowLearningFormatModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              Select the content formats you prefer. We'll prioritize these in your recommendations.
            </Text>
            <FlatList
              data={LEARNING_FORMATS}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.formatItem,
                    selectedFormats.includes(item.id) && styles.formatItemSelected,
                  ]}
                  onPress={() => toggleLearningFormat(item.id)}
                >
                  <View style={styles.formatInfo}>
                    <Text
                      style={[
                        styles.formatLabel,
                        selectedFormats.includes(item.id) && styles.formatLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.formatDescription}>{item.description}</Text>
                  </View>
                  <View
                    style={[
                      styles.checkbox,
                      selectedFormats.includes(item.id) && styles.checkboxSelected,
                    ]}
                  >
                    {selectedFormats.includes(item.id) && (
                      <Text style={styles.checkboxIcon}>✓</Text>
                    )}
                  </View>
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
            <Pressable
              style={styles.modalButton}
              onPress={() => setShowLearningFormatModal(false)}
            >
              <Text style={styles.modalButtonText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Deleting Account Overlay */}
      {deletingAccount && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.deletingText}>Deleting account...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'transparent',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    color: '#192B47',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 16,
  },
  scoreContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  scoreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 20,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 2,
  },
  bandBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bandText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Medium',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  settingArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    opacity: 0.5,
  },
  signOutButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.5)',
    paddingVertical: 14,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  signOutText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.7,
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
    paddingBottom: 40,
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
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  formatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  formatItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  formatInfo: {
    flex: 1,
  },
  formatLabel: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Medium',
    color: '#374151',
    marginBottom: 2,
  },
  formatLabelSelected: {
    color: '#192B47',
    fontFamily: 'HostGrotesk-SemiBold',
  },
  formatDescription: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#192B47',
    borderColor: '#192B47',
  },
  checkboxIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'HostGrotesk-Bold',
  },
  modalButton: {
    backgroundColor: '#192B47',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletingText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Medium',
    color: '#FFFFFF',
    marginTop: 16,
  },
});
