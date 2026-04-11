"use client"

import Image from "next/image"
import Link from "next/link"
import { useQuery } from "convex/react"
import {
  useCallback,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { TopBar } from "@/components/chat/shell/TopBar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useNaskah } from "@/lib/hooks/useNaskah"
import { usePaperSession } from "@/lib/hooks/usePaperSession"
import type { NaskahSection, NaskahSectionKey } from "@/lib/naskah/types"
import { NaskahActivityBar } from "./NaskahActivityBar"
import { NaskahSidebar } from "./NaskahSidebar"
import { NaskahSidebarContainer } from "./NaskahSidebarContainer"

interface NaskahShellProps {
  conversationId: string | null
  isSidebarAvailable?: boolean
  sidebarSections?: NaskahSection[]
  highlightedSectionKeys?: NaskahSectionKey[]
  children: ReactNode
}

const MD_BREAKPOINT = 768
// Matches chat's ChatLayout DEFAULT_SIDEBAR_WIDTH per Q3 = 280px.
const SIDEBAR_WIDTH = 280

function getViewportMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null
  }

  return window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`)
}

function subscribeViewport(callback: () => void) {
  const mediaQuery = getViewportMediaQuery()
  mediaQuery?.addEventListener("change", callback)
  return () => mediaQuery?.removeEventListener("change", callback)
}

function getIsDesktop() {
  const mediaQuery = getViewportMediaQuery()
  return mediaQuery?.matches ?? true
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeViewport, getIsDesktop, () => true)
}

/**
 * NaskahShell — chat-parallel shell for the `/naskah/:conversationId` route.
 *
 * Composes `NaskahActivityBar` (48px rail) + `NaskahSidebarContainer`
 * (sidebar column with outline + footer) + `TopBar` (shared from chat) +
 * body slot. Mirrors ChatLayout's desktop grid + mobile Sheet drawer
 * pattern byte-for-byte except:
 *   - No ChatSidebar (conversation history)
 *   - No ActivityBar panel buttons
 *   - No PanelResizer (resolved as Q6 A — skip drag resize)
 *   - No right artifact panel
 *
 * Per D-019 and naskah-page-redesign v2 plan §3.2, this shell is thin:
 * composition only, no custom layout logic beyond grid + mobile split.
 *
 * Relies on `src/app/naskah/layout.tsx` applying `data-chat-scope=""`
 * above this component in the tree. Without that wrapper, every
 * `var(--chat-*)` reference in the shell and its children resolves to
 * empty — see plan §1.5 for the empirical proof.
 */
export function NaskahShell({
  conversationId,
  isSidebarAvailable = false,
  sidebarSections = [],
  highlightedSectionKeys = [],
  children,
}: NaskahShellProps) {
  const { user } = useCurrentUser()
  const isDesktop = useIsDesktop()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const safeConversationId =
    typeof conversationId === "string" && /^[a-z0-9]{32}$/.test(conversationId)
      ? (conversationId as Id<"conversations">)
      : undefined

  const { session } = usePaperSession(safeConversationId)
  const { availability, updatePending } = useNaskah(session?._id)
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    safeConversationId && user?._id
      ? { conversationId: safeConversationId, userId: user._id }
      : "skip",
  )
  const shouldShowSidebar = isSidebarAvailable && sidebarSections.length > 0

  // TopBar expand-chevron semantics:
  // - Desktop: only render the expand button when there IS a sidebar AND
  //   it's currently collapsed. When no sidebar exists (loading / empty
  //   state), the button would be inert — don't render it (fixes v1 bug).
  // - Mobile: the rail is hidden entirely, so TopBar is the only way to
  //   open the Sheet drawer. Render the expand button only when there's
  //   a sidebar to open.
  const topBarSidebarCollapsed = isDesktop
    ? shouldShowSidebar && isSidebarCollapsed
    : shouldShowSidebar

  const handleToggleSidebar = useCallback(() => {
    if (!shouldShowSidebar) {
      return
    }

    if (isDesktop) {
      setIsSidebarCollapsed((current) => !current)
      return
    }

    setIsMobileSidebarOpen(true)
  }, [isDesktop, shouldShowSidebar])

  const handleCollapseSidebar = useCallback(() => {
    setIsSidebarCollapsed(true)
  }, [])

  return (
    <div className="flex h-dvh flex-col bg-[var(--chat-background)]">
      {isDesktop ? (
        <div
          data-testid="naskah-shell"
          className="grid min-h-0 flex-1 overflow-hidden"
          style={{
            gridTemplateColumns: `48px ${
              shouldShowSidebar && !isSidebarCollapsed ? `${SIDEBAR_WIDTH}px` : "0px"
            } 1fr`,
          }}
        >
          <NaskahActivityBar />

          <div
            className={shouldShowSidebar && !isSidebarCollapsed ? "flex min-h-0 flex-col" : "w-0 overflow-hidden"}
            aria-hidden={!shouldShowSidebar || isSidebarCollapsed}
          >
            {shouldShowSidebar && !isSidebarCollapsed && (
              <NaskahSidebarContainer
                onCollapseSidebar={handleCollapseSidebar}
                sections={sidebarSections}
                highlightedSectionKeys={highlightedSectionKeys}
              />
            )}
          </div>

          <main className="flex min-h-0 flex-col overflow-hidden bg-[var(--chat-background)]">
            <TopBar
              isSidebarCollapsed={topBarSidebarCollapsed}
              onToggleSidebar={handleToggleSidebar}
              artifactCount={artifacts?.length ?? 0}
              conversationId={conversationId}
              naskahAvailable={availability?.isAvailable ?? false}
              naskahUpdatePending={updatePending ?? false}
              routeContext="naskah"
            />
            <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
          </main>
        </div>
      ) : (
        <>
          <TopBar
            isSidebarCollapsed={topBarSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
            artifactCount={artifacts?.length ?? 0}
            conversationId={conversationId}
            naskahAvailable={availability?.isAvailable ?? false}
            naskahUpdatePending={updatePending ?? false}
            routeContext="naskah"
          />
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>

          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetContent
              side="left"
              className="w-[min(92vw,360px)] max-w-none gap-0 border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)] p-0"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Sidebar naskah</SheetTitle>
                <SheetDescription>
                  Navigasi struktur naskah dan daftar section.
                </SheetDescription>
              </SheetHeader>
              <div
                data-testid="naskah-mobile-sidebar-header"
                className="flex h-11 items-center border-b border-[color:var(--chat-sidebar-border)] px-4"
              >
                <Link
                  href="/"
                  aria-label="Home"
                  className="inline-flex items-center text-[var(--chat-sidebar-foreground)] transition-opacity hover:opacity-80"
                  onClick={() => setIsMobileSidebarOpen(false)}
                >
                  <Image
                    src="/logo/makalah_logo_light.svg"
                    alt="Makalah"
                    width={24}
                    height={24}
                    className="hidden dark:block"
                  />
                  <Image
                    src="/logo/makalah_logo_dark.svg"
                    alt="Makalah"
                    width={24}
                    height={24}
                    className="block dark:hidden"
                  />
                </Link>
              </div>
              {shouldShowSidebar ? (
                <NaskahSidebar
                  sections={sidebarSections}
                  highlightedSectionKeys={highlightedSectionKeys}
                />
              ) : (
                <div className="px-4 py-6 text-sm text-[var(--chat-muted-foreground)]">
                  Belum ada section yang masuk ke naskah.
                </div>
              )}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}
