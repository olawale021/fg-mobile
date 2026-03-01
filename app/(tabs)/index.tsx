import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, StatusBar, Image } from 'react-native';

const waveIcon = require('../../assets/images/wave.png');
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox, SkeletonLine } from '@/components/skeleton-loader';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase/client';
import { getScoreBandLabel } from '@/lib/scoring';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { router } from 'expo-router';
import { getAllLessonsForUser, getLessonBySlug, Lesson } from '@/lib/lessons';
import { getWeakAreasByCategory } from '@/lib/weak-areas';
import { getUnlockedLessons } from '@/lib/lesson-unlocks';

interface UserProfile {
  first_name: string;
  last_name: string;
  base_score: number;
  score_band: string;
  latest_score: number | null;
  latest_score_band: string | null;
  total_content_completed: number;
  total_learning_minutes: number;
  is_premium: boolean;
  current_streak_days: number;
  longest_streak_days: number;
}

export default function DashboardScreen() {
  const { user, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [weakCategories, setWeakCategories] = useState<string[]>([]);
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && user) {
        loadUserProfile();
      }
    }, [user, authLoading])
  );

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

      // Get unlocked lesson slugs
      const unlockedSlugs = await getUnlockedLessons(user.id);

      // Get completed lesson slugs
      const { data: completedData } = await supabase
        .from('user_lesson_completions')
        .select('content_slug')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const completedSet = new Set(completedData?.map(c => c.content_slug) || []);
      setCompletedSlugs(completedSet);

      // Get all generated lessons for this user
      const generatedLessons = await getAllLessonsForUser(user.id);
      const lessonMap = new Map<string, Lesson>();
      for (const l of generatedLessons) {
        lessonMap.set(l.id, l);
      }

      // For unlocked slugs not in generated lessons, try legacy fallback
      for (const slug of unlockedSlugs) {
        if (!lessonMap.has(slug)) {
          const legacy = await getLessonBySlug(user.id, slug);
          if (legacy) lessonMap.set(slug, legacy);
        }
      }

      // Show unlocked lessons as recommended (up to 5)
      const unlockedRecommended = unlockedSlugs
        .map(slug => lessonMap.get(slug))
        .filter((l): l is Lesson => !!l)
        .slice(0, 5);
      setRecommendedLessons(unlockedRecommended);
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
        <View style={styles.contentContainer}>
          {/* Greeting */}
          <SkeletonLine width="40%" style={{ marginBottom: 8 }} />
          <SkeletonLine width="25%" style={{ marginBottom: 24 }} />
          {/* Score card */}
          <SkeletonBox height={160} borderRadius={16} style={{ marginBottom: 16 }} />
          {/* Stats grid */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <SkeletonBox width="48%" height={100} borderRadius={12} />
            <SkeletonBox width="48%" height={100} borderRadius={12} />
          </View>
          {/* Section title */}
          <SkeletonLine width="35%" style={{ marginBottom: 16 }} />
          {/* Lesson cards */}
          <SkeletonBox height={120} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonBox height={120} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#FFFFFF' }]}>Unable to load profile</Text>
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
            <View style={styles.greetingRow}>
              <Text style={[styles.greeting, { color: '#FFFFFF' }]}>Hello, {userProfile.first_name}! </Text>
              <Image source={waveIcon} style={styles.waveIcon} />
            </View>
            <Text style={[styles.subtitle, { color: '#FFFFFF' }]}>Welcome to your dashboard</Text>
          </View>
        </View>


        {/* Founder Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}>
          <View style={styles.scoreHeader}>
            <Text style={[styles.scoreTitle, { color: '#111827' }]}>Your Founder Score</Text>
            <View style={[styles.scoreBadge, { backgroundColor: '#01B2FE' }]}>
              <Text style={[styles.scoreBadgeText, { color: '#FFFFFF' }]}>
                {getScoreBandLabel((userProfile.latest_score_band ?? userProfile.score_band) as any)}
              </Text>
            </View>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreValue, { color: '#111827' }]}>{userProfile.latest_score ?? userProfile.base_score}</Text>
            <Text style={[styles.scoreLabel, { color: '#6B7280' }]}>/100</Text>
          </View>

          {/* Streak Display */}
          {userProfile.current_streak_days > 0 && (
            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakValue}>{userProfile.current_streak_days}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
          )}

          <Pressable style={[styles.viewDetailsButton, { backgroundColor: '#01B2FE' }]} onPress={() => router.push('/assessment-details')}>
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
                    <Text style={[styles.categoryBadgeText, { color: '#111827' }]}>
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
                  <Text key={index} style={[styles.pathItem, { color: '#111827' }]} numberOfLines={1}>
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

        {/* Continue Learning Section - only show if user hasn't completed any lessons */}
        {completedSlugs.size === 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Continue Learning</Text>
            <Pressable
              style={[styles.emptyState, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}
              onPress={() => router.push('/(tabs)/library')}
            >
              <Text style={styles.emptyStateIcon}>📖</Text>
              <Text style={[styles.emptyStateText, { color: '#111827' }]}>Start your first lesson</Text>
              <Text style={[styles.emptyStateSubtext, { color: '#6B7280' }]}>
                Explore curated content to strengthen your founder skills
              </Text>
              <View style={[styles.primaryButton, { backgroundColor: '#01B2FE' }]}>
                <Text style={[styles.primaryButtonText, { color: '#FFFFFF' }]}>Browse Content</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* Recommended Content */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Recommended for You</Text>

          {recommendedLessons.map((lesson) => {
            const isCompleted = completedSlugs.has(lesson.id);
            return (
              <Pressable
                key={lesson.id}
                style={[
                  styles.lessonCard,
                  { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
                  isCompleted && styles.lessonCardCompleted
                ]}
                onPress={() => router.push(`/lesson/${lesson.id}`)}
              >
                <View style={styles.badgeRow}>
                  <View style={[styles.lessonBadge, { backgroundColor: '#01B2FE' }]}>
                    <Text style={[styles.lessonBadgeText, { color: '#FFFFFF' }]}>LESSON</Text>
                  </View>
                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Completed</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.lessonCategory, { color: '#6B7280' }]}>
                  {lesson.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Text>
                <Text style={[styles.lessonTitle, { color: '#111827' }]}>{lesson.title}</Text>
                <Text style={[styles.lessonDescription, { color: '#6B7280' }]} numberOfLines={2}>
                  {lesson.description}
                </Text>

                <View style={styles.lessonFooter}>
                  <Text style={[styles.lessonDuration, { color: '#6B7280' }]}>⏱️ {lesson.duration}</Text>
                  <View style={[styles.startButton, { backgroundColor: isCompleted ? '#FF7A1A' : '#01B2FE' }]}>
                    <Text style={[styles.startButtonText, { color: '#FFFFFF' }]}>
                      {isCompleted ? 'Review →' : 'Start →'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
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
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 4,
  },
  waveIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
  },
  scoreCard: {
    borderRadius: 16,
    borderWidth: 1,
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
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
    textTransform: 'uppercase',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scoreValue: {
    fontSize: 44,
    fontFamily: 'HostGrotesk-Bold',
    lineHeight: 48,
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    marginLeft: 4,
    marginTop: 8,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  streakEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  streakValue: {
    fontSize: 18,
    fontFamily: 'HostGrotesk-Bold',
    color: '#D97706',
    marginRight: 4,
  },
  streakLabel: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Medium',
    color: '#D97706',
  },
  viewDetailsButton: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'HostGrotesk-Bold',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
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
    lineHeight: 16,
  },
  moreItems: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-SemiBold',
    marginTop: 4,
  },
  emptyMessage: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 16,
  },
  lessonCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  lessonCardCompleted: {
    borderColor: '#FF7A1A',
    borderWidth: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  completedBadge: {
    backgroundColor: '#FF7A1A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  lessonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lessonBadgeText: {
    fontSize: 10,
    fontFamily: 'HostGrotesk-Bold',
    letterSpacing: 0.5,
  },
  lessonCategory: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  lessonTitle: {
    fontSize: 20,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 8,
    lineHeight: 26,
  },
  lessonDescription: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
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
  },
  startButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
  },
  emptyState: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyStateIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    textAlign: 'center',
    marginBottom: 14,
  },
  contentCard: {
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  contentBadge: {
    backgroundColor: '#01B2FE',
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
    color: '#111827',
    marginBottom: 8,
  },
  contentDescription: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
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
    color: '#6B7280',
  },
  primaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#111827',
  },
});
