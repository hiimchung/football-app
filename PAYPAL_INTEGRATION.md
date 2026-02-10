# PayPal Integration Guide

This guide explains how to set up and use PayPal payments in your Football Organizer app.

## Overview

The app supports three payment types:

1. **Pro Player Subscription** ($9.99/month) - Advanced stats and analytics
2. **Organizer Pro Subscription** ($19.99/month) - Unlimited games and boost features
3. **Boost Game** ($4.99 one-time) - Promote a single game

## Prerequisites

1. A PayPal Developer account
2. PayPal REST API credentials
3. Supabase project with the provided migrations applied

## Step 1: PayPal Setup

### 1.1 Create PayPal Developer Account

1. Go to [PayPal Developer](https://developer.paypal.com/)
2. Sign up or log in
3. Navigate to Dashboard

### 1.2 Create REST API App

1. Go to **Apps & Credentials**
2. Click **Create App**
3. Give your app a name (e.g., "Football Organizer")
4. Choose **Merchant** as the app type
5. Click **Create App**

### 1.3 Get API Credentials

From your app dashboard, copy:
- **Client ID**
- **Secret** (click "Show" to reveal)

### 1.4 Create Billing Plans

You need to create two billing plans in PayPal for subscriptions:

#### Pro Player Plan

1. Go to PayPal Developer Dashboard
2. Navigate to **Products & Services** → **Subscriptions**
3. Click **Create Plan**
4. Configure:
   - Plan Name: `Pro Player Subscription`
   - Product: Create new product "Pro Player"
   - Billing Cycle: Monthly
   - Price: $9.99 USD
5. Save and copy the **Plan ID** (format: `P-XXXXXXXXX`)

#### Organizer Pro Plan

1. Repeat the process above with:
   - Plan Name: `Organizer Pro Subscription`
   - Product: Create new product "Organizer Pro"
   - Billing Cycle: Monthly
   - Price: $19.99 USD
2. Save and copy the **Plan ID**

### 1.5 Update Edge Function

Update `/supabase/functions/create-paypal-subscription/index.ts`:

```typescript
const PAYPAL_PLANS: Record<string, PayPalPlan> = {
  pro_player: {
    planId: 'YOUR_PRO_PLAYER_PLAN_ID_HERE', // Replace with actual Plan ID
    name: 'Pro Player Subscription',
    amount: '9.99',
  },
  organizer_pro: {
    planId: 'YOUR_ORGANIZER_PRO_PLAN_ID_HERE', // Replace with actual Plan ID
    name: 'Organizer Pro Subscription',
    amount: '19.99',
  },
};
```

## Step 2: Environment Variables

Add these environment variables to your Supabase project:

### Via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Edge Functions**
3. Add the following secrets:

```bash
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com  # For sandbox testing
# PAYPAL_BASE_URL=https://api-m.paypal.com  # For production
PAYPAL_WEBHOOK_ID=your_webhook_id  # (Optional, for webhook verification)
APP_URL=exp://localhost:8081  # Your app URL for redirects
```

### For Testing (Sandbox)

Use `https://api-m.sandbox.paypal.com` as the base URL and sandbox credentials.

### For Production

1. Switch to live mode in PayPal Dashboard
2. Create new app credentials for production
3. Update `PAYPAL_BASE_URL` to `https://api-m.paypal.com`
4. Use production credentials

## Step 3: Webhook Setup (Optional but Recommended)

Webhooks automatically update subscription status in your database.

### 3.1 Create Webhook in PayPal

1. Go to PayPal Developer Dashboard
2. Navigate to **Webhooks**
3. Click **Add Webhook**
4. Configure:
   - Webhook URL: `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/paypal-webhook`
   - Event types to subscribe to:
     - `BILLING.SUBSCRIPTION.ACTIVATED`
     - `BILLING.SUBSCRIPTION.CANCELLED`
     - `BILLING.SUBSCRIPTION.EXPIRED`
     - `PAYMENT.CAPTURE.COMPLETED`
5. Save and copy the **Webhook ID**

### 3.2 Add Webhook ID to Environment

Add to Supabase Edge Function secrets:

```bash
PAYPAL_WEBHOOK_ID=your_webhook_id_here
```

## Step 4: Database Setup

The migration has already created the `subscriptions` table. You can verify by running:

```sql
SELECT * FROM subscriptions LIMIT 1;
```

The table includes:
- User subscription tracking
- PayPal subscription/order IDs
- Plan type and status
- Amount and currency
- Timestamps and expiration dates

## Step 5: Testing

### 5.1 Test in Sandbox Mode

1. Use PayPal Sandbox credentials
2. Create test accounts in PayPal Developer Dashboard
3. Use sandbox accounts to test payments

### 5.2 Test User Flow

1. Open the app
2. Go to Profile → Manage Subscriptions
3. Select a plan and click "Subscribe Now"
4. Complete payment in the PayPal browser
5. Verify subscription appears in your database

### 5.3 Test Webhook

1. Make a test payment
2. Check Supabase logs for webhook calls
3. Verify subscription status updates in database

## Usage in Your App

### Subscribe to a Plan

```typescript
import { subscribeToPlan } from '../lib/paypal';

// In your component
const handleSubscribe = async () => {
  const result = await subscribeToPlan('pro_player');
  if (result.success) {
    // Success! User will be redirected to PayPal
  } else {
    // Handle error
    console.error(result.error);
  }
};
```

### One-Time Payment (Boost Game)

```typescript
import { payForBoost } from '../lib/paypal';

const handleBoost = async () => {
  const result = await payForBoost(4.99, gameId);
  if (result.success) {
    // Success! User will be redirected to PayPal
  }
};
```

### Check Subscription Status

```typescript
import { isProPlayer, isOrganizerPro } from '../lib/paypal';

const checkAccess = async () => {
  const hasProPlayer = await isProPlayer();
  const hasOrganizerPro = await isOrganizerPro();

  if (hasProPlayer) {
    // Show pro player features
  }

  if (hasOrganizerPro) {
    // Show organizer pro features
  }
};
```

### Feature Gating

```typescript
import { getFeatureAccess } from '../lib/featureGating';

const features = await getFeatureAccess();

if (features.canBoostGames) {
  // Show boost button
}

if (features.canSeeAdvancedStats) {
  // Show advanced stats
}
```

## Features by Plan

### Pro Player ($9.99/month)

- Advanced statistics
- Performance tracking
- Pro Player badge
- Priority support

### Organizer Pro ($19.99/month)

- Unlimited games per month
- Boost games feature
- Advanced statistics
- Priority support
- Organizer Pro badge

### Boost Game ($4.99 one-time)

- Featured placement
- Reach more players
- Valid for 7 days

## Troubleshooting

### Payments Not Working

1. Verify PayPal credentials are correct
2. Check `PAYPAL_BASE_URL` matches your environment (sandbox vs production)
3. Verify Plan IDs are correct in the edge function
4. Check Supabase Edge Function logs for errors

### Webhooks Not Firing

1. Verify webhook URL is publicly accessible
2. Check webhook events are properly configured in PayPal
3. Verify `PAYPAL_WEBHOOK_ID` is set correctly
4. Check Supabase Edge Function logs

### Subscriptions Not Showing as Active

1. Check webhook is properly configured
2. Manually update database if webhook failed
3. Verify subscription ID matches between PayPal and database

### Database Errors

1. Verify migrations were applied successfully
2. Check RLS policies are correct
3. Ensure user is authenticated

## Security Notes

1. **Never expose PayPal secret** in client-side code
2. All PayPal API calls go through Edge Functions
3. Webhook signatures are verified before processing
4. RLS policies protect subscription data
5. Users can only access their own subscriptions

## Production Checklist

- [ ] Switch to PayPal live credentials
- [ ] Update `PAYPAL_BASE_URL` to production
- [ ] Create production billing plans
- [ ] Update Plan IDs in edge function
- [ ] Configure production webhook
- [ ] Test complete payment flow
- [ ] Verify webhook is working
- [ ] Test subscription cancellation
- [ ] Monitor error logs

## Support

For PayPal API issues, refer to:
- [PayPal Developer Documentation](https://developer.paypal.com/docs/api/overview/)
- [PayPal Subscriptions API](https://developer.paypal.com/docs/subscriptions/)
- [PayPal Webhooks](https://developer.paypal.com/docs/api-basics/notifications/webhooks/)
