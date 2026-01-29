import { redirect } from "next/navigation"

/**
 * Redirect /subscription/upgrade to /subscription/plans
 * Maintains backward compatibility for existing bookmarks
 */
export default function UpgradePage() {
  redirect("/subscription/plans")
}
