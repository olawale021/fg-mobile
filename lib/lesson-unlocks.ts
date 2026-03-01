import { supabase } from './supabase/client';

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
 * Daily unlocks are now handled server-side by the daily-lesson-unlock edge function.
 * This is kept as a no-op for backward compatibility with any callers.
 */
export async function checkAndUnlockIfEligible(_userId: string): Promise<void> {
  // Server-side cron handles lesson generation and unlocking
}

/**
 * Save accumulated screen time for a lesson
 * Accumulates time if record already exists
 */
export async function saveLessonTime(
  userId: string,
  contentSlug: string,
  timeSeconds: number
): Promise<void> {
  if (timeSeconds <= 0) return;

  try {
    const { error } = await supabase.rpc('save_lesson_time', {
      p_user_id: userId,
      p_content_slug: contentSlug,
      p_time_seconds: timeSeconds,
    });

    if (error) {
      console.error('Error saving lesson time:', error);
      throw error;
    }

    console.log(`Saved ${timeSeconds}s for lesson ${contentSlug}`);
  } catch (error) {
    console.error('Error in saveLessonTime:', error);
    throw error;
  }
}

/**
 * Increment read count when revisiting a completed lesson
 */
export async function incrementLessonReadCount(
  userId: string,
  contentSlug: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc('increment_lesson_read_count', {
      p_user_id: userId,
      p_content_slug: contentSlug,
    });

    if (error) {
      console.error('Error incrementing read count:', error);
      throw error;
    }

    console.log(`Incremented read count for lesson ${contentSlug}`);
  } catch (error) {
    console.error('Error in incrementLessonReadCount:', error);
    throw error;
  }
}
