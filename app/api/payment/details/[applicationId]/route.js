// app/api/payment/details/[applicationId]/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request, { params }) {
  console.log('🚀 Payment Details API Called');
  console.log('📋 Raw params:', params);
  
  try {
    const { applicationId } = params;
    console.log('🔍 Application ID:', applicationId);
    
    if (!applicationId) {
      console.log('❌ No application ID provided');
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Step 1: Check if application exists (any status)
    console.log('🔎 Checking if application exists...');
    const { data: checkApp, error: checkError } = await supabase
      .from('rental_applications')
      .select('id, status, payment_status')
      .eq('id', applicationId)
      .single();
    
    console.log('📊 Application check result:', checkApp, checkError);
    
    if (checkError || !checkApp) {
      console.log('❌ Application not found in database');
      return NextResponse.json(
        { 
          error: 'Application not found',
          debug: {
            applicationId,
            supabaseError: checkError?.message,
            found: !!checkApp
          }
        },
        { status: 404 }
      );
    }

    // Step 2: Check if application is approved
    if (checkApp.status !== 'approved' && checkApp.status !== 'payment_pending') {
      console.log(`❌ Application status is '${checkApp.status}', not 'approved'`);
      return NextResponse.json(
        { 
          error: `Application status is '${checkApp.status}'. Only approved applications can proceed to payment.`,
          debug: {
            currentStatus: checkApp.status,
            paymentStatus: checkApp.payment_status,
            required: 'approved'
          }
        },
        { status: 400 }
      );
    }

    // Step 3: Fetch full application with property details
    console.log('📈 Fetching full application with property details...');
    const { data: application, error } = await supabase
      .from('rental_applications')
      .select(`
        *,
        properties (
          id,
          title,
          location,
          price,
          security_deposit,
          owner_id
        )
      `)
      .eq('id', applicationId)
      .single();

    console.log('🏠 Full application data:', application);
    console.log('🏠 Property data:', application?.properties);

    if (error || !application) {
      console.log('❌ Error fetching full application:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch application details',
          debug: {
            supabaseError: error?.message
          }
        },
        { status: 500 }
      );
    }

    if (!application.properties) {
      console.log('❌ No property data found for application');
      return NextResponse.json(
        { 
          error: 'Property information not found for this application',
          debug: {
            applicationId,
            propertyId: application.property_id
          }
        },
        { status: 404 }
      );
    }

    // Step 4: Calculate payment breakdown
    const monthlyRent = application.properties?.price || 0;
    const securityDeposit = application.properties?.security_deposit || monthlyRent;
    const adminFee = 100;

    const paymentBreakdown = {
      items: [
        { 
          type: 'first_month_rent', 
          label: 'First Month Rent', 
          amount: monthlyRent,
          required: true
        },
        { 
          type: 'security_deposit', 
          label: 'Security Deposit', 
          amount: securityDeposit,
          required: true
        },
        { 
          type: 'admin_fee', 
          label: 'Administrative Fee', 
          amount: adminFee,
          required: true
        }
      ],
      total: monthlyRent + securityDeposit + adminFee
    };

    console.log('✅ Success! Returning payment data');
    console.log('💰 Payment breakdown:', paymentBreakdown);

    return NextResponse.json({
      application,
      paymentBreakdown
    });

  } catch (error) {
    console.error('💥 Unexpected error in payment details API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        debug: {
          message: error.message,
          stack: error.stack
        }
      },
      { status: 500 }
    );
  }
}