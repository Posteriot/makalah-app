"use client"

import { Suspense, useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  BadgeCheck,
  NavArrowLeft,
  Shield,
  User as UserIcon,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ProfileTab } from "@/components/settings/ProfileTab"
import { SecurityTab } from "@/components/settings/SecurityTab"
import { StatusTab } from "@/components/settings/StatusTab"

type SettingsTab = "profile" | "security" | "status"

const VALID_TABS: SettingsTab[] = ["profile", "security", "status"]

function parseTabParam(param: string | null): SettingsTab {
  if (param && VALID_TABS.includes(param as SettingsTab)) {
    return param as SettingsTab
  }
  return "profile"
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-interface text-sm text-muted-foreground">Memuat...</div>}>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const { user, isLoaded } = useUser()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    () => parseTabParam(searchParams.get("tab"))
  )

  const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? ""

  return (
    <div className="w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-lg border border-border bg-card shadow-none relative">
      {/* Left Column: Branding & Navigation */}
      <div className="md:w-4/12 bg-muted/30 p-6 md:p-8 relative flex flex-col">
        {/* Diagonal Stripes — same as AuthWideCard */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)'
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col flex-grow">
          {/* Logo — top */}
          <Link href="/" className="inline-flex items-center gap-2 group w-fit">
            <Image
              src="/logo/makalah_logo_light.svg"
              alt=""
              width={28}
              height={28}
              className="transition-transform group-hover:scale-105 brightness-[.88] sepia-[.06] hue-rotate-[185deg] saturate-[3]"
            />
          </Link>

          {/* Heading + Subtitle */}
          <div className="mt-6 md:mt-8">
            <h1 className="text-signal text-lg">Atur Akun</h1>
            <p className="mt-1 text-sm font-mono text-muted-foreground">
              Kelola informasi akun Anda.
            </p>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex flex-col gap-1 max-md:flex-row max-md:flex-wrap" aria-label="Navigasi akun">
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "profile" && "bg-accent text-foreground"
              )}
              onClick={() => setActiveTab("profile")}
              type="button"
            >
              {activeTab === "profile" && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />}
              <UserIcon className="h-4 w-4" />
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
              <Shield className="h-4 w-4" />
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
              <BadgeCheck className="h-4 w-4" />
              <span>Status Akun</span>
            </button>
          </nav>

          {/* Spacer */}
          <div className="flex-grow" />

          {/* Back link — bottom */}
          <Link
            href="/chat"
            className="mt-6 inline-flex items-center gap-2 text-sm font-mono text-muted-foreground transition-colors hover:text-foreground w-fit"
          >
            <NavArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </Link>
        </div>
      </div>

      {/* Right Column: Tab Content */}
      <div className="md:w-8/12 p-6 md:p-8 flex flex-col bg-[color:var(--slate-100)] dark:bg-[color:var(--slate-800)] relative overflow-y-auto max-h-[70vh] md:max-h-[80vh]">
        <div className="w-full relative z-10">
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
  )
}
