"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { isClerkAPIResponseError } from "@clerk/nextjs/errors"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowUpCircle,
  BadgeCheck,
  Eye,
  EyeClosed,
  Shield,
  User as UserIcon,
  Xmark,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { RoleBadge } from "@/components/admin/RoleBadge"

// Tier configuration for subscription badges
// Standar warna: GRATIS=emerald, BPP=sky, PRO=amber (semua text putih)
// Upgrade button: warna --success (grass green) + text-white
type TierType = "gratis" | "free" | "bpp" | "pro"

const TIER_CONFIG: Record<TierType, { label: string; className: string; showUpgrade: boolean }> = {
  gratis: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  free: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  bpp: { label: "BPP", className: "bg-sky-600 text-white", showUpgrade: true },
  pro: { label: "PRO", className: "bg-amber-500 text-white", showUpgrade: false },
}

interface UserSettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsTab = "profile" | "security" | "status"

export function UserSettingsModal({
  open,
  onOpenChange,
}: UserSettingsModalProps) {
  const { user, isLoaded } = useUser()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [isPasswordEditing, setIsPasswordEditing] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profileImage, setProfileImage] = useState<File | null>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [signOutOthers, setSignOutOthers] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }
    document.addEventListener("keydown", handleKeydown)
    return () => document.removeEventListener("keydown", handleKeydown)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open || !user) return
    setActiveTab("profile")
    setIsProfileEditing(false)
    setIsPasswordEditing(false)
    setFirstName(user.firstName ?? "")
    setLastName(user.lastName ?? "")
    setProfileImage(null)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setSignOutOthers(true)
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }, [open, user])

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

  const handleClose = () => onOpenChange(false)

  const handleProfileSave = async () => {
    if (!user) return

    setIsSavingProfile(true)
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
      setIsProfileEditing(false)
      setProfileImage(null)
    } catch (error) {
      const message = isClerkAPIResponseError(error)
        ? error.errors[0]?.message ?? "Gagal memperbarui profil."
        : error instanceof Error
          ? error.message
          : "Gagal memperbarui profil."
      toast.error(message)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSave = async () => {
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

    setIsSavingPassword(true)
    try {
      await user.updatePassword({
        newPassword,
        currentPassword: currentPassword || undefined,
        signOutOfOtherSessions: signOutOthers,
      })
      toast.success("Kata sandi berhasil diperbarui.")
      setIsPasswordEditing(false)
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
      setIsSavingPassword(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan akun"
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={handleClose} />
      <div
        className="relative z-10 flex w-full max-w-[720px] flex-col overflow-hidden rounded-shell border border-border bg-card shadow-lg max-md:mx-4 max-md:h-auto max-md:max-h-[calc(100vh-32px)] md:h-[560px]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-border px-6 pb-4 pt-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-signal text-lg">Atur Akun</h2>
            <p className="text-narrative text-sm text-muted-foreground">
              Kelola informasi akun Anda di Makalah AI.
            </p>
          </div>
          <button
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-action text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground focus-ring"
            onClick={handleClose}
            aria-label="Tutup modal"
            type="button"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 max-md:flex-col">
          <nav className="flex w-[200px] shrink-0 flex-col gap-1 border-r border-border bg-muted/30 p-2 pt-6 max-md:w-full max-md:flex-row max-md:flex-wrap max-md:border-b max-md:border-r-0 max-md:p-3 max-md:pt-3" aria-label="Navigasi akun">
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "profile" && "bg-accent text-foreground"
              )}
              onClick={() => setActiveTab("profile")}
              type="button"
            >
              {activeTab === "profile" && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />}
              <UserIcon />
              <span>Profil</span>
            </button>
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "security" && "bg-accent text-foreground"
              )}
              onClick={() => setActiveTab("security")}
              type="button"
            >
              {activeTab === "security" && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />}
              <Shield />
              <span>Keamanan</span>
            </button>
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "status" && "bg-accent text-foreground"
              )}
              onClick={() => setActiveTab("status")}
              type="button"
            >
              {activeTab === "status" && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />}
              <BadgeCheck />
              <span>Status Akun</span>
            </button>
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto p-6 max-sm:p-5">
            <div
              className={cn(
                activeTab === "profile" ? "block" : "hidden"
              )}
            >
              {/* Header with icon like subscription page */}
              <div className="mb-6">
                <h3 className="flex items-center gap-2 text-signal text-lg">
                  <UserIcon className="h-5 w-5 text-primary" />
                  Detail Profil
                </h3>
                <p className="mt-1 text-narrative text-sm text-muted-foreground">
                  Atur nama dan avatar akun Anda.
                </p>
              </div>

              {/* Card wrapper like subscription page */}
              <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
                <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Profil</div>
                <div className="p-4">
                {!isProfileEditing ? (
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
                      onClick={() => setIsProfileEditing(true)}
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
                        onClick={() => setIsProfileEditing(false)}
                        disabled={isSavingProfile}
                      >
                        Batal
                      </button>
                      <button
                        className="rounded-action bg-primary px-5 py-2 text-interface text-sm text-primary-foreground transition-colors hover:bg-primary/90 focus-ring disabled:opacity-50"
                        type="button"
                        onClick={handleProfileSave}
                        disabled={!isLoaded || isSavingProfile}
                      >
                        {isSavingProfile ? "Menyimpan..." : "Simpan"}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* Email card */}
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
            </div>

            <div
              className={cn(
                activeTab === "security" ? "block" : "hidden"
              )}
            >
              {/* Header with icon like subscription page */}
              <div className="mb-6">
                <h3 className="flex items-center gap-2 text-signal text-lg">
                  <Shield className="h-5 w-5 text-primary" />
                  Keamanan
                </h3>
                <p className="mt-1 text-narrative text-sm text-muted-foreground">
                  Update kata sandi dan kontrol sesi.
                </p>
              </div>

              {/* Password card */}
              <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
                <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Kata Sandi</div>
                <div className="p-4">
                {!isPasswordEditing ? (
                  <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
                    <span className="text-interface text-xs text-muted-foreground">Kata sandi</span>
                    <div className="min-w-0 text-interface text-sm text-foreground">
                      <span className="tracking-[0.2em] text-muted-foreground">••••••••</span>
                    </div>
                    <button
                      className="text-interface text-sm font-medium text-primary transition-opacity hover:opacity-80 focus-ring"
                      onClick={() => setIsPasswordEditing(true)}
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
                        onClick={() => setIsPasswordEditing(false)}
                        disabled={isSavingPassword}
                      >
                        Batal
                      </button>
                      <button
                        className="rounded-action bg-primary px-5 py-2 text-interface text-sm text-primary-foreground transition-colors hover:bg-primary/90 focus-ring disabled:opacity-50"
                        type="button"
                        onClick={handlePasswordSave}
                        disabled={!isLoaded || isSavingPassword}
                      >
                        {isSavingPassword ? "Menyimpan..." : "Simpan"}
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>

            <div
              className={cn(
                activeTab === "status" ? "block" : "hidden"
              )}
            >
              {/* Header with icon like subscription page */}
              <div className="mb-6">
                <h3 className="flex items-center gap-2 text-signal text-lg">
                  <BadgeCheck className="h-5 w-5 text-primary" />
                  Status Akun
                </h3>
                <p className="mt-1 text-narrative text-sm text-muted-foreground">
                  Ringkasan akses akun Anda di Makalah AI.
                </p>
              </div>

              {/* Email info card */}
              <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
                <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Informasi Akun</div>
                <div className="p-4">
                  <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
                    <span className="text-interface text-xs text-muted-foreground">Email</span>
                    <div className="min-w-0 text-interface text-sm text-foreground">{primaryEmail || "-"}</div>
                    <div />
                  </div>
                </div>
              </div>

              {/* Role card */}
              <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
                <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Role & Akses</div>
                <div className="p-4">
                  <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
                    <span className="text-interface text-xs text-muted-foreground">Role</span>
                    <div className="min-w-0 text-interface text-sm text-foreground">
                      {isConvexLoading ? (
                        <span className="text-interface text-sm text-muted-foreground">
                          Memuat...
                        </span>
                      ) : convexUser ? (
                        <RoleBadge
                          role={convexUser.role as "superadmin" | "admin" | "user"}
                        />
                      ) : (
                        "-"
                      )}
                    </div>
                    <div />
                  </div>
                </div>
              </div>

              {/* Subscription card */}
              <div className="mb-4 overflow-hidden rounded-action border border-border bg-card">
                <div className="border-b border-border px-4 py-3 text-interface text-sm font-medium">Subskripsi</div>
                <div className="p-4">
                  {isConvexLoading ? (
                    <span className="text-interface text-sm text-muted-foreground">Memuat...</span>
                  ) : (
                    <>
                      {/* Tier badge */}
                      {(() => {
                        const tierKey = (convexUser?.subscriptionStatus || "free").toLowerCase() as TierType
                        const tierConfig = TIER_CONFIG[tierKey] || TIER_CONFIG.free
                        return (
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-badge px-3 py-1 text-signal text-xs",
                                tierConfig.className
                              )}
                            >
                              {tierConfig.label}
                            </span>
                            {/* Upgrade button - grass green (--success) + text-white */}
                            {tierConfig.showUpgrade && (
                              <Link
                                href="/subscription/upgrade"
                                onClick={() => onOpenChange(false)}
                                className="inline-flex items-center gap-1.5 rounded-action bg-success px-4 py-2 text-interface text-sm font-medium text-white transition-colors hover:bg-success/90 focus-ring"
                              >
                                <ArrowUpCircle className="h-4 w-4" />
                                Upgrade
                              </Link>
                            )}
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
            </div>

            {!isLoaded && (
              <div className="text-interface text-sm text-muted-foreground">Memuat...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
