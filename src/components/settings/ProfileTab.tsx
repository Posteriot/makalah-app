"use client"

import { useEffect, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import Image from "next/image"
import { toast } from "sonner"
import { User as UserIcon } from "iconoir-react"
import type { Doc } from "@convex/_generated/dataModel"

interface ProfileTabProps {
  convexUser: Doc<"users"> | null
  session: { user: { id: string; name: string | null; email: string; image: string | null; emailVerified: boolean; createdAt: Date; updatedAt: Date }; session: { id: string; userId: string; expiresAt: Date; token: string } } | null
  isLoading: boolean
}

export function ProfileTab({ convexUser, session, isLoading }: ProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const updateProfile = useMutation(api.users.updateProfile)

  useEffect(() => {
    if (convexUser) {
      setFirstName(convexUser.firstName ?? "")
      setLastName(convexUser.lastName ?? "")
    } else if (session?.user?.name) {
      const nameParts = session.user.name.split(" ")
      setFirstName(nameParts[0] ?? "")
      setLastName(nameParts.slice(1).join(" ") ?? "")
    }
  }, [convexUser, session])

  const primaryEmail = convexUser?.email ?? session?.user?.email ?? ""
  const fullName = [convexUser?.firstName ?? session?.user?.name?.split(" ")[0], convexUser?.lastName ?? session?.user?.name?.split(" ").slice(1).join(" ")]
    .filter(Boolean)
    .join(" ")
    .trim()
  const userInitial =
    (convexUser?.firstName ?? session?.user?.name)?.charAt(0).toUpperCase() ||
    primaryEmail.charAt(0).toUpperCase() ||
    "U"
  const avatarUrl = session?.user?.image ?? null

  const handleSave = async () => {
    if (!convexUser) return

    setIsSaving(true)
    try {
      const trimmedFirst = firstName.trim()
      const trimmedLast = lastName.trim()

      await updateProfile({
        userId: convexUser._id,
        firstName: trimmedFirst || undefined,
        lastName: trimmedLast || undefined,
      })

      // Also update BetterAuth user name if changed
      const { authClient } = await import("@/lib/auth-client")
      const newName = [trimmedFirst, trimmedLast].filter(Boolean).join(" ")
      if (newName !== fullName) {
        await authClient.updateUser({ name: newName })
      }

      toast.success("Profil berhasil diperbarui.")
      setIsEditing(false)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Gagal memperbarui profil."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-narrative font-medium text-xl">
          <UserIcon className="h-5 w-5 text-slate-800 dark:text-slate-200" />
          Detail
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Atur nama dan avatar akun Anda.
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">Profil</div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
        {!isEditing ? (
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
            <span className="text-interface text-xs text-muted-foreground">Profil</span>
            <div className="min-w-0 flex items-center gap-3 text-interface text-sm text-foreground max-sm:w-full">
              <div className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={fullName || "User"}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                    unoptimized
                    loader={({ src }) => src}
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <span className="truncate text-interface text-sm font-medium">
                {fullName || primaryEmail || "-"}
              </span>
            </div>
            <button
              className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-2 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              <span
                className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
              <span className="relative z-10">Ubah Profil</span>
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-4 text-interface text-sm font-semibold">Ubah profil</div>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3 max-sm:flex-col max-sm:items-start">
                <div className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground text-base font-semibold">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={fullName || "User"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      unoptimized
                      loader={({ src }) => src}
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-interface text-xs font-medium text-foreground">Nama depan</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-interface text-xs font-medium text-foreground">Nama belakang</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-4 border-t border-border pt-4 max-sm:flex-col-reverse max-sm:items-stretch">
              <button
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-transparent text-slate-800 hover:text-slate-800 hover:border-slate-600 dark:text-slate-100 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                <span
                  className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                  aria-hidden="true"
                />
                <span className="relative z-10">Batal</span>
              </button>
              <button
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={handleSave}
                disabled={isLoading || isSaving}
              >
                <span
                  className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                  aria-hidden="true"
                />
                <span className="relative z-10">{isSaving ? "Menyimpan..." : "Simpan"}</span>
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">Email</div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
            <span className="text-interface text-xs text-muted-foreground">Email</span>
            <div className="min-w-0 text-interface text-sm text-foreground">{primaryEmail || "-"}</div>
            {primaryEmail && (
              <span className="inline-flex rounded-badge border border-slate-300 bg-slate-100 px-2 py-0.5 text-signal text-[10px] dark:border-slate-600 dark:bg-slate-700">Utama</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
