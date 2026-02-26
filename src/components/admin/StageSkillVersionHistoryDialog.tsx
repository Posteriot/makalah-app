"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface StageSkillVersionHistoryDialogProps {
  open: boolean
  userId: Id<"users">
  skillId: string | null
  onClose: () => void
}

export function StageSkillVersionHistoryDialog({
  open,
  userId,
  skillId,
  onClose,
}: StageSkillVersionHistoryDialogProps) {
  const history = useQuery(
    api.stageSkills.getVersionHistory,
    open && skillId
      ? { requestorUserId: userId, skillId }
      : "skip"
  ) as {
    skill: { skillId: string; stageScope: string } | null
    versions: Array<{ _id: string; version: number; status: string; changeNote?: string; createdAt: number }>
  } | undefined

  const publishVersion = useMutation(api.stageSkills.publishVersion)
  const activateVersion = useMutation(api.stageSkills.activateVersion)
  const rollbackVersion = useMutation(api.stageSkills.rollbackVersion)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })

  const handlePublish = async (version: number) => {
    if (!skillId) return
    setIsSubmitting(true)
    try {
      const result = await publishVersion({
        requestorUserId: userId,
        skillId,
        version,
      })
      toast.success(result.message ?? `v${version} dipublish`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Publish gagal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActivate = async (version: number) => {
    if (!skillId) return
    setIsSubmitting(true)
    try {
      const result = await activateVersion({
        requestorUserId: userId,
        skillId,
        version,
      })
      toast.success(result.message ?? `v${version} diaktifkan`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Activate gagal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRollback = async (version: number) => {
    if (!skillId) return
    setIsSubmitting(true)
    try {
      const result = await rollbackVersion({
        requestorUserId: userId,
        skillId,
        targetVersion: version,
        reason: "Rollback from admin panel",
      })
      toast.success(result.message ?? `Rollback ke v${version} berhasil`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Rollback gagal")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Riwayat Versi Stage Skill</DialogTitle>
          <DialogDescription>
            Publish, activate, dan rollback versi skill dari satu tempat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(history?.versions ?? []).map((version) => (
            <div
              key={version._id}
              className="rounded-action border border-border bg-card/70 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-interface text-sm font-medium text-foreground">
                    v{version.version}
                  </p>
                  <p className="text-narrative text-xs text-muted-foreground">
                    {formatDate(version.createdAt)} • status: {version.status}
                  </p>
                  {version.changeNote && (
                    <p className="text-narrative text-xs text-muted-foreground">
                      {version.changeNote}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {version.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() => handlePublish(version.version)}
                    >
                      Publish
                    </Button>
                  )}

                  {version.status !== "active" && version.status !== "archived" && (
                    <Button
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => handleActivate(version.version)}
                    >
                      Activate
                    </Button>
                  )}

                  {version.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isSubmitting}
                      onClick={() => handleRollback(version.version)}
                    >
                      Rollback ke v{version.version}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {history && history.versions.length === 0 && (
            <p className="text-narrative text-sm text-muted-foreground">
              Belum ada versi untuk skill ini.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
