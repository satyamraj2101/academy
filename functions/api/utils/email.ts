export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
}

export async function sendEmail(env: any, options: EmailOptions) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set. Email not sent.', options.subject);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `SpotCLM Academy <${env.RESEND_FROM_EMAIL || 'info@spotclm.com'}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('RESEND API ERROR:', res.status, res.statusText);
      console.error('RESEND API ERROR DETAILS:', errorText);
      return false;
    }

    const data = await res.json();
    console.log('RESEND SUCCESS:', data);
    return true;
  } catch (err) {
    console.error('Error sending email:', err);
    return false;
  }
}

export const emailTemplates = {
  welcome: (name: string) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="text-align: center; padding: 30px 0;">
        <h1 style="color: #4f46e5; margin-bottom: 10px;">Welcome to SpotCLM Academy!</h1>
        <p style="font-size: 18px; color: #666;">Kickstart your Contract Lifecycle Management career.</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
        <p>Hi <strong>${name}</strong>,</p>
        <p>We're thrilled to have you on board! SpotCLM Academy is designed to transform you into an expert in Contract Lifecycle Management.</p>
        <p>Ready to begin your journey? We recommend starting with these foundational courses:</p>
        
        <ul style="list-style: none; padding: 0;">
          <li style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; display: block;">CLM Platform Fundamentals</strong>
            <span style="color: #64748b; font-size: 14px;">Master the basics of enterprise contract lifecycle management.</span>
          </li>
          <li style="margin-bottom: 15px; padding: 15px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
            <strong style="color: #0f172a; display: block;">Platform Master Administration</strong>
            <span style="color: #64748b; font-size: 14px;">Advanced administration techniques and API integration.</span>
          </li>
        </ul>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://spotclm-academy.pages.dev/dashboard" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Dashboard</a>
        </div>
      </div>
      
      <div style="text-align: center; color: #94a3b8; font-size: 12px;">
        &copy; 2026 SpotCLM Academy. All rights reserved.
      </div>
    </div>
  `,

  referralNotification: (newUserName: string) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="text-align: center; padding: 30px 0;">
        <h1 style="color: #10b981; margin-bottom: 10px;">New Referral! 🎉</h1>
        <p style="font-size: 18px; color: #666;">Someone used your referral link.</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
        <p>Great news!</p>
        <p><strong>${newUserName}</strong> just signed up using your referral code.</p>
        <p>You're one step closer to unlocking Partner status. Remember, you need 2 referrals to apply for Partner and earn commissions!</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://spotclm-academy.pages.dev/dashboard" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Check Your Referrals</a>
        </div>
      </div>
      
      <div style="text-align: center; color: #94a3b8; font-size: 12px;">
        &copy; 2026 SpotCLM Academy. All rights reserved.
      </div>
    </div>
  `,

  referralPromotion: (name: string, referralCode: string) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <div style="text-align: center; padding: 30px 0;">
        <h1 style="color: #f59e0b; margin-bottom: 10px;">Earn With SpotCLM Academy! 💰</h1>
        <p style="font-size: 18px; color: #666;">Join our Referral Program.</p>
      </div>
      
      <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 30px;">
        <p>Hi <strong>${name}</strong>,</p>
        <p>Did you know you can earn credits and real commissions by sharing SpotCLM Academy with your network?</p>
        
        <div style="background: #fef3c7; border: 1px dashed #f59e0b; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <p style="margin: 0; color: #b45309; font-weight: bold;">Your Referral Link:</p>
          <code style="font-size: 18px; color: #d97706; display: block; margin-top: 10px;">https://spotclm-academy.pages.dev/signup?ref=${referralCode}</code>
        </div>
        
        <p>Share this link with your friends and colleagues. Once you refer 2 friends, you can apply for <strong>Partner Status</strong> and earn 15% on all their course purchases!</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://spotclm-academy.pages.dev/dashboard" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Start Referring</a>
        </div>
      </div>
      
      <div style="text-align: center; color: #94a3b8; font-size: 12px;">
        &copy; 2026 SpotCLM Academy. All rights reserved.
      </div>
    </div>
  `
};
