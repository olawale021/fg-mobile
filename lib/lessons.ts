import contentData from '@/data/sample-content.json';

export interface BreakdownPoint {
  title: string;
  description: string;
}

export interface LessonContent {
  intro: string;
  quickBreakdown: BreakdownPoint[];
  rememberThis: {
    title: string;
    content: string;
  };
}

export interface ContentItem {
  title: string;
  slug: string;
  description: string;
  format: 'lesson' | 'article' | 'story' | 'debate' | 'conversation';
  content: LessonContent;
  category_slug: string;
  tags: string[];
  is_premium: boolean;
  estimated_duration_minutes: number;
  author: string;
  display_order: number;
}

// Legacy Lesson interface for backward compatibility
export interface Lesson {
  id: string;
  title: string;
  duration: string;
  category: string;
  description: string;
  intro: string;
  quickBreakdown: BreakdownPoint[];
  rememberThis: {
    title: string;
    content: string;
  };
}

const contentItems: ContentItem[] = contentData;

// Convert new format to legacy format for backward compatibility
function contentItemToLesson(item: ContentItem): Lesson {
  return {
    id: item.slug,
    title: item.title,
    duration: `${item.estimated_duration_minutes} min`,
    category: item.category_slug,
    description: item.description,
    intro: item.content.intro,
    quickBreakdown: item.content.quickBreakdown,
    rememberThis: item.content.rememberThis,
  };
}

export function getAllLessons(): Lesson[] {
  return contentItems.map(contentItemToLesson);
}

export function getAllContentItems(): ContentItem[] {
  return contentItems;
}

export function getLessonById(id: string): Lesson | undefined {
  const item = contentItems.find(item => item.slug === id);
  return item ? contentItemToLesson(item) : undefined;
}

export function getContentItemBySlug(slug: string): ContentItem | undefined {
  return contentItems.find(item => item.slug === slug);
}

export function getLessonsByCategory(category: string): Lesson[] {
  return contentItems
    .filter(item => item.category_slug === category)
    .map(contentItemToLesson);
}

export function getContentItemsByCategory(category: string): ContentItem[] {
  return contentItems.filter(item => item.category_slug === category);
}

export function getRecommendedLessons(limit?: number): Lesson[] {
  const allLessons = getAllLessons();
  return limit ? allLessons.slice(0, limit) : allLessons;
}

export function getRecommendedContent(limit?: number): ContentItem[] {
  const sortedContent = [...contentItems].sort((a, b) => a.display_order - b.display_order);
  return limit ? sortedContent.slice(0, limit) : sortedContent;
}

/**
 * Map category name to slug
 */
const categoryNameToSlug: Record<string, string> = {
  'Problem Clarity': 'problem-clarity',
  'Customer Understanding': 'customer-understanding',
  'Product Development': 'product-development',
  'Traction & Validation': 'traction-validation',
  'Execution Consistency': 'execution-consistency',
  'Team Building': 'team-building',
  'Founder Identity': 'founder-identity',
};

/**
 * Get lessons filtered by weak area category names
 * @param weakCategories - Array of category names from weak areas (e.g., "Problem Clarity")
 * @param limit - Optional limit on number of lessons returned
 */
export function getLessonsForWeakAreas(weakCategories: string[], limit?: number): Lesson[] {
  if (!weakCategories || weakCategories.length === 0) {
    // If no weak areas, return all lessons sorted by display order
    return getRecommendedLessons(limit);
  }

  // Convert category names to slugs
  const categorySlugs = weakCategories
    .map(name => categoryNameToSlug[name])
    .filter(Boolean);

  if (categorySlugs.length === 0) {
    return getRecommendedLessons(limit);
  }

  // Filter lessons by weak area categories, prioritize by category match
  const matchingLessons = contentItems
    .filter(item => categorySlugs.includes(item.category_slug))
    .sort((a, b) => a.display_order - b.display_order)
    .map(contentItemToLesson);

  // If we have matching lessons, return them (up to limit)
  if (matchingLessons.length > 0) {
    return limit ? matchingLessons.slice(0, limit) : matchingLessons;
  }

  // Fallback to all lessons if no matches
  return getRecommendedLessons(limit);
}

/**
 * Get content items filtered by weak area category names
 */
export function getContentForWeakAreas(weakCategories: string[], limit?: number): ContentItem[] {
  if (!weakCategories || weakCategories.length === 0) {
    return getRecommendedContent(limit);
  }

  const categorySlugs = weakCategories
    .map(name => categoryNameToSlug[name])
    .filter(Boolean);

  if (categorySlugs.length === 0) {
    return getRecommendedContent(limit);
  }

  const matchingContent = contentItems
    .filter(item => categorySlugs.includes(item.category_slug))
    .sort((a, b) => a.display_order - b.display_order);

  if (matchingContent.length > 0) {
    return limit ? matchingContent.slice(0, limit) : matchingContent;
  }

  return getRecommendedContent(limit);
}
