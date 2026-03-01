// Test Push Notification Function
// Scheduled to run at 6:45 AM UK time for testing
// Deploy: supabase functions deploy test-push-notification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Test user email - change this to your email
const TEST_USER_EMAIL = 'olawalefilani112@gmail.com'

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
        data: { type: 'test-notification' },
        sound: 'default',
      }),
    })

    const result = await response.json()
    console.log('Expo push response:', JSON.stringify(result, null, 2))

    // Expo returns object for single push, array for batch
    const ticket = Array.isArray(result.data) ? result.data[0] : result.data
    if (ticket) {
      if (ticket.status === 'error') {
        console.error(`Push failed: ${ticket.message}`, ticket.details)
        return false
      }
      if (ticket.status === 'ok') {
        console.log(`Push sent! Ticket ID: ${ticket.id}`)
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error sending push:', error)
    return false
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

    console.log('=== TEST PUSH NOTIFICATION ===')
    console.log('Time:', new Date().toISOString())

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, expo_push_token, push_notifications_enabled')
      .eq('email', TEST_USER_EMAIL)
      .single()

    if (error || !user) {
      console.error('User not found:', error)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    console.log('User:', user.email)
    console.log('Token:', user.expo_push_token)
    console.log('Notifications enabled:', user.push_notifications_enabled)

    if (!user.expo_push_token) {
      return new Response(JSON.stringify({ error: 'No push token for user' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const sent = await sendPushNotification(
      user.expo_push_token,
      '🧪 Test from Server',
      'Scheduled test notification at 6:45 AM UK time'
    )

    const result = {
      success: sent,
      user: user.email,
      token: user.expo_push_token,
      timestamp: new Date().toISOString(),
    }

    console.log('Result:', result)

    return new Response(JSON.stringify(result), {
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
