# Supabase Email Templates

Branded email templates for Supabase Auth. These match the Lexport design used in the application emails.

## Templates Included

| Template | File | Supabase Setting |
|----------|------|------------------|
| Confirm Signup | `confirm-signup.html` | Authentication → Email Templates → Confirm signup |
| Magic Link | `magic-link.html` | Authentication → Email Templates → Magic Link |
| Reset Password | `reset-password.html` | Authentication → Email Templates → Reset Password |
| Invite User | `invite-user.html` | Authentication → Email Templates → Invite user |
| Change Email | `change-email.html` | Authentication → Email Templates → Change Email Address |

## How to Add to Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Email Templates**
3. For each template type:
   - Click on the template name (e.g., "Confirm signup")
   - Copy the contents of the corresponding HTML file
   - Paste into the **Message body** field (make sure HTML is enabled)
   - Update the **Subject** line if needed (suggestions below)
   - Click **Save**

## Suggested Subject Lines

| Template | Subject |
|----------|---------|
| Confirm Signup | `✉️ Confirm your email for Lexport` |
| Magic Link | `🔐 Sign in to Lexport` |
| Reset Password | `🔑 Reset your Lexport password` |
| Invite User | `👥 You've been invited to Lexport` |
| Change Email | `✉️ Confirm your new email address` |

## Template Variables

These templates use Supabase's built-in variables:

- `{{ .ConfirmationURL }}` - The action link (confirm, reset, etc.)
- `{{ .Email }}` - The user's email address
- `{{ .SiteURL }}` - Your site URL (from Supabase settings)
- `{{ .Token }}` - OTP token (if using OTP instead of magic links)

## Custom SMTP Setup

For production, configure custom SMTP to send from your domain:

1. Go to **Project Settings** → **Authentication** → **SMTP Settings**
2. Enable **Custom SMTP**
3. Add your SMTP provider details:
   - **Sender email**: `noreply@lexportai.com`
   - **Sender name**: `Lexport`
   - **Host**: Your SMTP host (e.g., `smtp.resend.com`)
   - **Port**: Usually `587` for TLS
   - **Username/Password**: From your email provider

### Recommended Providers

- **Resend** - Simple API, great deliverability
- **SendGrid** - Enterprise-grade
- **Mailgun** - Developer-friendly
- **Amazon SES** - Cost-effective at scale
