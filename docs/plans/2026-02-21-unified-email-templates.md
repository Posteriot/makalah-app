# Unified Email Template System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Konsolidasi 8 email template ke satu file dengan shared layout (header logo + footer), design tokens Mechanical Grace, dan hapus dead files.

**Architecture:** Tambah `emailLayout()` wrapper function di `convex/authEmails.ts`. Semua email function pakai wrapper ini. Pindahkan waitlist confirmation dari Next.js server action ke Convex internal action. Hapus `src/lib/email/resend.ts` dan `actions.ts`.

**Tech Stack:** Convex actions, Resend API (fetch), inline HTML/CSS email templates

---

## Design Reference

Full design doc: `docs/plans/2026-02-21-unified-email-template-design.md`

### Design Tokens

| Token | Value |
|-------|-------|
| Background | `#0f172a` (slate-900) |
| Text body | `#cbd5e1` (slate-300), 13px |
| Text heading | `#f8fafc` (slate-50), 15px |
| Text muted | `#64748b` (slate-500), 11px |
| Separator | `#334155` (slate-700) |
| CTA button | `#059669` (emerald-600), text `#f8fafc` |
| Secondary button | `#334155` (slate-700), text `#f8fafc` |
| Info box | bg `#1e293b`, border `#334155` |
| Font body | `'Geist Sans', -apple-system, sans-serif` |
| Font mono | `'Geist Mono', 'SF Mono', monospace` |
| Border radius | 6px buttons, 8px outer |

### Image URLs

- Logo icon: `https://www.makalah.ai/logo/logo-color-darkmode.png`
- Brand text: `https://www.makalah.ai/logo-makalah-ai-white.svg`

---

## Perubahan Inti

| File | Aksi |
|------|------|
| `convex/authEmails.ts` | Modify — add `emailLayout()`, upgrade semua template, add `sendWaitlistConfirmationEmail()` |
| `convex/waitlist.ts` | Modify — add `sendConfirmationEmail` internal action, schedule dari `register()` |
| `src/components/auth/WaitlistForm.tsx` | Modify — hapus import + call `sendConfirmationEmail` |
| `src/lib/email/resend.ts` | Delete |
| `src/app/(auth)/waitinglist/actions.ts` | Delete |

---

### Task 1: Tambah `emailLayout()` wrapper function

**Files:**
- Modify: `convex/authEmails.ts` (tambah setelah line 7, sebelum `sendViaResend`)

**Step 1: Tambah constants dan emailLayout function**

Tambah tepat setelah `const DEFAULT_APP_URL = "https://makalah.ai";` (line 7):

```typescript
const LOGO_ICON_URL = "https://www.makalah.ai/logo/logo-color-darkmode.png";
const BRAND_TEXT_URL = "https://www.makalah.ai/logo-makalah-ai-white.svg";
const APP_URL_FOR_EMAILS = "https://www.makalah.ai";

/**
 * Shared email layout wrapper — Mechanical Grace dark theme.
 * Header: logo icon + brand SVG. Footer: copyright + disclaimer.
 */
function emailLayout(content: string): string {
  return `<div style="font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #e2e8f0; border-radius: 8px;">
  <div style="padding-bottom: 16px; margin-bottom: 24px; border-bottom: 1px solid #334155;">
    <a href="${APP_URL_FOR_EMAILS}" style="text-decoration: none; display: inline-flex; align-items: center; gap: 10px;">
      <img src="${LOGO_ICON_URL}" alt="Makalah AI" width="24" height="24" style="width: 24px; height: 24px; border-radius: 4px; display: block;" />
      <img src="${BRAND_TEXT_URL}" alt="Makalah AI" height="18" style="height: 18px; width: auto; display: block;" />
    </a>
  </div>
  ${content}
  <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #334155; text-align: center;">
    <p style="font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 10px; color: #475569; margin: 0 0 4px 0;">&copy; 2026 Makalah AI &middot; <a href="${APP_URL_FOR_EMAILS}" style="color: #64748b; text-decoration: none;">makalah.ai</a></p>
    <p style="font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 10px; color: #475569; margin: 0;">Email otomatis dari sistem Makalah AI. Tidak perlu dibalas.</p>
  </div>
