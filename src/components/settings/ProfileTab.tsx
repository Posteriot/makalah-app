"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { UserResource } from "@clerk/types"
import { isClerkAPIResponseError } from "@clerk/nextjs/errors"
import Image from "next/image"
import { toast } from "sonner"
import { User as UserIcon } from "iconoir-react"

interface ProfileTabProps {
  user: UserResource | null | undefined
  isLoaded: boolean
}

export function ProfileTab({ user, isLoaded }: ProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName ?? "")
    setLastName(user.lastName ?? "")
  }, [user])

  const profilePreviewUrl = useMemo(() => {
    if (!profileImage) return null
    return URL.createObjectURL(profileImage)
  }, [profileImage])

  useEffect(() => {
    return () => {
      if (profilePreviewUrl) {
        URL.revokeObjectURL(profilePreviewUrl)
      }
    }
  }, [profilePreviewUrl])

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? ""
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  const userInitial =
    user?.firstName?.charAt(0).toUpperCase() ||
    primaryEmail.charAt(0).toUpperCase() ||
    "U"

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)
    try {
      const trimmedFirst = firstName.trim()
      const trimmedLast = lastName.trim()
      const updatePayload: { firstName?: string | null; lastName?: string | null } = {}

      if (trimmedFirst !== (user.firstName ?? "")) {
        updatePayload.firstName = trimmedFirst ? trimmedFirst : null
      }

      if (trimmedLast !== (user.lastName ?? "")) {
        updatePayload.lastName = trimmedLast ? trimmedLast : null
      }

      if (Object.keys(updatePayload).length > 0) {
        await user.update(updatePayload)
      }

      if (profileImage) {
        await user.setProfileImage({ file: profileImage })
      }

      toast.success("Profil berhasil diperbarui.")
      setIsEditing(false)
      setProfileImage(null)
    } catch (error) {
      const message = isClerkAPIResponseError(error)
        ? error.errors[0]?.message ?? "Gagal memperbarui profil."
        : error instanceof Error
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
                {user?.imageUrl ? (
                  <Image
                    src={user.imageUrl}
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
                  {profilePreviewUrl ? (
                    <Image
                      src={profilePreviewUrl}
                      alt={fullName || "User"}
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                      unoptimized
                      loader={({ src }) => src}
                    />
                  ) : user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
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
                <div className="flex flex-col gap-1">
                  <button
                    className="group relative overflow-hidden inline-flex w-fit items-center justify-center gap-2 rounded-action px-3 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isLoaded}
                  >
                    <span
                      className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                      aria-hidden="true"
                    />
                    <span className="relative z-10">Upload</span>
                  </button>
                  <span className="text-narrative text-xs text-muted-foreground">
                    Ukuran rekomendasi 1:1, maksimal 10MB.
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setProfileImage(file)
                    }}
                  />
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
                disabled={!isLoaded || isSaving}
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
