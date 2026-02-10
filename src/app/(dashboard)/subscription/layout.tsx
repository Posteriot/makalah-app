"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Dashboard,
  CreditCard,
  Clock,
  ArrowUpCircle,
  Menu,
  Xmark,
} from "iconoir-react"
import { cn } from "@/lib/utils"

const SIDEBAR_ITEMS = [
  {
    href: "/subscription/overview",
    label: "Overview",
    icon: Dashboard,
  },
  {
    href: "/subscription/topup",
    label: "Top Up",
    icon: CreditCard,
  },
  {
    href: "/subscription/history",
    label: "Riwayat",
    icon: Clock,
  },
  {
    href: "/subscription/upgrade",
    label: "Upgrade",
    icon: ArrowUpCircle,
  },
]

function SubscriptionSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Desktop: in-grid, Mobile: fixed overlay */}
      <aside
        className={cn(
          // Mobile: fixed overlay
          "fixed md:relative top-0 left-0 h-full md:h-auto z-50 md:z-0",
          "w-[220px] md:w-auto md:col-span-3 bg-slate-900 border-r border-hairline",
          "transform transition-transform duration-200 ease-in-out",
          "md:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-3 border-b border-hairline md:hidden">
          <span className="text-interface text-xs font-semibold uppercase tracking-wide text-slate-400">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-action focus-ring"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 pt-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-2.5 px-2.5 py-2 rounded-action text-xs transition-colors",
                  "hover:bg-slate-800 hover:text-slate-100",
                  isActive
                    ? "bg-amber-500/5 text-amber-500"
                    : "text-slate-400"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-amber-500 rounded-r-full" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-interface">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

export default function SubscriptionLayout({
  children,
}: {
  children: ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="subscription-container max-w-[1400px] mx-auto">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 p-3 border-b border-hairline bg-slate-900">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-slate-800 rounded-action focus-ring"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="text-interface text-xs font-semibold uppercase tracking-wide text-slate-300">Subskripsi</span>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="subscription-body grid grid-cols-16 min-h-[calc(100vh-var(--header-h)-var(--footer-h)-48px)] overflow-hidden">
        <SubscriptionSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Content */}
        <div className="col-span-16 md:col-span-13 p-4 md:p-5 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
