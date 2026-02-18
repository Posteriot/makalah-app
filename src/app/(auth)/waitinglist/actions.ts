"use server"

import { sendWaitlistConfirmationEmail } from "@/lib/email/resend"

/**
 * Send confirmation email after waitlist registration
 */
export async function sendConfirmationEmail(email: string, firstName?: string): Promise<void> {
  await sendWaitlistConfirmationEmail({ to: email, firstName })
}
