"use client"

import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { Eye, EyeClosed, Lock } from "iconoir-react"

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
  const [isSettingPassword, setIsSettingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [hasPassword, setHasPassword] = useState(false)
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([])
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true)

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [is2FALoading, setIs2FALoading] = useState(false)
  const [show2FAPasswordInput, setShow2FAPasswordInput] = useState(false)
  const [twoFAPassword, setTwoFAPassword] = useState("")
  const [show2FAPassword, setShow2FAPassword] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)

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

  // Check 2FA status from session
  useEffect(() => {
    if (!session?.user) return
    const user = session.user as Record<string, unknown>
    setIs2FAEnabled(user.twoFactorEnabled === true)
  }, [session])

  const handleSetPassword = async () => {
    if (!newPassword) {
      toast.error("Password baru wajib diisi.")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password minimal 8 karakter.")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Konfirmasi password tidak cocok.")
      return
    }

    setIsSettingPassword(true)
    try {
      // setPassword is a core BetterAuth endpoint for OAuth-only users
      // but not included in the generated client types — safe to call via proxy.
      const { error: apiError } = await (authClient as unknown as {
        setPassword: (args: { newPassword: string }) => Promise<{ error: { message?: string } | null }>
      }).setPassword({ newPassword })
      if (apiError) {
        toast.error(apiError.message ?? "Gagal membuat password.")
        return
      }
      toast.success("Password berhasil dibuat.")
      setHasPassword(true)
      setNewPassword("")
      setConfirmPassword("")
    } catch {
      toast.error("Gagal membuat password. Silakan coba lagi.")
    } finally {
      setIsSettingPassword(false)
    }
  }

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

    if (!currentPassword) {
      toast.error("Password saat ini wajib diisi.")
      return
    }

    setIsSaving(true)
    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: signOutOthers,
      })

      if (signOutOthers) {
        toast.success("Password berhasil diatur. Silakan masuk kembali.")
        window.location.href = "/sign-in"
        return
      }

      toast.success("Password berhasil diatur.")
      setIsEditing(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Gagal memperbarui password."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEnable2FA = async () => {
    if (!twoFAPassword) {
      toast.error("Password wajib diisi untuk mengaktifkan 2FA.")
      return
    }
    setIs2FALoading(true)
    try {
      const result = await authClient.twoFactor.enable({ password: twoFAPassword })
      if (result.error) {
        toast.error(result.error.message ?? "Gagal mengaktifkan 2FA.")
        return
      }
      setIs2FAEnabled(true)
      setShow2FAPasswordInput(false)
      setTwoFAPassword("")

      // Check if backup codes were returned
      const data = result.data as Record<string, unknown> | undefined
      if (data?.backupCodes && Array.isArray(data.backupCodes)) {
        setBackupCodes(data.backupCodes as string[])
        toast.success("2FA berhasil diaktifkan! Simpan backup codes di bawah.")
      } else {
        toast.success("Verifikasi 2 Langkah berhasil diaktifkan.")
      }
    } catch {
      toast.error("Gagal mengaktifkan 2FA. Cek password dan coba lagi.")
    } finally {
      setIs2FALoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!twoFAPassword) {
      toast.error("Password wajib diisi untuk menonaktifkan 2FA.")
      return
    }
    setIs2FALoading(true)
    try {
      const result = await authClient.twoFactor.disable({ password: twoFAPassword })
      if (result.error) {
        toast.error(result.error.message ?? "Gagal menonaktifkan 2FA.")
        return
      }
      setIs2FAEnabled(false)
      setShow2FAPasswordInput(false)
      setTwoFAPassword("")
      setBackupCodes(null)
      toast.success("Verifikasi 2 Langkah berhasil dinonaktifkan.")
    } catch {
      toast.error("Gagal menonaktifkan 2FA. Cek password dan coba lagi.")
    } finally {
      setIs2FALoading(false)
    }
  }

  // Filter to show only external (non-credential) accounts
  const externalAccounts = linkedAccounts.filter((a) => a.providerId !== "credential")

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">Password</div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
        {!hasPassword ? (
          /* OAuth-only user: no credential account yet — inline set password form */
          <div className="w-full">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-interface text-xs text-muted-foreground">Password</span>
              <span className="text-interface text-xs text-muted-foreground">—</span>
              <span className="text-interface text-xs text-muted-foreground">Belum diatur</span>
            </div>
            <div className="flex flex-col gap-5">
              <div className="flex w-full flex-1 flex-col gap-1.5">
                <label className="sr-only" htmlFor="set-new-password">Password baru</label>
                <div className="relative flex items-center">
                  <input
                    id="set-new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Password baru (min. 8 karakter)"
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
                    {showNewPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex w-full flex-1 flex-col gap-1.5">
                <label className="sr-only" htmlFor="set-confirm-password">Konfirmasi password</label>
                <div className="relative flex items-center">
                  <input
                    id="set-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Konfirmasi password"
                    className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 pr-10 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    className="absolute right-2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-slate-300 transition-colors hover:text-foreground dark:hover:text-slate-100 focus:outline-none"
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label="Tampilkan konfirmasi password"
                  >
                    {showConfirmPassword ? <EyeClosed className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end border-t border-border pt-4">
              <button
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-4 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
                onClick={handleSetPassword}
                disabled={isSettingPassword || !newPassword || !confirmPassword}
              >
                <span
                  className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                  aria-hidden="true"
                />
                <span className="relative z-10">{isSettingPassword ? "Menyimpan..." : "Buat Password"}</span>
              </button>
            </div>
          </div>
        ) : !isEditing ? (
          /* Has password: show dots + edit button */
          <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
            <span className="text-interface text-xs text-muted-foreground">Password</span>
            <div className="min-w-0 text-interface text-sm text-foreground">
              <span className="tracking-[0.2em] text-muted-foreground">••••••••</span>
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
              <span className="relative z-10">Ubah Password</span>
            </button>
          </div>
        ) : (
          /* Editing: change password form */
          <div className="w-full">
            <div className="mb-4 text-interface text-sm font-semibold">
              Ubah password
            </div>
            <div className="flex flex-col gap-5">
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

      {/* 2FA Section — only show for users with password */}
      {hasPassword && (
        <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
          <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">
            Verifikasi 2 Langkah
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800">
            {/* Status row */}
            <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
              <span className="text-interface text-xs text-muted-foreground">Status</span>
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                {is2FAEnabled ? (
                  <span className="inline-flex items-center gap-1 rounded-badge bg-success/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-success">
                    Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-badge bg-slate-500/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
                    Nonaktif
                  </span>
                )}
              </div>
              {!show2FAPasswordInput && (
                <button
                  className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-2 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  onClick={() => setShow2FAPasswordInput(true)}
                  disabled={is2FALoading}
                >
                  <span
                    className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                    aria-hidden="true"
                  />
                  <span className="relative z-10">
                    {is2FAEnabled ? "Nonaktifkan" : "Aktifkan"}
                  </span>
                </button>
              )}
            </div>

            {/* Description */}
            <p className="mt-2 text-narrative text-xs text-muted-foreground">
              {is2FAEnabled
                ? "Setiap kali masuk dengan email dan password, kode verifikasi akan dikirim ke email kamu. Fitur ini aktif secara default untuk keamanan akunmu."
                : "Verifikasi 2 langkah sedang nonaktif. Kami sangat menyarankan untuk mengaktifkannya kembali demi keamanan akunmu."}
            </p>

            {/* Password input for enable/disable */}
            {show2FAPasswordInput && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-interface text-xs font-medium mb-3">
                  {is2FAEnabled
                    ? "Masukkan password untuk menonaktifkan 2FA:"
                    : "Masukkan password untuk mengaktifkan 2FA:"}
                </p>
                <div className="flex gap-3 items-start max-sm:flex-col">
                  <div className="relative flex items-center flex-1 max-sm:w-full">
                    <input
                      type={show2FAPassword ? "text" : "password"}
                      placeholder="Password"
                      value={twoFAPassword}
                      onChange={(e) => setTwoFAPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          is2FAEnabled ? handleDisable2FA() : handleEnable2FA()
                        }
                      }}
                      className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 pr-10 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
                    />
                    <button
                      className="absolute right-2 inline-flex h-7 w-7 items-center justify-center text-muted-foreground dark:text-slate-300 transition-colors hover:text-foreground dark:hover:text-slate-100 focus:outline-none"
                      type="button"
                      onClick={() => setShow2FAPassword((prev) => !prev)}
                      aria-label="Tampilkan password"
                    >
                      {show2FAPassword ? (
                        <EyeClosed className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-3 py-2 text-narrative text-xs font-medium border border-transparent bg-transparent text-slate-800 hover:border-slate-600 dark:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                      type="button"
                      onClick={() => {
                        setShow2FAPasswordInput(false)
                        setTwoFAPassword("")
                        setShow2FAPassword(false)
                      }}
                      disabled={is2FALoading}
                    >
                      <span className="relative z-10">Batal</span>
                    </button>
                    <button
                      className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-3 py-2 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
                      type="button"
                      onClick={is2FAEnabled ? handleDisable2FA : handleEnable2FA}
                      disabled={is2FALoading || !twoFAPassword}
                    >
                      <span
                        className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                      <span className="relative z-10">
                        {is2FALoading
                          ? "Memproses..."
                          : is2FAEnabled
                            ? "Nonaktifkan"
                            : "Aktifkan"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Backup codes display */}
            {backupCodes && backupCodes.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-interface text-xs font-medium text-destructive mb-2">
                  Simpan backup codes ini di tempat yang aman. Kode ini hanya ditampilkan sekali.
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-md border border-dashed border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 p-3">
                  {backupCodes.map((code, i) => (
                    <span
                      key={i}
                      className="font-mono text-xs text-foreground tracking-wider"
                    >
                      {code}
                    </span>
                  ))}
                </div>
                <button
                  className="mt-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(backupCodes.join("\n"))
                    toast.success("Backup codes disalin ke clipboard.")
                  }}
                >
                  Salin semua ke clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
