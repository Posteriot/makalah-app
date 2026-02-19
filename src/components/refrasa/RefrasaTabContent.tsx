"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { RefrasaIssue } from "@/lib/refrasa/types"
import { RefrasaToolbar } from "./RefrasaToolbar"
import { RefrasaLoadingIndicator } from "./RefrasaLoadingIndicator"

interface RefrasaTabContentProps {
  artifactId: Id<"artifacts">
  conversationId: Id<"conversations">
  userId: Id<"users">
  onTabClose?: (artifactId: Id<"artifacts">) => void
  onExpand?: () => void
  onActivateTab?: (tabId: Id<"artifacts">) => void
}

export function RefrasaTabContent({
  artifactId,
  conversationId,
  userId,
  onTabClose,
  onExpand,
  onActivateTab,
}: RefrasaTabContentProps) {
  // Local state to track which version is being viewed
  const [viewingArtifactId, setViewingArtifactId] =
    useState<Id<"artifacts">>(artifactId)
  const [isApplying, setIsApplying] = useState(false)
  const [isApplied, setIsApplied] = useState(false)

  // Sync viewingArtifactId when prop changes (e.g. parent switches tab)
  useEffect(() => {
    setViewingArtifactId(artifactId)
  }, [artifactId])

  // Queries
  const artifact = useQuery(api.artifacts.get, {
    artifactId: viewingArtifactId,
    userId,
  })

  const versions = useQuery(
    api.artifacts.getBySourceArtifact,
    artifact?.sourceArtifactId
      ? { sourceArtifactId: artifact.sourceArtifactId, userId }
      : "skip"
  )

  const sourceArtifact = useQuery(
    api.artifacts.get,
    artifact?.sourceArtifactId
      ? { artifactId: artifact.sourceArtifactId, userId }
      : "skip"
  )

  // Mutations
  const updateArtifact = useMutation(api.artifacts.update)
  const removeArtifact = useMutation(api.artifacts.remove)

  // Parse issues from artifact
  const issues: RefrasaIssue[] =
    artifact?.refrasaIssues
      ? (artifact.refrasaIssues as RefrasaIssue[])
      : []

  // Version list for toolbar
  const versionList = (versions ?? []).map((v) => ({
    _id: v._id,
    version: v.version,
  }))

  const sourceTitle = sourceArtifact?.title ?? "..."

  // Handlers
  const handleVersionChange = useCallback(
    (id: Id<"artifacts">) => {
      setViewingArtifactId(id)
    },
    []
  )

  const handleApply = useCallback(async () => {
    if (!artifact?.sourceArtifactId || !artifact.content) return

    setIsApplying(true)
    try {
      await updateArtifact({
        artifactId: artifact.sourceArtifactId,
        userId,
        content: artifact.content,
      })
      setIsApplied(true)

      // After 1.5s, switch to source artifact tab and reset
      setTimeout(() => {
        onActivateTab?.(artifact.sourceArtifactId!)
        setIsApplied(false)
      }, 1500)
    } catch (err) {
      console.error("[RefrasaTabContent] Apply failed:", err)
    } finally {
      setIsApplying(false)
    }
  }, [artifact, userId, updateArtifact, onActivateTab])

  const handleDelete = useCallback(async () => {
    if (!artifact) return

    try {
      await removeArtifact({ artifactId: viewingArtifactId, userId })

      // If this was the only version, close the tab
      const isLastVersion = !versions || versions.length <= 1
      if (isLastVersion) {
        onTabClose?.(artifactId)
      } else {
        // Switch to next available version
        const remaining = versions!.filter((v) => v._id !== viewingArtifactId)
        if (remaining.length > 0) {
          setViewingArtifactId(remaining[0]._id)
        }
      }
    } catch (err) {
      console.error("[RefrasaTabContent] Delete failed:", err)
    }
  }, [artifact, viewingArtifactId, userId, versions, artifactId, onTabClose, removeArtifact])

  const handleCopy = useCallback(async () => {
    if (!artifact?.content) return
    try {
      await navigator.clipboard.writeText(artifact.content)
    } catch (err) {
      console.error("[RefrasaTabContent] Copy failed:", err)
    }
  }, [artifact])

  const handleDownload = useCallback(
    (format: "docx" | "pdf" | "txt") => {
      if (!artifact?.content) return

      if (format === "txt") {
        const blob = new Blob([artifact.content], { type: "text/plain;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `refrasa-v${artifact.version}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      // TODO: Implement DOCX/PDF export via /api/export/word and /api/export/pdf
      console.log(`[RefrasaTabContent] Download ${format} — not yet implemented`)
    },
    [artifact]
  )

  // Loading state
  if (artifact === undefined) {
    return (
      <div className="flex h-full flex-col">
        <RefrasaLoadingIndicator />
      </div>
    )
  }

  // Artifact not found (deleted or no access)
  if (artifact === null) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
          Artifact tidak ditemukan
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <RefrasaToolbar
        artifact={artifact}
        sourceTitle={sourceTitle}
        versions={versionList}
        issues={issues}
        onVersionChange={handleVersionChange}
        onApply={handleApply}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onDownload={handleDownload}
        isApplying={isApplying}
        isApplied={isApplied}
        onExpand={onExpand}
      />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-900 dark:text-slate-100">
          {artifact.content}
        </p>
      </div>
    </div>
  )
}
