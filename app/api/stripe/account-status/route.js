import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user's Stripe account ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_completed')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.stripe_account_id) {
      return NextResponse.json({
        hasAccount: false,
        onboardingComplete: false,
        canReceiveTransfers: false
      });
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);

    const onboardingComplete = account.details_submitted && account.charges_enabled && account.payouts_enabled;
    const canReceiveTransfers = account.capabilities?.transfers === 'active';

    return NextResponse.json({
      hasAccount: true,
      accountId: profile.stripe_account_id,
      onboardingComplete,
      canReceiveTransfers,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      requirements: account.requirements
    });

  } catch (error) {
    console.error('Error checking Stripe account status:', error);
    return NextResponse.json(
      { error: 'Failed to check account status' },
      { status: 500 }
    );
  }
}