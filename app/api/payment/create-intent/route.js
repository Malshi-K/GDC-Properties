// app/api/payment/create-intent/route.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper function to create payment distributions
async function createPaymentDistributions(insertedPaymentRecords, owner, property) {
  const distributions = [];
  
  for (const record of insertedPaymentRecords) {
    const platformFeePercentage = property.platform_fee_percentage || 5.00;
    const managementFeePercentage = property.management_fee_percentage || 0.00;
    
    const platformFeeAmount = record.platform_fee_amount;
    const managementFeeAmount = record.management_fee_amount;
    const ownerAmount = record.owner_net_amount;

    // Platform fee distribution
    if (platformFeeAmount > 0) {
      distributions.push({
        payment_record_id: record.id,
        recipient_type: 'platform',
        recipient_id: '00000000-0000-0000-0000-000000000000', // Use a valid UUID for platform
        amount: platformFeeAmount,
        percentage: platformFeePercentage,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    // Management fee distribution (if applicable)
    if (managementFeeAmount > 0) {
      distributions.push({
        payment_record_id: record.id,
        recipient_type: 'management',
        recipient_id: property.management_company_id || owner.id,
        amount: managementFeeAmount,
        percentage: managementFeePercentage,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    // Owner distribution
    distributions.push({
      payment_record_id: record.id,
      recipient_type: 'owner',
      recipient_id: owner.id,
      amount: ownerAmount,
      percentage: 100 - platformFeePercentage - managementFeePercentage,
      status: 'pending',
      created_at: new Date().toISOString()
    });
  }

  if (distributions.length > 0) {
    const { error } = await supabase
      .from('payment_distributions')
      .insert(distributions);
    
    if (error) {
      console.error('Error creating payment distributions:', error);
      throw error;
    }

    console.log(`Created ${distributions.length} payment distributions for owner: ${owner.full_name}`);
  }

  return distributions;
}

export async function POST(request) {
  try {
    const { applicationId, amount, paymentItems, cardType, verificationId, email } = await request.json();

    console.log('Create Intent - Application ID:', applicationId);

    // Get application with property details
    const { data: application, error: appError } = await supabase
      .from('rental_applications')
      .select(`
        *,
        properties!inner (
          id,
          title,
          location,
          price,
          security_deposit,
          owner_id,
          platform_fee_percentage,
          management_fee_percentage
        )
      `)
      .eq('id', applicationId)
      .single();

    console.log('Application query result:', { application, error: appError });

    if (appError || !application) {
      return NextResponse.json(
        { 
          error: 'Application not found',
          debug: {
            applicationId,
            supabaseError: appError?.message,
            found: !!application
          }
        },
        { status: 404 }
      );
    }

    // Get owner details separately using owner_id from properties
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', application.properties.owner_id)
      .single();

    console.log('Owner query result:', { owner, error: ownerError });

    if (ownerError || !owner) {
      return NextResponse.json(
        { error: 'Property owner not found' },
        { status: 404 }
      );
    }

    // Use the data we fetched
    const property = application.properties;
    const ownerData = owner;

    // Check if application is approved or payment_pending
    if (application.status !== 'approved' && application.status !== 'payment_pending') {
      console.log(`Application status: ${application.status}`);
      return NextResponse.json(
        { 
          error: `Application status is '${application.status}'. Only approved applications can proceed to payment.`,
          debug: {
            currentStatus: application.status,
            paymentStatus: application.payment_status
          }
        },
        { status: 400 }
      );
    }

    // Verify email verification if provided
    if (verificationId && email) {
      const { data: verification, error: verifyError } = await supabase
        .from('email_verifications')
        .select('verified, email')
        .eq('id', verificationId)
        .eq('application_id', applicationId)
        .single();

      console.log('Email verification check:', { verification, error: verifyError });

      if (verifyError || !verification || !verification.verified) {
        return NextResponse.json(
          { error: 'Email verification required before payment' },
          { status: 400 }
        );
      }
    }

    // Validate we have all required data
    if (!property || !ownerData) {
      return NextResponse.json(
        { error: 'Property or owner information not found' },
        { status: 404 }
      );
    }

    // Calculate payment distribution
    const totalAmount = amount;
    const platformFeePercentage = property.platform_fee_percentage || 5.00;
    const managementFeePercentage = property.management_fee_percentage || 0.00;
    
    const platformFeeAmount = (totalAmount * platformFeePercentage) / 100;
    const managementFeeAmount = (totalAmount * managementFeePercentage) / 100;
    const ownerNetAmount = totalAmount - platformFeeAmount - managementFeeAmount;

    console.log('Payment breakdown:', {
      total: totalAmount,
      platformFee: platformFeeAmount,
      managementFee: managementFeeAmount,
      ownerNet: ownerNetAmount,
      ownerId: ownerData.id,
      ownerName: ownerData.full_name
    });

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        applicationId: applicationId,
        propertyId: property.id,
        tenantId: application.user_id,
        ownerId: ownerData.id,
        ownerName: ownerData.full_name,
        cardType: cardType || 'unknown',
        emailVerified: verificationId ? 'true' : 'false',
        email: email || 'not_provided',
        platformFeeAmount: platformFeeAmount.toFixed(2),
        ownerNetAmount: ownerNetAmount.toFixed(2)
      },
      description: `Rental Payment - ${property.title} (Owner: ${ownerData.full_name})`,
      statement_descriptor_suffix: 'RENTAL', // Changed from statement_descriptor
      receipt_email: email || null,
    });

    // Create enhanced payment records
    const paymentRecords = paymentItems.map(item => ({
      application_id: applicationId,
      payment_type: item.type,
      amount: item.amount,
      payment_intent_id: paymentIntent.id,
      due_date: new Date().toISOString(),
      status: 'pending',
      platform_fee_amount: (item.amount * platformFeePercentage) / 100,
      management_fee_amount: (item.amount * managementFeePercentage) / 100,
      owner_net_amount: item.amount - ((item.amount * platformFeePercentage) / 100) - ((item.amount * managementFeePercentage) / 100),
      email_verification_id: verificationId || null,
      email_verified: !!verificationId,
      verified_email: email || null,
      created_at: new Date().toISOString()
    }));

    console.log('Creating payment records:', paymentRecords);

    // Insert payment records and get the inserted records with IDs
    const { data: insertedRecords, error: insertError } = await supabase
      .from('payment_records')
      .insert(paymentRecords)
      .select();

    if (insertError) {
      console.error('Error creating payment records:', insertError);
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return NextResponse.json(
        { 
          error: 'Failed to create payment records',
          debug: { supabaseError: insertError.message }
        },
        { status: 500 }
      );
    }

    console.log('Payment records created successfully:', insertedRecords);

    // Create payment distributions to track owner payments
    try {
      const distributions = await createPaymentDistributions(insertedRecords, ownerData, property);
      console.log(`Payment distributions created for owner: ${ownerData.full_name} (${ownerData.id})`);
    } catch (distributionError) {
      console.error('Error creating payment distributions:', distributionError);
      console.warn('Payment created but distributions failed - manual intervention may be required');
    }

    // Update application status
    const { error: updateError } = await supabase
      .from('rental_applications')
      .update({ 
        status: 'payment_pending',
        payment_status: 'pending',
        updated_at: new Date().toISOString()
        // Removed email_verified and verified_email as they don't exist in the table
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error updating application:', updateError);
    }

    console.log('Payment intent created successfully');

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      emailVerified: !!verificationId,
      ownerInfo: {
        id: ownerData.id,
        name: ownerData.full_name,
        email: ownerData.email,
        phone: ownerData.phone
      },
      paymentBreakdown: {
        total: totalAmount,
        platformFee: platformFeeAmount,
        managementFee: managementFeeAmount,
        ownerNet: ownerNetAmount
      }
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
        debug: {
          message: error.message
        }
      },
      { status: 500 }
    );
  }
}