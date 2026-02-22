"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { RefrasaIssue } from "@/lib/refrasa/types"
import { RefrasaToolbar } from "./RefrasaToolbar"
import { RefrasaLoadingIndicator } from "./RefrasaLoadingIndicator"
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer"

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
  userId,
  onTabClose,
  onExpand,
  onActivateTab,
}: RefrasaTabContentProps) {
  // Local state to track which version is being viewed
  const [viewingArtifactId, setViewingArtifactId] =
    useState<Id<"artifacts">>(artifactId)
  const [isApplying, setIsApplying] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [mobileCompareTab, setMobileCompareTab] = useState<"asli" | "refrasa">("refrasa")

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
  const markApplied = useMutation(api.artifacts.markRefrasaApplied)

  // Derive applied state from DB (persistent across tab switches)
  const isApplied = artifact?.appliedAt !== undefined

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
      await markApplied({ artifactId: viewingArtifactId, userId })

      // After 1.5s, switch to source artifact tab
      setTimeout(() => {
        onActivateTab?.(artifact.sourceArtifactId!)
      }, 1500)
    } catch (err) {
      console.error("[RefrasaTabContent] Apply failed:", err)
    } finally {
      setIsApplying(false)
    }
  }, [artifact, viewingArtifactId, userId, updateArtifact, markApplied, onActivateTab])

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
        <p className="text-xs font-mono text-[var(--ds-artifact-text-muted)]">
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
        showCompare={showCompare}
        onToggleCompare={() => setShowCompare((v) => !v)}
      />

      {/* Content area */}
      {showCompare ? (
        <>
          {/* Desktop: side-by-side */}
          <div className="hidden flex-1 overflow-hidden md:grid md:grid-cols-2 md:gap-0">
            {/* Left: Original */}
            <div className="overflow-y-auto border-r border-[var(--ds-artifact-divider-border)] p-4 scrollbar-thin">
              <span className="mb-3 inline-block rounded-badge border border-[var(--ds-artifact-chip-border)] bg-[var(--ds-artifact-chip-bg)] px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ds-artifact-chip-fg)]">
                Asli
              </span>
              {sourceArtifact?.content && (
                <MarkdownRenderer
                  markdown={sourceArtifact.content}
                  className="text-sm leading-relaxed text-[var(--ds-artifact-text-secondary)]"
                  context="artifact"
                />
              )}
            </div>
            {/* Right: Refrasa */}
            <div className="overflow-y-auto p-4 scrollbar-thin">
              <span className="mb-3 inline-block rounded-badge border border-[var(--ds-artifact-mode-badge-border)] bg-[var(--ds-artifact-mode-badge-bg)] px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--ds-artifact-mode-badge-fg)]">
                Refrasa
              </span>
              <MarkdownRenderer
                markdown={artifact.content}
                className="text-sm leading-relaxed text-[var(--ds-artifact-text-primary)]"
                context="artifact"
              />
            </div>
          </div>

          {/* Mobile: toggle tabs */}
          <div className="flex flex-1 flex-col overflow-hidden md:hidden">
            <div className="flex shrink-0 gap-2 border-b border-[var(--ds-artifact-divider-border)] px-4 py-2">
              <button
                onClick={() => setMobileCompareTab("asli")}
                className={`rounded-badge border px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${
                  mobileCompareTab === "asli"
                    ? "border-[var(--ds-artifact-chip-border)] bg-[var(--ds-artifact-chip-bg)] text-[var(--ds-artifact-chip-fg)]"
                    : "border-[var(--ds-artifact-chip-border)] bg-transparent text-[var(--ds-artifact-text-muted)] hover:bg-[var(--ds-artifact-chip-hover-bg)]"
                }`}
              >
                Asli
              </button>
              <button
                onClick={() => setMobileCompareTab("refrasa")}
                className={`rounded-badge border px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-widest transition-colors ${
                  mobileCompareTab === "refrasa"
                    ? "border-[var(--ds-artifact-mode-badge-border)] bg-[var(--ds-artifact-mode-badge-bg)] text-[var(--ds-artifact-mode-badge-fg)]"
                    : "border-[var(--ds-artifact-chip-border)] bg-transparent text-[var(--ds-artifact-text-muted)] hover:bg-[var(--ds-artifact-chip-hover-bg)]"
                }`}
              >
                Refrasa
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <MarkdownRenderer
                markdown={(mobileCompareTab === "asli" ? sourceArtifact?.content : artifact.content) ?? ""}
                className="text-sm leading-relaxed text-[var(--ds-artifact-text-primary)]"
                context="artifact"
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <MarkdownRenderer
            markdown={artifact.content}
            className="text-sm leading-relaxed text-[var(--ds-artifact-text-primary)]"
            context="artifact"
          />
        </div>
      )}
    </div>
  )
}
