"use client"

import { useState, useCallback } from "react"
import { Id } from "../../../convex/_generated/dataModel"

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
}

/** Maximum number of open artifact tabs */
const MAX_ARTIFACT_TABS = 8

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
}

/**
 * useArtifactTabs - Tab state management for artifact panel
 *
 * Manages which artifacts are open as tabs and which is active.
 * Session-only state (no localStorage, no URL sync).
 * Max 8 tabs — oldest tab removed when exceeded.
 */
export function useArtifactTabs(): UseArtifactTabsReturn {
  const [openTabs, setOpenTabs] = useState<ArtifactTab[]>([])
  const [activeTabId, setActiveTabId] = useState<Id<"artifacts"> | null>(null)

  const openTab = useCallback((artifact: ArtifactTab) => {
    setOpenTabs((prev) => {
      // Already open — just activate and update title
      const existing = prev.find((tab) => tab.id === artifact.id)
      if (existing) {
        return prev.map((tab) =>
          tab.id === artifact.id ? { ...tab, title: artifact.title } : tab
        )
      }

      // Refrasa tab reuse: replace existing tab with same sourceArtifactId
      if (artifact.type === "refrasa" && artifact.sourceArtifactId) {
        const idx = prev.findIndex(
          (tab) =>
            tab.type === "refrasa" &&
            tab.sourceArtifactId === artifact.sourceArtifactId
        )
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = artifact
          return updated
        }
      }

      // At max — remove oldest (first) tab
      if (prev.length >= MAX_ARTIFACT_TABS) {
        return [...prev.slice(1), artifact]
      }

      return [...prev, artifact]
    })
    setActiveTabId(artifact.id)
  }, [])

  const closeTab = useCallback((id: Id<"artifacts">) => {
    setOpenTabs((prev) => {
      const index = prev.findIndex((tab) => tab.id === id)
      if (index < 0) return prev
      return [...prev.slice(0, index), ...prev.slice(index + 1)]
    })
    setActiveTabId((prevActive) => {
      if (prevActive !== id) return prevActive
      // Closing active tab — switch to neighbor
      // Use current openTabs via closure for index calculation
      return null // Will be resolved in useEffect or by component
    })
    // Need to compute next active based on current tabs
    setOpenTabs((prev) => {
      // This runs after the removal above
      // If active was the closed tab, pick next neighbor
      setActiveTabId((prevActive) => {
        if (prevActive !== null) return prevActive
        if (prev.length > 0) {
          return prev[prev.length - 1].id
        }
        return null
      })
      return prev
    })
  }, [])

  const closeAllTabs = useCallback(() => {
    setOpenTabs([])
    setActiveTabId(null)
  }, [])

  const updateTabTitle = useCallback((id: Id<"artifacts">, title: string) => {
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, title } : tab))
    )
  }, [])

  const setActive = useCallback((id: Id<"artifacts">) => {
    setActiveTabId(id)
  }, [])

  return {
    openTabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab: setActive,
    closeAllTabs,
    updateTabTitle,
  }
}

export default useArtifactTabs
