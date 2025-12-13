import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { SettingsContainer } from "@/components/settings/SettingsContainer"

export default async function SettingsPage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in")

  const convexUser = await fetchQuery(api.users.getUserByClerkId, {
    clerkUserId: user.id,
  })

  if (!convexUser) redirect("/sign-in")

  return <SettingsContainer user={convexUser} />
}
