"use client"

import { Suspense, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  BadgeCheck,
  NavArrowLeft,
  Shield,
  User as UserIcon,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
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
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    () => parseTabParam(searchParams.get("tab"))
  )

  const primaryEmail = convexUser?.email ?? session?.user?.email ?? ""
  const handleAccordionChange = (value: string) => {
    if (VALID_TABS.includes(value as SettingsTab)) {
      setActiveTab(value as SettingsTab)
    }
  }

  return (
    <div className="relative w-full h-auto flex flex-col md:flex-row bg-transparent shadow-none md:max-w-4xl md:h-[80vh] md:overflow-hidden md:rounded-xl md:border md:border-border md:bg-card">
      {/* Left Column: Branding & Navigation */}
      <div className="hidden md:flex md:w-4/12 bg-slate-200 dark:bg-slate-950 p-6 md:p-8 relative flex-col">
        {/* Diagonal Stripes — same as AuthWideCard */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)'
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col flex-grow">
          {/* Top Row: Home Logo + Back Button */}
          <div className="flex items-center justify-between w-full">
            <Link href="/" className="inline-flex items-center focus-ring rounded-action">
              <Image
                src="/logo/logo-color-lightmode.png"
                alt="Makalah"
                width={28}
                height={28}
                className="block h-7 w-7 dark:hidden"
              />
              <Image
                src="/logo/logo-color-darkmode.png"
                alt="Makalah"
                width={28}
                height={28}
                className="hidden h-7 w-7 dark:block"
              />
            </Link>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-sm font-normal text-slate-800 dark:text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-100 hover:underline focus-ring w-fit"
            >
              <NavArrowLeft className="h-4 w-4" />
              <span>Kembali</span>
            </button>
          </div>

          {/* Heading + Subtitle */}
          <div className="mt-6 md:mt-8">
            <h1 className="text-narrative font-medium text-xl">Pengaturan Akun</h1>
            <p className="mt-1 text-sm font-normal text-slate-800 dark:text-slate-400">
              Kelola informasi akun Anda.
            </p>
          </div>

          {/* Navigation */}
          <nav className="mt-6 flex flex-col gap-1 max-md:flex-row max-md:flex-wrap" aria-label="Navigasi akun">
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "profile" && "bg-slate-50 text-foreground dark:bg-slate-800 dark:text-slate-50"
              )}
              onClick={() => setActiveTab("profile")}
              type="button"
            >
              <UserIcon className="h-4 w-4" />
              <span>Profil</span>
            </button>
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "security" && "bg-slate-50 text-foreground dark:bg-slate-800 dark:text-slate-50"
              )}
              onClick={() => setActiveTab("security")}
              type="button"
            >
              <Shield className="h-4 w-4" />
              <span>Keamanan</span>
            </button>
            <button
              className={cn(
                "relative inline-flex items-center gap-3 rounded-action px-3 py-2.5 text-left text-interface text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-ring",
                activeTab === "status" && "bg-slate-50 text-foreground dark:bg-slate-800 dark:text-slate-50"
              )}
              onClick={() => setActiveTab("status")}
              type="button"
            >
              <BadgeCheck className="h-4 w-4" />
              <span>Status Akun</span>
            </button>
          </nav>

        </div>
      </div>

      {/* Right Column: Tab Content */}
      <div className="md:w-8/12 p-4 md:p-8 flex flex-col bg-slate-200 dark:bg-slate-950 relative overflow-visible md:overflow-y-auto md:bg-[color:var(--slate-100)] md:dark:bg-slate-800">
        {/* Mobile Diagonal Stripes */}
        <div
          className="md:hidden absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)"
          }}
          aria-hidden="true"
        />

        {/* Mobile Header */}
        <div className="md:hidden relative z-10 mb-3 flex items-center justify-between px-3 py-2">
          <Link href="/" className="inline-flex items-center gap-2 focus-ring rounded-action">
            <Image
              src="/logo/logo-color-lightmode.png"
              alt="Makalah"
              width={24}
              height={24}
              className="block h-6 w-6 dark:hidden"
            />
            <Image
              src="/logo/logo-color-darkmode.png"
              alt="Makalah"
              width={24}
              height={24}
              className="hidden h-6 w-6 dark:block"
            />
          </Link>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-normal text-slate-800 dark:text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-100 hover:underline focus-ring w-fit"
          >
            <NavArrowLeft className="h-4 w-4" />
            <span>Kembali</span>
          </button>
        </div>

        {/* Mobile Accordion */}
        <div className="md:hidden relative z-10">
          <Accordion
            type="single"
            value={activeTab}
            onValueChange={handleAccordionChange}
            className="rounded-md border border-slate-300 bg-slate-50 px-3 dark:border-slate-600 dark:bg-slate-900"
          >
            <AccordionItem value="profile" className="border-slate-300 dark:border-slate-600">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="inline-flex items-center gap-2 text-interface text-sm">
                  <UserIcon className="h-4 w-4" />
                  Profil
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <ProfileTab convexUser={convexUser} session={session} isLoading={isConvexLoading || isPending} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security" className="border-slate-300 dark:border-slate-600">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="inline-flex items-center gap-2 text-interface text-sm">
                  <Shield className="h-4 w-4" />
                  Keamanan
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <SecurityTab session={session} isLoading={isConvexLoading || isPending} />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="status" className="border-slate-300 dark:border-slate-600">
              <AccordionTrigger className="py-3 hover:no-underline">
                <span className="inline-flex items-center gap-2 text-interface text-sm">
                  <BadgeCheck className="h-4 w-4" />
                  Status Akun
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-0">
                <StatusTab
                  primaryEmail={primaryEmail}
                  convexUser={convexUser}
                  isConvexLoading={isConvexLoading}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="w-full relative z-10">
          <div className={cn(activeTab === "profile" ? "hidden md:block" : "hidden")}>
            <ProfileTab convexUser={convexUser} session={session} isLoading={isConvexLoading || isPending} />
          </div>

          <div className={cn(activeTab === "security" ? "hidden md:block" : "hidden")}>
            <SecurityTab session={session} isLoading={isConvexLoading || isPending} />
          </div>

          <div className={cn(activeTab === "status" ? "hidden md:block" : "hidden")}>
            <StatusTab
              primaryEmail={primaryEmail}
              convexUser={convexUser}
              isConvexLoading={isConvexLoading}
            />
          </div>

          {isPending && (
            <div className="text-interface text-sm text-muted-foreground">Memuat...</div>
          )}
        </div>
      </div>
    </div>
  )
}
