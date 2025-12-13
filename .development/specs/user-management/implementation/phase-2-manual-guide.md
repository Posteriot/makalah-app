# Phase 2 Manual Configuration Guide

## Tasks yang Memerlukan Manual Configuration di Clerk Dashboard

Beberapa tasks di Phase 2 TIDAK BISA di-automate via API dan harus dikonfigurasi secara manual di Clerk Dashboard.

---

## USER-010: Enable Email & Password Authentication

### Steps:

1. **Buka Clerk Dashboard**
   - URL: https://dashboard.clerk.com
   - Login dengan account lo

2. **Navigate ke User & Authentication**
   - Di sidebar kiri, klik **"User & Authentication"**
   - Kemudian klik **"Email, Phone, Username"**

3. **Enable Email Address**
   - Toggle ON pada **"Email address"**
   - Checkbox: **"Require email address"** → ON

4. **Configure Email Verification**
   - Di bagian **"Verify at sign-up"** → Toggle ON
   - Pilih verification method: **"Email verification code"** (recommended)
   - Atau pilih **"Email verification link"**

5. **Configure Password Settings**
   - Di bagian **"Password"** → Toggle ON
   - Set minimum length: **8 characters** (recommended)
   - Optional: Enable password breach detection (HIBP)

6. **Save Changes**
   - Klik tombol **"Save"** di pojok kanan atas

### Success Criteria:
- [ ] Email address enabled dan required
- [ ] Email verification at sign-up enabled
- [ ] Password enabled dengan minimum 8 characters
- [ ] Settings saved successfully

---

## USER-011: Configure Resend as Email Provider

### ✅ IMPLEMENTED: Method 2 - Clerk Default Email + Webhook for Custom Emails

Karena Clerk Dashboard tidak memiliki direct Resend integration, gue implementasi webhook approach:

### Architecture:
```
Clerk handles:           Our webhook handles:
- Verification emails    - Welcome emails (via Resend)
- Password reset emails  - Custom transactional emails
- Built-in templates     - Future custom emails
```

### Webhook Implementation Details:

**Endpoint Created:** `/src/app/api/webhooks/clerk/route.ts`

**Events Handled:**
- `user.created` → Sends welcome email via Resend

**Files Modified:**
- Created `/src/app/api/webhooks/clerk/route.ts`
- Added `CLERK_WEBHOOK_SECRET` to `.env.local`

### Manual Steps Required - Clerk Dashboard Webhook Setup:

1. **Buka Clerk Dashboard**
   - URL: https://dashboard.clerk.com
   - Login dengan account lo

2. **Navigate ke Webhooks**
   - Di sidebar kiri, klik **"Webhooks"**
   - Klik **"+ Add Endpoint"**

3. **Configure Endpoint**
   - **Endpoint URL:** `https://your-domain.com/api/webhooks/clerk`
     - Development: Gunakan ngrok atau similar untuk expose localhost
     - Production: `https://makalah.ai/api/webhooks/clerk`
   - **Message Filtering:** Select these events:
     - ✅ `user.created`
     - (Optional) `user.updated`
     - (Optional) `session.created`

4. **Get Signing Secret**
   - Setelah create endpoint, klik endpoint tersebut
   - Copy **"Signing Secret"** (starts with `whsec_`)

5. **Add to Environment**
   - Buka `.env.local`
   - Paste signing secret ke `CLERK_WEBHOOK_SECRET="whsec_xxxxx"`

6. **Restart Dev Server**
   - Stop dan restart `npm run dev`

### Testing Webhook Locally:

**Option A: Clerk Dashboard Test**
1. Di Clerk Dashboard → Webhooks → Your endpoint
2. Klik "Testing" tab
3. Select event `user.created`
4. Klik "Send"
5. Check server logs untuk "Webhook received: user.created"

**Option B: Use ngrok untuk real testing**
```bash
# Install ngrok jika belum
brew install ngrok

# Expose localhost:3000
ngrok http 3000

# Use ngrok URL (e.g., https://abc123.ngrok.io/api/webhooks/clerk)
# Update di Clerk Dashboard
```

### Current Status:
- **Webhook Endpoint:** ✅ Created (`/api/webhooks/clerk/route.ts`)
- **Resend Integration:** ✅ Uses existing `sendWelcomeEmail()` function
- **Resend API Key:** ✅ Configured (`RESEND_API_KEY` di .env.local)
- **Resend From Email:** ✅ Configured (`no-reply@makalah.ai`)
- **Webhook Secret:** ⏳ Perlu diambil dari Clerk Dashboard

### Success Criteria:
- [x] Webhook endpoint created dan build passed
- [ ] Webhook configured di Clerk Dashboard
- [ ] `CLERK_WEBHOOK_SECRET` added to `.env.local`
- [ ] Test webhook dengan user.created event
- [ ] Welcome email received via Resend

---

## Verification Checklist Setelah Manual Configuration

### Test Sign-Up Flow:
1. [ ] Buka `/sign-up`
2. [ ] Create account dengan email baru
3. [ ] Terima verification email dalam 1-2 menit
4. [ ] Click verification link/enter code
5. [ ] Account berhasil di-verify
6. [ ] Redirect ke `/settings` (sesuai USER-014 config)

### Test Password Reset Flow:
1. [ ] Buka `/sign-in`
2. [ ] Klik "Forgot password?"
3. [ ] Enter email
4. [ ] Terima reset password email dalam 1-2 menit
5. [ ] Click reset link/enter code
6. [ ] Set new password
7. [ ] Login dengan new password berhasil

---

## Troubleshooting

### Email tidak terkirim:
1. Check Clerk Dashboard → Email logs
2. Verify Resend domain sudah verified
3. Check spam folder

### Verification code tidak work:
1. Code sudah expired (biasanya 10 menit)
2. Request new code

### Redirect tidak sesuai:
1. Verify `.env.local` redirect URLs sudah benar
2. Restart Next.js dev server setelah edit `.env.local`

---

**Document Created:** 2025-12-13
**Status:** Ready for manual execution
