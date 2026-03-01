// Supabase Edge Function: Lesson Reminder
// Sends push notifications to users with 3+ uncompleted lessons (Tue & Fri at 10am local time)
// Deploy with: supabase functions deploy lesson-reminder

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface User {
  id: string
  timezone: string
  expo_push_token: string | null
  signup_completed_at: string | null
  push_notifications_enabled: boolean
}

/**
 * Check if it's currently 11am (11:00-11:59) in a given timezone
 */
function is11amInTimezone(timezone: string): boolean {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    })
    const hour = parseInt(formatter.format(now))
    return hour === 11
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`)
    return false
  }
}

/**
 * Send push notification via Expo's push service
 */
async function sendPushNotification(pushToken: string, title: string, body: string, data: Record<string, string>): Promise<boolean> {
  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data,
        sound: 'default',
      }),
    })

    const result = await response.json()
    console.log(`Push notification response for token ${pushToken}:`, JSON.stringify(result))

    const ticket = Array.isArray(result.data) ? result.data[0] : result.data
    if (ticket) {
      if (ticket.status === 'error') {
        console.error(`Push notification failed: ${ticket.message}`, ticket.details)
        return false
      }
      if (ticket.status === 'ok') {
        console.log(`Push notification sent successfully, ticket ID: ${ticket.id}`)
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error sending push notification:', error)
    return false
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for force flag (bypasses day/time checks for testing)
    let force = false
    try {
      const body = await req.json()
      force = body?.force === true
    } catch {
      // No body or invalid JSON — that's fine, default to false
    }

    console.log(`Starting lesson reminder job...${force ? ' (FORCE MODE)' : ''}`)

    // Get all users who have completed signup with valid push tokens
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, timezone, expo_push_token, signup_completed_at, push_notifications_enabled')
      .not('signup_completed_at', 'is', null)
      .not('expo_push_token', 'is', null)
      .eq('push_notifications_enabled', true)

    if (usersError) {
      throw usersError
    }

    console.log(`Found ${users?.length || 0} eligible users`)

    let usersChecked = 0
    let notificationsSent = 0

    for (const user of (users || []) as User[]) {
      const timezone = user.timezone || 'Europe/London'

      // Skip if not 10am in user's timezone (unless force mode)
      if (!force && !is11amInTimezone(timezone)) {
        continue
      }

      usersChecked++

      // Count uncompleted lessons
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

      if (uncompletedCount < 3) {
        continue
      }

      console.log(`User ${user.id}: ${uncompletedCount} uncompleted lessons, sending reminder`)

      // Rotate through messages for variety
      const messages = [
        { title: 'Keep building momentum', body: `You have ${uncompletedCount} lessons waiting. Complete them to unlock fresh insights — great founders never leave growth on the table.` },
        { title: 'Your next breakthrough is close', body: `${uncompletedCount} lessons stand between you and new content. Knock them out — every lesson completed unlocks the next step forward.` },
        { title: "Don't let your momentum stall", body: `You've got ${uncompletedCount} lessons to finish before new ones unlock. The best founders show up even on the hard days.` },
        { title: 'New lessons are on hold', body: `Complete your ${uncompletedCount} waiting lessons to unlock new ones. 5 minutes today keeps your founder journey moving.` },
      ]
      const msg = messages[Math.floor(Math.random() * messages.length)]

      const sent = await sendPushNotification(
        user.expo_push_token!,
        msg.title,
        msg.body,
        { type: 'lesson-reminder', uncompletedCount: String(uncompletedCount) },
      )

      if (sent) {
        notificationsSent++
      }
    }

    const result = {
      success: true,
      usersChecked,
      notificationsSent,
      timestamp: new Date().toISOString(),
    }

    console.log('Lesson reminder job completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in lesson-reminder:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
