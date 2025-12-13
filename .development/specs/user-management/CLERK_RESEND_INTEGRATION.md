# Clerk + Resend Integration Guide

## Overview
Panduan lengkap untuk mengintegrasikan Clerk authentication dengan Resend email service untuk Makalah App.

---

## Table of Contents
1. [Setup Resend Account](#1-setup-resend-account)
2. [Configure Clerk Email Provider](#2-configure-clerk-email-provider)
3. [Customize Email Templates](#3-customize-email-templates)
4. [Sync Email Verification Status](#4-sync-email-verification-status)
5. [Testing Email Flows](#5-testing-email-flows)
6. [Production Checklist](#6-production-checklist)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Setup Resend Account

### 1.1 Create Resend Account
1. Go to https://resend.com
2. Click "Sign Up" atau "Get Started"
3. Create account dengan email: erik.supit@gmail.com (atau team email)
4. Verify email address

### 1.2 Get API Key
1. Login to Resend Dashboard
2. Navigate to **API Keys** section
3. Click "Create API Key"
4. Settings:
   - Name: `Makalah App - Production`
   - Permission: **Sending access**
5. Click "Create"
6. **IMPORTANT:** Copy API key immediately (hanya shown once)
7. Save to `.env.local`:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### 1.3 Verify Domain (Custom Sender Email)

**Option A: Use Custom Domain (makalahapp.com)**

1. Go to Resend Dashboard → **Domains**
2. Click "Add Domain"
3. Enter domain: `makalahapp.com`
4. Resend provides DNS records to add:

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Records (Resend provides 3 records):**
```
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.com

Type: CNAME
Name: resend2._domainkey
Value: resend2._domainkey.resend.com

Type: CNAME
Name: resend3._domainkey
Value: resend3._domainkey.resend.com
```

**DMARC Record (Recommended):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@makalahapp.com
```

5. Add these records to your DNS provider (Cloudflare, Namecheap, etc.)
6. Wait for DNS propagation (5 minutes - 24 hours)
7. Click "Verify" di Resend dashboard
8. Once verified, set sender email:
   ```bash
   RESEND_FROM_EMAIL=noreply@makalahapp.com
   ```

**Option B: Use Resend Default Domain (Quick Start)**

If domain verification takes time, use Resend's default sending domain:
```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Note:** Recipients may see "via resend.dev" in email client. Not recommended for production.

---

## 2. Configure Clerk Email Provider

### 2.1 Access Clerk Email Settings
1. Login to Clerk Dashboard: https://dashboard.clerk.com
2. Select your Makalah App project
3. Navigate to: **Email & SMS** → **Email**

### 2.2 Configure SMTP Provider

**Method 1: Native Resend Integration (If Available)**
1. Select provider: **Resend**
2. Enter API key: `re_xxxxxxxxxxxxx`
3. Sender email: `noreply@makalahapp.com`
4. Sender name: `Makalah App`
5. Click "Save"
6. Test email delivery

**Method 2: Custom SMTP (Alternative)**
1. Select provider: **Custom SMTP**
2. SMTP Configuration:
   ```
   Host: smtp.resend.com
   Port: 465 (SSL) atau 587 (TLS)
   Username: resend
   Password: <Your Resend API Key>
   From Email: noreply@makalahapp.com
   From Name: Makalah App
   ```
3. Enable SSL/TLS
4. Click "Save"
5. Test connection

### 2.3 Test Email Delivery
1. Di Clerk Email settings, click "Send Test Email"
2. Enter your email address
3. Check inbox (and spam folder)
4. Verify email received with correct sender
5. If successful, configuration complete ✅

---

## 3. Customize Email Templates

### 3.1 Access Email Templates
1. Clerk Dashboard → **Customization** → **Emails**
2. Available templates:
   - **Verification email** - Email confirmation
   - **Sign-in email code** - Passwordless login
   - **Password reset email** - Reset password
   - **Invitation email** - Team invites (if using)

### 3.2 Customize Verification Email

**Template Name:** Verification email

**Subject Line:**
```
Verifikasi Email Anda - Makalah App
```

**Email Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Makalah App</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Halo {{user.firstName}},</h2>

    <p>Terima kasih telah mendaftar di <strong>Makalah App</strong>!</p>

    <p>Untuk menyelesaikan registrasi Anda, silakan klik tombol di bawah ini untuk memverifikasi alamat email Anda:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verificationLink}}" style="background: #667eea; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Verifikasi Email
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">Atau copy link berikut ke browser Anda:</p>
    <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px;">
      {{verificationLink}}
    </p>

    <p style="color: #999; font-size: 12px; margin-top: 30px;">
      Link verifikasi ini berlaku selama <strong>24 jam</strong>.<br>
      Jika Anda tidak mendaftar di Makalah App, abaikan email ini.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="color: #666; font-size: 12px; text-align: center;">
      Salam,<br>
      <strong>Tim Makalah App</strong><br>
      <a href="https://makalahapp.com" style="color: #667eea;">makalahapp.com</a>
    </p>
  </div>

</body>
</html>
```

**Plain Text Version:**
```
Halo {{user.firstName}},

Terima kasih telah mendaftar di Makalah App!

Untuk menyelesaikan registrasi Anda, klik link berikut untuk verifikasi email:
{{verificationLink}}

Link berlaku selama 24 jam.
Jika bukan Anda yang mendaftar, abaikan email ini.

Salam,
Tim Makalah App
https://makalahapp.com
```

### 3.3 Customize Password Reset Email

**Template Name:** Password reset email

**Subject Line:**
```
Reset Password - Makalah App
```

**Email Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Makalah App</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Halo {{user.firstName}},</h2>

    <p>Kami menerima permintaan untuk reset password akun Anda di <strong>Makalah App</strong>.</p>

    <p>Klik tombol di bawah ini untuk membuat password baru:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetLink}}" style="background: #667eea; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">Atau copy link berikut ke browser Anda:</p>
    <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px;">
      {{resetLink}}
    </p>

    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0; color: #856404;">
        <strong>⚠️ Penting:</strong> Link reset berlaku selama <strong>1 jam</strong>.<br>
        Jika bukan Anda yang meminta reset password, abaikan email ini.<br>
        Password Anda tetap aman.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="color: #666; font-size: 12px; text-align: center;">
      Salam,<br>
      <strong>Tim Makalah App</strong><br>
      <a href="https://makalahapp.com" style="color: #667eea;">makalahapp.com</a>
    </p>
  </div>

</body>
</html>
```

**Plain Text Version:**
```
Halo {{user.firstName}},

Kami menerima permintaan reset password untuk akun Anda.

Klik link berikut untuk membuat password baru:
{{resetLink}}

⚠️ PENTING:
- Link berlaku selama 1 jam
- Jika bukan Anda yang meminta, abaikan email ini
- Password Anda tetap aman

Salam,
Tim Makalah App
https://makalahapp.com
```

### 3.4 Available Template Variables

Clerk provides these variables for use in templates:
- `{{user.firstName}}` - User's first name
- `{{user.lastName}}` - User's last name
- `{{user.emailAddress}}` - User's email
- `{{verificationLink}}` - Email verification link
- `{{resetLink}}` - Password reset link
- `{{code}}` - Verification code (for OTP flows)
- `{{applicationName}}` - Your app name

---

## 4. Sync Email Verification Status

### 4.1 Update ensureConvexUser Function

**File:** `src/app/(dashboard)/layout.tsx`

```typescript
import { currentUser } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

async function ensureConvexUser() {
  const user = await currentUser()
  if (!user) return

  const primaryEmail = user.emailAddresses[0]?.emailAddress
  if (!primaryEmail) return

  // Extract email verification status from Clerk
  const emailVerified = user.emailAddresses[0]?.verification?.status === "verified"

  // Extract user name
  const firstName = user.firstName ?? undefined
  const lastName = user.lastName ?? undefined

  // Sync to Convex
  await fetchMutation(api.users.createUser, {
    clerkUserId: user.id,
    email: primaryEmail,
    firstName,
    lastName,
    emailVerified, // NEW: Sync verification status
  })
}

export default async function DashboardLayout({ children }) {
  await ensureConvexUser()
  // ... rest of layout
}
```

### 4.2 Alternative: Clerk Webhook (Real-time Sync)

For real-time sync, setup Clerk webhook:

**Step 1: Create Webhook Endpoint**

**File:** `src/app/api/webhooks/clerk/route.ts`

```typescript
import { headers } from "next/headers"
import { Webhook } from "svix"
import { WebhookEvent } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

export async function POST(req: Request) {
  // Get headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error: Missing svix headers", { status: 400 })
  }

  // Get body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verify webhook
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    return new Response("Error: Verification failed", { status: 400 })
  }

  // Handle events
  const eventType = evt.type

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data

    const primaryEmail = email_addresses[0]?.email_address
    const emailVerified = email_addresses[0]?.verification?.status === "verified"

    if (primaryEmail) {
      await fetchMutation(api.users.createUser, {
        clerkUserId: id,
        email: primaryEmail,
        firstName: first_name ?? undefined,
        lastName: last_name ?? undefined,
        emailVerified,
      })
    }
  }

  return new Response("", { status: 200 })
}
```

**Step 2: Configure Webhook in Clerk**

1. Clerk Dashboard → **Webhooks**
2. Click "Add Endpoint"
3. Endpoint URL: `https://your-app.vercel.app/api/webhooks/clerk`
4. Events to subscribe:
   - ✅ `user.created`
   - ✅ `user.updated`
5. Click "Create"
6. Copy webhook secret
7. Add to `.env.local`:
   ```bash
   CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

---

## 5. Testing Email Flows

### 5.1 Test Signup + Email Verification

**Test Steps:**
1. Go to `/sign-up`
2. Fill form:
   - Email: `test-verification@example.com`
   - Password: `TestPassword123`
   - First Name: `Test`
   - Last Name: `User`
3. Submit form
4. **Check email inbox** (within 1 minute)
5. Open verification email
6. **Verify:**
   - Subject: "Verifikasi Email Anda - Makalah App"
   - From: "Makalah App <noreply@makalahapp.com>"
   - Body: Indonesian language, branding correct
   - "Verifikasi Email" button present
7. Click verification button
8. **Verify redirect:** Should redirect to /sign-in
9. Login dengan credentials
10. **Check Convex database:**
    ```bash
    npx convex data users --limit 5
    ```
11. **Verify record:**
    - email: test-verification@example.com
    - emailVerified: true
    - role: "user"

**Success Criteria:**
- ✅ Email received within 1 minute
- ✅ Template correctly customized
- ✅ Verification link works
- ✅ User can login after verification
- ✅ Convex record shows emailVerified = true

### 5.2 Test Password Reset

**Test Steps:**
1. Go to `/sign-in`
2. Click "Forgot password?" link
3. Enter email: `test-verification@example.com`
4. Submit
5. **Check email inbox** (within 1 minute)
6. Open reset email
7. **Verify:**
   - Subject: "Reset Password - Makalah App"
   - From: "Makalah App <noreply@makalahapp.com>"
   - Body: Indonesian language, warning present
   - "Reset Password" button present
8. Click reset button
9. Enter new password: `NewPassword123`
10. Submit
11. **Verify redirect:** Should redirect to /sign-in
12. Login dengan new password
13. **Verify:** Login successful

**Success Criteria:**
- ✅ Reset email received within 1 minute
- ✅ Template correctly customized
- ✅ Reset link works (expires after 1 hour)
- ✅ New password accepted
- ✅ User can login dengan new password

### 5.3 Test Email Not Verified Warning

**Test Steps:**
1. Create user yang belum verify email
2. User tries to login
3. Clerk should block login dan show:
   "Please verify your email first"
4. User receives new verification email
5. User verifies email
6. User can login

**Success Criteria:**
- ✅ Unverified users cannot login
- ✅ Clear error message shown
- ✅ Resend verification email works

---

## 6. Production Checklist

**Before Going Live:**

### 6.1 Email Configuration
- [ ] Custom domain verified di Resend
- [ ] SPF, DKIM, DMARC records configured
- [ ] Sender email: noreply@makalahapp.com
- [ ] Test emails dari production domain

### 6.2 Clerk Configuration
- [ ] Resend configured sebagai email provider
- [ ] Email templates customized (Indonesian)
- [ ] Redirect URLs set correctly
- [ ] Email verification required: ON
- [ ] Webhook configured (if using)

### 6.3 Environment Variables
- [ ] `RESEND_API_KEY` set in production
- [ ] `RESEND_FROM_EMAIL` set correctly
- [ ] `CLERK_WEBHOOK_SECRET` set (if using webhooks)
- [ ] All vars in Vercel environment variables

### 6.4 Testing
- [ ] Signup flow tested
- [ ] Email verification tested
- [ ] Password reset tested
- [ ] Email templates render correctly (desktop + mobile)
- [ ] No emails going to spam
- [ ] Clerk → Convex sync working

### 6.5 Monitoring
- [ ] Setup email delivery monitoring (Resend dashboard)
- [ ] Setup error logging (Sentry atau similar)
- [ ] Monitor verification completion rate
- [ ] Monitor email bounce rate

---

## 7. Troubleshooting

### Issue: Email Not Received

**Possible Causes:**
1. Email in spam folder
2. Domain not verified
3. SPF/DKIM not configured
4. Resend API key invalid
5. Rate limit exceeded

**Solutions:**
1. Check spam folder first
2. Verify domain di Resend dashboard
3. Check DNS records propagation: `dig TXT makalahapp.com`
4. Regenerate Resend API key
5. Check Resend dashboard untuk error logs
6. Verify sender email di Resend settings

### Issue: Verification Link Expired

**Possible Causes:**
- Link older than 24 hours
- User clicked multiple times
- Link already used

**Solutions:**
- Resend verification email via Clerk
- User can request new verification from login page
- Check Clerk session settings

### Issue: Emails Going to Spam

**Possible Causes:**
- Missing SPF/DKIM records
- Domain reputation low
- Email content flagged
- No DMARC policy

**Solutions:**
1. Verify SPF record: `dig TXT makalahapp.com`
2. Verify DKIM records
3. Add DMARC policy
4. Warm up domain (send gradually increasing emails)
5. Use email testing tools: mail-tester.com
6. Review email content untuk spam triggers

### Issue: Template Not Updating

**Possible Causes:**
- Browser cache
- Clerk cache
- Template not saved correctly

**Solutions:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear Clerk cache (logout/login)
3. Send test email from Clerk dashboard
4. Verify template saved correctly
5. Check template syntax errors

### Issue: Convex emailVerified Not Syncing

**Possible Causes:**
- ensureConvexUser() not extracting status
- Webhook not configured
- Clerk data structure changed

**Solutions:**
1. Check ensureConvexUser() code
2. Log Clerk user object: `console.log(user.emailAddresses[0])`
3. Verify webhook receiving events
4. Manual sync via Convex dashboard if needed

---

## Additional Resources

### Official Documentation
- **Resend Docs:** https://resend.com/docs
- **Clerk Docs:** https://clerk.com/docs
- **Clerk Email Customization:** https://clerk.com/docs/authentication/email-customization
- **Resend Email Verification:** https://resend.com/docs/send-with-nodejs

### Tools
- **Email Testing:** https://mail-tester.com
- **DNS Lookup:** https://mxtoolbox.com
- **Email Preview:** https://www.emailonacid.com

### Support
- **Resend Support:** support@resend.com
- **Clerk Support:** https://clerk.com/support
- **Community:** Discord servers for both platforms

---

**Last Updated:** 2025-12-13
**Status:** Ready for Implementation
