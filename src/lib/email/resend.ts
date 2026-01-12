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

