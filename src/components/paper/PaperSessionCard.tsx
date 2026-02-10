"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Doc, Id } from "@convex/_generated/dataModel"
import { toast } from "sonner"
import {
  Page,
  Archive,
  Undo,
  Trash,
  Download,
  NavArrowRight,
  Check,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getStageLabel, getStageNumber, STAGE_ORDER, type PaperStageId } from "@convex/paperSessions/constants"

interface PaperSessionCardProps {
  session: Doc<"paperSessions">
  userId: Id<"users">
}

export function PaperSessionCard({ session, userId }: PaperSessionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch conversation untuk dapat title
  const conversation = useQuery(api.conversations.getConversation, {
    conversationId: session.conversationId,
  })

  // Mutations
  const archiveSession = useMutation(api.paperSessions.archiveSession)
  const unarchiveSession = useMutation(api.paperSessions.unarchiveSession)
  const deleteSession = useMutation(api.paperSessions.deleteSession)

  // Derive display title
  const displayTitle = getDisplayTitle(session, conversation)

  // Status indicators
  const isCompleted = session.currentStage === "completed"
  const isArchived = session.archivedAt !== undefined
  const currentStageNumber = isCompleted
    ? STAGE_ORDER.length
    : getStageNumber(session.currentStage as PaperStageId)

  // Format dates
  const createdDate = formatDate(session.createdAt)
  const updatedDate = formatDate(session.updatedAt)

  // Handlers
  const handleArchiveToggle = async () => {
    setIsArchiving(true)
    try {
      if (isArchived) {
        await unarchiveSession({ sessionId: session._id, userId })
        toast.success("Paper berhasil di-unarchive")
      } else {
        await archiveSession({ sessionId: session._id, userId })
        toast.success("Paper berhasil diarsipkan")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah status arsip")
    } finally {
      setIsArchiving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteSession({ sessionId: session._id, userId })
      toast.success("Paper berhasil dihapus")
      setShowDeleteDialog(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus paper")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExport = async (format: "word" | "pdf") => {
    setIsExporting(true)
    try {
      const endpoint = format === "word" ? "/api/export/word" : "/api/export/pdf"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session._id }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (error?.redirectUrl) {
          window.location.href = error.redirectUrl
          return
        }
        throw new Error(error.error || `Gagal export ke ${format.toUpperCase()}`)
      }

      // Trigger download
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `paper.${format === "word" ? "docx" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(`Paper berhasil di-export ke ${format.toUpperCase()}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Gagal export ke ${format.toUpperCase()}`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Card className={cn("transition-all hover:shadow-md rounded-shell border border-hairline bg-slate-900/50", isArchived && "opacity-60")}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-interface text-base truncate text-slate-100" title={displayTitle}>
                {displayTitle}
              </CardTitle>
              <CardDescription className="mt-1 text-[11px] text-slate-500 font-mono">
                {isCompleted ? "Selesai" : `Tahap ${currentStageNumber}/${STAGE_ORDER.length}`} - {getStageLabel(session.currentStage as PaperStageId | "completed")}
              </CardDescription>
            </div>
            <StatusBadge isCompleted={isCompleted} isArchived={isArchived} />
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          {/* Mini progress indicator */}
          <div className="flex gap-0.5 mb-3">
            {STAGE_ORDER.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  index < currentStageNumber
                    ? "bg-emerald-500"
                    : index === currentStageNumber && !isCompleted
                      ? "bg-amber-500"
                      : "bg-slate-800"
                )}
              />
            ))}
          </div>

          <div className="flex flex-col gap-1 text-[11px] font-mono text-slate-500">
            <span className="text-interface">Dibuat: {createdDate}</span>
            <span className="text-interface">Diubah: {updatedDate}</span>
          </div>
        </CardContent>

        <CardFooter className="flex-wrap gap-2 pt-3 border-t border-hairline">
          {/* Lanjutkan / Lihat button */}
          <Button asChild size="sm" variant={isCompleted ? "outline" : "default"} className="text-interface text-xs rounded-action">
            <Link href={`/chat/${session.conversationId}`}>
              {isCompleted ? "Lihat" : "Lanjutkan"}
              <NavArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>

          {/* Export dropdown - only for completed */}
          {isCompleted && (
            <Select
              onValueChange={(value) => handleExport(value as "word" | "pdf")}
              disabled={isExporting}
            >
              <SelectTrigger className="w-[100px] text-interface text-xs rounded-action border-hairline bg-slate-900" size="sm">
                <Download className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Export" />
              </SelectTrigger>
              <SelectContent className="border-hairline bg-slate-900 text-interface text-xs">
                <SelectItem value="word">
                  <Download className="h-4 w-4 mr-2" />
                  Word
                </SelectItem>
                <SelectItem value="pdf">
                  <Page className="h-4 w-4 mr-2" />
                  PDF
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Archive toggle */}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleArchiveToggle}
            disabled={isArchiving}
            className="rounded-action hover:bg-slate-800"
            title={isArchived ? "Unarchive" : "Archive"}
          >
            {isArchived ? (
              <Undo className="h-4 w-4" />
            ) : (
              <Archive className="h-4 w-4" />
            )}
          </Button>

          {/* Delete button */}
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setShowDeleteDialog(true)}
            className="rounded-action text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            title="Hapus"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Paper?</AlertDialogTitle>
            <AlertDialogDescription>
              Paper ini akan dihapus permanen beserta semua data dan conversation-nya.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Helper components
function StatusBadge({ isCompleted, isArchived }: { isCompleted: boolean; isArchived: boolean }) {
  if (isArchived) {
    return (
      <Badge variant="secondary" className="shrink-0 rounded-badge text-[10px] font-mono uppercase tracking-wide bg-slate-800 border border-hairline text-slate-300">
        <Archive className="h-3 w-3 mr-1" />
        Archived
      </Badge>
    )
  }

  if (isCompleted) {
    return (
      <Badge className="shrink-0 rounded-badge text-[10px] font-mono uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <Check className="h-3 w-3 mr-1" />
        Selesai
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="shrink-0 rounded-badge text-[10px] font-mono uppercase tracking-wide border-hairline text-slate-400">
      In Progress
    </Badge>
  )
}

// Helper functions
function getDisplayTitle(
  session: Doc<"paperSessions">,
  conversation: Doc<"conversations"> | null | undefined
): string {
  // Priority 1: paperTitle field
  if (session.paperTitle) {
    return session.paperTitle
  }

  // Priority 2: stageData.judul.judulTerpilih
  const stageData = session.stageData as Record<string, Record<string, unknown>>
  const judulData = stageData?.judul
  if (judulData?.judulTerpilih && typeof judulData.judulTerpilih === "string") {
    return judulData.judulTerpilih
  }

  // Priority 3: Conversation title
  if (conversation?.title && conversation.title !== "Percakapan baru") {
    return conversation.title
  }

  // Fallback
  return "Untitled Paper"
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}
