// app/api/payment/confirm/route.js - UPDATED VERSION
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { applicationId, paymentIntentId } = await request.json();

    console.log("Processing payment confirmation:", { applicationId, paymentIntentId });

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

    console.log("Payment records updated successfully");

    // Get application details first
    const { data: application, error: fetchError } = await supabase
      .from('rental_applications')
      .select('*, properties(*)')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      console.error('Error fetching application:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch application details' },
        { status: 500 }
      );
    }

    console.log("Application details fetched:", application);

    // Update application status to completed
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

    console.log("Application status updated to completed");

    // **NEW: Update property status to 'rented'**
    const { error: propertyUpdateError } = await supabase
      .from('properties')
      .update({
        status: 'rented',
        updated_at: new Date().toISOString()
      })
      .eq('id', application.property_id);

    if (propertyUpdateError) {
      console.error('Error updating property status:', propertyUpdateError);
      return NextResponse.json(
        { error: 'Failed to update property status' },
        { status: 500 }
      );
    }

    console.log("Property status updated to 'rented'");

    // **NEW: Reject all other pending/approved applications for this property**
    const { error: rejectError } = await supabase
      .from('rental_applications')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('property_id', application.property_id)
      .neq('id', applicationId)
      .in('status', ['pending', 'approved']);

    if (rejectError) {
      console.error('Error rejecting other applications:', rejectError);
      // Don't fail the entire process for this
      console.log("Continuing despite rejection error...");
    } else {
      console.log("Other applications for this property rejected successfully");
    }

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
      console.log("Continuing without rental agreement...");
    } else {
      console.log("Rental agreement created successfully");
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment completed successfully and property status updated',
      data: {
        applicationId,
        propertyId: application.property_id,
        newPropertyStatus: 'rented',
        applicationStatus: 'completed'
      }
    });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}