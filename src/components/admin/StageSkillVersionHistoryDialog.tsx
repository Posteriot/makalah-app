"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { Trash } from "iconoir-react"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const deleteVersionMutation = useMutation(api.stageSkills.deleteVersion)
  const deleteAllVersionHistoryMutation = useMutation(api.stageSkills.deleteAllVersionHistory)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete per-version state
  const [deleteTarget, setDeleteTarget] = useState<{ version: number; status: string } | null>(null)
  const [deleteReason, setDeleteReason] = useState("")

  // Delete all history state
  const [showDeleteAll, setShowDeleteAll] = useState(false)
  const [deleteAllReason, setDeleteAllReason] = useState("")

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

  const handleDeleteVersion = async () => {
    if (!skillId || !deleteTarget) return
    setIsSubmitting(true)
    try {
      const result = await deleteVersionMutation({
        requestorUserId: userId,
        skillId,
        version: deleteTarget.version,
        reason: deleteReason.trim(),
      })
      toast.success(result.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Hapus version gagal")
    } finally {
      setIsSubmitting(false)
      setDeleteTarget(null)
      setDeleteReason("")
    }
  }

  const handleDeleteAllHistory = async () => {
    if (!skillId) return
    setIsSubmitting(true)
    try {
      const result = await deleteAllVersionHistoryMutation({
        requestorUserId: userId,
        skillId,
        reason: deleteAllReason.trim(),
      })
      toast.success(result.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Hapus history gagal")
    } finally {
      setIsSubmitting(false)
      setShowDeleteAll(false)
      setDeleteAllReason("")
    }
  }

  const nonActiveVersions = (history?.versions ?? []).filter((v) => v.status !== "active")
  const activeVersion = (history?.versions ?? []).find((v) => v.status === "active")

  const handleCloseDialog = () => {
    setDeleteTarget(null)
    setDeleteReason("")
    setShowDeleteAll(false)
    setDeleteAllReason("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleCloseDialog()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Riwayat Versi Stage Skill</DialogTitle>
          <DialogDescription>
            Publish, activate, rollback, dan hapus versi skill dari satu tempat.
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

                  {version.status !== "active" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSubmitting}
                      onClick={() => setDeleteTarget({ version: version.version, status: version.status })}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
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

          {history && history.versions.length > 0 && nonActiveVersions.length === 0 && (
            <div className="rounded-action border border-border bg-muted/50 p-3">
              <p className="text-narrative text-sm text-muted-foreground">
                Tidak ada version non-active yang bisa dihapus. Version active tidak dapat dihapus karena sedang digunakan di paper sessions.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {nonActiveVersions.length > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isSubmitting}
              onClick={() => setShowDeleteAll(true)}
            >
              Hapus Semua History
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleCloseDialog}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* AlertDialog: delete single version */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteTarget(null)
            setDeleteReason("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus version ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Version v{deleteTarget?.version} ({deleteTarget?.status}) akan dihapus permanen dari riwayat skill. Aksi ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-reason">Alasan penghapusan</Label>
            <Input
              id="delete-reason"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Contoh: draft duplikat, versi obsolete, cleanup history"
              disabled={isSubmitting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              disabled={isSubmitting || !deleteReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Menghapus..." : `Hapus v${deleteTarget?.version}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: delete all non-active versions */}
      <AlertDialog
        open={showDeleteAll}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setShowDeleteAll(false)
            setDeleteAllReason("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus semua version history non-active?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua version dengan status draft, published, dan archived akan dihapus permanen. Version active, jika ada, akan tetap dipertahankan. Aksi ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-action border border-border bg-muted/50 p-3 text-sm">
              <p>Akan dihapus: <strong>{nonActiveVersions.length}</strong> version</p>
              <p>Dipertahankan: {activeVersion ? <strong>v{activeVersion.version} (active)</strong> : "tidak ada active version"}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-all-reason">Alasan cleanup</Label>
              <Input
                id="delete-all-reason"
                value={deleteAllReason}
                onChange={(e) => setDeleteAllReason(e.target.value)}
                placeholder="Contoh: menyisakan active version saja untuk mengurangi clutter"
                disabled={isSubmitting}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllHistory}
              disabled={isSubmitting || !deleteAllReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Menghapus..." : "Hapus Semua History"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
