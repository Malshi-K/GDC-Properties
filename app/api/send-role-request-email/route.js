// app/api/send-role-request-email/route.js
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

// Create transporter (configure with your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // Use app-specific password for Gmail
  },
  // For other services like SendGrid, Mailgun, etc:
  // host: process.env.EMAIL_HOST,
  // port: process.env.EMAIL_PORT,
  // secure: true,
  // auth: {
  //   user: process.env.EMAIL_USER,
  //   pass: process.env.EMAIL_APP_PASSWORD,
  // },
});

export async function POST(request) {
  try {
    const { 
      admin_email, 
      user_email, 
      user_name, 
      business_name, 
      business_type, 
      additional_info 
    } = await request.json();

    // Format business type for display
    const formattedBusinessType = business_type 
      ? business_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      : 'Not specified';

    // HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF6B35; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
          .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .label { font-weight: bold; color: #666; }
          .button { display: inline-block; padding: 12px 24px; background: #FF6B35; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Property Owner Role Request</h2>
          </div>
          <div class="content">
            <p>A new user has requested to be upgraded to Property Owner status:</p>
            
            <div class="info-row">
              <span class="label">Name:</span> ${user_name || 'Not provided'}
            </div>
            
            <div class="info-row">
              <span class="label">Email:</span> ${user_email}
            </div>
            
            <div class="info-row">
              <span class="label">Business Name:</span> ${business_name || 'Not provided'}
            </div>
            
            <div class="info-row">
              <span class="label">Business Type:</span> ${formattedBusinessType}
            </div>
            
            ${additional_info ? `
            <div class="info-row">
              <span class="label">Additional Information:</span><br>
              ${additional_info}
            </div>
            ` : ''}
            
            <p style="margin-top: 20px;">Please log in to your admin dashboard to review and approve or reject this request.</p>
            
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login" class="button" style="color: white;">Go to Admin Dashboard</a>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email
    const mailOptions = {
      from: `"GDC Properties" <${process.env.EMAIL_USER}>`,
      to: admin_email || process.env.ADMIN_EMAIL,
      subject: `Role Upgrade Request from ${user_name || user_email}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}