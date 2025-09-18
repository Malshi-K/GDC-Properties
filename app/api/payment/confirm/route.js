// app/api/payment/confirm/route.js - UPDATED WITH STRIPE TRANSFERS
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { applicationId, paymentIntentId } = await request.json();

    console.log("Processing payment confirmation with transfers:", { applicationId, paymentIntentId });

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

    // Get application with property and owner details
    const { data: application, error: fetchError } = await supabase
      .from('rental_applications')
      .select(`
        *,
        properties!inner (
          id,
          title,
          owner_id,
          platform_fee_percentage,
          management_fee_percentage
        )
      `)
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      console.error('Error fetching application:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch application details' },
        { status: 500 }
      );
    }

    // Get owner/landlord details including Stripe account
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select(`
        id, 
        full_name, 
        email, 
        stripe_account_id, 
        stripe_onboarding_completed, 
        can_receive_transfers
      `)
      .eq('id', application.properties.owner_id)
      .single();

    if (ownerError || !owner) {
      console.error('Error fetching owner details:', ownerError);
      return NextResponse.json(
        { error: 'Landlord not found' },
        { status: 404 }
      );
    }

    // Get payment distributions for this payment
    const { data: distributions, error: distributionError } = await supabase
      .from('payment_distributions')
      .select('*')
      .eq('payment_record_id', application.id) // Adjust this to match your actual payment record ID
      .eq('recipient_type', 'owner');

    if (distributionError) {
      console.error('Error fetching payment distributions:', distributionError);
    }

    const ownerDistribution = distributions?.[0];

    // Process Stripe Transfer if landlord has connected account
    let transferResult = null;
    let transferError = null;

    if (owner.stripe_account_id && owner.can_receive_transfers && ownerDistribution) {
      try {
        console.log(`Attempting transfer to landlord: ${owner.full_name} (${owner.stripe_account_id})`);
        
        // Check if Stripe account is still active
        const account = await stripe.accounts.retrieve(owner.stripe_account_id);
        
        if (!account.charges_enabled || !account.payouts_enabled) {
          throw new Error('Landlord account not fully set up for transfers');
        }

        // Create transfer to landlord
        const transfer = await stripe.transfers.create({
          amount: Math.round(ownerDistribution.amount * 100), // Convert to cents
          currency: 'usd',
          destination: owner.stripe_account_id,
          transfer_group: `rental_${applicationId}`,
          metadata: {
            application_id: applicationId,
            payment_intent_id: paymentIntentId,
            property_id: application.properties.id,
            owner_id: owner.id,
            owner_name: owner.full_name
          },
          description: `Rental payment for ${application.properties.title}`
        });

        transferResult = {
          transferId: transfer.id,
          amount: transfer.amount / 100,
          status: transfer.object === 'transfer' ? 'created' : 'unknown'
        };

        // Update payment distribution with transfer details
        await supabase
          .from('payment_distributions')
          .update({
            stripe_transfer_id: transfer.id,
            status: 'transferred',
            transferred_at: new Date().toISOString(),
            transfer_amount: transfer.amount / 100,
            transfer_currency: transfer.currency
          })
          .eq('id', ownerDistribution.id);

        console.log(`✅ Transfer successful: ${transfer.id} - $${transfer.amount / 100} to ${owner.full_name}`);

      } catch (stripeError) {
        console.error('❌ Stripe transfer failed:', stripeError);
        transferError = stripeError.message;

        // Update distribution status to show transfer failed
        if (ownerDistribution) {
          await supabase
            .from('payment_distributions')
            .update({
              status: 'transfer_failed',
              transfer_error: stripeError.message,
              transfer_attempted_at: new Date().toISOString()
            })
            .eq('id', ownerDistribution.id);
        }
      }
    } else {
      console.log('⚠️ Skipping transfer - landlord account not ready:', {
        hasStripeAccount: !!owner.stripe_account_id,
        canReceiveTransfers: owner.can_receive_transfers,
        onboardingComplete: owner.stripe_onboarding_completed
      });

      transferError = 'Landlord banking not configured for transfers';

      // Update distribution to show manual processing needed
      if (ownerDistribution) {
        await supabase
          .from('payment_distributions')
          .update({
            status: 'manual_processing_required',
            transfer_error: transferError,
            updated_at: new Date().toISOString()
          })
          .eq('id', ownerDistribution.id);
      }
    }

    // Continue with existing application updates
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

    // Update property status to 'rented'
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

    // Reject other applications for this property
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
        lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        monthly_rent: application.properties?.price || 0,
        security_deposit: application.properties?.security_deposit || application.properties?.price || 0,
        status: 'active'
      });

    if (agreementError) {
      console.error('Error creating rental agreement:', agreementError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Payment completed successfully',
      data: {
        applicationId,
        propertyId: application.property_id,
        newPropertyStatus: 'rented',
        applicationStatus: 'completed',
        transferResult,
        transferError,
        landlordBankingStatus: {
          hasStripeAccount: !!owner.stripe_account_id,
          onboardingComplete: owner.stripe_onboarding_completed,
          canReceiveTransfers: owner.can_receive_transfers
        }
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