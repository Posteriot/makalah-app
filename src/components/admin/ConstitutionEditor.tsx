"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NavArrowLeft } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConstitutionData {
  _id: Id<"styleConstitutions">
  name: string
  content: string
  description?: string
  version: number
}

interface ConstitutionEditorProps {
  userId: Id<"users">
  /** undefined = create mode, defined = edit mode */
  constitution?: ConstitutionData
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConstitutionEditor({
  userId,
  constitution,
}: ConstitutionEditorProps) {
  const router = useRouter()
  const isEditMode = !!constitution

  // ---- Form state ----------------------------------------------------------
  const [name, setName] = useState(constitution?.name ?? "")
  const [description, setDescription] = useState(
    constitution?.description ?? "",
  )
  const [content, setContent] = useState(constitution?.content ?? "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ---- Mutations -----------------------------------------------------------
  const createConstitution = useMutation(api.styleConstitutions.create)
  const updateConstitution = useMutation(api.styleConstitutions.update)

  // ---- Derived -------------------------------------------------------------
  const hasChanges = isEditMode
    ? content !== constitution.content ||
      description !== (constitution.description ?? "")
    : name.trim() !== "" && content.trim() !== ""

  const backUrl = "/dashboard?tab=refrasa"

  // ---- Handlers ------------------------------------------------------------
  function handleBack() {
    router.push(backUrl)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!hasChanges) return

    setIsSubmitting(true)

    try {
      if (isEditMode) {
        await updateConstitution({
          requestorUserId: userId,
          constitutionId: constitution._id,
          content: content.trim(),
          description: description.trim() || undefined,
        })
        toast.success(
          `Constitution berhasil diupdate ke v${constitution.version + 1}`,
        )
      } else {
        await createConstitution({
          requestorUserId: userId,
          name: name.trim(),
          content: content.trim(),
          description: description.trim() || undefined,
        })
        toast.success("Constitution berhasil dibuat")
      }

      router.push(backUrl)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Terjadi kesalahan",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // ---- Render --------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <button
            type="button"
            onClick={handleBack}
            className="text-interface flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <NavArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Kembali ke Refrasa
          </button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-action"
              onClick={handleBack}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="constitution-form"
              className="rounded-action"
              disabled={!hasChanges || isSubmitting}
            >
              {isSubmitting
                ? "Menyimpan..."
                : isEditMode
                  ? `Simpan (Buat v${constitution.version + 1})`
                  : "Buat Constitution"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Title + subtitle */}
        <div className="mb-6">
          <h1 className="text-narrative text-2xl font-semibold tracking-tight">
            {isEditMode
              ? `Edit: ${constitution.name} (v${constitution.version})`
              : "Buat Constitution Baru"}
          </h1>
          <p className="text-interface mt-1 text-sm text-muted-foreground">
            {isEditMode
              ? "Perubahan akan membuat versi baru. Versi sebelumnya tetap tersimpan di riwayat."
              : "Constitution baru akan tidak aktif secara default."}
          </p>
        </div>

        <form id="constitution-form" onSubmit={handleSubmit}>
          {/* Metadata fields */}
          <div className="mb-6 grid gap-4 md:grid-cols-5">
            {/* Nama */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="constitution-name" className="text-interface">
                Nama
              </Label>
              <Input
                id="constitution-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama constitution"
                disabled={isEditMode}
                className={
                  isEditMode
                    ? "rounded-action bg-muted text-muted-foreground"
                    : "rounded-action"
                }
              />
            </div>

            {/* Deskripsi */}
            <div className="space-y-2 md:col-span-3">
              <Label
                htmlFor="constitution-description"
                className="text-interface"
              >
                Deskripsi
              </Label>
              <Input
                id="constitution-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi singkat (opsional)"
                className="rounded-action"
              />
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-2">
            <Label htmlFor="constitution-content" className="text-interface">
              Konten
            </Label>
            <Textarea
              id="constitution-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis style constitution di sini (mendukung Markdown)..."
              className="h-[calc(100vh-340px)] min-h-[50vh] resize-y font-mono text-sm rounded-action"
            />
            <p className="text-interface text-xs text-muted-foreground">
              Gunakan format Markdown. Constitution berisi aturan gaya penulisan
              untuk Refrasa.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
