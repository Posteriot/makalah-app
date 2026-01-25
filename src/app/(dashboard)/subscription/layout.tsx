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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 h-full md:h-auto z-50 md:z-0",
          "w-[200px] bg-card border-r border-border",
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
        <nav className="p-2 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  "hover:bg-accent",
                  isActive
                    ? "bg-accent text-foreground border-l-2 border-primary"
                    : "text-muted-foreground"
                )}
              >
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
    <div className="subscription-layout flex min-h-[calc(100vh-120px)]">
      <SubscriptionSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col">
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

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
