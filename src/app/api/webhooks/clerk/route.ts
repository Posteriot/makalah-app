import { Webhook } from "svix"
import { headers } from "next/headers"
import { WebhookEvent } from "@clerk/nextjs/server"
import { sendWelcomeEmail } from "@/lib/email/resend"

/**
 * Clerk Webhook Handler
 *
 * Handles Clerk webhook events and triggers custom email flows via Resend.
 * Events handled:
 * - user.created: Sends welcome email to new users
 *
 * Setup di Clerk Dashboard:
 * 1. Go to Webhooks → Add Endpoint
 * 2. URL: https://your-domain.com/api/webhooks/clerk
 * 3. Select events: user.created
 * 4. Copy Signing Secret to CLERK_WEBHOOK_SECRET env var
 */

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not set")
    return new Response("Webhook secret not configured", { status: 500 })
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new Response("Invalid signature", { status: 400 })
  }

  // Handle the webhook event
  const eventType = evt.type

  switch (eventType) {
    case "user.created": {
      const { email_addresses } = evt.data

      // Get primary email
      const primaryEmail = email_addresses?.find(
        (email) => email.id === evt.data.primary_email_address_id
      )

      if (primaryEmail?.email_address) {
        try {
          await sendWelcomeEmail({
            to: primaryEmail.email_address,
          })
        } catch (error) {
          console.error("Failed to send welcome email:", error)
          // Don't fail the webhook, just log the error
        }
      }
      break
    }

    // Add more event handlers as needed
    // case "user.updated":
    // case "user.deleted":
    // case "session.created":

    default:
      // Unhandled event type - no action needed
      break
  }

  return new Response("Webhook processed", { status: 200 })
}
