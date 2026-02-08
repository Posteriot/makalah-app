"use client"

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"
import {
  BadgeCheck,
  Shield,
  User as UserIcon,
  Xmark,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ProfileTab } from "./ProfileTab"
import { SecurityTab } from "./SecurityTab"
import { StatusTab } from "./StatusTab"

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
  const [prevOpen, setPrevOpen] = useState(open)

  if (open && !prevOpen) {
    setActiveTab("profile")
  }
  if (open !== prevOpen) {
    setPrevOpen(open)
  }

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

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? ""
  const handleClose = () => onOpenChange(false)

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
            <div className={cn(activeTab === "profile" ? "block" : "hidden")}>
              <ProfileTab user={user} isLoaded={isLoaded} />
            </div>

            <div className={cn(activeTab === "security" ? "block" : "hidden")}>
              <SecurityTab user={user} isLoaded={isLoaded} />
            </div>

            <div className={cn(activeTab === "status" ? "block" : "hidden")}>
              <StatusTab
                primaryEmail={primaryEmail}
                convexUser={convexUser}
                isConvexLoading={isConvexLoading}
              />
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
