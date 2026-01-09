// Supabase Edge Function: Daily Lesson Unlock
// This function runs on a schedule (via cron) to unlock lessons for users at 8am their local time
// Deploy with: supabase functions deploy daily-lesson-unlock
// Schedule with pg_cron or Supabase Scheduled Functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface User {
  id: string
  timezone: string
  last_unlock_date: string | null
  expo_push_token: string | null
  signup_completed_at: string | null
  push_notifications_enabled: boolean
  current_streak_days: number
  last_lesson_completed_date: string | null
}

/**
 * Check if it's currently 8am (8:00-8:59) in a given timezone
 */
function is8amInTimezone(timezone: string): boolean {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    })
    const hour = parseInt(formatter.format(now))
    return hour === 8
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`)
    return false
  }
}

/**
 * Get today's date in user's timezone (YYYY-MM-DD format)
 */
function getTodayInTimezone(timezone: string): string {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
    })
    return formatter.format(now)
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`)
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Send push notification via Expo's push service
 */
async function sendPushNotification(pushToken: string, title: string, body: string): Promise<void> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data: { type: 'daily-lesson' },
        sound: 'default',
      }),
    })

    if (!response.ok) {
      console.error('Failed to send push notification:', await response.text())
    }
  } catch (error) {
    console.error('Error sending push notification:', error)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting daily lesson unlock job...')

    // Get all users who have completed signup
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, timezone, last_unlock_date, expo_push_token, signup_completed_at, push_notifications_enabled, current_streak_days, last_lesson_completed_date')
      .not('signup_completed_at', 'is', null)

    if (usersError) {
      throw usersError
    }

    console.log(`Found ${users?.length || 0} users with completed signup`)

    let unlocksPerformed = 0
    let notificationsSent = 0
    let streaksReset = 0

    for (const user of (users || []) as User[]) {
      const timezone = user.timezone || 'Europe/London'
      const todayInTimezone = getTodayInTimezone(timezone)

      // Check if streak needs to be reset (missed 2+ days)
      // Grace period: 1 day allowed, so reset if 3+ days since last completion
      if (user.current_streak_days > 0 && user.last_lesson_completed_date) {
        const lastCompletion = new Date(user.last_lesson_completed_date)
        const today = new Date(todayInTimezone)
        const daysDiff = Math.floor((today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24))

        // Reset streak if 3+ days have passed (1-day grace period means 2 days allowed)
        if (daysDiff >= 3) {
          const { error: resetError } = await supabase
            .from('users')
            .update({ current_streak_days: 0 })
            .eq('id', user.id)

          if (!resetError) {
            streaksReset++
            console.log(`User ${user.id}: Streak reset (${daysDiff} days since last completion)`)
          }
        }
      }

      // Skip if not 8am in user's timezone
      if (!is8amInTimezone(timezone)) {
        continue
      }

      // Skip if already unlocked today
      if (user.last_unlock_date === todayInTimezone) {
        continue
      }

      // Count uncompleted lessons (unlocked but not completed)
      const { data: unlocks } = await supabase
        .from('user_lesson_unlocks')
        .select('content_slug')
        .eq('user_id', user.id)

      const { data: completions } = await supabase
        .from('user_lesson_completions')
        .select('content_slug')
        .eq('user_id', user.id)
        .eq('status', 'completed')

      const unlockedCount = unlocks?.length || 0
      const completedCount = completions?.length || 0
      const uncompletedCount = unlockedCount - completedCount

      // Skip if backlog is full (3+ uncompleted lessons)
      if (uncompletedCount >= 3) {
        console.log(`User ${user.id}: Backlog full (${uncompletedCount} uncompleted), skipping`)
        continue
      }

      // Get next lesson position to unlock
      const { data: lastUnlock } = await supabase
        .from('user_lesson_unlocks')
        .select('unlock_order')
        .eq('user_id', user.id)
        .order('unlock_order', { ascending: false })
        .limit(1)
        .single()

      const nextPosition = (lastUnlock?.unlock_order || 0) + 1

      // Get the lesson at this position in the queue
      const { data: queueItem } = await supabase
        .from('user_lesson_queue')
        .select('content_slug')
        .eq('user_id', user.id)
        .eq('queue_position', nextPosition)
        .single()

      if (!queueItem) {
        console.log(`User ${user.id}: No more lessons in queue`)
        continue
      }

      // Unlock the lesson
      const { error: unlockError } = await supabase
        .from('user_lesson_unlocks')
        .insert({
          user_id: user.id,
          content_slug: queueItem.content_slug,
          unlock_order: nextPosition,
          unlocked_at: new Date().toISOString(),
        })

      if (unlockError) {
        console.error(`Error unlocking lesson for user ${user.id}:`, unlockError)
        continue
      }

      // Update last unlock date
      await supabase
        .from('users')
        .update({ last_unlock_date: todayInTimezone })
        .eq('id', user.id)

      unlocksPerformed++
      console.log(`User ${user.id}: Unlocked lesson ${queueItem.content_slug}`)

      // Send push notification if user has a token and notifications are enabled
      if (user.expo_push_token && user.push_notifications_enabled !== false) {
        await sendPushNotification(
          user.expo_push_token,
          'Your daily lesson is ready!',
          'Start learning today'
        )
        notificationsSent++
      }
    }

    const result = {
      success: true,
      usersProcessed: users?.length || 0,
      unlocksPerformed,
      notificationsSent,
      streaksReset,
      timestamp: new Date().toISOString(),
    }

    console.log('Job completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in daily-lesson-unlock:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
