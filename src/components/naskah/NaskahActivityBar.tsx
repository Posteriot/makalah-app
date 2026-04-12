"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * NaskahActivityBar — the 48px left rail of the naskah page.
 *
 * This mirrors the visual skeleton of `src/components/chat/shell/ActivityBar.tsx`
 * for chat parity per D-019 and the naskah-page-redesign v2 plan. It renders
 * ONLY the home logo link — no panel buttons, no tooltip provider, no
 * keyboard navigation. Naskah has no panels to switch between; the only
 * rail affordance is the brand anchor back to `/`.
 *
 * The sidebar expand/collapse chevron lives in TopBar (when collapsed) and
 * in NaskahSidebarContainer's collapse header (when expanded). This rail
 * does NOT own the chevron.
 *
 * Classes MUST stay byte-identical to ActivityBar's wrapper + logo link so
 * the two routes feel like the same visual family. If chat's ActivityBar
 * changes, this file should be re-synced manually.
 */
export function NaskahActivityBar({ className }: { className?: string }) {
  return (
    <nav
      role="navigation"
      aria-label="Sidebar navigation"
      data-testid="naskah-activity-bar"
      className={cn(
        "flex flex-col items-center gap-0 py-0",
        "w-[var(--activity-bar-width)] min-w-[48px]",
        "border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar)]",
        className,
      )}
    >
      <Link
        href="/"
        className={cn(
          "flex items-center justify-center",
          "h-11 w-full rounded-none border-b border-[color:var(--chat-sidebar-border)]",
          "hover:bg-[var(--chat-sidebar-accent)] transition-colors",
        )}
        aria-label="Home"
      >
        <Image
          src="/logo/makalah_logo_light.svg"
          alt="Makalah"
          width={20}
          height={20}
          className="hidden dark:block"
        />
        <Image
          src="/logo/makalah_logo_dark.svg"
          alt="Makalah"
          width={20}
          height={20}
          className="block dark:hidden"
        />
      </Link>
    </nav>
  )
}
