import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase/client';
import { getScoreBandLabel } from '@/lib/scoring';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { router } from 'expo-router';
import { getLessonsForWeakAreas, Lesson } from '@/lib/lessons';
import { getWeakAreasByCategory } from '@/lib/weak-areas';

interface UserProfile {
  first_name: string;
  last_name: string;
  base_score: number;
  score_band: string;
  total_content_completed: number;
  total_learning_minutes: number;
  is_premium: boolean;
}

export default function DashboardScreen() {
  const { user, loading: authLoading } = useAuth();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [weakCategories, setWeakCategories] = useState<string[]>([]);
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    if (!authLoading && user) {
      loadUserProfile();
    }
  }, [user, authLoading]);

  const loadUserProfile = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      console.log('Authenticated user:', user.email);

      // Load user profile
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        console.error('Error details:', JSON.stringify(error));
      } else {
        console.log('Profile loaded successfully:', profile);
        setUserProfile(profile);
      }

      // Load weak areas data
      const weakAreasByCategory = await getWeakAreasByCategory(user.id);
      const categoryNames = Object.keys(weakAreasByCategory);
      setWeakCategories(categoryNames);

      // Get recommended lessons based on weak areas
      const lessons = getLessonsForWeakAreas(categoryNames, 5);
      setRecommendedLessons(lessons);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#192B47" />
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>Unable to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>Hello, {userProfile.first_name}! 👋</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Welcome to your dashboard</Text>
          </View>
        </View>

        {/* Founder Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <View style={styles.scoreHeader}>
            <Text style={[styles.scoreTitle, { color: '#192B47' }]}>Your Founder Score</Text>
            <View style={[styles.scoreBadge, { backgroundColor: '#192B47' }]}>
              <Text style={[styles.scoreBadgeText, { color: '#FFFFFF' }]}>
                {getScoreBandLabel(userProfile.score_band as any)}
              </Text>
            </View>
          </View>
          <Text style={[styles.scoreValue, { color: '#192B47' }]}>{userProfile.base_score}</Text>
          <Text style={[styles.scoreLabel, { color: '#6B7280' }]}>out of 100</Text>
          <Pressable style={[styles.viewDetailsButton, { backgroundColor: '#192B47' }]}>
            <Text style={[styles.viewDetailsText, { color: '#FFFFFF' }]}>View Details</Text>
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
            <Text style={[styles.statLabel, { color: '#6B7280' }]}>Weak areas</Text>
            {weakCategories.length > 0 ? (
              <View style={styles.categoryList}>
                {weakCategories.map((category, index) => (
                  <View key={index} style={[styles.categoryBadge, { backgroundColor: '#F3F4F6' }]}>
                    <Text style={[styles.categoryBadgeText, { color: '#192B47' }]}>
                      {category}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyMessage, { color: '#6B7280' }]}>No weak areas</Text>
            )}
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
            <Text style={[styles.statLabel, { color: '#6B7280' }]}>Your learning path</Text>
            {recommendedLessons.length > 0 ? (
              <View style={styles.pathList}>
                {recommendedLessons.slice(0, 3).map((lesson, index) => (
                  <Text key={index} style={[styles.pathItem, { color: '#192B47' }]} numberOfLines={1}>
                    • {lesson.title}
                  </Text>
                ))}
                {recommendedLessons.length > 3 && (
                  <Text style={[styles.moreItems, { color: '#6B7280' }]}>
                    +{recommendedLessons.length - 3} more
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[styles.emptyMessage, { color: '#6B7280' }]}>No items yet</Text>
            )}
          </View>
        </View>

        {/* Continue Learning Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Learning</Text>
          <View style={[styles.emptyState, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
            <Text style={styles.emptyStateIcon}>📖</Text>
            <Text style={[styles.emptyStateText, { color: '#192B47' }]}>Start your first lesson</Text>
            <Text style={[styles.emptyStateSubtext, { color: '#6B7280' }]}>
              Explore curated content to strengthen your founder skills
            </Text>
            <Pressable style={[styles.primaryButton, { backgroundColor: '#192B47' }]}>
              <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>Browse Content</Text>
            </Pressable>
          </View>
        </View>

        {/* Recommended Content */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommended for You</Text>

          {recommendedLessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              style={[styles.lessonCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}
              onPress={() => router.push(`/lesson/${lesson.id}`)}
            >
              <View style={[styles.lessonBadge, { backgroundColor: '#192B47' }]}>
                <Text style={[styles.lessonBadgeText, { color: '#FFFFFF' }]}>LESSON</Text>
              </View>

              <Text style={[styles.lessonCategory, { color: '#6B7280' }]}>
                {lesson.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </Text>
              <Text style={[styles.lessonTitle, { color: '#192B47' }]}>{lesson.title}</Text>
              <Text style={[styles.lessonDescription, { color: '#6B7280' }]} numberOfLines={2}>
                {lesson.description}
              </Text>

              <View style={styles.lessonFooter}>
                <Text style={[styles.lessonDuration, { color: '#6B7280' }]}>⏱️ {lesson.duration}</Text>
                <View style={[styles.startButton, { backgroundColor: '#192B47' }]}>
                  <Text style={[styles.startButtonText, { color: '#FFFFFF' }]}>Start →</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  scoreCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    padding: 16,
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreTitle: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  scoreBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 44,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
  },
  viewDetailsButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#192B47',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  categoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
  },
  pathList: {
    gap: 4,
    width: '100%',
  },
  pathItem: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  moreItems: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 4,
  },
  emptyMessage: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  lessonBadge: {
    backgroundColor: '#192B47',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  lessonBadgeText: {
    fontSize: 10,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  lessonCategory: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  lessonTitle: {
    fontSize: 20,
    fontFamily: 'HostGrotesk-Bold',
    color: '#192B47',
    marginBottom: 8,
    lineHeight: 26,
  },
  lessonDescription: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  lessonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lessonDuration: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Medium',
    color: '#6B7280',
  },
  startButton: {
    backgroundColor: '#192B47',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  emptyStateIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 14,
  },
  contentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 12,
  },
  contentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  contentBadgeText: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  contentTitle: {
    fontSize: 20,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  contentDescription: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 20,
    marginBottom: 12,
  },
  contentMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  contentMetaText: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#192B47',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
});
