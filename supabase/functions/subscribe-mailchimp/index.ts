// Supabase Edge Function: Subscribe to Mailchimp
// This function adds new users to the Mailchimp mailing list
// Deploy with: supabase functions deploy subscribe-mailchimp

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscribeRequest {
  email: string
  firstName: string
  lastName: string
  location: string
}

interface MailchimpError {
  status?: number
  title?: string
  detail?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('subscribe-mailchimp function called')

  try {
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body))

    const { email, firstName, lastName, location }: SubscribeRequest = body

    // Validate required fields
    if (!email || !firstName || !lastName || !location) {
      console.error('Missing required fields:', { email: !!email, firstName: !!firstName, lastName: !!lastName, location: !!location })
      return new Response(
        JSON.stringify({ error: 'Missing required fields', details: { email: !!email, firstName: !!firstName, lastName: !!lastName, location: !!location } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Get Mailchimp credentials from environment
    const apiKey = Deno.env.get('MAILCHIMP_API_KEY')
    const listId = Deno.env.get('MAILCHIMP_LIST_ID')
    const serverPrefix = Deno.env.get('MAILCHIMP_SERVER_PREFIX')
    const tag = Deno.env.get('MAILCHIMP_TAG')

    console.log('Environment check:', {
      hasApiKey: !!apiKey,
      hasListId: !!listId,
      hasServerPrefix: !!serverPrefix,
      serverPrefix: serverPrefix || 'not set'
    })

    if (!apiKey || !listId || !serverPrefix) {
      console.error('Missing Mailchimp environment variables:', {
        MAILCHIMP_API_KEY: !!apiKey,
        MAILCHIMP_LIST_ID: !!listId,
        MAILCHIMP_SERVER_PREFIX: !!serverPrefix
      })
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          missing: {
            MAILCHIMP_API_KEY: !apiKey,
            MAILCHIMP_LIST_ID: !listId,
            MAILCHIMP_SERVER_PREFIX: !serverPrefix
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Mailchimp API endpoint
    const mailchimpUrl = `https://${serverPrefix}.api.mailchimp.com/3.0/lists/${listId}/members`

    // Prepare request body
    const mailchimpBody: Record<string, unknown> = {
      email_address: email,
      status: 'subscribed',
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName,
        COUNTRY: location,
      },
    }

    // Add tag if configured
    if (tag) {
      mailchimpBody.tags = [tag]
    }

    // Make request to Mailchimp API
    const response = await fetch(mailchimpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`anystring:${apiKey}`)}`,
      },
      body: JSON.stringify(mailchimpBody),
    })

    const data = await response.json()

    if (!response.ok) {
      const error = data as MailchimpError

      // Handle specific Mailchimp errors
      if (error.title === 'Member Exists') {
        console.log(`Email already subscribed: ${email}`)
        return new Response(
          JSON.stringify({ success: true, message: 'Already subscribed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      if (error.title === 'Invalid Resource') {
        return new Response(
          JSON.stringify({ error: 'Invalid email address' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      console.error('Mailchimp error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to subscribe' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log(`Successfully subscribed: ${email}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Successfully subscribed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error in subscribe-mailchimp:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