</div>`;
}

/** Reusable CTA button (emerald-600). */
function ctaButton(href: string, label: string): string {
  return `<div style="text-align: center; margin: 24px 0;">
  <a href="${href}" style="display: inline-block; background: #059669; color: #f8fafc; font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; padding: 12px 32px; border-radius: 6px;">${label}</a>
</div>`;
}

/** Reusable secondary button (slate-700). */
function secondaryButton(href: string, label: string): string {
  return `<div style="text-align: center; margin: 24px 0;">
  <a href="${href}" style="display: inline-block; background: #334155; color: #f8fafc; font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none; padding: 10px 24px; border-radius: 6px;">${label}</a>
</div>`;
}
```

**Step 2: Commit**

```bash
git add convex/authEmails.ts
git commit -m "feat(email): add shared emailLayout with header, footer, and button helpers"
```

---

### Task 2: Upgrade 5 auth email templates ke shared layout

**Files:**
- Modify: `convex/authEmails.ts` (functions: sendVerificationEmail, sendMagicLinkEmail, sendPasswordResetEmail, sendTwoFactorOtpEmail, sendSignupSuccessEmail)

**Step 1: Replace sendVerificationEmail (line 30-36)**

```typescript
export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  await sendViaResend(
    email,
    "Verifikasi Email — Makalah AI",
    emailLayout(`
      <p style="font-size: 15px; color: #f8fafc; margin: 0 0 8px 0;">Halo!</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 0 0;">Klik tombol di bawah untuk verifikasi email kamu.</p>
      ${ctaButton(url, "VERIFIKASI EMAIL")}
      <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Link berlaku selama 24 jam.</p>
      <p style="font-size: 11px; color: #64748b; margin: 0;">Kalau kamu tidak merasa mendaftar, abaikan email ini.</p>`)
  );
}
```

**Step 2: Replace sendMagicLinkEmail (line 38-44)**

```typescript
export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  await sendViaResend(
    email,
    "Masuk ke Makalah AI",
    emailLayout(`
      <p style="font-size: 15px; color: #f8fafc; margin: 0 0 8px 0;">Halo!</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 0 0;">Klik tombol di bawah untuk masuk ke Makalah AI.</p>
      ${ctaButton(url, "MASUK SEKARANG")}
      <p style="font-size: 11px; color: #64748b; margin: 0;">Link berlaku selama 5 menit. Jangan bagikan link ini.</p>`)
  );
}
```

**Step 3: Replace sendPasswordResetEmail (line 46-52)**

```typescript
export async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
  await sendViaResend(
    email,
    "Reset Password — Makalah AI",
    emailLayout(`
      <p style="font-size: 15px; color: #f8fafc; margin: 0 0 8px 0;">Halo!</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 0 0;">Kamu meminta reset password. Klik tombol di bawah.</p>
      ${ctaButton(url, "RESET PASSWORD")}
      <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Link berlaku selama 1 jam.</p>
      <p style="font-size: 11px; color: #64748b; margin: 0;">Kalau kamu tidak meminta ini, abaikan email ini.</p>`)
  );
}
```

**Step 4: Replace sendTwoFactorOtpEmail (line 54-69)**

```typescript
export async function sendTwoFactorOtpEmail(email: string, otp: string): Promise<void> {
  await sendViaResend(
    email,
    "Kode Verifikasi 2FA — Makalah AI",
    emailLayout(`
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 24px 0;">Masukkan kode berikut untuk menyelesaikan login:</p>
      <div style="background: #1e293b; border: 1px dashed #475569; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.3em; color: #f8fafc;">${otp}</span>
      </div>
      <p style="font-size: 11px; color: #64748b; margin: 0;">Kode berlaku selama 5 menit. Jangan bagikan kode ini ke siapapun.</p>`)
  );
}
```

