import { redirect } from "next/navigation"

/**
 * DEPRECATED: Old topup page
 *
 * This page has been moved to /checkout/bpp as part of the pricing flow redesign.
 * This redirect ensures existing bookmarks and links continue to work.
 *
 * @see /checkout/bpp for the new checkout page
 */
export default async function DeprecatedTopupPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const query = from ? `?from=${encodeURIComponent(from)}` : ""

  redirect(`/checkout/bpp${query}`)
}
