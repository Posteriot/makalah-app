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

export async function sendWaitlistInviteEmail(
  email: string,
  firstName: string,
  signupUrl: string
): Promise<void> {
  await sendViaResend(
    email,
    "Undangan Bergabung — Makalah AI",
    `<div style="font-family: 'Geist Sans', -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #e2e8f0; border-radius: 8px;">
      <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px;">
        <span style="font-size: 11px; font-family: 'Geist Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Makalah AI — Undangan Waiting List</span>
      </div>
      <p style="font-size: 15px; color: #f8fafc; margin: 0 0 8px 0;">Halo, ${firstName}!</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 24px 0;">Kamu telah diundang untuk bergabung dengan Makalah AI. Klik tombol di bawah untuk mendaftar — pilih Google atau buat akun dengan email dan password.</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${signupUrl}" style="display: inline-block; background: #f59e0b; color: #0f172a; font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; padding: 12px 32px; border-radius: 6px;">DAFTAR SEKARANG</a>
      </div>
      <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0;">Setelah mendaftar, kamu bisa langsung mulai menyusun paper dengan Makalah AI.</p>
      <p style="font-size: 11px; color: #64748b; margin: 0;">Kalau kamu tidak merasa mendaftar di Makalah AI, abaikan email ini.</p>
    </div>`
  );
}

export type WaitlistAdminEvent = "new_registration" | "invited" | "registered";

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

  const html = `<div style="font-family: 'Geist Mono', 'SF Mono', monospace; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #e2e8f0; border-radius: 8px;">
    <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px;">
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Makalah AI — Admin Notification</span>
    </div>
    <div style="display: inline-block; background: ${config.color}20; border: 1px solid ${config.color}40; border-radius: 4px; padding: 4px 10px; margin-bottom: 16px;">
      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${config.color};">${config.label}</span>
    </div>
    <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 16px 0; line-height: 1.6;">${config.description}</p>
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0 0 4px 0;">WAKTU</p>
      <p style="font-size: 13px; color: #f8fafc; margin: 0;">${timestamp}</p>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #334155; color: #f8fafc; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none; padding: 10px 24px; border-radius: 6px;">BUKA DASHBOARD</a>
    </div>
    <p style="font-size: 10px; color: #475569; margin: 16px 0 0 0; text-align: center;">Email otomatis dari sistem Makalah AI. Tidak perlu dibalas.</p>
  </div>`;

  for (const adminEmail of adminEmails) {
    try {
      await sendViaResend(adminEmail, config.subject, html);
    } catch (error) {
      console.warn(`[Waitlist Admin] Failed to notify ${adminEmail}:`, error);
    }
  }
}
