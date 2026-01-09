import { supabase } from './supabase/client';
import { getAllContentItems, ContentItem } from './lessons';
import { getWeakAreas } from './weak-areas';

/**
 * Interface for queue item
 */
interface QueueItem {
  content_slug: string;
  queue_position: number;
  priority_score: number;
}

/**
 * Interface for unlock record
 */
interface LessonUnlock {
  id: string;
  user_id: string;
  content_slug: string;
  unlock_order: number;
  unlocked_at: string;
}

/**
 * Interface for score progression result
 */
export interface ScoreProgressionResult {
  newScore: number;
  pointsEarned: number;
  streakBonus: number;
  currentStreak: number;
  scoreBand: string;
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
 * Generate personalized lesson queue based on weak areas
 * Priority: Highest priority weak areas first, then other content
 */
export async function generateLessonQueue(
  userId: string,
  weakCategories: string[]
): Promise<QueueItem[]> {
  // Get all lessons
  const allLessons = getAllContentItems();

  // Convert category names to slugs
  const weakSlugs = weakCategories
    .map((name) => categoryNameToSlug[name])
    .filter(Boolean);

  // Score each lesson
  const scoredLessons = allLessons.map((lesson) => {
    let priorityScore = 0;

    // Higher priority for weak area matches
    const weakIndex = weakSlugs.indexOf(lesson.category_slug);
    if (weakIndex !== -1) {
      // First weak area gets highest priority, descending
      priorityScore = (weakSlugs.length - weakIndex) * 100;
    }

    // Secondary sort by display_order (lower = earlier)
    priorityScore += 100 - lesson.display_order;

    return {
      content_slug: lesson.slug,
      priority_score: priorityScore,
    };
  });

  // Sort by priority score (descending)
  scoredLessons.sort((a, b) => b.priority_score - a.priority_score);

  // Assign queue positions
  return scoredLessons.map((lesson, index) => ({
    ...lesson,
    queue_position: index + 1,
  }));
}

/**
 * Initialize lesson queue for a user after signup
 */
export async function initializeLessonQueue(userId: string): Promise<void> {
  try {
    // Get user's weak areas
    const weakAreas = await getWeakAreas(userId);
    const weakCategories = [...new Set(weakAreas.map((area) => area.category))];

    // Generate personalized queue
    const queue = await generateLessonQueue(userId, weakCategories);

    // Insert queue into database
    const queueItems = queue.map((item) => ({
      user_id: userId,
      content_slug: item.content_slug,
      queue_position: item.queue_position,
      priority_score: item.priority_score,
    }));

    const { error } = await supabase.from('user_lesson_queue').insert(queueItems);

    if (error) {
      console.error('Error inserting lesson queue:', error);
      throw error;
    }

    // Mark signup as completed
    await supabase
      .from('users')
      .update({ signup_completed_at: new Date().toISOString() })
      .eq('id', userId);

    // Unlock first lesson immediately
    await unlockNextLesson(userId);

    console.log('Lesson queue initialized successfully');
  } catch (error) {
    console.error('Error initializing lesson queue:', error);
    throw error;
  }
}

/**
 * Unlock the next lesson in the user's queue
 */
export async function unlockNextLesson(userId: string): Promise<boolean> {
  try {
    // Get current unlock count
    const { data: unlocks } = await supabase
      .from('user_lesson_unlocks')
      .select('unlock_order')
      .eq('user_id', userId)
      .order('unlock_order', { ascending: false })
      .limit(1);

    const nextPosition = (unlocks?.[0]?.unlock_order || 0) + 1;

    // Get the lesson at this position in the queue
    const { data: queueItem } = await supabase
      .from('user_lesson_queue')
      .select('content_slug')
      .eq('user_id', userId)
      .eq('queue_position', nextPosition)
      .single();

    if (!queueItem) {
      console.log('No more lessons to unlock');
      return false;
    }

    // Insert unlock record
    const { error } = await supabase.from('user_lesson_unlocks').insert({
      user_id: userId,
      content_slug: queueItem.content_slug,
      unlock_order: nextPosition,
      unlocked_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error unlocking lesson:', error);
      return false;
    }

    // Update last unlock date
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('users')
      .update({ last_unlock_date: today })
      .eq('id', userId);

    console.log(`Unlocked lesson: ${queueItem.content_slug}`);
    return true;
  } catch (error) {
    console.error('Error unlocking next lesson:', error);
    return false;
  }
}

/**
 * Get all unlocked lesson slugs for a user
 */
export async function getUnlockedLessons(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_lesson_unlocks')
    .select('content_slug')
    .eq('user_id', userId)
    .order('unlock_order', { ascending: true });

  if (error) {
    console.error('Error fetching unlocked lessons:', error);
    return [];
  }

  return data?.map((d) => d.content_slug) || [];
}

/**
 * Check if a specific lesson is unlocked for a user
 */
export async function isLessonUnlocked(
  userId: string,
  contentSlug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_lesson_unlocks')
    .select('id')
    .eq('user_id', userId)
    .eq('content_slug', contentSlug)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" which is expected
    console.error('Error checking lesson unlock:', error);
  }

  return !!data;
}

/**
 * Get count of uncompleted lessons (unlocked but not completed)
 */
export async function getUncompletedCount(userId: string): Promise<number> {
  // Get unlocked lessons
  const unlockedSlugs = await getUnlockedLessons(userId);
  if (unlockedSlugs.length === 0) return 0;

  // Get completed lessons
  const { data: completedItems } = await supabase
    .from('user_lesson_completions')
    .select('content_slug')
    .eq('user_id', userId)
    .eq('status', 'completed');

  const completedCount = completedItems?.length || 0;
  return unlockedSlugs.length - completedCount;
}

/**
 * Check if user can receive a new unlock (backlog < 3)
 */
export async function canUnlockNewLesson(userId: string): Promise<boolean> {
  const uncompletedCount = await getUncompletedCount(userId);
  return uncompletedCount < 3;
}

/**
 * Mark a lesson as completed and update score with streak bonus
 * Returns score progression data for UI feedback
 */
export async function markLessonCompleted(
  userId: string,
  contentSlug: string
): Promise<ScoreProgressionResult | null> {
  try {
    // Check if already completed
    const alreadyCompleted = await isLessonCompleted(userId, contentSlug);
    if (alreadyCompleted) {
      console.log(`Lesson ${contentSlug} already completed`);
      return null;
    }

    // Mark progress in user_lesson_completions (uses text slug, not UUID)
    const { error: progressError } = await supabase.from('user_lesson_completions').upsert(
      {
        user_id: userId,
        content_slug: contentSlug,
        status: 'completed',
        completed_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,content_slug',
      }
    );

    if (progressError) {
      console.error('Error marking lesson progress:', progressError);
      throw progressError;
    }

    // Call RPC to update score with streak bonus
    const { data, error } = await supabase.rpc('complete_lesson_and_update_score', {
      p_user_id: userId,
      p_content_slug: contentSlug,
    });

    if (error) {
      console.error('Error updating score:', error);
      throw error;
    }

    // RPC returns an array with one row
    const result = data?.[0];
    if (!result) {
      console.error('No result from score update RPC');
      return null;
    }

    console.log(`Marked lesson ${contentSlug} as completed. Score: ${result.new_score}, Streak: ${result.new_streak}`);

    return {
      newScore: result.new_score,
      pointsEarned: result.points_earned + result.streak_bonus,
      streakBonus: result.streak_bonus,
      currentStreak: result.new_streak,
      scoreBand: result.new_score_band,
    };
  } catch (error) {
    console.error('Error marking lesson completed:', error);
    throw error;
  }
}

/**
 * Check if a lesson is completed
 */
export async function isLessonCompleted(
  userId: string,
  contentSlug: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_lesson_completions')
    .select('status')
    .eq('user_id', userId)
    .eq('content_slug', contentSlug)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking lesson completion:', error);
  }

