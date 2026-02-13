import { isAuthenticated, getToken } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { AdminPanelContainer } from "@/components/admin/AdminPanelContainer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WarningCircle } from "iconoir-react"

type SearchParams = Record<string, string | string[] | undefined>

function buildQueryString(searchParams?: SearchParams): string {
  if (!searchParams) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) {
        params.append(key, item)
      }
    } else {
      params.append(key, value)
    }
  }
  const query = params.toString()
  return query ? `?${query}` : ""
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const isAuthed = await isAuthenticated()
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const redirectPath = `/dashboard${buildQueryString(resolvedSearchParams)}`

  if (!isAuthed) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`)
  }

  let convexToken: string | null = null
  try {
    convexToken = (await getToken()) ?? null
  } catch {
    redirect(`/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`)
  }
  if (!convexToken) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
          <AlertTitle>Konfigurasi Auth Bermasalah</AlertTitle>
          <AlertDescription>
            Token Convex tidak tersedia. Cek konfigurasi auth.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  const convexOptions = { token: convexToken }

  const convexUser = await fetchQuery(api.users.getMyUser, {}, convexOptions)

  if (!convexUser) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
          <AlertTitle>Sinkronisasi User Bermasalah</AlertTitle>
          <AlertDescription>
            Data user di Convex belum tersedia.
          </AlertDescription>
          <div className="mt-4">
            <Link
              href={redirectPath}
              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              Coba lagi
            </Link>
          </div>
        </Alert>
      </div>
    )
  }

  // Check if user is admin or superadmin
  const isAdmin = await fetchQuery(api.users.checkIsAdmin, {
    userId: convexUser._id,
  }, convexOptions)

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
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
