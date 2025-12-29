// Send email confirmation template test
import 'dotenv/config';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const TEST_EMAIL = "akpobor2000@gmail.com";
const FROM_EMAIL = process.env.EMAIL_FROM || "Lexport <noreply@lexport.app>";

const BRAND = {
  navy: "#202e46",
  blue: "#529ec6",
  emerald: "#10b981",
};

const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; background-color: #f8fafc; margin: 0; padding: 0;">
  <!-- Full-width Header -->
  <div style="background: linear-gradient(135deg, ${BRAND.navy} 0%, #2a3a54 100%); padding: 28px 20px; text-align: center;">
    <div style="display: inline-block;">
      <span style="color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -1px;">Lex</span><span style="color: ${BRAND.blue}; font-size: 28px; font-weight: 700; letter-spacing: -1px;">port</span>
    </div>
  </div>

  <div style="max-width: 600px; margin: 0 auto; padding: 32px 20px;">
    <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      
      <!-- Success Icon -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background: linear-gradient(135deg, ${BRAND.blue}20 0%, ${BRAND.blue}10 100%); border-radius: 50%; padding: 20px;">
          <span style="font-size: 36px;">✉️</span>
        </div>
      </div>

      <h2 style="color: ${BRAND.navy}; font-size: 24px; margin: 0 0 8px; text-align: center;">Confirm Your Email</h2>
      <p style="margin: 0 0 24px; color: #64748b; text-align: center; font-size: 15px;">One last step to get started with Lexport</p>

      <p style="margin: 16px 0; color: #475569;">Hi there,</p>

      <p style="margin: 16px 0; color: #475569;">
        Thanks for signing up for Lexport! Please confirm your email address by clicking the button below.
      </p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="https://lexport.app/verify?token=example" style="display: inline-block; background: linear-gradient(135deg, ${BRAND.emerald} 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 10px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);">Confirm Email</a>
      </div>

      <div style="background-color: #f1f5f9; border-radius: 10px; padding: 16px; margin: 24px 0; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: #64748b;">
          🕐 This link expires in <strong>24 hours</strong>
        </p>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;">

      <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
        Didn't sign up for Lexport? You can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; font-size: 13px; color: #64748b;">
      <p style="margin: 0 0 8px;">Powered by <a href="https://lexport.app" style="color: ${BRAND.blue}; text-decoration: none; font-weight: 500;">Lexport</a></p>
      <p style="margin: 0; font-size: 12px; color: #94a3b8;">AI-powered contracts & e-signatures for modern businesses</p>
    </div>
  </div>
</body>
</html>
`;

async function main() {
  console.log("Sending email confirmation template...");

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TEST_EMAIL],
      subject: "✉️ [TEST] Confirm Your Email - Lexport",
      html,
    });

    if (error) throw error;
    console.log(`✅ Email confirmation sent! ID: ${data?.id}`);
  } catch (e: any) {
    console.error(`❌ Error:`, e.message);
  }
}

main();
