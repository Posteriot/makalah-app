"use client"

import { useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Home,
  InfoCircle,
  Book,
  Journal,
  ScaleFrameEnlarge,
  PrivacyPolicy,
} from "iconoir-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * CMS page identifiers for activity bar navigation
 *
 * - home, about, documentation, blog: Content pages with sidebar sections
 * - legal: Parent for Privacy, Security, Terms (children in sidebar)
 * - global-layout: Parent for Header, Footer (children in sidebar)
 */
export type CmsPageId =
  | "home"
  | "about"
  | "documentation"
  | "blog"
  | "legal"
  | "global-layout"

interface CmsActivityBarProps {
  activePage: CmsPageId | null
  onPageChange: (page: CmsPageId) => void
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}

interface CmsActivityBarItemProps {
  page: CmsPageId
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

function CmsActivityBarItem({
  page,
  icon,
  label,
  isActive,
  onClick,
}: CmsActivityBarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-action border border-transparent transition-all duration-150",
            "text-slate-600 hover:bg-slate-200/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
            "focus-visible:ring-2 focus-visible:ring-muted-foreground/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--section-bg-alt)]",
            isActive && "border-slate-400/50 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          )}
          onClick={onClick}
          aria-label={`${label} page`}
          aria-pressed={isActive}
          aria-describedby={`cms-activity-bar-item-${page}-desc`}
          data-panel={page}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} id={`cms-activity-bar-item-${page}-desc`} className="font-mono text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

// Content pages group
const contentPageItems: Array<{
  page: CmsPageId
  icon: React.ReactNode
  label: string
}> = [
  {
    page: "home",
    icon: <Home className="h-5 w-5" aria-hidden="true" />,
    label: "Home",
  },
  {
    page: "about",
    icon: <InfoCircle className="h-5 w-5" aria-hidden="true" />,
    label: "About",
  },
  {
    page: "documentation",
    icon: <Book className="h-5 w-5" aria-hidden="true" />,
    label: "Dokumentasi",
  },
  {
    page: "blog",
    icon: <Journal className="h-5 w-5" aria-hidden="true" />,
    label: "Blog",
  },
  {
    page: "legal",
    icon: <PrivacyPolicy className="h-5 w-5" aria-hidden="true" />,
    label: "Legal",
  },
]

// Global components group
const globalComponentItems: Array<{
  page: CmsPageId
  icon: React.ReactNode
  label: string
}> = [
  {
    page: "global-layout",
    icon: <ScaleFrameEnlarge className="h-5 w-5" aria-hidden="true" />,
    label: "Global Layout",
  },
]

// All pages in order for keyboard navigation
const allPages: CmsPageId[] = [
  ...contentPageItems.map((item) => item.page),
  ...globalComponentItems.map((item) => item.page),
]

/**
 * CmsActivityBar - Vertical navigation bar for CMS layout
 *
 * Two groups separated by a visual divider:
 * 1. Content Pages - home, about, documentation, blog, legal
 * 2. Global Components - global-layout (header + footer)
 */
export function CmsActivityBar({
  activePage,
  onPageChange,
  isSidebarCollapsed,
  onToggleSidebar,
}: CmsActivityBarProps) {
  // Handle page click - auto expand sidebar if collapsed
  const handlePageClick = useCallback(
    (page: CmsPageId) => {
      if (isSidebarCollapsed) {
        onToggleSidebar()
      }
      onPageChange(page)
    },
    [isSidebarCollapsed, onToggleSidebar, onPageChange]
  )

  // Keyboard navigation for activity bar
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = activePage ? allPages.indexOf(activePage) : -1

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight": {
          e.preventDefault()
          const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % allPages.length
          handlePageClick(allPages[nextIndex])
          const nextButton = document.querySelector(
            `[data-panel="${allPages[nextIndex]}"]`
          ) as HTMLElement
          nextButton?.focus()
          break
        }
        case "ArrowUp":
        case "ArrowLeft": {
          e.preventDefault()
          const prevIndex =
            currentIndex <= 0 ? allPages.length - 1 : currentIndex - 1
          handlePageClick(allPages[prevIndex])
          const prevButton = document.querySelector(
            `[data-panel="${allPages[prevIndex]}"]`
          ) as HTMLElement
          prevButton?.focus()
          break
        }
        case "Home": {
          e.preventDefault()
          handlePageClick(allPages[0])
          const firstButton = document.querySelector(
            `[data-panel="${allPages[0]}"]`
          ) as HTMLElement
          firstButton?.focus()
          break
        }
        case "End": {
          e.preventDefault()
          handlePageClick(allPages[allPages.length - 1])
          const lastButton = document.querySelector(
            `[data-panel="${allPages[allPages.length - 1]}"]`
          ) as HTMLElement
          lastButton?.focus()
          break
        }
      }
    },
    [activePage, handlePageClick]
  )

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        role="navigation"
        aria-label="CMS page navigation"
        className={cn(
          "flex flex-col items-center gap-0 py-0",
          "w-[var(--activity-bar-width)] min-w-[48px]",
          "border-r border-slate-400/20 bg-slate-300 dark:border-slate-700/90 dark:bg-slate-900"
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Logo */}
        <Link
          href="/"
          className={cn(
            "flex items-center justify-center",
            "h-11 w-full rounded-none border-b border-slate-400/40 dark:border-slate-700/80",
            "hover:bg-slate-200/80 transition-colors dark:hover:bg-slate-800"
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

        {/* Content Pages Group */}
        <div
          role="tablist"
          aria-label="Content pages"
          aria-orientation="vertical"
          className="mt-3 flex flex-col items-center gap-1"
        >
          {contentPageItems.map((item) => (
            <CmsActivityBarItem
              key={item.page}
              page={item.page}
              icon={item.icon}
              label={item.label}
              isActive={activePage === item.page}
              onClick={() => handlePageClick(item.page)}
            />
          ))}
        </div>

        {/* Separator */}
        <div className="my-2 w-6 border-t border-slate-400/40 dark:border-slate-700/80" />

        {/* Global Components Group */}
        <div
          role="tablist"
          aria-label="Global components"
          aria-orientation="vertical"
          className="flex flex-col items-center gap-1"
        >
          {globalComponentItems.map((item) => (
            <CmsActivityBarItem
              key={item.page}
              page={item.page}
              icon={item.icon}
              label={item.label}
              isActive={activePage === item.page}
              onClick={() => handlePageClick(item.page)}
            />
          ))}
        </div>
      </nav>
    </TooltipProvider>
  )
}

export default CmsActivityBar
