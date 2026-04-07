"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { Plus, EditPencil, ClockRotateRight, SwitchOn, SwitchOff, Trash } from "iconoir-react"
import { api } from "@convex/_generated/api"
import { STAGE_ORDER } from "@convex/paperSessions/constants"
import type { Id } from "@convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { StageSkillFormDialog, type StageSkillRow } from "./StageSkillFormDialog"
import { StageSkillVersionHistoryDialog } from "./StageSkillVersionHistoryDialog"

interface StageSkillsManagerProps {
  userId: Id<"users">
}

type StageSkillListItem = StageSkillRow & {
  _id: Id<"stageSkills">
  isEnabled: boolean
  activeVersion: number | null
  latestVersion: number
  latestDraftVersion: number | null
  latestPublishedVersion: number | null
  versionsCount: number
  expectedSearchPolicy: "active" | "passive"
}

export function StageSkillsManager({ userId }: StageSkillsManagerProps) {
  const skills = useQuery(api.stageSkills.listByStage, {
    requestorUserId: userId,
  }) as StageSkillListItem[] | undefined

  const publishVersion = useMutation(api.stageSkills.publishVersion)
  const activateVersion = useMutation(api.stageSkills.activateVersion)
  const setSkillEnabled = useMutation(api.stageSkills.setSkillEnabled)
  const deleteSkillEntirelyMutation = useMutation(api.stageSkills.deleteSkillEntirely)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingSkill, setEditingSkill] = useState<StageSkillRow | null>(null)
  const [historySkillId, setHistorySkillId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Delete skill entirely state
  const [deleteSkillTarget, setDeleteSkillTarget] = useState<StageSkillListItem | null>(null)
  const [deleteSkillReason, setDeleteSkillReason] = useState("")
  const [deleteSkillConfirmation, setDeleteSkillConfirmation] = useState("")

  const openCreateDialog = () => {
    setEditingSkill(null)
    setIsFormOpen(true)
  }

  const openEditDialog = (skill: StageSkillListItem) => {
    setEditingSkill(skill)
    setIsFormOpen(true)
  }

  const openHistoryDialog = (skillId: string) => {
    setHistorySkillId(skillId)
    setIsHistoryOpen(true)
  }

  const handlePublishDraft = async (skill: StageSkillListItem) => {
    if (!skill.latestDraftVersion) return
    setIsSubmitting(true)
    try {
      const result = await publishVersion({
        requestorUserId: userId,
        skillId: skill.skillId,
        version: skill.latestDraftVersion,
      })
      toast.success(result.message ?? `Draft ${skill.skillId} dipublish.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Publish draft gagal.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActivatePublished = async (skill: StageSkillListItem) => {
    if (!skill.latestPublishedVersion) return
    setIsSubmitting(true)
    try {
      const result = await activateVersion({
        requestorUserId: userId,
        skillId: skill.skillId,
        version: skill.latestPublishedVersion,
      })
      toast.success(result.message ?? `Skill ${skill.skillId} aktif.`)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Activate skill gagal.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleEnabled = async (skill: StageSkillListItem) => {
    setIsSubmitting(true)
    try {
      const result = await setSkillEnabled({
        requestorUserId: userId,
        skillId: skill.skillId,
        isEnabled: !skill.isEnabled,
      })
      toast.success(
        result.isEnabled
          ? `${skill.skillId} diaktifkan`
          : `${skill.skillId} dinonaktifkan`
      )
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal mengubah status skill.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSkillEntirely = async () => {
    if (!deleteSkillTarget) return
    setIsSubmitting(true)
    try {
      const result = await deleteSkillEntirelyMutation({
        requestorUserId: userId,
        skillId: deleteSkillTarget.skillId,
        reason: deleteSkillReason.trim(),
        confirmationText: deleteSkillConfirmation,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Hapus skill gagal.")
    } finally {
      setIsSubmitting(false)
      setDeleteSkillTarget(null)
      setDeleteSkillReason("")
      setDeleteSkillConfirmation("")
    }
  }

  const canDeleteSkill = (skill: StageSkillListItem) =>
    !skill.isEnabled && skill.activeVersion === null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-interface text-lg font-medium text-foreground">
            Stage Skills
          </h2>
          <p className="text-narrative text-sm text-muted-foreground">
            Kelola draft, publish, activation, dan rollback skill untuk {STAGE_ORDER.length} stage paper workflow.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          Buat/Edit Draft
        </Button>
      </div>

      <div className="space-y-3">
        {(skills ?? []).map((skill) => (
          <div
            key={skill._id}
            className="rounded-shell border-hairline bg-card/80 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-interface text-sm font-medium text-foreground">
                  {skill.skillId}
                </p>
                <p className="text-narrative text-xs text-muted-foreground">
                  stage: {skill.stageScope} • policy: {skill.expectedSearchPolicy}
                </p>
                <p className="text-narrative text-xs text-muted-foreground">
                  active: {skill.activeVersion ? `v${skill.activeVersion}` : "-"} • draft:{" "}
                  {skill.latestDraftVersion ? `v${skill.latestDraftVersion}` : "-"} • published:{" "}
                  {skill.latestPublishedVersion ? `v${skill.latestPublishedVersion}` : "-"} • total versions:{" "}
                  {skill.versionsCount}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="focus-ring border-main border border-border bg-background text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                  onClick={() => openEditDialog(skill)}
                  disabled={isSubmitting}
                >
                  <EditPencil className="mr-1 h-4 w-4" />
                  Draft
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="focus-ring border-main border border-border bg-background text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                  onClick={() => openHistoryDialog(skill.skillId)}
                  disabled={isSubmitting}
                >
                  <ClockRotateRight className="mr-1 h-4 w-4" />
                  History
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="focus-ring border-main border border-border bg-background text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                  onClick={() => handlePublishDraft(skill)}
                  disabled={isSubmitting || !skill.latestDraftVersion}
                >
                  Publish Draft
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="focus-ring border-main border border-border bg-background text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800"
                  onClick={() => handleActivatePublished(skill)}
                  disabled={isSubmitting || !skill.latestPublishedVersion}
                >
                  Activate
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={
                    skill.isEnabled
                      ? "focus-ring border-main border border-border bg-background text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                      : "focus-ring border-main border border-border bg-background text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800"
                  }
                  onClick={() => handleToggleEnabled(skill)}
                  disabled={isSubmitting}
                >
                  {skill.isEnabled ? (
                    <>
                      <SwitchOff className="mr-1 h-4 w-4" />
                      Disable
                    </>
                  ) : (
                    <>
                      <SwitchOn className="mr-1 h-4 w-4" />
                      Enable
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteSkillTarget(skill)}
                  disabled={isSubmitting || !canDeleteSkill(skill)}
                >
                  <Trash className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
            {!canDeleteSkill(skill) && (
              <p className="mt-2 text-narrative text-xs text-muted-foreground">
                {skill.isEnabled
                  ? "Nonaktifkan skill terlebih dahulu sebelum menghapus."
                  : "Skill dengan active version tidak bisa dihapus."}
              </p>
            )}
          </div>
        ))}

        {skills && skills.length === 0 && (
          <div className="rounded-shell border-hairline bg-card/70 p-5">
            <p className="text-narrative text-sm text-muted-foreground">
              Belum ada stage skill di registry. Klik &quot;Buat/Edit Draft&quot; untuk mulai.
            </p>
          </div>
        )}
      </div>

      <StageSkillFormDialog
        open={isFormOpen}
        userId={userId}
        initialSkill={editingSkill}
        onClose={() => setIsFormOpen(false)}
      />

      <StageSkillVersionHistoryDialog
        open={isHistoryOpen}
        userId={userId}
        skillId={historySkillId}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* AlertDialog: delete skill entirely */}
      <AlertDialog
        open={!!deleteSkillTarget}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteSkillTarget(null)
            setDeleteSkillReason("")
            setDeleteSkillConfirmation("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus skill sepenuhnya?</AlertDialogTitle>
            <AlertDialogDescription>
              Skill &quot;{deleteSkillTarget?.skillId}&quot; beserta seluruh version-nya akan dihapus permanen dari katalog admin. Audit log tetap dipertahankan. Aksi ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-action border border-border bg-muted/50 p-3 text-sm space-y-1">
              <p>Skill harus dalam kondisi <strong>disabled</strong>.</p>
              <p>Skill tidak boleh memiliki <strong>active version</strong>.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-skill-reason">Alasan penghapusan skill</Label>
              <Input
                id="delete-skill-reason"
                value={deleteSkillReason}
                onChange={(e) => setDeleteSkillReason(e.target.value)}
                placeholder="Contoh: skill deprecated dan tidak lagi dipakai"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-skill-confirmation">Ketik untuk konfirmasi</Label>
              <Input
                id="delete-skill-confirmation"
                value={deleteSkillConfirmation}
                onChange={(e) => setDeleteSkillConfirmation(e.target.value)}
                placeholder={`DELETE ${deleteSkillTarget?.skillId ?? ""}`}
                disabled={isSubmitting}
                className="font-mono"
              />
              <p className="text-narrative text-xs text-muted-foreground">
                Ketik &quot;DELETE {deleteSkillTarget?.skillId}&quot; untuk mengaktifkan tombol hapus.
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSkillEntirely}
              disabled={
                isSubmitting
                || !deleteSkillReason.trim()
                || deleteSkillConfirmation !== `DELETE ${deleteSkillTarget?.skillId}`
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Menghapus..." : "Delete Skill Entirely"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
