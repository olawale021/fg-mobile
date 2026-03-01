// Edge Function: RevenueCat Webhook Handler
// Deploy: supabase functions deploy revenuecat-webhook
// Set secret: supabase secrets set REVENUECAT_WEBHOOK_SECRET=your-secret

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Validate webhook auth header
  const webhookSecret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')
  const authHeader = req.headers.get('authorization')

  if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const body = await req.json()
    const event = body.event

    if (!event) {
      return new Response(JSON.stringify({ error: 'Missing event' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const eventType: string = event.type
    const appUserId: string = event.app_user_id
    const productId: string = event.product_id ?? null
    const expirationAtMs: number | null = event.expiration_at_ms ?? null
    const purchaseDateMs: number | null = event.purchase_date_ms ?? null

    // app_user_id should be the Supabase user UUID
    if (!appUserId) {
      return new Response(JSON.stringify({ error: 'Missing app_user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let status: string

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
      case 'UNCANCELLATION':
        status = 'active'
        break
      case 'CANCELLATION':
        status = 'cancelled'
        break
      case 'EXPIRATION':
        status = 'expired'
        break
      case 'BILLING_ISSUE_DETECTED':
        status = 'billing_issue'
        break
      case 'SUBSCRIBER_ALIAS':
        // Alias events don't change subscription status — acknowledge and skip
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      default:
        // Unknown event type — acknowledge to prevent retries
        console.log(`Unhandled RevenueCat event type: ${eventType}`)
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    const upsertData: Record<string, unknown> = {
      user_id: appUserId,
      product_id: productId,
      status,
      updated_at: new Date().toISOString(),
    }

    if (purchaseDateMs) {
      upsertData.current_period_start = new Date(purchaseDateMs).toISOString()
    }
    if (expirationAtMs) {
      upsertData.current_period_end = new Date(expirationAtMs).toISOString()
    }

    const { error } = await supabase
      .from('subscriptions')
      .upsert(upsertData, { onConflict: 'user_id' })

    if (error) {
      console.error('Error upserting subscription:', error)
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
