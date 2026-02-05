"use client"

import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
    Dialog,
    DialogContent,
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

    const versionHistory = useQuery(
        api.artifacts.getVersionHistory,
        currentUser?._id
            ? { artifactId, userId: currentUser._id }
            : "skip"
    )

    const hasMultipleVersions = versionHistory && versionHistory.length > 1

    // Don't show dialog trigger if there's only one version
    if (!hasMultipleVersions) {
        return null
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="font-mono">
                    <Clock className="h-4 w-4 mr-1" />
                    Riwayat ({versionHistory?.length ?? 0})
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Riwayat Versi
                    </DialogTitle>
                </DialogHeader>

                {/* Version Timeline */}
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {versionHistory === undefined ? (
                        <div className="flex items-center justify-center py-8">
                            <span className="h-6 w-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Sort by version descending (newest first) */}
                            {[...versionHistory].reverse().map((version, index) => {
                                const isCurrentVersion = currentVersionId === version._id
                                const isLatest = index === 0

                                return (
                                    <button
                                        key={version._id}
                                        onClick={() => onSelectVersion(version._id)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg transition-colors",
                                            // Mechanical Grace: .border-hairline
                                            "border border-slate-800 hover:border-slate-700",
                                            "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-amber-500",
                                            isCurrentVersion && "bg-accent border-amber-500/50"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {/* Timeline dot */}
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full shrink-0",
                                                    isCurrentVersion ? "bg-amber-500" : "bg-muted-foreground/50"
                                                )} />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-medium">v{version.version}</span>
                                                        {isLatest && (
                                                            <Badge variant="secondary" className="text-[10px] font-mono px-1 py-0">
                                                                Terbaru
                                                            </Badge>
                                                        )}
                                                        {isCurrentVersion && (
                                                            <Badge variant="default" className="text-[10px] font-mono px-1 py-0 bg-amber-500/20 text-amber-400">
                                                                Dilihat
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {/* Mechanical Grace: .text-interface timestamps */}
                                                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                                                        {formatDate(version.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <NavArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                        </div>

                                        {/* Content preview */}
                                        <p className="text-xs text-muted-foreground mt-2 ml-4 line-clamp-2">
                                            {truncateContent(version.content)}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer info - Mechanical Grace: .border-hairline + Mono */}
                <div className="pt-4 border-t border-slate-800 text-xs font-mono text-muted-foreground text-center">
                    Total {versionHistory?.length ?? 0} versi
                </div>
            </DialogContent>
        </Dialog>
    )
}
