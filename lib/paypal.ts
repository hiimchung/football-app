import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

export type SubscriptionPlan = 'pro_player' | 'organizer_pro';

interface PayPalResponse {
  success: boolean;
  approvalUrl?: string;
  subscriptionId?: string;
  orderId?: string;
  error?: string;
}

export async function startPayPalCheckout(url: string): Promise<WebBrowser.WebBrowserResult> {
  return await WebBrowser.openBrowserAsync(url, {
    dismissButtonStyle: 'close',
    readerMode: false,
    controlsColor: '#007AFF',
    toolbarColor: '#ffffff',
  });
}

export async function subscribeToPlan(plan: SubscriptionPlan): Promise<PayPalResponse> {
  try {
    console.log('Starting subscription process for plan:', plan);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.error('No session found');
      throw new Error('User not authenticated. Please log in again.');
    }

    console.log('User authenticated, session found');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      console.error('EXPO_PUBLIC_SUPABASE_URL is not defined');
      throw new Error('Configuration error: Supabase URL not found');
    }

    const apiUrl = `${supabaseUrl}/functions/v1/create-paypal-subscription`;
    console.log('Calling edge function:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan }),
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response body:', responseText);

    let data: PayPalResponse;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw new Error('Invalid response from server. Please check if PayPal is configured.');
    }

    if (!data.success || !data.approvalUrl) {
      console.error('Subscription creation failed:', data.error);
      throw new Error(data.error || 'Failed to create subscription. Please check PayPal configuration.');
    }

    console.log('Opening PayPal checkout:', data.approvalUrl);
    await startPayPalCheckout(data.approvalUrl);

    return data;
  } catch (error) {
    console.error('Subscribe to plan error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function payForBoost(amount: number, gameId?: string): Promise<PayPalResponse> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('User not authenticated');
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const apiUrl = `${supabaseUrl}/functions/v1/create-paypal-payment`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        gameId,
        description: 'Boost Game',
      }),
    });

    const data: PayPalResponse = await response.json();

    if (!data.success || !data.approvalUrl) {
      throw new Error(data.error || 'Failed to create payment');
    }

    await startPayPalCheckout(data.approvalUrl);

    return data;
  } catch (error) {
    console.error('Pay for boost error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getUserSubscriptions() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get user subscriptions error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function getActiveSubscription(plan: SubscriptionPlan) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('plan', plan)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Get active subscription error:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function hasActiveSubscription(plan: SubscriptionPlan): Promise<boolean> {
  const { data } = await getActiveSubscription(plan);

  if (!data) {
    return false;
  }

  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at);
    const now = new Date();
    return expiresAt > now;
  }

  return true;
}

export async function isProPlayer(): Promise<boolean> {
  return await hasActiveSubscription('pro_player');
}

export async function isOrganizerPro(): Promise<boolean> {
  return await hasActiveSubscription('organizer_pro');
}
