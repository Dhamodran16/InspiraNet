const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  /**
   * Initialize email transporter
   */
  async initTransporter() {
    try {
      // Check if SMTP credentials are configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('⚠️ SMTP credentials not configured, email service will use console logging');
        this.transporter = null;
        return;
      }

      // For development, use a test account or configure with your email service
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      // Verify connection
      await this.transporter.verify();
      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      console.log('📧 Email service will use console logging as fallback');
      // Fallback to console logging for development
      this.transporter = null;
    }
  }

  /**
   * Send email with template support
   */
  async sendEmail(emailData) {
    try {
      if (!this.transporter) {
        // Fallback to console logging for development
        console.log('📧 Email would be sent (development mode):', emailData);
        return true;
      }

      const { to, subject, template, data } = emailData;
      
      // Generate email content based on template
      const { html, text } = this.generateEmailContent(template, data);

      const mailOptions = {
        from: process.env.SMTP_USER || 'noreply@kongu.edu',
        to: to,
        subject: subject,
        text: text,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`📧 Email sent successfully to ${to}:`, result.messageId);
      return true;

    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  /**
   * Generate email content based on template
   */
  generateEmailContent(template, data) {
    switch (template) {
      case 'expiry-warning':
        return this.generateExpiryWarningEmail(data);
      case 'final-warning':
        return this.generateFinalWarningEmail(data);
      case 'conversion-notification':
        return this.generateConversionNotificationEmail(data);
      default:
        return this.generateDefaultEmail(data);
    }
  }

  /**
   * Generate expiry warning email
   */
  generateExpiryWarningEmail(data) {
    const { name, joinYear, expiryDate, daysLeft, hasPersonalEmail } = data;
    const expiryDateStr = expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">⚠️ Action Required</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your KEC College Email is Expiring Soon</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
          
          <p style="color: #555; line-height: 1.6;">
            This is an important notice regarding your Kongu Engineering College email account.
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">📅 Expiry Details</h3>
            <ul style="color: #856404; padding-left: 20px;">
              <li><strong>Join Year:</strong> ${joinYear}</li>
              <li><strong>Expiry Date:</strong> ${expiryDateStr}</li>
              <li><strong>Days Remaining:</strong> ${daysLeft} days</li>
            </ul>
          </div>
          
          <p style="color: #555; line-height: 1.6;">
            Your college email (${joinYear}${data.department || 'dept'}@kongu.edu) will be deactivated on <strong>${expiryDateStr}</strong>.
          </p>
          
          ${hasPersonalEmail ? 
            `<div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">✅ Good News!</h3>
              <p style="color: #155724; margin: 0;">You have a personal email registered. Your account will be automatically converted to alumni status.</p>
            </div>` :
            `<div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #721c24; margin-top: 0;">⚠️ Immediate Action Required</h3>
              <p style="color: #721c24; margin: 0;">You don't have a personal email registered. Please add one to retain access to your account.</p>
            </div>`
          }
          
          <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #004085; margin-top: 0;">🚀 What Happens Next?</h3>
            <ol style="color: #004085; padding-left: 20px;">
              <li>Your account will be automatically converted to alumni status</li>
              <li>You'll retain access to all your data and connections</li>
              <li>You can continue networking with the KEC community</li>
              <li>Your college email will be archived (read-only)</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8083'}/profile" 
               style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Update Profile Now
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </div>
    `;

    const text = `
      ACTION REQUIRED: Your KEC College Email is Expiring Soon
      
      Hello ${name},
      
      Your Kongu Engineering College email account will expire on ${expiryDateStr} (${daysLeft} days remaining).
      
      Join Year: ${joinYear}
      Expiry Date: ${expiryDateStr}
      Days Remaining: ${daysLeft}
      
      ${hasPersonalEmail ? 
        'Good news! You have a personal email registered. Your account will be automatically converted to alumni status.' :
        'You need to add a personal email to retain access to your account.'
      }
      
      What happens next:
      1. Your account will be automatically converted to alumni status
      2. You'll retain access to all your data and connections
      3. You can continue networking with the KEC community
      4. Your college email will be archived (read-only)
      
      Update your profile now: ${process.env.FRONTEND_URL || 'http://localhost:8083'}/profile
      
      If you have any questions, please contact our support team.
    `;

    return { html, text };
  }

  /**
   * Generate final warning email
   */
  generateFinalWarningEmail(data) {
    const { name, joinYear, expiryDate, daysLeft } = data;
    const expiryDateStr = expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🚨 URGENT: Final Warning</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your KEC Account Will Be Deactivated Soon</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Hello ${name},</h2>
          
          <p style="color: #555; line-height: 1.6;">
            This is your <strong>FINAL WARNING</strong> regarding your Kongu Engineering College account.
          </p>
          
          <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #721c24; margin-top: 0;">🚨 Critical Issue</h3>
            <p style="color: #721c24; margin: 0;">
              You don't have a personal email registered. Without one, you will <strong>lose access to your account</strong> 
              and all your data will be permanently archived.
            </p>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">📅 Expiry Details</h3>
            <ul style="color: #856404; padding-left: 20px;">
              <li><strong>Join Year:</strong> ${joinYear}</li>
              <li><strong>Expiry Date:</strong> ${expiryDateStr}</li>
              <li><strong>Days Remaining:</strong> ${daysLeft} days</li>
            </ul>
          </div>
          
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin-top: 0;">💡 How to Save Your Account</h3>
            <ol style="color: #0c5460; padding-left: 20px;">
              <li>Log in to your KEC account immediately</li>
              <li>Go to Profile Settings</li>
              <li>Add your personal email address</li>
              <li>Save the changes</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8083'}/profile" 
               style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              SAVE MY ACCOUNT NOW
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            This is your last chance to preserve your account. Don't wait!
          </p>
        </div>
      </div>
    `;

    const text = `
      URGENT: Final Warning - Your KEC Account Will Be Deactivated Soon
      
      Hello ${name},
      
      This is your FINAL WARNING regarding your Kongu Engineering College account.
      
      CRITICAL ISSUE:
      You don't have a personal email registered. Without one, you will lose access to your account and all your data will be permanently archived.
      
      Expiry Details:
      - Join Year: ${joinYear}
      - Expiry Date: ${expiryDateStr}
      - Days Remaining: ${daysLeft}
      
      How to Save Your Account:
      1. Log in to your KEC account immediately
      2. Go to Profile Settings
      3. Add your personal email address
      4. Save the changes
      
      SAVE YOUR ACCOUNT NOW: ${process.env.FRONTEND_URL || 'http://localhost:8083'}/profile
      
      This is your last chance to preserve your account. Don't wait!
    `;

    return { html, text };
  }

  /**
   * Generate conversion notification email
   */
  generateConversionNotificationEmail(data) {
    const { name, graduationYear, department } = data;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎓 Welcome to KEC Alumni Network!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your account has been successfully converted</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Congratulations ${name}! 🎉</h2>
          
          <p style="color: #555; line-height: 1.6;">
            Welcome to the Kongu Engineering College Alumni Network! Your account has been successfully converted 
            from student to alumni status.
          </p>
          
          <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">🎯 Your Alumni Profile</h3>
            <ul style="color: #155724; padding-left: 20px;">
              <li><strong>Graduation Year:</strong> ${graduationYear}</li>
              <li><strong>Department:</strong> ${department}</li>
              <li><strong>Status:</strong> Alumni Member</li>
            </ul>
          </div>
          
          <div style="background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #004085; margin-top: 0;">🚀 What's Next?</h3>
            <ol style="color: #004085; padding-left: 20px;">
              <li>Complete your alumni profile with current employment details</li>
              <li>Connect with fellow alumni in your industry</li>
              <li>Explore mentorship opportunities for current students</li>
              <li>Stay updated with KEC events and news</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:8083'}/profile" 
               style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Complete Your Alumni Profile
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; text-align: center;">
            Welcome to the alumni family! We're excited to see what you'll accomplish next.
          </p>
        </div>
      </div>
    `;

    const text = `
      Welcome to KEC Alumni Network!
      
      Congratulations ${name}! 🎉
      
      Welcome to the Kongu Engineering College Alumni Network! Your account has been successfully converted from student to alumni status.
      
      Your Alumni Profile:
      - Graduation Year: ${graduationYear}
      - Department: ${department}
      - Status: Alumni Member
      
      What's Next?
      1. Complete your alumni profile with current employment details
      2. Connect with fellow alumni in your industry
      3. Explore mentorship opportunities for current students
      4. Stay updated with KEC events and news
      
      Complete your alumni profile: ${process.env.FRONTEND_URL || 'http://localhost:8083'}/profile
      
      Welcome to the alumni family! We're excited to see what you'll accomplish next.
    `;

    return { html, text };
  }

  /**
   * Generate default email template
   */
  generateDefaultEmail(data) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h2 style="color: #333; margin-top: 0;">KEC Alumni Network</h2>
          <p style="color: #555; line-height: 1.6;">
            ${data.message || 'You have received a notification from KEC Alumni Network.'}
          </p>
        </div>
      </div>
    `;

    const text = `
      KEC Alumni Network
      
      ${data.message || 'You have received a notification from KEC Alumni Network.'}
    `;

    return { html, text };
  }
}

module.exports = new EmailService(); 