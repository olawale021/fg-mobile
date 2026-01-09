// Supabase Edge Function: Delete User Account
// This function archives user data and deletes the auth account
// Deploy with: supabase functions deploy delete-user

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header to identify the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Create Supabase client with the user's JWT to verify identity
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client with user's token to get their ID
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get the current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Get deletion reason from request body
    let deletionReason = 'No reason provided'
    try {
      const body = await req.json()
      if (body?.reason) {
        deletionReason = body.reason
      }
    } catch (e) {
      // No body or invalid JSON, use default reason
    }

    console.log(`Archiving and deleting user account: ${user.id} (${user.email}) - Reason: ${deletionReason}`)

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch user profile data
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // Fetch test responses
    const { data: testResponses } = await supabaseAdmin
      .from('test_responses')
      .select('*')
      .eq('user_id', user.id)

    // Fetch weak areas
    const { data: weakAreas } = await supabaseAdmin
      .from('user_weak_areas')
      .select('*')
      .eq('user_id', user.id)

    // Archive to deleted_accounts table
    const { error: archiveError } = await supabaseAdmin
      .from('deleted_accounts')
      .insert({
        original_user_id: user.id,
        email: user.email,
        first_name: userData?.first_name,
        last_name: userData?.last_name,
        location: userData?.location,
        base_score: userData?.base_score,
        score_band: userData?.score_band,
        total_content_completed: userData?.total_content_completed,
        current_streak_days: userData?.current_streak_days,
        longest_streak_days: userData?.longest_streak_days,
        signup_completed_at: userData?.signup_completed_at,
        original_created_at: userData?.created_at,
        deleted_at: new Date().toISOString(),
        deletion_reason: deletionReason,
        user_data: userData,
        test_responses: testResponses,
        weak_areas: weakAreas,
      })

    if (archiveError) {
      console.error('Error archiving user data:', archiveError)
      // Continue anyway - we still want to delete the account
    } else {
      console.log('User data archived successfully')
    }

    // Now delete user data from active tables
    // Delete lesson completions
    await supabaseAdmin
      .from('user_lesson_completions')
      .delete()
      .eq('user_id', user.id)

    // Delete lesson unlocks
    await supabaseAdmin
      .from('user_lesson_unlocks')
      .delete()
      .eq('user_id', user.id)

    // Delete lesson queue
    await supabaseAdmin
      .from('user_lesson_queue')
      .delete()
      .eq('user_id', user.id)

    // Delete weak areas
    await supabaseAdmin
      .from('user_weak_areas')
      .delete()
      .eq('user_id', user.id)

    // Delete test responses
    await supabaseAdmin
      .from('test_responses')
      .delete()
      .eq('user_id', user.id)

    // Delete user profile
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id)

    // Delete the auth user using admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete account', details: deleteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log(`Successfully deleted user: ${user.id}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in delete-user:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
