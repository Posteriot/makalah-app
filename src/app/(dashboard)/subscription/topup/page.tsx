import { redirect } from "next/navigation"

/**
 * DEPRECATED: Old topup page
 *
 * This page has been moved to /checkout/bpp as part of the pricing flow redesign.
 * This redirect ensures existing bookmarks and links continue to work.
 *
 * @see /checkout/bpp for the new checkout page
 */
export default function DeprecatedTopupPage() {
  redirect("/checkout/bpp")
}
