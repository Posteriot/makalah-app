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

export async function sendSignupSuccessEmail(email: string): Promise<void> {
  const appUrl = process.env.SITE_URL ?? process.env.APP_URL ?? DEFAULT_APP_URL;

  await sendViaResend(
    email,
    "Pendaftaran Berhasil — Makalah AI",
    `<p>Pendaftaran akun kamu berhasil.</p><p>Sekarang kamu bisa mulai menyusun paper dengan Makalah AI.</p><p><a href="${appUrl}/get-started">Mulai sekarang</a></p>`
  );
}
