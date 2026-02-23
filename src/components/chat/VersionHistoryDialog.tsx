"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useMemo, useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, NavArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"

interface VersionHistoryDialogProps {
    artifactId: Id<"artifacts">
    currentVersionId: Id<"artifacts"> | null
    onSelectVersion: (versionId: Id<"artifacts">) => void
}

// Format timestamp to readable date
function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

// Truncate content for preview
function truncateContent(content: string, maxLength: number = 100): string {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength).trim() + "..."
}

export function VersionHistoryDialog({
    artifactId,
    currentVersionId,
    onSelectVersion,
}: VersionHistoryDialogProps) {
    const { user: currentUser } = useCurrentUser()
    const [open, setOpen] = useState(false)

    const versionHistory = useQuery(
        api.artifacts.getVersionHistory,
        currentUser?._id
            ? { artifactId, userId: currentUser._id }
            : "skip"
    )

    const hasMultipleVersions = versionHistory && versionHistory.length > 1
    const orderedVersions = useMemo(
        () => (versionHistory ? [...versionHistory].reverse() : []),
        [versionHistory]
    )
    const latestVersionId = orderedVersions[0]?._id ?? null
    const selectedVersionNumber = useMemo(
        () => orderedVersions.find((version) => version._id === currentVersionId)?.version,
        [orderedVersions, currentVersionId]
    )

    // Don't show dialog trigger if there's only one version
    if (!hasMultipleVersions) {
        return null
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 font-mono">
                    <Clock className="h-4 w-4 mr-1" />
                    Riwayat ({versionHistory?.length ?? 0})
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-lg border-[color:var(--chat-border)] bg-[var(--chat-card)]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Riwayat Versi
                    </DialogTitle>
                    <DialogDescription className="text-xs font-mono text-[var(--chat-muted-foreground)]">
                        Pilih versi untuk ditampilkan di viewer artifak.
                    </DialogDescription>
                </DialogHeader>

                {/* Version Timeline */}
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {versionHistory === undefined ? (
                        <div className="flex items-center justify-center py-8">
                            <span className="h-6 w-6 border-2 border-[color:var(--chat-muted-foreground)] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-3 pr-1">
                            {orderedVersions.map((version, index) => {
                                const isCurrentVersion = currentVersionId === version._id
                                const isLatest = latestVersionId === version._id
                                const isLastItem = index === orderedVersions.length - 1

                                return (
                                    <div key={version._id} className="relative pl-7">
                                        {!isLastItem && (
                                            <span
                                                className="absolute left-2.5 top-4 h-[calc(100%+8px)] w-px bg-[var(--chat-border)]"
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span
                                            className={cn(
                                                "absolute left-[5px] top-3 h-3 w-3 rounded-full border-2 border-[color:var(--chat-card)]",
                                                isCurrentVersion
                                                    ? "bg-[var(--chat-info)]"
                                                    : "bg-[var(--chat-muted-foreground)]"
                                            )}
                                            aria-hidden="true"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onSelectVersion(version._id)
                                                setOpen(false)
                                            }}
                                            className={cn(
                                                "w-full rounded-action border p-3 text-left transition-colors",
                                                "border-[color:var(--chat-border)] hover:border-[color:var(--chat-primary)] hover:bg-[var(--chat-accent)]",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chat-ring focus-visible:ring-offset-2",
                                                isCurrentVersion &&
                                                    "border-[color:var(--chat-info)] bg-[var(--chat-info)]"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-mono font-medium">v{version.version}</span>
                                                        {isLatest && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1 py-0 text-[10px] font-mono text-[var(--chat-secondary-foreground)]"
                                                            >
                                                                Terbaru
                                                            </Badge>
                                                        )}
                                                        {isCurrentVersion && (
                                                            <Badge
                                                                variant="default"
                                                                className="rounded-badge border border-[color:var(--chat-info)] bg-[var(--chat-info)] px-1 py-0 text-[10px] font-mono text-[var(--chat-info-foreground)]"
                                                            >
                                                                Dilihat
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-xs font-mono text-[var(--chat-muted-foreground)]">
                                                        {formatDate(version.createdAt)}
                                                    </p>
                                                </div>
                                                <NavArrowRight
                                                    className={cn(
                                                        "h-4 w-4 shrink-0 text-[var(--chat-muted-foreground)]",
                                                        isCurrentVersion && "text-[var(--chat-info)]"
                                                    )}
                                                />
                                            </div>

                                            <p className="mt-2 text-xs text-[var(--chat-muted-foreground)] line-clamp-2">
                                                {truncateContent(version.content)}
                                            </p>
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer info - Mechanical Grace: .border-hairline + Mono */}
                <div className="border-t border-[color:var(--chat-border)] pt-4 text-xs font-mono text-[var(--chat-muted-foreground)]">
                    <div className="flex items-center justify-between">
                        <span>Total {versionHistory?.length ?? 0} versi</span>
                        <span>
                            {currentVersionId
                                ? `Sedang dilihat: ${selectedVersionNumber ? `v${selectedVersionNumber}` : "versi lama"}`
                                : "Belum ada versi dipilih"}
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
