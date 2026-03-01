import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonBox, SkeletonLine } from '@/components/skeleton-loader';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { useAuth } from '@/contexts/auth-context';
import { useSubscription } from '@/contexts/subscription-context';
import { PaywallModal } from '@/components/paywall-modal';
import { FREE_LESSON_LIMIT } from '@/lib/revenucat';
import { getAllLessonsForUser, getLessonBySlug, Lesson } from '@/lib/lessons';
import { getUnlockedLessons } from '@/lib/lesson-unlocks';
import { supabase } from '@/lib/supabase/client';

export default function LibraryScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [unlockedLessons, setUnlockedLessons] = useState<Lesson[]>([]);
  const [completedSlugs, setCompletedSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Fetch unlocked lessons on focus
  useFocusEffect(
    useCallback(() => {
      async function loadUnlockedLessons() {
        if (!user) {
          setLoading(false);
          return;
        }

        try {
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

          // Get all generated lessons for the user
          const generatedLessons = await getAllLessonsForUser(user.id);

          // Build a map of all available lessons (generated + legacy via slug lookup)
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

          // Filter to only unlocked lessons, preserve unlock order
          const filtered = unlockedSlugs
            .map(slug => lessonMap.get(slug))
            .filter((l): l is Lesson => !!l);

          setUnlockedLessons(filtered);
        } catch (error) {
          console.error('Error loading unlocked lessons:', error);
        } finally {
          setLoading(false);
        }
      }

      loadUnlockedLessons();
    }, [user])
  );

  // Get unique categories from unlocked lessons
  const categories = ['All', ...Array.from(new Set(unlockedLessons.map(lesson => lesson.category)))];

  // Filter lessons based on search and category
  const filteredLessons = unlockedLessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || lesson.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={{ padding: 20 }}>
          {/* Title + subtitle */}
          <SkeletonLine width="30%" style={{ marginBottom: 8, marginTop: 16 }} />
          <SkeletonLine width="40%" style={{ marginBottom: 20 }} />
          {/* Search bar */}
          <SkeletonBox height={48} borderRadius={12} style={{ marginBottom: 16 }} />
          {/* Category chips */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
            <SkeletonBox width={60} height={36} borderRadius={20} />
            <SkeletonBox width={60} height={36} borderRadius={20} />
            <SkeletonBox width={60} height={36} borderRadius={20} />
          </View>
          {/* Lesson cards */}
          <SkeletonBox height={160} borderRadius={16} style={{ marginBottom: 16 }} />
          <SkeletonBox height={160} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  const LessonCard = ({ lesson, index }: { lesson: Lesson; index: number }) => {
    const isCompleted = completedSlugs.has(lesson.id);
    const isLocked = !isPremium && index >= FREE_LESSON_LIMIT;

    return (
      <Pressable
        style={[
          styles.lessonCard,
          { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
          isCompleted && styles.lessonCardCompleted,
          isLocked && styles.lessonCardLocked,
        ]}
        onPress={() => isLocked ? setShowPaywall(true) : router.push(`/lesson/${lesson.id}`)}
      >
        <View style={styles.badgeRow}>
          <View style={[styles.lessonBadge, { backgroundColor: isLocked ? '#9CA3AF' : '#01B2FE' }]}>
            <Text style={[styles.lessonBadgeText, { color: '#FFFFFF' }]}>LESSON</Text>
          </View>
          {isLocked && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
          {isCompleted && !isLocked && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>✓ Completed</Text>
            </View>
          )}
        </View>

        <Text style={[styles.lessonCategory, { color: isLocked ? '#9CA3AF' : '#6B7280' }]}>{lesson.category}</Text>
        <Text style={[styles.lessonTitle, { color: isLocked ? '#9CA3AF' : '#111827' }]}>{lesson.title}</Text>
        <Text style={[styles.lessonDescription, { color: isLocked ? '#D1D5DB' : '#6B7280' }]} numberOfLines={2}>
          {lesson.description}
        </Text>

        <View style={styles.lessonFooter}>
          <Text style={[styles.lessonDuration, { color: isLocked ? '#D1D5DB' : '#6B7280' }]}>⏱️ {lesson.duration}</Text>
          <View style={[styles.startButton, { backgroundColor: isLocked ? '#9CA3AF' : isCompleted ? '#FF7A1A' : '#01B2FE' }]}>
            <Text style={[styles.startButtonText, { color: '#FFFFFF' }]}>
              {isLocked ? '🔒 Unlock' : isCompleted ? 'Review →' : 'Start →'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Library</Text>
        <Text style={[styles.headerSubtitle, { color: '#FFFFFF' }]}>
          {unlockedLessons.length} {unlockedLessons.length === 1 ? 'lesson' : 'lessons'} unlocked
        </Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput]}
          placeholder="Search lessons..."
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Text style={[styles.clearButton]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Category Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map(category => (
          <Pressable
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && { color: '#01B2FE' }
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Lessons Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredLessons.length > 0 ? (
          <View style={styles.lessonsGrid}>
            {filteredLessons.map((lesson, index) => (
              <LessonCard key={lesson.id} lesson={lesson} index={unlockedLessons.indexOf(lesson)} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📚</Text>
            <Text style={[styles.emptyStateTitle, { color: '#FFFFFF' }]}>No lessons found</Text>
            <Text style={[styles.emptyStateText, { color: '#FFFFFF' }]}>
              {searchQuery
                ? `No lessons match "${searchQuery}"`
                : 'No lessons available in this category'}
            </Text>
            {searchQuery && (
              <Pressable
                style={[styles.clearSearchButton, { backgroundColor: colors.buttonPrimary }]}
                onPress={() => setSearchQuery('')}
              >
                <Text style={[styles.clearSearchButtonText, { color: colors.buttonPrimaryText }]}>Clear Search</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>
      {/* Paywall Modal */}
      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
  },
  clearButton: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.7,
    paddingHorizontal: 8,
  },
  categoriesScroll: {
    marginBottom: 16,
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  categoryChipTextActive: {
    color: '#01B2FE',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  lessonsGrid: {
    gap: 16,
  },
  lessonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    padding: 20,
  },
  lessonCardCompleted: {
    borderColor: '#FF7A1A',
    borderWidth: 2,
  },
  lessonCardLocked: {
    opacity: 0.65,
    borderColor: '#D1D5DB',
  },
  proBadge: {
    backgroundColor: '#FF7A1A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
    color: '#FFFFFF',
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  lessonTitle: {
    fontSize: 20,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 26,
  },
  lessonDescription: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
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
    color: '#FFFFFF',
    opacity: 0.9,
  },
  startButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#01B2FE',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'HostGrotesk-Bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  clearSearchButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearSearchButtonText: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#01B2FE',
  },
});
