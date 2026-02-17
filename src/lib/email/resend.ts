"use server"

import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL

const client = resendApiKey ? new Resend(resendApiKey) : null

type BaseEmailParams = {
  to: string
}

export async function sendWelcomeEmail({
  to,
}: BaseEmailParams): Promise<void> {
  if (!client || !fromEmail) {
    return
  }

  await client.emails.send({
    from: fromEmail,
    to,
    subject: "Welcome to Makalah App",
    text: "Thanks for signing up to Makalah App. You can now start organizing and writing your papers with AI assistance.",
  })
}

export async function sendBillingNotificationEmail({
  to,
  subject,
  text,
}: BaseEmailParams & { subject: string; text: string }): Promise<void> {
  if (!client || !fromEmail) {
    return
  }

  await client.emails.send({
    from: fromEmail,
    to,
    subject,
    text,
  })
}

// ════════════════════════════════════════════════════════════════
// Waiting List Emails
// ════════════════════════════════════════════════════════════════

/**
 * Send confirmation email after waitlist registration
 */
export async function sendWaitlistConfirmationEmail({
  to,
  firstName,
}: BaseEmailParams & { firstName?: string }): Promise<void> {
  if (!client || !fromEmail) {
    return
  }

  const greeting = firstName ? `Halo ${firstName}!` : "Halo!"

  await client.emails.send({
    from: fromEmail,
    to,
    subject: "Pendaftaran Waiting List Berhasil - Makalah",
    text: `${greeting}

Terima kasih sudah mendaftar di waiting list Makalah App.

Email kamu (${to}) sudah terdaftar. Kami akan mengirimkan undangan khusus saat giliran kamu tiba untuk mencoba Makalah App.

Sambil menunggu, kamu bisa:
- Follow perkembangan kami di sosial media
- Baca dokumentasi di website kami

Sampai jumpa di Makalah App!

Salam,
Tim Makalah`,
  })
}

/**
 * Send invite email with magic link for signup
 */
export async function sendWaitlistInviteEmail({
  to,
  inviteToken,
  firstName,
}: BaseEmailParams & { inviteToken: string; firstName?: string }): Promise<void> {
  if (!client || !fromEmail) {
    return
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000"
  const inviteLink = `${appUrl}/accept-invite?token=${inviteToken}`
  const greeting = firstName ? `Halo ${firstName}!` : "Halo!"

  await client.emails.send({
    from: fromEmail,
    to,
    subject: "Undangan Bergabung - Makalah App",
    text: `${greeting}

Kabar baik! Giliran kamu sudah tiba untuk bergabung dengan Makalah App.

Klik link berikut untuk membuat akun:
${inviteLink}

Link ini berlaku selama 7 hari.

Apa itu Makalah App?
Makalah adalah AI assistant yang membantu kamu menyusun paper akademik dengan mudah. Cukup ngobrol, dan AI akan membantu dari ide hingga paper jadi.

Jika ada pertanyaan, jangan ragu untuk menghubungi kami.

Salam,
Tim Makalah`,
  })
}
