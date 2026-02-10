import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  plan: 'pro_player' | 'organizer_pro';
}

interface PlanConfig {
  name: string;
  description: string;
  amount: string;
  interval: 'MONTH' | 'YEAR';
}

const PLAN_CONFIGS: Record<string, PlanConfig> = {
  pro_player: {
    name: 'Pro Player',
    description: 'Advanced stats, priority matchmaking, and premium features for players.',
    amount: '9.99',
    interval: 'MONTH',
  },
  organizer_pro: {
    name: 'Organizer Pro',
    description: 'Unlimited games, advanced management tools, and premium organizer features.',
    amount: '19.99',
    interval: 'MONTH',
  },
};

function getPayPalBaseUrl(): string {
  return Deno.env.get('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_SECRET');

  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${secret}`);

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal OAuth failed: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createPayPalProduct(accessToken: string, config: PlanConfig): Promise<string> {
  const response = await fetch(`${getPayPalBaseUrl()}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: config.name,
      description: config.description,
      type: 'SERVICE',
      category: 'SOFTWARE',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create PayPal product: ${errorText}`);
  }

  const data = await response.json();
  return data.id;
}

async function createPayPalBillingPlan(
  accessToken: string,
  productId: string,
  config: PlanConfig
): Promise<string> {
  const response = await fetch(`${getPayPalBaseUrl()}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      name: `${config.name} Monthly`,
      description: config.description,
      billing_cycles: [
        {
          frequency: {
            interval_unit: config.interval,
            interval_count: 1,
          },
          tenure_type: 'REGULAR',
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: config.amount,
              currency_code: 'USD',
            },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 3,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create PayPal billing plan: ${errorText}`);
  }

  const data = await response.json();
  return data.id;
}

async function getOrCreatePayPalPlanId(
  accessToken: string,
  planKey: string,
  config: PlanConfig,
  supabase: any
): Promise<string> {
  const { data: existingPlan } = await supabase
    .from('paypal_plans')
    .select('paypal_plan_id')
    .eq('plan_key', planKey)
    .maybeSingle();

  if (existingPlan?.paypal_plan_id) {
    return existingPlan.paypal_plan_id;
  }

  const productId = await createPayPalProduct(accessToken, config);
  const billingPlanId = await createPayPalBillingPlan(accessToken, productId, config);

  await supabase.from('paypal_plans').insert({
    plan_key: planKey,
    paypal_product_id: productId,
    paypal_plan_id: billingPlanId,
    name: config.name,
    amount: parseFloat(config.amount),
    currency: 'USD',
  });

  return billingPlanId;
}

async function createPayPalSubscription(
  accessToken: string,
  planId: string,
  returnUrl: string,
  cancelUrl: string
): Promise<{ subscriptionId: string; approvalUrl: string }> {
  const response = await fetch(`${getPayPalBaseUrl()}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      application_context: {
        brand_name: 'Football Organizer',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = 'Failed to create PayPal subscription';
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.details?.length > 0) {
        const detail = errorData.details[0];
        errorMessage = `PayPal Error: ${detail.issue || errorData.message}. ${detail.description || ''}`;
      } else if (errorData.message) {
        errorMessage = `PayPal Error: ${errorData.message}`;
      }
    } catch {
      errorMessage = `PayPal Error: ${errorText}`;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const approvalUrl = data.links.find((link: any) => link.rel === 'approve')?.href;

  if (!approvalUrl) {
    throw new Error('No approval URL returned from PayPal');
  }

  return { subscriptionId: data.id, approvalUrl };
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { plan }: RequestBody = await req.json();

    if (!plan || !PLAN_CONFIGS[plan]) {
      throw new Error('Invalid plan selected');
    }

    const config = PLAN_CONFIGS[plan];
    const accessToken = await getPayPalAccessToken();
    const paypalPlanId = await getOrCreatePayPalPlanId(accessToken, plan, config, supabase);

    const appUrl = Deno.env.get('APP_URL') || 'https://example.com';
    const returnUrl = `${appUrl}/payment-success`;
    const cancelUrl = `${appUrl}/payment-cancelled`;

    const { subscriptionId, approvalUrl } = await createPayPalSubscription(
      accessToken,
      paypalPlanId,
      returnUrl,
      cancelUrl
    );

    const { error: dbError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        paypal_subscription_id: subscriptionId,
        plan,
        status: 'pending',
        amount: parseFloat(config.amount),
        currency: 'USD',
      });

    if (dbError) {
      console.error('Database error:', dbError);
    }

    return new Response(
      JSON.stringify({ success: true, subscriptionId, approvalUrl }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
