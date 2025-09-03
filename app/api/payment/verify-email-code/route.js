// app/api/payment/verify-email-code/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { verificationId, code, applicationId } = await request.json();

    if (!verificationId || !code || !applicationId) {
      return NextResponse.json(
        { error: 'Verification ID, code, and application ID are required' },
        { status: 400 }
      );
    }

    // Get verification record
    const { data: verification, error: verifyError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('id', verificationId)
      .eq('application_id', applicationId)
      .single();

    if (verifyError || !verification) {
      return NextResponse.json(
        { error: 'Verification not found or expired' },
        { status: 404 }
      );
    }

    // Check if already verified
    if (verification.verified) {
      return NextResponse.json({
        success: true,
        message: 'Email already verified'
      });
    }

    // Check if expired
    const now = new Date();
    const expiresAt = new Date(verification.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check attempts limit
    if (verification.attempts >= 5) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new verification code.' },
        { status: 429 }
      );
    }

    // Increment attempts
    await supabase
      .from('email_verifications')
      .update({ attempts: verification.attempts + 1 })
      .eq('id', verificationId);

    // Verify code
    if (verification.code !== code) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark as verified
    const { error: updateError } = await supabase
      .from('email_verifications')
      .update({
        verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', verificationId);

    if (updateError) {
      console.error('Error updating email verification:', updateError);
      return NextResponse.json(
        { error: 'Failed to verify code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify email code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}