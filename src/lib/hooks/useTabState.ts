"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

/**
 * Tab type representing an open conversation
 */
export interface Tab {
  /** Conversation ID */
  id: string
  /** Display title */
  title: string
  /** Tab type (chat for free chat, paper for paper session) */
  type: "chat" | "paper"
}

/**
 * LocalStorage key for persisting tabs
 */
const STORAGE_KEY = "chat-tabs"

/**
 * Default maximum number of open tabs
 */
const DEFAULT_MAX_TABS = 10

interface UseTabStateOptions {
  /** Maximum number of tabs allowed (default: 10) */
  maxTabs?: number
}

interface UseTabStateReturn {
  /** Array of open tabs */
  tabs: Tab[]
  /** Currently active tab ID (synced with URL) */
  activeTabId: string | null
  /** Open a new tab or activate existing tab */
  openTab: (id: string, title: string, type: "chat" | "paper") => void
  /** Close a tab by ID */
  closeTab: (id: string) => void
  /** Close all tabs */
  closeAllTabs: () => void
  /** Set active tab (navigates to conversation) */
  setActiveTab: (id: string) => void
  /** Update tab title */
  updateTabTitle: (id: string, title: string) => void
}

/**
 * Extract conversation ID from pathname
 * Supports: /chat/[conversationId]
 */
function getConversationIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/chat\/([^/]+)$/)
  return match ? match[1] : null
}

/**
 * Load tabs from localStorage
 */
function loadTabsFromStorage(): Tab[] {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    // Validate each tab has required properties
    return parsed.filter(
      (tab): tab is Tab =>
        typeof tab === "object" &&
        typeof tab.id === "string" &&
        typeof tab.title === "string" &&
        (tab.type === "chat" || tab.type === "paper")
    )
  } catch {
    return []
  }
}

/**
 * Save tabs to localStorage
 */
function saveTabsToStorage(tabs: Tab[]): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs))
  } catch {
    // Ignore storage errors
  }
}

/**
 * useTabState - Tab state management hook
 *
 * Features:
 * - Manage open tabs with localStorage persistence
 * - Sync with URL routing (/chat/[conversationId])
 * - Add tab when conversation opened
 * - Remove tab when closed
 * - Max tabs limit (configurable, default 10)
 * - Auto-navigate when switching tabs
 */
export function useTabState(
  currentPath: string,
  options: UseTabStateOptions = {}
): UseTabStateReturn {
  const router = useRouter()
  const pathname = usePathname()
  const { maxTabs = DEFAULT_MAX_TABS } = options

  // Initialize tabs from localStorage
  const [tabs, setTabs] = useState<Tab[]>(() => loadTabsFromStorage())

  // Active tab ID derived from URL
  const activeTabId = getConversationIdFromPath(pathname)

  // Persist tabs to localStorage whenever they change
  useEffect(() => {
    saveTabsToStorage(tabs)
  }, [tabs])

  /**
   * Open a new tab or activate existing tab
   * If tab already exists, just activates it (no duplicate)
   * If at max tabs, removes oldest tab
   */
  const openTab = useCallback(
    (id: string, title: string, type: "chat" | "paper") => {
      setTabs((prev) => {
        // Check if tab already exists
        const existingIndex = prev.findIndex((tab) => tab.id === id)

        if (existingIndex >= 0) {
          // Update title if changed, move to end (most recent)
          const existing = prev[existingIndex]
          const updated = { ...existing, title }
          const newTabs = [
            ...prev.slice(0, existingIndex),
            ...prev.slice(existingIndex + 1),
            updated,
          ]
          return newTabs
        }

        // Create new tab
        const newTab: Tab = { id, title, type }

        // If at max, remove oldest (first) tab
        if (prev.length >= maxTabs) {
          return [...prev.slice(1), newTab]
        }

        return [...prev, newTab]
      })
    },
    [maxTabs]
  )

  /**
   * Close a tab by ID
   * If closing active tab, navigate to next tab or /chat
   */
  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        const index = prev.findIndex((tab) => tab.id === id)
        if (index < 0) return prev

        const newTabs = [...prev.slice(0, index), ...prev.slice(index + 1)]

        // If closing active tab, navigate to another
        if (activeTabId === id) {
          if (newTabs.length > 0) {
            // Navigate to next tab, or previous if closing last
            const nextIndex = Math.min(index, newTabs.length - 1)
            router.push(`/chat/${newTabs[nextIndex].id}`)
          } else {
            // No tabs left, go to landing
            router.push("/chat")
          }
        }

        return newTabs
      })
    },
    [activeTabId, router]
  )

  /**
   * Close all tabs
   * Navigates to /chat (landing page)
   */
  const closeAllTabs = useCallback(() => {
    setTabs([])
    router.push("/chat")
  }, [router])

  /**
   * Set active tab by ID
   * Navigates to the conversation
   */
  const setActiveTab = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`)
    },
    [router]
  )

  /**
   * Update tab title
   */
  const updateTabTitle = useCallback((id: string, title: string) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, title } : tab))
    )
  }, [])

  return {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    closeAllTabs,
    setActiveTab,
    updateTabTitle,
  }
}

export default useTabState
