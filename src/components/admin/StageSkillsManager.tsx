"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { Plus, EditPencil, ClockRotateRight, SwitchOn, SwitchOff } from "iconoir-react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingSkill, setEditingSkill] = useState<StageSkillRow | null>(null)
  const [historySkillId, setHistorySkillId] = useState<string | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-interface text-lg font-medium text-foreground">
            Stage Skills
          </h2>
          <p className="text-narrative text-sm text-muted-foreground">
            Kelola draft, publish, activation, dan rollback skill untuk 13 stage paper workflow.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
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
                  onClick={() => handlePublishDraft(skill)}
                  disabled={isSubmitting || !skill.latestDraftVersion}
                >
                  Publish Draft
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleActivatePublished(skill)}
                  disabled={isSubmitting || !skill.latestPublishedVersion}
                >
                  Activate
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
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
              </div>
            </div>
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
    </div>
  )
}
