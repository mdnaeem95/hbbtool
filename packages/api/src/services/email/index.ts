import { Resend } from 'resend'

// Initialize Resend client
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

// Email templates
const emailTemplates = {
  merchantApproved: (merchantName: string, loginUrl: string) => ({
    subject: 'Your HomeJiak Account Has Been Approved! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Approved</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to HomeJiak!</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #FF6B35; margin-top: 0;">Hi ${merchantName},</h2>
            
            <p style="font-size: 16px; color: #555;">
              Great news! Your merchant account has been approved and you're now ready to start accepting orders on HomeJiak.
            </p>
            
            <div style="background: #f8f9fa; border-left: 4px solid #FF6B35; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">What's Next?</h3>
              <ul style="color: #555; padding-left: 20px;">
                <li>Log in to your dashboard</li>
                <li>Complete your business profile</li>
                <li>Add your menu items</li>
                <li>Configure delivery settings</li>
                <li>Start receiving orders!</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="display: inline-block; background: #FF6B35; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Access Your Dashboard
              </a>
            </div>
            
            <div style="background: #fff9f5; border-radius: 8px; padding: 20px; margin-top: 30px;">
              <h4 style="color: #FF6B35; margin-top: 0;">💡 Pro Tips to Get Started</h4>
              <ul style="color: #666; font-size: 14px;">
                <li>Upload high-quality photos of your dishes - they increase orders by up to 30%</li>
                <li>Set realistic preparation times to keep customers happy</li>
                <li>Enable WhatsApp notifications to never miss an order</li>
                <li>Complete your profile 100% to appear higher in search results</li>
              </ul>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #888; font-size: 14px;">
              If you have any questions, our support team is here to help at 
              <a href="mailto:support@homejiak.sg" style="color: #FF6B35;">support@homejiak.sg</a>
            </p>
            
            <p style="color: #888; font-size: 14px;">
              Best regards,<br>
              The HomeJiak Team
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
            © ${new Date().getFullYear()} HomeJiak. Singapore's home-based F&B platform.
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${merchantName},

Great news! Your merchant account has been approved and you're now ready to start accepting orders on HomeJiak.

What's Next?
- Log in to your dashboard
- Complete your business profile  
- Add your menu items
- Configure delivery settings
- Start receiving orders!

Access your dashboard at: ${loginUrl}

Pro Tips to Get Started:
- Upload high-quality photos of your dishes
- Set realistic preparation times
- Enable WhatsApp notifications
- Complete your profile 100%

If you have any questions, contact us at support@homejiak.sg

Best regards,
The HomeJiak Team
    `
  }),

  merchantRejected: (merchantName: string, reason: string) => ({
    subject: 'Update on Your HomeJiak Application',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Application Update</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: #333; margin: 0; font-size: 24px;">Application Update</h1>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${merchantName},</h2>
            
            <p style="font-size: 16px; color: #555;">
              Thank you for your interest in joining HomeJiak. After reviewing your application, we're unable to approve your account at this time.
            </p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <strong>Reason:</strong><br>
              ${reason}
            </div>
            
            <p style="color: #555;">
              If you believe this decision was made in error or if you can address the concerns mentioned above, 
              please feel free to contact us at <a href="mailto:support@homejiak.sg" style="color: #FF6B35;">support@homejiak.sg</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="color: #888; font-size: 14px;">
              Best regards,<br>
              The HomeJiak Team
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
Hi ${merchantName},

Thank you for your interest in joining HomeJiak. After reviewing your application, we're unable to approve your account at this time.

Reason: ${reason}

If you believe this decision was made in error or if you can address the concerns mentioned above, please contact us at support@homejiak.sg

Best regards,
The HomeJiak Team
    `
  })
}

// Email sending functions
export async function sendMerchantApprovalEmail(
  email: string, 
  merchantName: string
): Promise<boolean> {
  if (!resend) {
    console.log('📧 [EMAIL MOCK] Would send approval email to:', email)
    return true
  }

  try {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://homejiak.com'}/auth`
    const template = emailTemplates.merchantApproved(merchantName, loginUrl)
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'HomeJiak <noreply@homejiak.com>',
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      replyTo: 'support@homejiak.com',  // Add this for replies
    })

    if (error) {
      console.error('❌ Failed to send approval email:', error)
      return false
    }

    console.log('✅ Approval email sent:', { to: email, id: data?.id })
    return true
  } catch (error) {
    console.error('❌ Email sending error:', error)
    return false
  }
}

export async function sendMerchantRejectionEmail(
  email: string,
  merchantName: string,
  reason: string
): Promise<boolean> {
  if (!resend) {
    console.log('📧 [EMAIL MOCK] Would send rejection email to:', email)
    console.log('   Subject: Update on Your HomeJiak Application')
    console.log('   Reason:', reason)
    return true
  }

  try {
    const template = emailTemplates.merchantRejected(merchantName, reason)
    
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'HomeJiak <noreply@homejiak.sg>',
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })

    if (error) {
      console.error('❌ Failed to send rejection email:', error)
      console.log(data)
      return false
    }

    console.log('✅ Rejection email sent to:', email)
    return true
  } catch (error) {
    console.error('❌ Email sending error:', error)
    return false
  }
}

// Generic email sender for other notifications
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  if (!resend) {
    console.log('📧 [EMAIL MOCK] Would send email')
    console.log('   To:', to)
    console.log('   Subject:', subject)
    return true
  }

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'HomeJiak <noreply@homejiak.sg>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if no text version
    })

    if (error) {
      console.error('❌ Email send failed:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ Email error:', error)
    return false
  }
}