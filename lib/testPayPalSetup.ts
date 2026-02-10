import { supabase } from './supabase';

export async function testPayPalSetup(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return {
        success: false,
        message: 'Not authenticated. Please log in first.',
      };
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl) {
      return {
        success: false,
        message: 'EXPO_PUBLIC_SUPABASE_URL environment variable is not set',
      };
    }

    const apiUrl = `${supabaseUrl}/functions/v1/create-paypal-subscription`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan: 'pro_player' }),
    });

    const data = await response.json();

    return {
      success: response.ok && data.success,
      message: data.success
        ? 'PayPal is configured correctly!'
        : data.error || 'PayPal setup incomplete',
      details: {
        status: response.status,
        response: data,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
