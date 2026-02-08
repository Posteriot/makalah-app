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
        <h3 className="flex items-center gap-2 text-signal text-lg">
          <UserIcon className="h-5 w-5 text-primary" />
          Detail Profil
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Atur nama dan avatar akun Anda.
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Profil</div>
        <div className="p-4">
        {!isEditing ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
              <span className="text-interface text-sm font-medium">
                {fullName || primaryEmail || "-"}
              </span>
            </div>
            <button
              className="text-interface text-sm font-medium text-primary transition-opacity hover:opacity-80 focus-ring"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              Ubah profil
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-4 text-interface text-sm font-semibold">Ubah profil</div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
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
                    className="inline-flex w-fit rounded-action border border-border px-3 py-1.5 text-interface text-sm transition-colors hover:bg-accent focus-ring disabled:opacity-50"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isLoaded}
                  >
                    Upload
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
                    className="h-10 w-full rounded-action border border-border bg-background px-3 text-interface text-sm transition-colors focus-ring"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-interface text-xs font-medium text-foreground">Nama belakang</label>
                  <input
                    type="text"
                    className="h-10 w-full rounded-action border border-border bg-background px-3 text-interface text-sm transition-colors focus-ring"
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
              <button
                className="rounded-action border border-border bg-background px-4 py-2 text-interface text-sm transition-colors hover:bg-accent focus-ring disabled:opacity-50"
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                className="rounded-action bg-primary px-5 py-2 text-interface text-sm text-primary-foreground transition-colors hover:bg-primary/90 focus-ring disabled:opacity-50"
                type="button"
                onClick={handleSave}
                disabled={!isLoaded || isSaving}
              >
                {isSaving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Email</div>
        <div className="p-4">
          <div className="flex items-center gap-2 text-interface text-sm">
            <span>{primaryEmail || "-"}</span>
            {primaryEmail && (
              <span className="inline-flex rounded-badge border border-border bg-muted px-2 py-0.5 text-signal text-[10px]">Utama</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
