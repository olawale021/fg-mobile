// Edge Function: AI-powered lesson Q&A
// Deploy: supabase functions deploy ask-lesson-question
// Set secret: supabase secrets set OPENAI_API_KEY=sk-...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { question, lessonTitle, lessonDescription, lessonIntro, lessonBreakdown, rememberThis } = await req.json()

    if (!question || !lessonTitle) {
      return new Response(JSON.stringify({ error: 'Missing question or lesson data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        messages: [
          {
            role: 'system',
            content: 'You are a teaching assistant for Podium. ONLY answer questions directly related to the lesson content provided. If the question is unrelated to the lesson, reply: "I can only help with questions about this lesson. Try asking something related to the topic!" Give short, precise answers in 2-3 sentences max. Be direct and practical. No markdown, no bullet points, no headings.',
          },
          {
            role: 'user',
            content: `Lesson: ${lessonTitle}\n\nDescription: ${lessonDescription}\n\nIntro: ${lessonIntro}\n\nKey Points:\n${lessonBreakdown}\n\nKey Takeaway: ${rememberThis}\n\n---\n\nStudent question: ${question}`,
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
    const answer = result.choices[0]?.message?.content || 'Sorry, I could not generate an answer.'

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
