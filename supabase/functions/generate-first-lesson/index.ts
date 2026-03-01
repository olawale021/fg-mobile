// Edge Function: Generate first AI lesson at signup
// Deploy: supabase functions deploy generate-first-lesson

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

interface GeneratedLesson {
  title: string
  slug: string
  description: string
  content: {
    intro: string
    quickBreakdown: { title: string; description: string }[]
    rememberThis: { title: string; content: string }
  }
  category_slug: string
  topic_summary: string
}

async function generateLesson(
  openaiKey: string,
  categorySlug: string,
  previousTopics: string[],
): Promise<GeneratedLesson> {
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

  // Validate structure
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify auth from request
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')!
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await authClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    console.log(`Generating first lesson for user ${user.id}`)

    // Check if user already has generated lessons (idempotency)
    const { data: existing } = await supabase
      .from('generated_lessons')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`User ${user.id} already has generated lessons, skipping`)
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Get user's weak areas to pick a category
    const { data: weakAreas } = await supabase
      .from('weak_areas')
      .select('category')
      .eq('user_id', user.id)
      .eq('is_addressed', false)
      .order('priority', { ascending: true })

    let categorySlug: string
    if (weakAreas && weakAreas.length > 0) {
      // Pick the highest priority weak area category
      const topCategory = weakAreas[0].category
      categorySlug = CATEGORY_NAME_TO_SLUG[topCategory] || CATEGORY_SLUGS[0]
    } else {
      // Default to problem-clarity for first lesson
      categorySlug = 'problem-clarity'
    }

    // Generate the lesson
    const lesson = await generateLesson(openaiKey, categorySlug, [])

    // Make slug unique per user by appending lesson number
    const uniqueSlug = `${lesson.slug}-${user.id.substring(0, 8)}-1`

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
        lesson_number: 1,
        content: lesson.content,
        topic_summary: lesson.topic_summary,
      })

    if (insertError) {
      console.error('Error inserting generated lesson:', insertError)
      throw insertError
    }

    // Unlock the lesson for the user
    const { error: unlockError } = await supabase
      .from('user_lesson_unlocks')
      .insert({
        user_id: user.id,
        content_slug: uniqueSlug,
        unlock_order: 1,
        unlocked_at: new Date().toISOString(),
      })

    if (unlockError) {
      console.error('Error unlocking lesson:', unlockError)
      throw unlockError
    }

    // Update last unlock date and mark signup completed
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('users')
      .update({
        last_unlock_date: today,
        signup_completed_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    console.log(`Generated and unlocked first lesson "${lesson.title}" for user ${user.id}`)

    return new Response(JSON.stringify({ success: true, slug: uniqueSlug, title: lesson.title }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error generating first lesson:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
