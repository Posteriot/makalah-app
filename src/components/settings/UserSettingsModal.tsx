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
  EyeOff,
  Shield,
  User as UserIcon,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { RoleBadge } from "@/components/admin/RoleBadge"

// Tier configuration for subscription badges
// Standar warna: GRATIS=emerald, BPP=blue, PRO=amber (semua text putih)
// Upgrade button: warna PRO (amber)
type TierType = "gratis" | "free" | "bpp" | "pro"

const TIER_CONFIG: Record<TierType, { label: string; className: string; showUpgrade: boolean }> = {
  gratis: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  free: { label: "GRATIS", className: "bg-emerald-600 text-white", showUpgrade: true },
  bpp: { label: "BPP", className: "bg-blue-600 text-white", showUpgrade: true },
  pro: { label: "PRO", className: "bg-amber-600 text-white", showUpgrade: false },
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
      className="user-settings-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan akun"
    >
      <div className="user-settings-backdrop" onClick={handleClose} />
      <div
        className="user-settings-container"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="user-settings-header">
          <div className="user-settings-title-area">
            <h2 className="user-settings-title">Atur Akun</h2>
            <p className="user-settings-subtitle">
              Kelola informasi akun Anda di Makalah AI.
            </p>
          </div>
          <button
            className="user-settings-close-btn"
            onClick={handleClose}
            aria-label="Tutup modal"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="user-settings-body">
          <nav className="user-settings-nav" aria-label="Navigasi akun">
            <button
              className={cn(
                "user-settings-nav-item",
                activeTab === "profile" && "active"
              )}
              onClick={() => setActiveTab("profile")}
              type="button"
            >
              <UserIcon />
              <span>Profil</span>
            </button>
            <button
              className={cn(
                "user-settings-nav-item",
                activeTab === "security" && "active"
              )}
              onClick={() => setActiveTab("security")}
              type="button"
            >
              <Shield />
              <span>Keamanan</span>
            </button>
            <button
              className={cn(
                "user-settings-nav-item",
                activeTab === "status" && "active"
              )}
              onClick={() => setActiveTab("status")}
              type="button"
            >
              <BadgeCheck />
              <span>Status Akun</span>
            </button>
          </nav>

          <div className="user-settings-content">
            <div
              className={cn(
                "user-settings-tab",
                activeTab === "profile" && "active"
              )}
            >
              {/* Header with icon like subscription page */}
              <div className="settings-content-header">
                <h3 className="settings-content-title">
                  <UserIcon />
                  Detail Profil
                </h3>
                <p className="settings-content-subtitle">
                  Atur nama dan avatar akun Anda.
                </p>
              </div>

              {/* Card wrapper like subscription page */}
              <div className="settings-card">
                <div className="settings-card-header">Profil</div>
                <div className="settings-card-body">
                {!isProfileEditing ? (
                  <div className="flex items-center justify-between">
                    <div className="settings-profile-info">
                      <div className="settings-avatar">
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
                      <span className="settings-profile-name">
                        {fullName || primaryEmail || "-"}
                      </span>
                    </div>
                    <button
                      className="settings-row-action"
                      onClick={() => setIsProfileEditing(true)}
                      type="button"
                    >
                      Ubah profil
                    </button>
                  </div>
                ) : (
                  <div className="settings-accordion-fullwidth">
                    <div className="accordion-fw-header">Ubah profil</div>
                    <div className="accordion-fw-body">
                      <div className="accordion-avatar-row">
                        <div className="settings-avatar accordion-avatar">
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
                        <div className="accordion-avatar-info">
                          <button
                            className="accordion-upload-btn"
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!isLoaded}
                          >
                            Upload
                          </button>
                          <span className="accordion-upload-hint">
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
                      <div className="accordion-fields-row">
                        <div className="accordion-field">
                          <label className="accordion-label">Nama depan</label>
                          <input
                            type="text"
                            className="accordion-input"
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                          />
                        </div>
                        <div className="accordion-field">
                          <label className="accordion-label">Nama belakang</label>
                          <input
                            type="text"
                            className="accordion-input"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="accordion-fw-footer">
                      <button
                        className="accordion-cancel-btn"
                        type="button"
                        onClick={() => setIsProfileEditing(false)}
                        disabled={isSavingProfile}
                      >
                        Batal
                      </button>
                      <button
                        className="accordion-save-btn"
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
              <div className="settings-card">
                <div className="settings-card-header">Email</div>
                <div className="settings-card-body">
                  <div className="settings-email-item">
                    <span>{primaryEmail || "-"}</span>
                    {primaryEmail && (
                      <span className="settings-badge-primary">Utama</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "user-settings-tab",
                activeTab === "security" && "active"
              )}
            >
              {/* Header with icon like subscription page */}
              <div className="settings-content-header">
                <h3 className="settings-content-title">
                  <Shield />
                  Keamanan
                </h3>
                <p className="settings-content-subtitle">
                  Update kata sandi dan kontrol sesi.
                </p>
              </div>

              {/* Password card */}
              <div className="settings-card">
                <div className="settings-card-header">Kata Sandi</div>
                <div className="settings-card-body">
                {!isPasswordEditing ? (
                  <div className="settings-row">
                    <span className="settings-row-label">Kata sandi</span>
                    <div className="settings-row-value">
                      <span className="settings-password-dots">••••••••</span>
                    </div>
                    <button
                      className="settings-row-action"
                      onClick={() => setIsPasswordEditing(true)}
                      type="button"
                    >
                      Ubah kata sandi
                    </button>
                  </div>
                ) : (
                  <div className="settings-accordion-fullwidth">
                    <div className="accordion-fw-header">Ubah kata sandi</div>
                    <div className="accordion-fw-body">
                      <div className="accordion-field accordion-field-full">
                        <label className="accordion-label">Kata sandi saat ini</label>
                        <div className="accordion-input-wrapper">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            className="accordion-input"
                            value={currentPassword}
                            onChange={(event) =>
                              setCurrentPassword(event.target.value)
                            }
                          />
                          <button
                            className="accordion-eye-btn"
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword((prev) => !prev)
                            }
                            aria-label="Tampilkan kata sandi"
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="accordion-field accordion-field-full">
                        <label className="accordion-label">Kata sandi baru</label>
                        <div className="accordion-input-wrapper">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            className="accordion-input"
                            value={newPassword}
                            onChange={(event) => setNewPassword(event.target.value)}
                          />
                          <button
                            className="accordion-eye-btn"
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            aria-label="Tampilkan kata sandi baru"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="accordion-field accordion-field-full">
                        <label className="accordion-label">Konfirmasi kata sandi</label>
                        <div className="accordion-input-wrapper">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            className="accordion-input"
                            value={confirmPassword}
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
                          />
                          <button
                            className="accordion-eye-btn"
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword((prev) => !prev)
                            }
                            aria-label="Tampilkan konfirmasi kata sandi"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="accordion-checkbox-row">
                        <input
                          type="checkbox"
                          className="accordion-checkbox"
                          id="signout-checkbox"
                          checked={signOutOthers}
                          onChange={(event) => setSignOutOthers(event.target.checked)}
                        />
                        <div className="accordion-checkbox-content">
                          <label
                            className="accordion-checkbox-label"
                            htmlFor="signout-checkbox"
                          >
                            Keluar dari semua perangkat lain
                          </label>
                          <span className="accordion-checkbox-hint">
                            Disarankan agar semua sesi lama ikut keluar setelah
                            kata sandi diganti.
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="accordion-fw-footer">
                      <button
                        className="accordion-cancel-btn"
                        type="button"
                        onClick={() => setIsPasswordEditing(false)}
                        disabled={isSavingPassword}
                      >
                        Batal
                      </button>
                      <button
                        className="accordion-save-btn"
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
                "user-settings-tab",
                activeTab === "status" && "active"
              )}
            >
              {/* Header with icon like subscription page */}
              <div className="settings-content-header">
                <h3 className="settings-content-title">
                  <BadgeCheck />
                  Status Akun
                </h3>
                <p className="settings-content-subtitle">
                  Ringkasan akses akun Anda di Makalah AI.
                </p>
              </div>

              {/* Email info card */}
              <div className="settings-card">
                <div className="settings-card-header">Informasi Akun</div>
                <div className="settings-card-body">
                  <div className="settings-row">
                    <span className="settings-row-label">Email</span>
                    <div className="settings-row-value">{primaryEmail || "-"}</div>
                    <div />
                  </div>
                </div>
              </div>

              {/* Role card */}
              <div className="settings-card">
                <div className="settings-card-header">Role & Akses</div>
                <div className="settings-card-body">
                  <div className="settings-row">
                    <span className="settings-row-label">Role</span>
                    <div className="settings-row-value">
                      {isConvexLoading ? (
                        <span className="text-sm text-muted-foreground">
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
              <div className="settings-card">
                <div className="settings-card-header">Subskripsi</div>
                <div className="settings-card-body">
                  {isConvexLoading ? (
                    <span className="text-sm text-muted-foreground">Memuat...</span>
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
                                "inline-flex items-center px-3 py-1 rounded-md text-xs font-bold",
                                tierConfig.className
                              )}
                            >
                              {tierConfig.label}
                            </span>
                            {/* Upgrade button for Gratis and BPP - always use PRO color (amber) */}
                            {tierConfig.showUpgrade && (
                              <Link
                                href="/subscription/upgrade"
                                onClick={() => onOpenChange(false)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700"
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
              <div className="text-sm text-muted-foreground">Memuat...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