  return data?.status === 'completed';
}

/**
 * Get user's timezone (defaults to Europe/London)
 */
export async function getUserTimezone(userId: string): Promise<string> {
  const { data } = await supabase
    .from('users')
    .select('timezone')
    .eq('id', userId)
    .single();

  return data?.timezone || 'Europe/London';
}

/**
 * Helper: Check if it's 8am or later in a timezone
 */
export function is8amOrLaterInTimezone(timezone: string): boolean {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).format(new Date())
  );
  return hour >= 8;
}

/**
 * Helper: Get current date string in timezone
 */
export function getDateInTimezone(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
  }).format(new Date());
}

/**
 * Check and perform daily unlock if eligible
 * Called on app open - checks if server missed the unlock
 */
export async function checkAndUnlockIfEligible(userId: string): Promise<void> {
  try {
    // Get user data
    const { data: user } = await supabase
      .from('users')
      .select('last_unlock_date, timezone, signup_completed_at')
      .eq('id', userId)
      .single();

    if (!user || !user.signup_completed_at) {
      // User hasn't completed signup, nothing to do
      return;
    }

    const timezone = user.timezone || 'Europe/London';
    const todayInTimezone = getDateInTimezone(timezone);

    // If last unlock was today, nothing to do
    if (user.last_unlock_date === todayInTimezone) {
      return;
    }

    // Check if it's 8am or later
    if (!is8amOrLaterInTimezone(timezone)) {
      return;
    }

    // Check backlog limit
    const canUnlock = await canUnlockNewLesson(userId);
    if (!canUnlock) {
      console.log('Backlog full, skipping unlock');
      return;
    }

    // Perform unlock
    await unlockNextLesson(userId);
  } catch (error) {
    console.error('Error in checkAndUnlockIfEligible:', error);
  }
}
