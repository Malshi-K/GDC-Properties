// app/api/payment/confirm/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { applicationId, paymentIntentId } = await request.json();

    // Update payment records
    const { error: updateError } = await supabase
      .from('payment_records')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        transaction_id: paymentIntentId
      })
      .eq('payment_intent_id', paymentIntentId);

    if (updateError) {
      console.error('Error updating payment records:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment records' },
        { status: 500 }
      );
    }

    // Update application status
    const { error: appUpdateError } = await supabase
      .from('rental_applications')
      .update({
        status: 'completed',
        payment_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (appUpdateError) {
      console.error('Error updating application:', appUpdateError);
      return NextResponse.json(
        { error: 'Failed to update application' },
        { status: 500 }
      );
    }

    // Get application details for creating rental agreement
    const { data: application } = await supabase
      .from('rental_applications')
      .select('*, properties(*)')
      .eq('id', applicationId)
      .single();

    // Create rental agreement
    const { error: agreementError } = await supabase
      .from('rental_agreements')
      .insert({
        application_id: applicationId,
        property_id: application.property_id,
        tenant_id: application.user_id,
        owner_id: application.properties.owner_id,
        lease_start_date: new Date().toISOString().split('T')[0],
        lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year lease
        monthly_rent: application.properties.price,
        security_deposit: application.properties.security_deposit || application.properties.price,
        status: 'active'
      });

    if (agreementError) {
      console.error('Error creating rental agreement:', agreementError);
      // Don't fail the payment, just log the error
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment completed successfully' 
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}