"use client"

import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Eye, EyeClosed, Shield } from "iconoir-react"

interface SecurityTabProps {
  session: { user: { id: string; name: string | null; email: string; image?: string | null; emailVerified: boolean; createdAt: Date; updatedAt: Date }; session: { id: string; userId: string; expiresAt: Date; token: string } } | null
  isLoading: boolean
}

interface LinkedAccount {
  id: string
  providerId: string
  [key: string]: unknown
}

export function SecurityTab({ session, isLoading }: SecurityTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [signOutOthers, setSignOutOthers] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)

  // Fetch linked accounts to determine hasPassword and connected accounts
  useEffect(() => {
    if (!session) {
      setIsLoadingAccounts(false)
      return
    }

    let cancelled = false

    async function fetchAccounts() {
      try {
        const result = await authClient.listAccounts()
        if (cancelled) return

        const accounts = (result.data ?? []) as LinkedAccount[]
        setLinkedAccounts(accounts)
        setHasPassword(accounts.some((a) => a.providerId === "credential"))
      } catch (err) {
        console.error("[SecurityTab] listAccounts failed:", err)
      } finally {
        if (!cancelled) setIsLoadingAccounts(false)
      }
    }

    fetchAccounts()
    return () => { cancelled = true }
  }, [session])

  const handleSave = async () => {
    if (!session) return

    if (!newPassword) {
      toast.error("Password baru wajib diisi.")
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.")
      return
    }

    if (hasPassword && !currentPassword) {
      toast.error("Password saat ini wajib diisi.")
      return
    }

    setIsSaving(true)
    try {
      await authClient.changePassword({
        currentPassword: currentPassword || "",
        newPassword,
        revokeOtherSessions: signOutOthers,
      })
      toast.success(
        hasPassword
          ? "Password berhasil diperbarui."
          : "Password berhasil dibuat."
      )
      setIsEditing(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      // Update hasPassword since we just set/changed it
      setHasPassword(true)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Gagal memperbarui password."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  // Filter to show only external (non-credential) accounts
  const externalAccounts = linkedAccounts.filter((a) => a.providerId !== "credential")

  return (
    <>
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-narrative font-medium text-xl">
          <Shield className="h-5 w-5 text-slate-800 dark:text-slate-200" />
          Keamanan
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Update password dan kontrol sesi.
        </p>
      </div>

      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">Password</div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
        {!isEditing ? (
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
            <span className="text-interface text-xs text-muted-foreground">Password</span>
            <div className="min-w-0 text-interface text-sm text-foreground">
              {isLoadingAccounts ? (
                <span className="text-interface text-xs text-muted-foreground">Memuat...</span>
              ) : hasPassword ? (
                <span className="tracking-[0.2em] text-muted-foreground">••••••••</span>
              ) : (
                <span className="text-interface text-xs text-muted-foreground">
                  Belum diatur
                </span>
              )}
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
              <span className="relative z-10">
                {hasPassword ? "Ubah Password" : "Buat Password"}
              </span>
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="mb-4 text-interface text-sm font-semibold">
              {hasPassword ? "Ubah password" : "Buat password"}
            </div>
            <div className="flex flex-col gap-5">
              {hasPassword && (
                <div className="flex w-full flex-1 flex-col gap-1.5">
                  <label className="sr-only" htmlFor="current-password">
                    Password saat ini
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Password saat ini"
                      className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 pr-10 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                      value={currentPassword}
                      onChange={(event) =>
                        setCurrentPassword(event.target.value)
                      }
                    />
                    <button
                      className="absolute right-2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-slate-300 transition-colors hover:text-foreground dark:hover:text-slate-100 focus:outline-none"
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword((prev) => !prev)
                      }
                      aria-label="Tampilkan password"
                    >
                      {showCurrentPassword ? (
                        <EyeClosed className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex w-full flex-1 flex-col gap-1.5">
                <label className="sr-only" htmlFor="new-password">
                  Password baru
                </label>
                <div className="relative flex items-center">
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Password baru"
                    className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 pr-10 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <button
                    className="absolute right-2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-slate-300 transition-colors hover:text-foreground dark:hover:text-slate-100 focus:outline-none"
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label="Tampilkan password baru"
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
                <label className="sr-only" htmlFor="confirm-password">
                  Konfirmasi password
                </label>
                <div className="relative flex items-center">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Konfirmasi password"
                    className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 pr-10 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                  />
                  <button
                    className="absolute right-2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-slate-300 transition-colors hover:text-foreground dark:hover:text-slate-100 focus:outline-none"
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    aria-label="Tampilkan konfirmasi password"
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
                  className="mt-0.5 size-[18px] shrink-0 accent-slate-200"
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
                    password diganti.
                  </span>
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

      {/* Connected Accounts Section */}
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">Akun Terhubung</div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
          {isLoadingAccounts ? (
            <p className="text-interface text-xs text-muted-foreground">Memuat...</p>
          ) : externalAccounts.length > 0 ? (
            <div className="flex flex-col gap-3">
              {externalAccounts.map((account) => (
                <div
                  key={account.id}
                  className="grid grid-cols-[120px_1fr] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start"
                >
                  <span className="text-interface text-xs text-muted-foreground capitalize">
                    {account.providerId === "google" ? "Google" : account.providerId}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-interface text-sm text-foreground truncate">
                      {session?.user?.email ?? ""}
                    </span>
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-badge bg-success/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-success">
                      Terhubung
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-interface text-xs text-muted-foreground">
              Belum ada akun terhubung.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
