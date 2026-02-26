"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Dashboard,
  Clock,
  ArrowUpCircle,
  NavArrowRight,
  SidebarExpand,
  SidebarCollapse,
} from "iconoir-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { getEffectiveTier, type EffectiveTier } from "@/lib/utils/subscription"

function getSidebarItems(tier: EffectiveTier): Array<{ href: string; label: string; icon: typeof Dashboard }> {
  const items: Array<{ href: string; label: string; icon: typeof Dashboard }> = [
    {
      href: "/subscription/overview",
      label: "Overview",
      icon: Dashboard,
    },
  ]

  // Riwayat: BPP, Pro, Unlimited (NOT Gratis — they have no payments)
  if (tier === "bpp" || tier === "pro" || tier === "unlimited") {
    items.push({
      href: "/subscription/history",
      label: tier === "unlimited" ? "Riwayat" : "Riwayat Pembayaran",
      icon: Clock,
    })
  }

  // Upgrade: Gratis only
  if (tier === "gratis") {
    items.push({
      href: "/subscription/upgrade",
      label: "Upgrade",
      icon: ArrowUpCircle,
    })
  }

  // Top Up moved to overview page for both BPP and Pro

  return items
}

function SidebarNav({
  pathname,
  tier,
  onSelect,
}: {
  pathname: string
  tier: EffectiveTier
  onSelect?: () => void
}) {
  return (
    <nav className="space-y-6">
      <div>
        <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
          SUBSCRIPTION
        </h3>
        <ul className="mt-3 space-y-1">
          {getSidebarItems(tier).map((item) => {
            const Icon = item.icon
            const isActive = (() => {
              if (item.href === "/subscription/upgrade") {
                return (
                  pathname === "/subscription/upgrade" ||
                  pathname.startsWith("/subscription/upgrade/") ||
                  pathname === "/subscription/plans" ||
                  pathname.startsWith("/subscription/plans/")
                )
              }

              if (item.href === "/subscription/plans") {
                return pathname === "/subscription/plans" || pathname.startsWith("/subscription/plans/")
              }

              if (item.href === "/subscription/overview") {
                return pathname === "/subscription/overview" || pathname === "/subscription"
              }

              return pathname === item.href || pathname.startsWith(`${item.href}/`)
            })()

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onSelect}
                  className={cn(
                    "text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                      : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {isActive ? <NavArrowRight className="h-4 w-4 shrink-0" /> : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export default function SubscriptionLayout({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useCurrentUser()
  const tier = getEffectiveTier(user?.role, user?.subscriptionStatus)

  return (
    <div className="subscription-container relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-background">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
        {tier !== "gratis" && (
          <div className="md:hidden flex justify-end py-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Tutup menu subskripsi" : "Buka menu subskripsi"}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-action p-1 text-foreground transition-colors hover:text-foreground/70"
            >
              {sidebarOpen ? (
                <SidebarCollapse className="h-7 w-7" strokeWidth={1.5} />
              ) : (
                <SidebarExpand className="h-7 w-7" strokeWidth={1.5} />
              )}
            </button>
          </div>
        )}

        <div className={cn(
          "grid grid-cols-1 gap-comfort pb-2",
          tier !== "gratis" && "md:grid-cols-16"
        )}>
          {tier !== "gratis" && (
            <aside className="hidden md:col-span-4 md:block">
              <div className="mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900">
                <SidebarNav pathname={pathname} tier={tier} />
              </div>
            </aside>
          )}

          <main className={cn(
            "col-span-1 pt-4",
            tier !== "gratis" ? "md:col-span-12" : "md:col-span-1"
          )}>
            <div className="mx-auto w-full max-w-4xl rounded-shell border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-6 md:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-5 py-4 pr-12">
            <SheetTitle className="text-interface font-mono text-sm font-medium text-foreground">
              Subscription Menu
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto px-5 py-5">
            <SidebarNav pathname={pathname} tier={tier} onSelect={() => setSidebarOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
