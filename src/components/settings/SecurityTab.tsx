"use client"

import { useState } from "react"
import type { UserResource } from "@clerk/types"
import { isClerkAPIResponseError } from "@clerk/nextjs/errors"
import { toast } from "sonner"
import { Eye, EyeClosed, Shield } from "iconoir-react"

interface SecurityTabProps {
  user: UserResource | null | undefined
  isLoaded: boolean
}

export function SecurityTab({ user, isLoaded }: SecurityTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [signOutOthers, setSignOutOthers] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSave = async () => {
    if (!user) return

    if (!newPassword) {
      toast.error("Kata sandi baru wajib diisi.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok.")
      return
    }

    if (user.passwordEnabled && !currentPassword) {
      toast.error("Kata sandi saat ini wajib diisi.")
      return
    }

    setIsSaving(true)
    try {
      await user.updatePassword({
        newPassword,
        currentPassword: currentPassword || undefined,
        signOutOfOtherSessions: signOutOthers,
      })
      toast.success("Kata sandi berhasil diperbarui.")
      setIsEditing(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      const message = isClerkAPIResponseError(error)
        ? error.errors[0]?.message ?? "Gagal memperbarui kata sandi."
        : error instanceof Error
          ? error.message
          : "Gagal memperbarui kata sandi."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-signal text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Keamanan
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Update kata sandi dan kontrol sesi.
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
        <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Kata Sandi</div>
        <div className="p-4">
        {!isEditing ? (
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
            <span className="text-interface text-xs text-muted-foreground">Kata sandi</span>
            <div className="min-w-0 text-interface text-sm text-foreground">
              <span className="tracking-[0.2em] text-muted-foreground">••••••••</span>
            </div>
            <button
              className="text-interface text-sm font-medium text-primary transition-opacity hover:opacity-80 focus-ring"
              onClick={() => setIsEditing(true)}
              type="button"
            >
              Ubah kata sandi
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-4 text-interface text-sm font-semibold">Ubah kata sandi</div>
            <div className="flex flex-col gap-4">
              <div className="flex w-full flex-1 flex-col gap-1.5">
                <label className="text-interface text-xs font-medium text-foreground">Kata sandi saat ini</label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    className="h-10 w-full rounded-action border border-border bg-background px-3 pr-10 text-interface text-sm transition-colors focus-ring"
                    value={currentPassword}
                    onChange={(event) =>
                      setCurrentPassword(event.target.value)
                    }
                  />
                  <button
                    className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-badge text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring"
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword((prev) => !prev)
                    }
                    aria-label="Tampilkan kata sandi"
                  >
                    {showCurrentPassword ? (
                      <EyeClosed className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex w-full flex-1 flex-col gap-1.5">
                <label className="text-interface text-xs font-medium text-foreground">Kata sandi baru</label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="h-10 w-full rounded-action border border-border bg-background px-3 pr-10 text-interface text-sm transition-colors focus-ring"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <button
                    className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-badge text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring"
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label="Tampilkan kata sandi baru"
                  >
                    {showNewPassword ? (
                      <EyeClosed className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex w-full flex-1 flex-col gap-1.5">
                <label className="text-interface text-xs font-medium text-foreground">Konfirmasi kata sandi</label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="h-10 w-full rounded-action border border-border bg-background px-3 pr-10 text-interface text-sm transition-colors focus-ring"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                  />
                  <button
                    className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-badge text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring"
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    aria-label="Tampilkan konfirmasi kata sandi"
                  >
                    {showConfirmPassword ? (
                      <EyeClosed className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 size-[18px] shrink-0 accent-primary"
                  id="signout-checkbox"
                  checked={signOutOthers}
                  onChange={(event) => setSignOutOthers(event.target.checked)}
                />
                <div className="flex flex-col gap-0.5">
                  <label
                    className="text-interface text-xs font-medium text-foreground"
                    htmlFor="signout-checkbox"
                  >
                    Keluar dari semua perangkat lain
                  </label>
                  <span className="text-narrative text-xs leading-5 text-muted-foreground">
                    Disarankan agar semua sesi lama ikut keluar setelah
                    kata sandi diganti.
                  </span>
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
    </>
  )
}
