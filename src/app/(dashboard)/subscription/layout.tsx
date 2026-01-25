"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CreditCard,
  History,
  ArrowUpCircle,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const SIDEBAR_ITEMS = [
  {
    href: "/subscription/overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/subscription/topup",
    label: "Top Up",
    icon: CreditCard,
  },
  {
    href: "/subscription/history",
    label: "Riwayat",
    icon: History,
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
          "w-[200px] bg-sidebar border-r border-sidebar-border",
          "transform transition-transform duration-200 ease-in-out",
          "md:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-border md:hidden">
          <span className="font-semibold text-sm">Menu</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 pt-6 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-accent",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-r" />
                )}
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
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
      <div className="md:hidden flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-accent rounded-md"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold">Subskripsi</span>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="subscription-body grid grid-cols-1 md:grid-cols-[200px_1fr] min-h-[calc(100vh-var(--header-h)-var(--footer-h)-48px)] overflow-hidden">
        <SubscriptionSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
