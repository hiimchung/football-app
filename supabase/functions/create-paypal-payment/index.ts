import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  amount: number;
  gameId?: string;
  description?: string;
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_SECRET');
  const baseUrl = Deno.env.get('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';

  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${secret}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function createPayPalOrder(
  accessToken: string,
  amount: number,
  description: string,
  returnUrl: string,
  cancelUrl: string
): Promise<{ orderId: string; approvalUrl: string }> {
  const baseUrl = Deno.env.get('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';

  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          description,
          amount: {
            currency_code: 'USD',
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'Football Organizer',
        locale: 'en-US',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal order creation failed:', error);
    throw new Error('Failed to create PayPal order');
  }

  const data = await response.json();
  const approvalUrl = data.links.find((link: any) => link.rel === 'approve')?.href;

  if (!approvalUrl) {
    throw new Error('No approval URL returned from PayPal');
  }

  return {
    orderId: data.id,
    approvalUrl,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { amount, gameId, description }: RequestBody = await req.json();

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount');
    }

    const accessToken = await getPayPalAccessToken();

    const appUrl = Deno.env.get('APP_URL') || 'exp://localhost:8081';
    const returnUrl = `${appUrl}/payment-success`;
    const cancelUrl = `${appUrl}/payment-cancelled`;

    const paymentDescription = description || 'Boost Game';

    const { orderId, approvalUrl } = await createPayPalOrder(
      accessToken,
      amount,
      paymentDescription,
      returnUrl,
      cancelUrl
    );

    const { error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        paypal_order_id: orderId,
        plan: 'boost_game',
        status: 'pending',
        amount,
        currency: 'USD',
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save payment record');
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        approvalUrl,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
