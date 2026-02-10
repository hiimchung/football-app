# PayPal Integration Setup Guide

## Current Status
Your app is ready for PayPal integration, but you need to configure your PayPal credentials.

## What You Need to Do

### 1. Create a PayPal Developer Account
- Go to https://developer.paypal.com/
- Sign in or create an account
- Access the Developer Dashboard

### 2. Create a PayPal App
- In the PayPal Developer Dashboard, go to "Apps & Credentials"
- Click "Create App"
- Choose a name for your app (e.g., "Football Organizer")
- Select "Merchant" as the app type

### 3. Get Your Credentials
After creating the app, you'll see:
- **Client ID** - Copy this
- **Secret** - Click "Show" and copy this

### 4. Set Up Subscription Plans
You need to create two subscription plans in PayPal:

#### Pro Player Plan ($9.99/month)
1. Go to PayPal Dashboard > Products > Subscriptions
2. Create a new plan:
   - Name: "Pro Player Subscription"
   - Billing cycle: Monthly
   - Price: $9.99 USD
3. Copy the Plan ID (format: P-XXXXXXXXXXXX)

#### Organizer Pro Plan ($19.99/month)
1. Create another plan:
   - Name: "Organizer Pro Subscription"
   - Billing cycle: Monthly
   - Price: $19.99 USD
2. Copy the Plan ID

### 5. Configure Supabase Edge Function Secrets
Go to your Supabase Project Dashboard:
1. Navigate to Edge Functions > Settings
2. Add these secrets:
   - `PAYPAL_CLIENT_ID` - Your Client ID from step 3
   - `PAYPAL_SECRET` - Your Secret from step 3
   - `PAYPAL_BASE_URL` - Use:
     - `https://api-m.sandbox.paypal.com` (for testing)
     - `https://api-m.paypal.com` (for production)

### 6. Update Plan IDs in Code
After creating the subscription plans, update the Plan IDs in:
`supabase/functions/create-paypal-subscription/index.ts`

Replace the planId values:
```typescript
const PAYPAL_PLANS: Record<string, PayPalPlan> = {
  pro_player: {
    planId: 'YOUR_PRO_PLAYER_PLAN_ID',  // Replace this
    name: 'Pro Player Subscription',
    amount: '9.99',
  },
  organizer_pro: {
    planId: 'YOUR_ORGANIZER_PRO_PLAN_ID',  // Replace this
    name: 'Organizer Pro Subscription',
    amount: '19.99',
  },
};
```

## Testing
1. Use PayPal Sandbox accounts for testing
2. Test the subscription flow in your app
3. Verify webhooks are working (if configured)

## Going Live
When ready for production:
1. Switch from Sandbox to Live credentials
2. Update `PAYPAL_BASE_URL` to `https://api-m.paypal.com`
3. Create live subscription plans
4. Update Plan IDs to live Plan IDs

## Troubleshooting
- **"PayPal credentials not configured"** - Check that all secrets are set in Supabase
- **"Failed to create PayPal subscription"** - Verify Plan IDs are correct
- **400 errors** - Check that subscription plans exist and are active in PayPal

## Need Help?
- PayPal Developer Documentation: https://developer.paypal.com/docs/
- PayPal Subscriptions API: https://developer.paypal.com/docs/subscriptions/
