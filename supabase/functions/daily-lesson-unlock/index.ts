// Supabase Edge Function: Daily Lesson Unlock
// This function runs on a schedule (via cron) to generate and unlock AI lessons for users at 8am their local time
// Deploy with: supabase functions deploy daily-lesson-unlock

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

const CATEGORY_SLUGS = [
  'problem-clarity',
  'customer-understanding',
  'product-development',
  'traction-validation',
  'execution-consistency',
  'team-building',
  'founder-identity',
]

const CATEGORY_LABELS: Record<string, string> = {
  'problem-clarity': 'Problem Clarity',
  'customer-understanding': 'Customer Understanding',
  'product-development': 'Product Development',
  'traction-validation': 'Traction & Validation',
  'execution-consistency': 'Execution Consistency',
  'team-building': 'Team Building',
  'founder-identity': 'Founder Identity',
}

const CATEGORY_NAME_TO_SLUG: Record<string, string> = {
  'Problem Clarity': 'problem-clarity',
  'Customer Understanding': 'customer-understanding',
  'Product Development': 'product-development',
  'Traction & Validation': 'traction-validation',
  'Execution Consistency': 'execution-consistency',
  'Team Building': 'team-building',
  'Founder Identity': 'founder-identity',
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
async function sendPushNotification(pushToken: string, title: string, body: string): Promise<boolean> {
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
        data: { type: 'daily-lesson' },
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

/**
 * Generate a lesson using OpenAI
 */
async function generateLesson(
  openaiKey: string,
  categorySlug: string,
  previousTopics: string[],
) {
  const categoryLabel = CATEGORY_LABELS[categorySlug] || categorySlug

  const avoidTopics = previousTopics.length > 0
    ? `\n\nIMPORTANT: Do NOT cover these topics that were already taught:\n${previousTopics.map(t => `- ${t}`).join('\n')}`
    : ''

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a startup education expert creating lessons for first-time founders. Generate a practical, actionable lesson for the category "${categoryLabel}".

The lesson must be JSON with this exact structure:
{
  "title": "Short compelling title (4-7 words)",
  "slug": "kebab-case-slug-matching-title",
  "description": "One sentence describing what the founder will learn.",
  "content": {
    "intro": "Picture this:\\nA 2-3 paragraph real-world scenario that a first-time founder would face. Make it vivid, specific, and relatable. Use second person (you). End by revealing the core lesson insight.",
    "quickBreakdown": [
      { "title": "Short point with period.", "description": "2-3 practical sentences explaining this point. Be specific and actionable." },
      { "title": "Short point with period.", "description": "2-3 practical sentences explaining this point. Be specific and actionable." },
      { "title": "Short point with period.", "description": "2-3 practical sentences explaining this point. Be specific and actionable." }
    ],
    "rememberThis": { "title": "Remember this:", "content": "One memorable sentence that captures the core lesson." }
  },
  "topic_summary": "2-5 word summary of the specific topic covered"
}

Rules:
- Exactly 3 breakdown points
- Write for someone with zero startup experience
- Be direct, practical, no fluff
- Use real-world examples and specific numbers where possible
- The intro must start with "Picture this:\\n"
- Each breakdown title must end with a period
- Keep it concise — the whole lesson should take ~5 minutes to read${avoidTopics}`,
        },
        {
          role: 'user',
          content: `Generate a lesson about "${categoryLabel}" for first-time founders.`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('OpenAI API error:', errorBody)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const result = await response.json()
  const parsed = JSON.parse(result.choices[0].message.content)

  if (!parsed.title || !parsed.slug || !parsed.content?.intro || !parsed.content?.quickBreakdown || !parsed.content?.rememberThis) {
    throw new Error('Invalid lesson structure from OpenAI')
  }

  return {
    title: parsed.title,
    slug: parsed.slug,
    description: parsed.description,
    content: {
      intro: parsed.content.intro,
      quickBreakdown: parsed.content.quickBreakdown,
      rememberThis: parsed.content.rememberThis,
    },
    category_slug: categorySlug,
    topic_summary: parsed.topic_summary || parsed.title,
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

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Check for force flag (bypasses 8am and already-unlocked-today checks for testing)
    let force = false
    try {
      const body = await req.json()
      force = body?.force === true
    } catch {
      // No body or invalid JSON — that's fine, default to false
    }

    console.log(`Starting daily lesson unlock job...${force ? ' (FORCE MODE)' : ''}`)

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
      if (user.current_streak_days > 0 && user.last_lesson_completed_date) {
        const lastCompletion = new Date(user.last_lesson_completed_date)
        const today = new Date(todayInTimezone)
        const daysDiff = Math.floor((today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24))

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

      // Skip if not 8am in user's timezone (unless force mode)
      if (!force && !is8amInTimezone(timezone)) {
        continue
      }

      // Skip if already unlocked today (unless force mode)
      if (!force && user.last_unlock_date === todayInTimezone) {
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

      // Get next lesson number
      const { data: lastLesson } = await supabase
        .from('generated_lessons')
        .select('lesson_number')
        .eq('user_id', user.id)
        .order('lesson_number', { ascending: false })
        .limit(1)
        .single()

      const nextLessonNumber = (lastLesson?.lesson_number || 0) + 1

      // Get user's weak areas to pick a category (cycle through them)
      const { data: weakAreas } = await supabase
        .from('weak_areas')
        .select('category')
        .eq('user_id', user.id)
        .eq('is_addressed', false)
        .order('priority', { ascending: true })

      let categorySlug: string
      if (weakAreas && weakAreas.length > 0) {
        // Cycle through weak categories based on lesson number
        const uniqueCategories = [...new Set(weakAreas.map(a => a.category))]
        const categoryIndex = (nextLessonNumber - 1) % uniqueCategories.length
        const categoryName = uniqueCategories[categoryIndex]
        categorySlug = CATEGORY_NAME_TO_SLUG[categoryName] || CATEGORY_SLUGS[0]
      } else {
        // Cycle through all categories
        categorySlug = CATEGORY_SLUGS[(nextLessonNumber - 1) % CATEGORY_SLUGS.length]
      }

      // Get previous topic summaries to avoid repeats
      const { data: previousLessons } = await supabase
        .from('generated_lessons')
        .select('topic_summary')
        .eq('user_id', user.id)
        .order('lesson_number', { ascending: false })
        .limit(20)

      const previousTopics = previousLessons?.map(l => l.topic_summary).filter(Boolean) || []

      try {
        // Generate lesson via OpenAI
        const lesson = await generateLesson(openaiKey, categorySlug, previousTopics)

        // Make slug unique per user
        const uniqueSlug = `${lesson.slug}-${user.id.substring(0, 8)}-${nextLessonNumber}`

        // Insert into generated_lessons
        const { error: insertError } = await supabase
          .from('generated_lessons')
          .insert({
            user_id: user.id,
            slug: uniqueSlug,
            title: lesson.title,
            description: lesson.description,
            category_slug: lesson.category_slug,
            estimated_duration_minutes: 5,
            lesson_number: nextLessonNumber,
            content: lesson.content,
            topic_summary: lesson.topic_summary,
          })

        if (insertError) {
          console.error(`Error inserting lesson for user ${user.id}:`, insertError)
          continue
        }

        // Unlock the lesson
        const { error: unlockError } = await supabase
          .from('user_lesson_unlocks')
          .insert({
            user_id: user.id,
            content_slug: uniqueSlug,
            unlock_order: nextLessonNumber,
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
        console.log(`User ${user.id}: Generated and unlocked lesson "${lesson.title}" (#${nextLessonNumber})`)

        // Send push notification if user has a token and notifications are enabled
        if (user.expo_push_token && user.push_notifications_enabled !== false) {
          const sent = await sendPushNotification(
            user.expo_push_token,
            'New lesson unlocked',
            'Great founders never stop learning. Dive in.'
          )
          if (sent) {
            notificationsSent++
          }
        }
      } catch (genError) {
        console.error(`Error generating lesson for user ${user.id}:`, genError)
        continue
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
