"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation } from "convex/react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const STAGE_OPTIONS = [
  { value: "gagasan", label: "Gagasan" },
  { value: "topik", label: "Topik" },
  { value: "outline", label: "Outline" },
  { value: "abstrak", label: "Abstrak" },
  { value: "pendahuluan", label: "Pendahuluan" },
  { value: "tinjauan_literatur", label: "Tinjauan Literatur" },
  { value: "metodologi", label: "Metodologi" },
  { value: "hasil", label: "Hasil" },
  { value: "diskusi", label: "Diskusi" },
  { value: "kesimpulan", label: "Kesimpulan" },
  { value: "daftar_pustaka", label: "Daftar Pustaka" },
  { value: "lampiran", label: "Lampiran" },
  { value: "judul", label: "Judul" },
] as const

type StageScope = typeof STAGE_OPTIONS[number]["value"]

export interface StageSkillRow {
  skillId: string
  stageScope: StageScope
  name: string
  description: string
  latestDraftContent?: string
  activeContent?: string
  latestPublishedContent?: string
}

interface StageSkillFormDialogProps {
  open: boolean
  userId: Id<"users">
  initialSkill: StageSkillRow | null
  onClose: () => void
}

export function StageSkillFormDialog({
  open,
  userId,
  initialSkill,
  onClose,
}: StageSkillFormDialogProps) {
  const createOrUpdateDraft = useMutation(api.stageSkills.createOrUpdateDraft)

  const [stageScope, setStageScope] = useState<StageScope>("gagasan")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [contentBody, setContentBody] = useState("")
  const [changeNote, setChangeNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    if (initialSkill) {
      setStageScope(initialSkill.stageScope)
      setName(initialSkill.name)
      setDescription(initialSkill.description)
      setContentBody(
        initialSkill.latestDraftContent?.trim()
          || initialSkill.activeContent?.trim()
          || initialSkill.latestPublishedContent?.trim()
          || ""
      )
      setChangeNote("")
    } else {
      setStageScope("gagasan")
      setName("")
      setDescription("")
      setContentBody("")
      setChangeNote("")
    }
  }, [initialSkill, open])

  const isEditing = !!initialSkill
  const canSubmit = useMemo(() => {
    return !!name.trim() && !!description.trim() && !!contentBody.trim() && !isSubmitting
  }, [name, description, contentBody, isSubmitting])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      const result = await createOrUpdateDraft({
        requestorUserId: userId,
        stageScope,
        name: name.trim(),
        description: description.trim(),
        contentBody: contentBody.trim(),
        changeNote: changeNote.trim() || undefined,
      })
      toast.success(result.message ?? "Draft stage skill tersimpan.")
      onClose()
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan draft stage skill.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Draft: ${initialSkill?.skillId}` : "Buat Stage Skill Draft"}
          </DialogTitle>
          <DialogDescription>
            Konten skill harus full English. Publish/activate akan ditolak jika melanggar validator.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stage-scope">Stage Scope</Label>
              <select
                id="stage-scope"
                value={stageScope}
                onChange={(event) => setStageScope(event.target.value as StageScope)}
                disabled={isEditing || isSubmitting}
                className="focus-ring h-10 w-full rounded-action border border-border bg-background px-3 text-sm"
              >
                {STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-name">Skill Name</Label>
              <Input
                id="skill-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="gagasan-skill"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-description">Description</Label>
            <Input
              id="skill-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Stage instruction for ... Use when currentStage = ..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-content">Skill Content</Label>
            <Textarea
              id="skill-content"
              value={contentBody}
              onChange={(event) => setContentBody(event.target.value)}
              rows={18}
              className="font-mono text-sm"
              placeholder="Write SKILL.md body in English..."
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-change-note">Change Note (Optional)</Label>
            <Input
              id="skill-change-note"
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              placeholder="What changed in this draft?"
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "Menyimpan..." : "Simpan Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
