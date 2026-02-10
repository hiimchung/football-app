import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PayPalWebhookEvent {
  event_type: string;
  resource: {
    id: string;
    status?: string;
    subscriber?: {
      email_address: string;
    };
    billing_agreement_id?: string;
  };
}

async function verifyWebhookSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');

  if (!webhookId) {
    console.warn('PayPal webhook ID not configured, skipping verification');
    return true;
  }

  const transmissionId = req.headers.get('PAYPAL-TRANSMISSION-ID');
  const transmissionTime = req.headers.get('PAYPAL-TRANSMISSION-TIME');
  const certUrl = req.headers.get('PAYPAL-CERT-URL');
  const authAlgo = req.headers.get('PAYPAL-AUTH-ALGO');
  const transmissionSig = req.headers.get('PAYPAL-TRANSMISSION-SIG');

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    console.error('Missing webhook signature headers');
    return false;
  }

  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_SECRET');
  const baseUrl = Deno.env.get('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';

  const auth = btoa(`${clientId}:${secret}`);

  const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenResponse.ok) {
    console.error('Failed to get PayPal access token');
    return false;
  }

  const { access_token } = await tokenResponse.json();

  const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    }),
  });

  if (!verifyResponse.ok) {
    console.error('Webhook verification failed');
    return false;
  }

  const verifyData = await verifyResponse.json();
  return verifyData.verification_status === 'SUCCESS';
}

async function handleSubscriptionActivated(
  supabase: any,
  subscriptionId: string
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('paypal_subscription_id', subscriptionId);

  if (error) {
    console.error('Failed to activate subscription:', error);
    throw error;
  }
}

async function handleSubscriptionCancelled(
  supabase: any,
  subscriptionId: string
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
    })
    .eq('paypal_subscription_id', subscriptionId);

  if (error) {
    console.error('Failed to cancel subscription:', error);
    throw error;
  }
}

async function handlePaymentCaptureCompleted(
  supabase: any,
  orderId: string
) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'completed',
    })
    .eq('paypal_order_id', orderId);

  if (error) {
    console.error('Failed to complete payment:', error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.text();
    const event: PayPalWebhookEvent = JSON.parse(body);

    const isValid = await verifyWebhookSignature(req, body);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Processing webhook event:', event.event_type);

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await handleSubscriptionActivated(supabase, event.resource.id);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(supabase, event.resource.id);
        break;

      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await handleSubscriptionCancelled(supabase, event.resource.id);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        if (event.resource.billing_agreement_id) {
          await handleSubscriptionActivated(supabase, event.resource.billing_agreement_id);
        } else {
          await handlePaymentCaptureCompleted(supabase, event.resource.id);
        }
        break;

      default:
        console.log('Unhandled event type:', event.event_type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
