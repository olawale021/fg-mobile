import { supabase } from './supabase/client';

/**
 * Weak Area Interface
 */
export interface WeakArea {
  id: string;
  user_id: string;
  test_response_id: string;
  category: string;
  question_number: number;
  question_text: string;
  user_answer: string;
  user_score: number;
  max_score: number;
  priority: number;
  is_addressed: boolean;
  addressed_at: string | null;
  created_at: string;
}

/**
 * Category with question mapping
 */
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  question_numbers: number[];
  display_order: number;
}

/**
 * Question texts mapping (matches database logic)
 */
const QUESTION_TEXTS = [
  'Do you have a clear problem you are solving?',
  'Can you explain the problem in one sentence?',
  'Do you have a defined customer segment?',
  'Have you validated your problem with real people?',
  'Do you have a prototype or demo?',
  'Do you have traction?',
  'Are you working on this consistently?',
  'Do you have a co-founder or team?',
  'How clear is your founder story?',
  'Preferred learning format',
];

/**
 * Analyze weak areas from a test response
 * This analyzes test answers and stores weak areas in the database
 */
export async function analyzeWeakAreas(
  userId: string,
  testResponseId: string,
  answers: Record<string, string>
) {
  try {
    // Clear ALL existing weak areas for this user (retake replaces previous analysis)
    await supabase
      .from('weak_areas')
      .delete()
      .eq('user_id', userId);

    // Get categories
    const categories = await getCategories();
    if (categories.length === 0) {
      console.warn('No categories found, skipping weak area analysis');
      return;
    }

    // Analyze each question (q1-q9, skip q10 as it's preference)
    for (let questionNum = 1; questionNum <= 9; questionNum++) {
      const answer = answers[`q${questionNum}`];
      if (!answer) continue;

      // Calculate score from answer
      const score = calculateScoreFromAnswer(answer);

      // Only store weak areas (score <= 2)
      if (score <= 2) {
        // Find matching categories for this question
        const matchingCategories = categories.filter((cat) =>
          cat.question_numbers.includes(questionNum)
        );

        for (const category of matchingCategories) {
          const { error } = await supabase.from('weak_areas').insert({
            user_id: userId,
            test_response_id: testResponseId,
            category: category.name,
            question_number: questionNum,
            question_text: QUESTION_TEXTS[questionNum - 1],
            user_answer: answer,
            user_score: score,
            max_score: 3,
            priority: score === 1 ? 1 : 2, // Priority 1 for score 1, Priority 2 for score 2
          });

          if (error) {
            console.error(`Error inserting weak area for q${questionNum}:`, error);
          }
        }
      }
    }

    console.log('Weak areas analysis completed successfully');
  } catch (error) {
    console.error('Error analyzing weak areas:', error);
    throw error;
  }
}

/**
 * Get count of weak categories for a user
 */
export async function getWeakCategoriesCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_weak_categories_count', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error getting weak categories count:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get count of learning path items for a user
 */
export async function getLearningPathCount(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_learning_path_count', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error getting learning path count:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Get all weak areas for a user
 */
export async function getWeakAreas(userId: string): Promise<WeakArea[]> {
  const { data, error } = await supabase
    .from('weak_areas')
    .select('*')
    .eq('user_id', userId)
    .eq('is_addressed', false)
    .order('priority', { ascending: true })
    .order('question_number', { ascending: true });

  if (error) {
    console.error('Error fetching weak areas:', error);
    return [];
  }

  return data || [];
}

/**
 * Get weak areas grouped by category
 */
export async function getWeakAreasByCategory(userId: string) {
  const weakAreas = await getWeakAreas(userId);

  // Group by category
  const grouped = weakAreas.reduce((acc, area) => {
    if (!acc[area.category]) {
      acc[area.category] = [];
    }
    acc[area.category].push(area);
    return acc;
  }, {} as Record<string, WeakArea[]>);

  return grouped;
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

/**
 * Get recommended content based on weak areas
 */
export async function getRecommendedContent(userId: string, limit: number = 5) {
  // First get weak categories
  const weakAreas = await getWeakAreas(userId);
  const weakCategories = [...new Set(weakAreas.map(area => area.category))];

  if (weakCategories.length === 0) {
    return [];
  }

  // Get content items matching weak categories
  const { data, error } = await supabase
    .from('content_items')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_published', true)
    .eq('format', 'lesson')
    .in('category.name', weakCategories)
    .order('display_order', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching recommended content:', error);
    return [];
  }

  return data || [];
}

/**
 * Mark a weak area as addressed
 */
export async function markWeakAreaAsAddressed(weakAreaId: string) {
  const { error } = await supabase
    .from('weak_areas')
    .update({
      is_addressed: true,
      addressed_at: new Date().toISOString(),
    })
    .eq('id', weakAreaId);

  if (error) {
    console.error('Error marking weak area as addressed:', error);
    throw error;
  }
}

/**
 * Calculate score from answer
 * This matches the logic in the SQL function
 */
export function calculateScoreFromAnswer(answer: string): number {
  const highScoreAnswers = ['Yes', 'Very clear', 'Yes, many', 'Yes, working', 'Yes, measurable'];
  const mediumScoreAnswers = [
    'Somewhat',
    'Not really',
    'Yes, a few',
    'In progress',
    'Some interest',
    'On and off',
    'Not yet',
  ];
  const lowScoreAnswers = ['No', 'Not clear', 'Solo'];

  if (highScoreAnswers.includes(answer)) return 3;
  if (mediumScoreAnswers.includes(answer)) return 2;
  if (lowScoreAnswers.includes(answer)) return 1;

  return 2; // Default to medium
}
