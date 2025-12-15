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
import { HistoryIcon, ChevronRightIcon, Loader2Icon } from "lucide-react"
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
    const currentUser = useCurrentUser()

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
                <Button variant="outline" size="sm">
                    <HistoryIcon className="h-4 w-4 mr-1" />
                    Riwayat ({versionHistory?.length ?? 0})
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HistoryIcon className="h-5 w-5" />
                        Riwayat Versi
                    </DialogTitle>
                </DialogHeader>

                {/* Version Timeline */}
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    {versionHistory === undefined ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
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
                                            "w-full text-left p-3 rounded-lg border transition-colors",
                                            "hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary",
                                            isCurrentVersion && "bg-accent border-primary"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {/* Timeline dot */}
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full shrink-0",
                                                    isCurrentVersion ? "bg-primary" : "bg-muted-foreground/50"
                                                )} />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">v{version.version}</span>
                                                        {isLatest && (
                                                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                                                Terbaru
                                                            </Badge>
                                                        )}
                                                        {isCurrentVersion && (
                                                            <Badge variant="default" className="text-[10px] px-1 py-0">
                                                                Dilihat
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {formatDate(version.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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

                {/* Footer info */}
                <div className="pt-4 border-t text-xs text-muted-foreground text-center">
                    Total {versionHistory?.length ?? 0} versi
                </div>
            </DialogContent>
        </Dialog>
    )
}
