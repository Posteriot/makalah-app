import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { AdminPanelContainer } from "@/components/admin/AdminPanelContainer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default async function DashboardPage() {
  const user = await currentUser()
  if (!user) redirect("/sign-in")

  const convexUser = await fetchQuery(api.users.getUserByClerkId, {
    clerkUserId: user.id,
  })

  if (!convexUser) redirect("/sign-in")

  // Check if user is admin or superadmin
  const isAdmin = await fetchQuery(api.users.checkIsAdmin, {
    userId: convexUser._id,
  })

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>
            Anda tidak memiliki izin untuk mengakses Dashboard.
            Halaman ini hanya dapat diakses oleh Admin atau Superadmin.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AdminPanelContainer
      userId={convexUser._id}
      userRole={convexUser.role as "superadmin" | "admin" | "user"}
    />
  )
}
