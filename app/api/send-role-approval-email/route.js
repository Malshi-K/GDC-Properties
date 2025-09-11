// ---

// app/api/send-role-approval-email/route.js
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const { user_email, user_name, new_role } = await request.json();

    const roleDisplay = new_role === 'property_owner' ? 'Property Owner' : 'Administrator';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
          .success-box { background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #FF6B35; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✓ Your Account Has Been Upgraded!</h2>
          </div>
          <div class="content">
            <p>Dear ${user_name || 'User'},</p>
            
            <div class="success-box">
              <strong>Great news!</strong> Your request to become a <strong>${roleDisplay}</strong> has been approved.
            </div>
            
            <p>You now have access to additional features:</p>
            <ul>
              ${new_role === 'property_owner' ? `
                <li>List and manage your properties</li>
                <li>View analytics and insights</li>
                <li>Receive inquiries from potential buyers/renters</li>
                <li>Access to owner dashboard and tools</li>
              ` : `
                <li>Full administrative access</li>
                <li>User management capabilities</li>
                <li>System configuration options</li>
                <li>Advanced analytics and reporting</li>
              `}
            </ul>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Sign out of your current session</li>
              <li>Sign back in to activate your new role</li>
              <li>Access your new dashboard features</li>
            </ol>
            
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/login" class="button" style="color: white;">Sign In Now</a>
            
            <div class="footer">
              <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              <p>Best regards,<br>The GDC Properties Team</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"GDC Properties" <${process.env.EMAIL_USER}>`,
      to: user_email,
      subject: `Congratulations! You're now a ${roleDisplay}`,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ 
      success: true, 
      message: 'Approval email sent successfully' 
    });

  } catch (error) {
    console.error('Error sending approval email:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}