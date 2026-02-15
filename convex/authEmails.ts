// convex/authEmails.ts

// Helper to send emails via Resend API (used by BetterAuth callbacks in convex/auth.ts)
// BetterAuth callbacks run in Convex HTTP action context where fetch is available.

const FROM_EMAIL = "Makalah AI <noreply@makalah.ai>";
const DEFAULT_APP_URL = "https://makalah.ai";

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn("[Auth Email] RESEND_API_KEY not set, skipping email to:", to);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });

  if (!response.ok) {
    console.error("[Auth Email] Failed to send:", await response.text());
  }
}

export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  await sendViaResend(
    email,
    "Verifikasi Email — Makalah AI",
    `<p>Klik link berikut untuk verifikasi email Anda:</p><p><a href="${url}">${url}</a></p>`
  );
}

export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  await sendViaResend(
    email,
    "Masuk ke Makalah AI",
    `<p>Klik link berikut untuk masuk:</p><p><a href="${url}">Masuk ke Makalah AI</a></p><p>Link ini berlaku selama 5 menit.</p>`
  );
}

export async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
  await sendViaResend(
    email,
    "Reset Password — Makalah AI",
    `<p>Klik link berikut untuk reset password:</p><p><a href="${url}">${url}</a></p>`
  );
}

export async function sendTwoFactorOtpEmail(email: string, otp: string): Promise<void> {
  await sendViaResend(
    email,
    "Kode Verifikasi 2FA — Makalah AI",
    `<div style="font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #e2e8f0; border-radius: 8px;">
      <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px;">
        <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Makalah AI — Verifikasi 2FA</span>
      </div>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 24px 0;">Masukkan kode berikut untuk menyelesaikan login:</p>
      <div style="background: #1e293b; border: 1px dashed #475569; border-radius: 6px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; font-weight: 700; letter-spacing: 0.3em; color: #f8fafc;">${otp}</span>
      </div>
      <p style="font-size: 11px; color: #64748b; margin: 0;">Kode berlaku selama 5 menit. Jangan bagikan kode ini ke siapapun.</p>
    </div>`
  );
}

export async function sendSignupSuccessEmail(email: string): Promise<void> {
  const appUrl = process.env.SITE_URL ?? process.env.APP_URL ?? DEFAULT_APP_URL;

  await sendViaResend(
    email,
    "Pendaftaran Berhasil — Makalah AI",
    `<p>Pendaftaran akun kamu berhasil.</p><p>Sekarang kamu bisa mulai menyusun paper dengan Makalah AI.</p><p><a href="${appUrl}/get-started">Mulai sekarang</a></p>`
  );
}
