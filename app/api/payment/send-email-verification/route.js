// app/api/payment/send-email-verification/route.js
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email service
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_APP_PASSWORD, // your app password
  },
});

export async function POST(request) {
  try {
    const { email, applicationId } = await request.json();

    if (!email || !applicationId) {
      return NextResponse.json(
        { error: "Email and application ID are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Verify application exists
    const { data: application, error: appError } = await supabase
      .from("rental_applications")
      .select("id, status, properties(title)")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Clean up old verifications for this application
    await supabase
      .from("email_verifications")
      .delete()
      .eq("application_id", applicationId)
      .eq("verified", false);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const verificationId = `email-${applicationId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification in database
    const { error: insertError } = await supabase
      .from("email_verifications")
      .insert({
        id: verificationId,
        application_id: applicationId,
        email: email.toLowerCase().trim(),
        code: verificationCode,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        verified: false,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error storing email verification:", insertError);
      return NextResponse.json(
        { error: "Failed to create verification" },
        { status: 500 }
      );
    }

    // Prepare email content
    const propertyTitle = application.properties?.title || "Property";
    const mailOptions = {
      from: {
        name: "Rental Payment System",
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: "Payment Verification Code - Rental Application",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Payment Verification Code</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    margin: 0; 
                    padding: 0; 
                    background-color: #f4f4f4;
                }
                .container { 
                    max-width: 600px; 
                    margin: 0 auto; 
                    background: #ffffff; 
                    border-radius: 8px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    overflow: hidden;
                }
                .header { 
                    background: linear-gradient(135deg, #dc2626, #ef4444); 
                    color: white; 
                    padding: 30px 20px; 
                    text-align: center; 
                }
                .header h1 { 
                    margin: 0; 
                    font-size: 28px; 
                    font-weight: 700; 
                }
                .header p { 
                    margin: 5px 0 0 0; 
                    opacity: 0.9; 
                    font-size: 16px; 
                }
                .content { 
                    padding: 40px 30px; 
                }
                .greeting { 
                    font-size: 18px; 
                    color: #1f2937; 
                    margin-bottom: 20px; 
                }
                .code-container { 
                    text-align: center; 
                    margin: 30px 0; 
                }
                .code { 
                    display: inline-block;
                    font-size: 36px; 
                    font-weight: bold; 
                    color: #dc2626; 
                    padding: 20px 30px; 
                    background: #fef2f2; 
                    border-radius: 12px; 
                    letter-spacing: 8px; 
                    border: 3px dashed #dc2626;
                    font-family: 'Courier New', monospace;
                    margin: 10px;
                }
                .info-box { 
                    background: #eff6ff; 
                    padding: 20px; 
                    border-radius: 8px; 
                    margin: 25px 0; 
                    border-left: 4px solid #3b82f6;
                }
                .warning-box { 
                    background: #fffbeb; 
                    padding: 20px; 
                    border-radius: 8px; 
                    margin: 25px 0; 
                    border-left: 4px solid #f59e0b;
                }
                .property-info {
                    background: #f9fafb;
                    padding: 15px;
                    border-radius: 6px;
                    margin: 15px 0;
                    border: 1px solid #e5e7eb;
                }
                .footer { 
                    background: #f9fafb; 
                    padding: 20px; 
                    text-align: center; 
                    font-size: 14px; 
                    color: #6b7280; 
                    border-top: 1px solid #e5e7eb;
                }
                ul {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                li {
                    margin: 5px 0;
                }
                .highlight {
                    font-weight: bold;
                    color: #dc2626;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Payment Verification</h1>
                    <p>Secure Payment Authorization Required</p>
                </div>
                
                <div class="content">
                    <div class="greeting">Hello!</div>
                    
                    <p>You're about to complete your rental payment. For your security and protection, we need to verify your email address before processing the transaction.</p>
                    
                    <div class="property-info">
                        <strong>Property:</strong> ${propertyTitle}<br>
                        <strong>Email:</strong> ${email}
                    </div>
                    
                    <p>Please use the verification code below to complete your payment:</p>
                    
                    <div class="code-container">
                        <div class="code">${verificationCode}</div>
                    </div>
                    
                    <div class="info-box">
                        <strong>📋 Important Information:</strong>
                        <ul>
                            <li>This code expires in <span class="highlight">15 minutes</span></li>
                            <li>Enter this code on the payment page you just visited</li>
                            <li>Your payment will be processed immediately after verification</li>
                            <li>You will receive a payment confirmation email</li>
                        </ul>
                    </div>
                    
                    <div class="warning-box">
                        <strong>🛡️ Security Notice:</strong><br>
                        Never share this code with anyone. Our team will never ask you for this code over the phone or email. If you didn't initiate this payment, please ignore this email and contact our support team immediately.
                    </div>
                    
                    <p>After entering this code, your payment will be securely processed using industry-standard encryption and your rental agreement will be activated.</p>
                    
                    <p style="margin-top: 30px;">Thank you for choosing our rental platform. We're excited to help you with your new home!</p>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        Having trouble? Contact our support team for assistance.
                    </p>
                </div>
                
                <div class="footer">
                    <p>This is an automated security message. Please do not reply to this email.</p>
                    <p style="margin: 5px 0;">© 2025 Rental Payment System. All rights reserved.</p>
                    <p style="font-size: 12px; margin-top: 10px;">
                        This email was sent to ${email} for payment verification purposes.
                    </p>
                </div>
            </div>
        </body>
        </html>
      `,
      text: `
        Payment Verification Code

        Hello!

        You're about to complete your rental payment for ${propertyTitle}.

        Your verification code is: ${verificationCode}

        Important Details:
        - This code expires in 15 minutes
        - Enter this code on the payment page you just visited
        - Never share this code with anyone
        - Your payment will be processed after verification

        Security Notice:
        If you didn't request this code, please ignore this email and contact support.

        Thank you for choosing our rental platform!

        ---
        This is an automated message. Please do not reply.
        © 2025 Rental Payment System
      `,
    };

    // Send email
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification code sent to ${email}`);

      return NextResponse.json({
        success: true,
        verificationId,
        message: "Verification code sent to your email",
        expiresIn: 900, // 15 minutes
        // For development only - remove in production
        ...(process.env.NODE_ENV === "development" && {
          devCode: verificationCode,
        }),
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);

      // Clean up the verification record if email failed
      await supabase
        .from("email_verifications")
        .delete()
        .eq("id", verificationId);

      return NextResponse.json(
        {
          error:
            "Failed to send verification email. Please check your email address.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Send email verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
