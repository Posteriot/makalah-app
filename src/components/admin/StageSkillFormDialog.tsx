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
type SearchPolicy = "active" | "passive"

const ACTIVE_SEARCH_STAGES: StageScope[] = [
  "gagasan",
  "topik",
  "pendahuluan",
  "tinjauan_literatur",
  "metodologi",
  "diskusi",
]

function getDefaultSearchPolicy(stageScope: StageScope): SearchPolicy {
  return ACTIVE_SEARCH_STAGES.includes(stageScope) ? "active" : "passive"
}

function normalizeQuotedValue(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function parseSkillMarkdown(raw: string): {
  body: string
  name?: string
  description?: string
  metadataInternal?: string
  metadataStageScope?: string
  metadataSearchPolicy?: SearchPolicy
} {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) {
    return { body: raw }
  }

  const frontmatter = match[1]
  const body = match[2] ?? ""
  const parsed: {
    body: string
    name?: string
    description?: string
    metadataInternal?: string
    metadataStageScope?: string
    metadataSearchPolicy?: SearchPolicy
  } = { body }

  let inMetadata = false
  for (const line of frontmatter.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed === "metadata:") {
      inMetadata = true
      continue
    }

    if (inMetadata && line.startsWith("  ")) {
      const separatorIndex = trimmed.indexOf(":")
      if (separatorIndex <= 0) continue
      const key = trimmed.slice(0, separatorIndex).trim()
      const value = normalizeQuotedValue(trimmed.slice(separatorIndex + 1))

      if (key === "internal") parsed.metadataInternal = value
      if (key === "stageScope") parsed.metadataStageScope = value
      if (key === "searchPolicy" && (value === "active" || value === "passive")) {
        parsed.metadataSearchPolicy = value
      }
      continue
    }

    inMetadata = false

    if (trimmed.startsWith("name:")) {
      parsed.name = normalizeQuotedValue(trimmed.slice("name:".length))
      continue
    }

    if (trimmed.startsWith("description:")) {
      parsed.description = normalizeQuotedValue(trimmed.slice("description:".length))
    }
  }

  return parsed
}

function buildSkillMarkdown(input: {
  name: string
  description: string
  stageScope: StageScope
  metadataInternal: string
  metadataSearchPolicy: SearchPolicy
  body: string
}): string {
  const normalizedBody = parseSkillMarkdown(input.body).body.trim()
  return [
    "---",
    `name: ${input.name.trim()}`,
    `description: ${input.description.trim()}`,
    "metadata:",
    `  internal: "${input.metadataInternal.trim() || "true"}"`,
    `  stageScope: ${input.stageScope}`,
    `  searchPolicy: ${input.metadataSearchPolicy}`,
    "---",
    "",
    normalizedBody,
  ].join("\n")
}

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
  const [metadataInternal, setMetadataInternal] = useState("true")
  const [metadataSearchPolicy, setMetadataSearchPolicy] = useState<SearchPolicy>("active")
  const [changeNote, setChangeNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return

    if (initialSkill) {
      const baseContent =
        initialSkill.latestDraftContent?.trim()
        || initialSkill.activeContent?.trim()
        || initialSkill.latestPublishedContent?.trim()
        || ""
      const parsed = parseSkillMarkdown(baseContent)

      setStageScope(initialSkill.stageScope)
      setName(parsed.name?.trim() || initialSkill.name)
      setDescription(parsed.description?.trim() || initialSkill.description)
      setContentBody(
        parsed.body.trim()
      )
      setMetadataInternal(parsed.metadataInternal || "true")
      setMetadataSearchPolicy(
        parsed.metadataSearchPolicy || getDefaultSearchPolicy(initialSkill.stageScope)
      )
      setChangeNote("")
    } else {
      setStageScope("gagasan")
      setName("")
      setDescription("")
      setContentBody("")
      setMetadataInternal("true")
      setMetadataSearchPolicy(getDefaultSearchPolicy("gagasan"))
      setChangeNote("")
    }
  }, [initialSkill, open])

  const isEditing = !!initialSkill
  const canSubmit = useMemo(() => {
    return !!name.trim() && !!description.trim() && !!contentBody.trim() && !isSubmitting
  }, [name, description, contentBody, isSubmitting])

  useEffect(() => {
    if (isEditing) return
    setMetadataSearchPolicy(getDefaultSearchPolicy(stageScope))
  }, [isEditing, stageScope])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setIsSubmitting(true)
    try {
      const normalizedName = name.trim()
      const normalizedDescription = description.trim()
      const normalizedContentBody = contentBody.trim()
      const fullSkillMarkdown = buildSkillMarkdown({
        name: normalizedName,
        description: normalizedDescription,
        stageScope,
        metadataInternal,
        metadataSearchPolicy,
        body: normalizedContentBody,
      })

      const result = await createOrUpdateDraft({
        requestorUserId: userId,
        stageScope,
        name: normalizedName,
        description: normalizedDescription,
        contentBody: fullSkillMarkdown,
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

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="metadata-internal">Metadata Internal</Label>
              <select
                id="metadata-internal"
                value={metadataInternal}
                onChange={(event) => setMetadataInternal(event.target.value)}
                disabled={isSubmitting}
                className="focus-ring h-10 w-full rounded-action border border-border bg-background px-3 text-sm"
              >
                <option value="true">"true"</option>
                <option value="false">"false"</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata-stage-scope">Metadata Stage Scope</Label>
              <Input
                id="metadata-stage-scope"
                value={stageScope}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata-search-policy">Metadata Search Policy</Label>
              <select
                id="metadata-search-policy"
                value={metadataSearchPolicy}
                onChange={(event) => setMetadataSearchPolicy(event.target.value as SearchPolicy)}
                disabled={isSubmitting}
                className="focus-ring h-10 w-full rounded-action border border-border bg-background px-3 text-sm"
              >
                <option value="active">active</option>
                <option value="passive">passive</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skill-content">Skill Content</Label>
            <Textarea
              id="skill-content"
              value={contentBody}
              onChange={(event) => setContentBody(event.target.value)}
              rows={18}
              className="font-mono text-sm"
              placeholder="Write skill body section (without frontmatter) in English..."
              disabled={isSubmitting}
            />
            <p className="text-narrative text-xs text-muted-foreground">
              Frontmatter (`name`, `description`, `metadata`) akan dibentuk otomatis saat simpan.
            </p>
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
