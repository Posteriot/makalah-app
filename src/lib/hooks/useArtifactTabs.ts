"use client"

import { useState, useCallback } from "react"
import { Id } from "../../../convex/_generated/dataModel"

export type ArtifactOrigin =
  | "chat"
  | "paper-active-session"
  | "paper-session-manager-root"
  | "paper-session-manager-folder"

export type ArtifactSourceKind = "artifact" | "refrasa"

export interface ArtifactOpenOptions {
  readOnly?: boolean
  sourceConversationId?: Id<"conversations">
  title?: string
  type?: string
  origin?: ArtifactOrigin
  originSessionId?: Id<"paperSessions">
  originSessionTitle?: string
  sourceMessageId?: Id<"messages">
  sourceKind?: ArtifactSourceKind
}

/**
 * Artifact tab representing an open artifact document
 */
export interface ArtifactTab {
  /** Artifact ID from Convex */
  id: Id<"artifacts">
  /** Display title (artifact title) */
  title: string
  /** Artifact type (code, outline, section, table, citation, formula) */
  type: string
  /** Source artifact ID — used for refrasa tab reuse */
  sourceArtifactId?: Id<"artifacts">
  /** Whether this tab is read-only (e.g., cross-session artifact preview) */
  readOnly?: ArtifactOpenOptions["readOnly"]
  /** Source conversation ID — for cross-session artifact references */
  sourceConversationId?: ArtifactOpenOptions["sourceConversationId"]
  /** Origin surface that opened this artifact */
  origin?: ArtifactOpenOptions["origin"]
  /** Paper session origin metadata */
  originSessionId?: ArtifactOpenOptions["originSessionId"]
  originSessionTitle?: ArtifactOpenOptions["originSessionTitle"]
  /** Message anchor for deterministic return to chat source */
  sourceMessageId?: ArtifactOpenOptions["sourceMessageId"]
  /** Whether this tab points to a parent artifact or refrasa artifact */
  sourceKind?: ArtifactOpenOptions["sourceKind"]
}

/** Maximum number of open artifact tabs */
const MAX_ARTIFACT_TABS = 8

interface ArtifactTabsState {
  openTabs: ArtifactTab[]
  activeTabId: Id<"artifacts"> | null
}

interface UseArtifactTabsReturn {
  /** Array of open artifact tabs */
  openTabs: ArtifactTab[]
  /** Currently active artifact tab ID */
  activeTabId: Id<"artifacts"> | null
  /** Open a new tab or activate existing. Returns the tab. */
  openTab: (artifact: ArtifactTab) => void
  /** Close a tab by artifact ID */
  closeTab: (id: Id<"artifacts">) => void
  /** Set active tab without opening new */
  setActiveTab: (id: Id<"artifacts">) => void
  /** Close all artifact tabs */
  closeAllTabs: () => void
  /** Update tab title (when artifact title changes) */
  updateTabTitle: (id: Id<"artifacts">, title: string) => void
  /** Update tab ID (when artifact is replaced with a new version) */
  updateTabId: (oldId: Id<"artifacts">, newId: Id<"artifacts">) => void
}

/**
 * useArtifactTabs - Tab state management for artifact panel
 *
 * Manages which artifacts are open as tabs and which is active.
 * Session-only state (no localStorage, no URL sync).
 * Max 8 tabs — oldest tab removed when exceeded.
 */
export function useArtifactTabs(): UseArtifactTabsReturn {
  const [{ openTabs, activeTabId }, setTabsState] = useState<ArtifactTabsState>({
    openTabs: [],
    activeTabId: null,
  })

  const openTab = useCallback((artifact: ArtifactTab) => {
    setTabsState((prev) => {
      // Already open — just activate and update title
      const existing = prev.openTabs.find((tab) => tab.id === artifact.id)
      if (existing) {
        return {
          openTabs: prev.openTabs.map((tab) =>
            tab.id === artifact.id ? { ...tab, ...artifact, title: artifact.title } : tab
          ),
          activeTabId: artifact.id,
        }
      }

      // Refrasa tab reuse: replace existing tab with same sourceArtifactId
      if (artifact.type === "refrasa" && artifact.sourceArtifactId) {
        const idx = prev.openTabs.findIndex(
          (tab) =>
            tab.type === "refrasa" &&
            tab.sourceArtifactId === artifact.sourceArtifactId
        )
        if (idx >= 0) {
          const updated = [...prev.openTabs]
          updated[idx] = artifact
          return {
            openTabs: updated,
            activeTabId: artifact.id,
          }
        }
      }

      // At max — remove oldest (first) tab
      if (prev.openTabs.length >= MAX_ARTIFACT_TABS) {
        return {
          openTabs: [...prev.openTabs.slice(1), artifact],
          activeTabId: artifact.id,
        }
      }

      return {
        openTabs: [...prev.openTabs, artifact],
        activeTabId: artifact.id,
      }
    })
  }, [])

  const closeTab = useCallback((id: Id<"artifacts">) => {
    setTabsState((prev) => {
      const index = prev.openTabs.findIndex((tab) => tab.id === id)
      if (index < 0) return prev

      const nextTabs = [
        ...prev.openTabs.slice(0, index),
        ...prev.openTabs.slice(index + 1),
      ]

      if (prev.activeTabId !== id) {
        return {
          openTabs: nextTabs,
          activeTabId: prev.activeTabId,
        }
      }

      const nextActiveTab =
        nextTabs[index] ??
        nextTabs[index - 1] ??
        null

      return {
        openTabs: nextTabs,
        activeTabId: nextActiveTab?.id ?? null,
      }
    })
  }, [])

  const closeAllTabs = useCallback(() => {
    setTabsState({
      openTabs: [],
      activeTabId: null,
    })
  }, [])

  const updateTabTitle = useCallback((id: Id<"artifacts">, title: string) => {
    setTabsState((prev) => ({
      openTabs: prev.openTabs.map((tab) => (tab.id === id ? { ...tab, title } : tab)),
      activeTabId: prev.activeTabId,
    }))
  }, [])

  const updateTabId = useCallback((oldId: Id<"artifacts">, newId: Id<"artifacts">) => {
    setTabsState((prev) => ({
      openTabs: prev.openTabs.map((tab) => tab.id === oldId ? { ...tab, id: newId } : tab),
      activeTabId: prev.activeTabId === oldId ? newId : prev.activeTabId,
    }))
  }, [])

  const setActive = useCallback((id: Id<"artifacts">) => {
    setTabsState((prev) => ({
      openTabs: prev.openTabs,
      activeTabId: id,
    }))
  }, [])

  return {
    openTabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab: setActive,
    closeAllTabs,
    updateTabTitle,
    updateTabId,
  }
}