**Step 5: Replace sendSignupSuccessEmail (line 71-79)**

```typescript
export async function sendSignupSuccessEmail(email: string): Promise<void> {
  const appUrl = process.env.SITE_URL ?? process.env.APP_URL ?? DEFAULT_APP_URL;

  await sendViaResend(
    email,
    "Pendaftaran Berhasil — Makalah AI",
    emailLayout(`
      <p style="font-size: 15px; color: #f8fafc; margin: 0 0 8px 0;">Halo!</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 0 0;">Pendaftaran akun kamu berhasil. Sekarang kamu bisa mulai menyusun paper dengan Makalah AI.</p>
      ${ctaButton(`${appUrl}/get-started`, "MULAI SEKARANG")}`)
  );
}
```

**Step 6: Commit**

```bash
git add convex/authEmails.ts
git commit -m "feat(email): upgrade 5 auth email templates to shared layout"
```

---

### Task 3: Upgrade 2 waitlist email templates ke shared layout

**Files:**
- Modify: `convex/authEmails.ts` (functions: sendWaitlistInviteEmail, sendWaitlistAdminNotification)

**Step 1: Replace sendWaitlistInviteEmail (line 81-102)**

```typescript
export async function sendWaitlistInviteEmail(
  email: string,
  firstName: string,
  signupUrl: string
): Promise<void> {
  await sendViaResend(
    email,
    "Undangan Bergabung — Makalah AI",
    emailLayout(`
      <p style="font-size: 15px; color: #f8fafc; margin: 0 0 8px 0;">Halo, ${firstName}!</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 0 0;">Giliran kamu sudah tiba! Klik tombol di bawah untuk mendaftar di Makalah AI. Kamu bisa pilih masuk lewat Google atau daftar dengan email dan password.</p>
      ${ctaButton(signupUrl, "DAFTAR SEKARANG")}
      <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Data kamu sudah kami siapkan di form pendaftaran — tinggal pilih metode masuk.</p>
      <p style="font-size: 11px; color: #64748b; margin: 0;">Kalau kamu tidak merasa mendaftar di Makalah AI, abaikan email ini.</p>`)
  );
}
```

**Step 2: Replace sendWaitlistAdminNotification (line 106-173)**

```typescript
export async function sendWaitlistAdminNotification(
  adminEmails: string[],
  event: WaitlistAdminEvent,
  entryEmail: string,
  entryName: string,
): Promise<void> {
  if (adminEmails.length === 0) return;

  const appUrl = process.env.SITE_URL ?? process.env.APP_URL ?? DEFAULT_APP_URL;
  const dashboardUrl = `${appUrl}/dashboard/waitlist`;
  const timestamp = new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  const eventConfig: Record<WaitlistAdminEvent, { subject: string; label: string; color: string; description: string }> = {
    new_registration: {
      subject: `[Waitlist] Pendaftar Baru: ${entryName} (${entryEmail})`,
      label: "PENDAFTAR BARU",
      color: "#f59e0b",
      description: `<strong>${entryName}</strong> (${entryEmail}) baru saja mendaftar di waiting list.`,
    },
    invited: {
      subject: `[Waitlist] Undangan Terkirim: ${entryName} (${entryEmail})`,
      label: "UNDANGAN TERKIRIM",
      color: "#0ea5e9",
      description: `Undangan telah dikirim ke <strong>${entryName}</strong> (${entryEmail}).`,
    },
    registered: {
      subject: `[Waitlist] Registrasi Selesai: ${entryName} (${entryEmail})`,
      label: "REGISTRASI SELESAI",
      color: "#10b981",
      description: `<strong>${entryName}</strong> (${entryEmail}) telah berhasil mendaftar akun setelah diundang.`,
    },
  };

  const config = eventConfig[event];

  const html = emailLayout(`
    <div style="display: inline-block; background: ${config.color}20; border: 1px solid ${config.color}40; border-radius: 4px; padding: 4px 10px; margin-bottom: 16px;">
      <span style="font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${config.color};">${config.label}</span>
    </div>
    <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 16px 0; line-height: 1.6;">${config.description}</p>
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px 16px; margin-bottom: 0;">
      <p style="font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 11px; color: #94a3b8; margin: 0 0 4px 0;">WAKTU</p>
      <p style="font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 13px; color: #f8fafc; margin: 0;">${timestamp}</p>
    </div>
    ${secondaryButton(dashboardUrl, "BUKA DASHBOARD")}`);

  for (const adminEmail of adminEmails) {
    try {
      await sendViaResend(adminEmail, config.subject, html);
    } catch (error) {
      console.warn(`[Waitlist Admin] Failed to notify ${adminEmail}:`, error);
    }
  }
}
```

