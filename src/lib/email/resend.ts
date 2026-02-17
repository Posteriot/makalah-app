"use server"

import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL

const client = resendApiKey ? new Resend(resendApiKey) : null

type BaseEmailParams = {
  to: string
}

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

Email kamu (${to}) sudah terdaftar. Saat giliran kamu tiba, tim Makalah AI akan mengirimkan magic link ke email ini. Klik link tersebut untuk langsung masuk — akunmu akan otomatis dibuat.

Penting: Jika email undangan tidak ditemukan di inbox, periksa folder spam.

Sambil menunggu, kamu bisa:
- Follow perkembangan kami di sosial media
- Baca dokumentasi di website kami

Sampai jumpa di Makalah App!

Salam,
Tim Makalah`,
  })
}
