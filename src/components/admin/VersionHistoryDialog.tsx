"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Id } from "@convex/_generated/dataModel"

interface SystemPrompt {
  _id: Id<"systemPrompts">
  name: string
  content: string
  description?: string
  version: number
  isActive: boolean
}

interface VersionHistoryDialogProps {
  prompt: SystemPrompt | null
  userId: Id<"users">
  onClose: () => void
}

export function VersionHistoryDialog({
  prompt,
  userId,
  onClose,
}: VersionHistoryDialogProps) {
  const versions = useQuery(
    api.systemPrompts.getPromptVersionHistory,
    prompt
      ? {
          promptId: prompt._id,
          requestorUserId: userId,
        }
      : "skip"
  )

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Dialog open={!!prompt} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Riwayat Versi: {prompt?.name}</DialogTitle>
        </DialogHeader>

        {versions === undefined ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        ) : versions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Tidak ada riwayat versi ditemukan.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-4">
            {/* Sort by version descending (newest first) */}
            {[...versions].reverse().map((version) => (
              <Card
                key={version._id}
                className={version.isActive ? "border-green-500" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      Versi {version.version}
                      {version.isActive && (
                        <Badge variant="default" className="bg-green-600">
                          Aktif
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(version.createdAt)} oleh {version.creatorEmail}
                    </div>
                  </div>
                  {version.description && (
                    <p className="text-sm text-muted-foreground">
                      {version.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">
                    {version.content}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