**Step 3: Commit**

```bash
git add convex/authEmails.ts
git commit -m "feat(email): upgrade waitlist invite and admin notification to shared layout"
```

---

### Task 4: Pindahkan waitlist confirmation email ke Convex

**Files:**
- Modify: `convex/authEmails.ts` (tambah `sendWaitlistConfirmationEmail`)
- Modify: `convex/waitlist.ts` (tambah internal action + schedule dari `register`)
- Modify: `src/components/auth/WaitlistForm.tsx` (hapus sendConfirmationEmail call)
- Delete: `src/lib/email/resend.ts`
- Delete: `src/app/(auth)/waitinglist/actions.ts`

**Step 1: Tambah `sendWaitlistConfirmationEmail` di `convex/authEmails.ts`**

Tambah sebelum `sendWaitlistInviteEmail`:

```typescript
export async function sendWaitlistConfirmationEmail(
  email: string,
  firstName: string,
): Promise<void> {
  const greeting = firstName ? `Halo, ${firstName}!` : "Halo!";

  await sendViaResend(
    email,
    "Pendaftaran Waiting List Berhasil — Makalah AI",
    emailLayout(`
      <p style="font-size: 15px; color: #f8fafc; margin: 0 0 8px 0;">${greeting}</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 8px 0;">Email kamu (${email}) sudah terdaftar di waiting list Makalah AI.</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 24px 0;">Saat giliran kamu tiba, kami akan mengirim email undangan berisi link pendaftaran. Klik link tersebut untuk membuat akun — bisa pakai Google atau email dan password.</p>
      <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px 16px;">
        <p style="font-family: 'Geist Mono', 'SF Mono', monospace; font-size: 11px; color: #f59e0b; margin: 0 0 4px 0; font-weight: 700;">PENTING</p>
        <p style="font-size: 11px; color: #cbd5e1; margin: 0;">Periksa folder Inbox, Spam, Update, atau Promosi — email undangan kami bisa masuk ke folder mana saja.</p>
      </div>`)
  );
}
```

**Step 2: Tambah internal action di `convex/waitlist.ts`**

Tambah setelah `inviteSingleInternal` (sebelum section Actions ~line 244):

```typescript
/**
 * Send waitlist confirmation email (called via scheduler from register mutation).
 */
export const sendConfirmationEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
  },
  handler: async (_ctx, args) => {
    const { sendWaitlistConfirmationEmail } = await import("./authEmails")
    await sendWaitlistConfirmationEmail(args.email, args.firstName)
  },
})
```

**Step 3: Update `register` mutation di `convex/waitlist.ts`**

Tambah scheduler call setelah admin notification (line 56-60). Tambah tepat setelah `notifyAdminsWaitlistEvent` scheduler:

```typescript
    // Send confirmation email to user
    await ctx.scheduler.runAfter(0, internal.waitlist.sendConfirmationEmail, {
      email,
      firstName,
    })
```

