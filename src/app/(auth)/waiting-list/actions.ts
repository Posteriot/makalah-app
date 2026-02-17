"use server"

import {
  sendWaitlistConfirmationEmail,
  sendWaitlistInviteEmail,
} from "@/lib/email/resend"

/**
 * Send confirmation email after waitlist registration
 */
export async function sendConfirmationEmail(email: string, firstName?: string): Promise<void> {
  await sendWaitlistConfirmationEmail({ to: email, firstName })
}

/**
 * Send invite emails to multiple waitlist entries
 * Used by admin panel after bulk invite
 */
export async function sendBulkInviteEmails(
  entries: Array<{ email: string; inviteToken: string; firstName?: string }>
): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  // Send emails in parallel with error handling
  const results = await Promise.allSettled(
    entries.map((entry) =>
      sendWaitlistInviteEmail({
        to: entry.email,
        inviteToken: entry.inviteToken,
        firstName: entry.firstName,
      })
    )
  )

  for (const result of results) {
    if (result.status === "fulfilled") {
      success++
    } else {
      failed++
      console.error("Failed to send invite email:", result.reason)
    }
  }

  return { success, failed }
}

/**
 * Send single invite email (for resend)
 */
export async function sendSingleInviteEmail(
  email: string,
  inviteToken: string,
  firstName?: string
): Promise<void> {
  await sendWaitlistInviteEmail({ to: email, inviteToken, firstName })
}
