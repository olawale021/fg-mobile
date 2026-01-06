import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/theme-context';
import { getAllLessons, Lesson } from '@/lib/lessons';

export default function LibraryScreen() {
  const { colors, isDark } = useTheme();
  const allLessons = getAllLessons();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(allLessons.map(lesson => lesson.category)))];

  // Filter lessons based on search and category
  const filteredLessons = allLessons.filter(lesson => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || lesson.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const LessonCard = ({ lesson }: { lesson: Lesson }) => (
    <Pressable
      style={[styles.lessonCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' }]}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
    >
      <View style={[styles.lessonBadge, { backgroundColor: '#192B47' }]}>
        <Text style={[styles.lessonBadgeText, { color: '#FFFFFF' }]}>LESSON</Text>
      </View>

      <Text style={[styles.lessonCategory, { color: '#6B7280' }]}>{lesson.category}</Text>
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
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Library</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {filteredLessons.length} {filteredLessons.length === 1 ? 'lesson' : 'lessons'} available
        </Text>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search lessons..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Text style={[styles.clearButton, { color: colors.text }]}>✕</Text>
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
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
              selectedCategory === category && { backgroundColor: colors.buttonPrimary, borderColor: colors.buttonPrimary }
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.categoryChipText,
                { color: colors.text },
                selectedCategory === category && { color: colors.buttonPrimaryText }
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
            {filteredLessons.map(lesson => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📚</Text>
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No lessons found</Text>
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: '#192B47',
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
  lessonBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#192B47',
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
    color: '#192B47',
  },
});