**Step 4: Hapus sendConfirmationEmail call dari WaitlistForm.tsx**

Di `src/components/auth/WaitlistForm.tsx`:

Hapus import line 9:
```typescript
// HAPUS: import { sendConfirmationEmail } from "@/app/(auth)/waitinglist/actions"
```

Hapus fire-and-forget call line 45-48:
```typescript
// HAPUS:
//       // Send confirmation email (fire-and-forget)
//       sendConfirmationEmail(email, firstName).catch((err) => {
//         console.error("Failed to send confirmation email:", err)
//       })
```

**Step 5: Hapus dead files**

```bash
rm src/lib/email/resend.ts
rm src/app/(auth)/waitinglist/actions.ts
```

**Step 6: Verifikasi tidak ada referensi ke file yang dihapus**

```bash
# Grep untuk import paths yang seharusnya sudah dihapus
grep -r "lib/email/resend" src/ convex/
grep -r "waitinglist/actions" src/ convex/
```

Expected: tidak ada hasil.

**Step 7: Commit**

```bash
git add convex/authEmails.ts convex/waitlist.ts src/components/auth/WaitlistForm.tsx
git add src/lib/email/resend.ts src/app/(auth)/waitinglist/actions.ts
git commit -m "refactor(email): consolidate waitlist confirmation into Convex, delete resend.ts and actions.ts"
```

---

### Task 5: Lint, test, deploy

**Step 1: Lint**

```bash
npx eslint convex/authEmails.ts convex/waitlist.ts src/components/auth/WaitlistForm.tsx
```

Expected: no errors.

**Step 2: Run tests**

```bash
npx vitest run
```

Expected: same pass/fail ratio as baseline (pre-existing failures only).

**Step 3: Deploy ke Convex dev (production)**

```bash
npx convex dev --once
```

Expected: `Convex functions ready!`

**Step 4: Push frontend**

```bash
git push
```

**Step 5: Commit final jika ada fix**

```bash
git add -A
git commit -m "feat(email): unified email template system with Mechanical Grace layout"
```

---

### Task 6: Verifikasi end-to-end (manual)

**Test semua 8 email:**

1. **Waitlist Confirmation**: Daftar di `/waitinglist` → cek email konfirmasi (styled, ada logo)
2. **Waitlist Invite**: Admin dashboard → Undang → cek email (styled, emerald CTA, logo)
3. **Admin Notification**: Otomatis setelah #1 → cek email admin (styled, badge, logo)
4. **Verifikasi Email**: Signup baru → cek email verifikasi (styled, emerald CTA, logo)
5. **Signup Success**: Setelah verify email → cek email sukses (styled, logo)
6. **Magic Link**: Request magic link di sign-in → cek email (styled, logo)
7. **Reset Password**: Request reset → cek email (styled, logo)
8. **2FA OTP**: Login dengan 2FA → cek email OTP (styled, OTP box, logo)

**Checklist per email:**
- [ ] Header: logo icon + brand text terlihat
- [ ] Footer: copyright + disclaimer ada
- [ ] Styling konsisten (dark bg, proper fonts)
- [ ] CTA button emerald-600 (bukan amber)
- [ ] Link di button berfungsi
- [ ] Branding: "Makalah AI" konsisten (bukan "Makalah App")

---

## Files Summary

| File | Action |
|------|--------|
| `convex/authEmails.ts` | Modify — add emailLayout(), ctaButton(), secondaryButton(), upgrade 7 templates, add sendWaitlistConfirmationEmail() |
| `convex/waitlist.ts` | Modify — add sendConfirmationEmail internal action, schedule dari register() |
| `src/components/auth/WaitlistForm.tsx` | Modify — hapus import + call sendConfirmationEmail |
| `src/lib/email/resend.ts` | Delete |
| `src/app/(auth)/waitinglist/actions.ts` | Delete |
