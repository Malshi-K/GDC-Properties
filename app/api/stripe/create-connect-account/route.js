import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { userId, email, businessType = 'individual' } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email are required' },
        { status: 400 }
      );
    }

    // Check if user already has a Stripe account
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_onboarding_completed')
      .eq('id', userId)
      .single();

    if (existingProfile?.stripe_account_id && existingProfile?.stripe_onboarding_completed) {
      return NextResponse.json({
        accountId: existingProfile.stripe_account_id,
        alreadyOnboarded: true,
        message: 'Account already set up and onboarded'
      });
    }

    let accountId = existingProfile?.stripe_account_id;

    // Create new Stripe Connect account if needed
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: businessType,
        metadata: {
          user_id: userId,
          created_via: 'rental_platform'
        }
      });

      accountId = account.id;

      // Save account ID to database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          stripe_account_id: accountId,
          stripe_onboarding_completed: false,
          bank_verification_status: 'pending',
          can_receive_transfers: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating profile with Stripe account:', updateError);
        return NextResponse.json(
          { error: 'Failed to save account information' },
          { status: 500 }
        );
      }
    }

    // Create account onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `http://localhost:3000/dashboard?tab=banking&refresh=true`,
      return_url: `http://localhost:3000/dashboard?tab=banking&success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      accountId,
      onboardingUrl: accountLink.url,
      alreadyOnboarded: false
    });

  } catch (error) {
    console.error('Stripe Connect account creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect account', details: error.message },
      { status: 500 }
    );
  }
}