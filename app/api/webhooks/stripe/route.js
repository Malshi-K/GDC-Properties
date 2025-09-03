// app/api/webhooks/stripe/route.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const applicationId = paymentIntent.metadata.applicationId;

      try {
        // Update payment records
        await supabase
          .from('payment_records')
          .update({
            status: 'completed',
            paid_at: new Date().toISOString(),
            transaction_id: paymentIntent.id
          })
          .eq('payment_intent_id', paymentIntent.id);

        // Update application status
        await supabase
          .from('rental_applications')
          .update({
            status: 'completed',
            payment_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        // Get application details for creating rental agreement
        const { data: application } = await supabase
          .from('rental_applications')
          .select('*, properties(*)')
          .eq('id', applicationId)
          .single();

        if (application) {
          // Create rental agreement
          await supabase.from('rental_agreements').insert({
            application_id: applicationId,
            property_id: application.property_id,
            tenant_id: application.user_id,
            owner_id: application.properties.owner_id,
            lease_start_date: new Date().toISOString().split('T')[0],
            lease_end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            monthly_rent: application.properties.price,
            security_deposit: application.properties.security_deposit || application.properties.price,
            status: 'active'
          });
        }

        console.log(`Payment succeeded for application ${applicationId}`);
      } catch (error) {
        console.error('Error processing payment success:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      const failedApplicationId = failedPayment.metadata.applicationId;

      try {
        // Update payment records to failed
        await supabase
          .from('payment_records')
          .update({
            status: 'failed'
          })
          .eq('payment_intent_id', failedPayment.id);

        // Reset application status back to approved
        await supabase
          .from('rental_applications')
          .update({
            status: 'approved',
            payment_status: 'not_required',
            updated_at: new Date().toISOString()
          })
          .eq('id', failedApplicationId);

        console.log(`Payment failed for application ${failedApplicationId}`);
      } catch (error) {
        console.error('Error processing payment failure:', error);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}