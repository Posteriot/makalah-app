import { redirect } from "next/navigation"

export default function DashboardPage() {
  // Always redirect to settings
  redirect("/settings")
}

