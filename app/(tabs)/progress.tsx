import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox, SkeletonLine } from '@/components/skeleton-loader';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase/client';
import { getScoreBandLabel } from '@/lib/scoring';

interface UserProfile {
  first_name: string;
  base_score: number;
  score_band: string;
  total_content_completed: number;
  total_learning_minutes: number;
}

interface WeeklyActivity {
  day: string;
  completed: number;
}

export default function ProgressScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Mock weekly activity data - in a real app, this would come from the database
  const weeklyActivity: WeeklyActivity[] = [
    { day: 'Mon', completed: 2 },
    { day: 'Tue', completed: 1 },
    { day: 'Wed', completed: 3 },
    { day: 'Thu', completed: 0 },
    { day: 'Fri', completed: 2 },
    { day: 'Sat', completed: 1 },
    { day: 'Sun', completed: 0 },
  ];

  const maxActivity = Math.max(...weeklyActivity.map(d => d.completed), 1);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('first_name, base_score, score_band, total_content_completed, total_learning_minutes')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={{ padding: 20 }}>
          {/* Title + subtitle */}
          <SkeletonLine width="40%" style={{ marginBottom: 8 }} />
          <SkeletonLine width="55%" style={{ marginBottom: 24 }} />
          {/* Score card */}
          <SkeletonBox height={140} borderRadius={16} style={{ marginBottom: 24 }} />
          {/* Stats grid */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <SkeletonBox width="48%" height={80} borderRadius={12} />
            <SkeletonBox width="48%" height={80} borderRadius={12} />
          </View>
          {/* Chart area */}
          <SkeletonBox height={160} borderRadius={12} style={{ marginBottom: 24 }} />
          {/* Goal cards */}
          <SkeletonBox height={80} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonBox height={80} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: '#FFFFFF' }]}>Unable to load progress data</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Your Progress</Text>
          <Text style={[styles.headerSubtitle, { color: '#FFFFFF' }]}>
            Keep up the great work, {userProfile.first_name}!
          </Text>
        </View>

        {/* Current Score Card */}
        <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.scoreHeader}>
            <View>
              <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Current Score</Text>
              <Text style={[styles.scoreValue, { color: colors.text }]}>{userProfile.base_score}</Text>
            </View>
            <View style={[styles.scoreBadge, { backgroundColor: colors.buttonSecondary }]}>
              <Text style={[styles.scoreBadgeText, { color: colors.buttonSecondaryText }]}>
                {getScoreBandLabel(userProfile.score_band as any)}
              </Text>
            </View>
          </View>
          <View style={styles.scoreProgress}>
            <View style={[styles.progressBar, { backgroundColor: colors.inputBackground }]}>
              <View style={[styles.progressFill, { width: `${userProfile.base_score}%`, backgroundColor: colors.success }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {100 - userProfile.base_score} points to 100
            </Text>
          </View>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{userProfile.total_content_completed}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Content Completed</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{userProfile.total_learning_minutes}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Minutes Learned</Text>
          </View>
        </View>

        {/* Weekly Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>This Week</Text>
          <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.activityChart}>
              {weeklyActivity.map((day, index) => (
                <View key={index} style={styles.activityBar}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${(day.completed / maxActivity) * 100}%`,
                          backgroundColor: day.completed > 0 ? colors.success : colors.inputBackground
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>{day.day}</Text>
                  <Text style={[styles.activityCount, { color: colors.text }]}>{day.completed}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Learning Goals</Text>
          <View style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.goalHeader}>
              <Text style={[styles.goalTitle, { color: colors.text }]}>Weekly Target</Text>
              <Text style={[styles.goalProgress, { color: colors.success }]}>60%</Text>
            </View>
            <View style={[styles.goalProgressBar, { backgroundColor: colors.inputBackground }]}>
              <View style={[styles.goalProgressFill, { width: '60%', backgroundColor: colors.success }]} />
            </View>
            <Text style={[styles.goalDescription, { color: colors.textSecondary }]}>
              3 of 5 lessons completed this week
            </Text>
          </View>

          <View style={[styles.goalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.goalHeader}>
              <Text style={[styles.goalTitle, { color: colors.text }]}>Study Time</Text>
              <Text style={[styles.goalProgress, { color: colors.success }]}>45%</Text>
            </View>
            <View style={[styles.goalProgressBar, { backgroundColor: colors.inputBackground }]}>
              <View style={[styles.goalProgressFill, { width: '45%', backgroundColor: colors.success }]} />
            </View>
            <Text style={[styles.goalDescription, { color: colors.textSecondary }]}>
              90 of 200 minutes this week
            </Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>Recent Achievements</Text>
          <View style={[styles.achievementCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.achievementIcon}>🏆</Text>
            <View style={styles.achievementContent}>
              <Text style={[styles.achievementTitle, { color: colors.text }]}>First Lesson Complete</Text>
              <Text style={[styles.achievementDescription, { color: colors.textSecondary }]}>
                Completed your first lesson
              </Text>
            </View>
          </View>

          <View style={[styles.achievementCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={styles.achievementIcon}>🔥</Text>
            <View style={styles.achievementContent}>
              <Text style={[styles.achievementTitle, { color: colors.text }]}>3 Day Streak</Text>
              <Text style={[styles.achievementDescription, { color: colors.textSecondary }]}>
                Learned 3 days in a row
              </Text>
            </View>
          </View>
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
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
  },
  scoreCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    marginBottom: 24,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: 'HostGrotesk-Bold',
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
  scoreProgress: {
    gap: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'HostGrotesk-Bold',
    marginBottom: 12,
  },
  activityCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 20,
  },
  activityChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  activityBar: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-Regular',
  },
  activityCount: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-SemiBold',
  },
  goalCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
  },
  goalProgress: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Bold',
  },
  goalProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  goalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  goalDescription: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  achievementIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-SemiBold',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
  },
});
