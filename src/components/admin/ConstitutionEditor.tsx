"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NavArrowLeft } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { DottedPattern } from "@/components/marketing/SectionBackground"

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
    <div className="relative isolate min-h-screen overflow-hidden bg-[color:var(--section-bg-alt)]">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 pb-6 pt-4 md:px-8">
        {/* Back link — above card, like a breadcrumb */}
        <button
          type="button"
          onClick={handleBack}
          className="text-interface mb-4 flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <NavArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Kembali ke Refrasa
        </button>

        {/* Card — exact same styling as AdminContentSection */}
        <div className="mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
          {/* Header: title + action buttons (matches admin card header pattern) */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-narrative text-2xl font-medium tracking-tight text-foreground md:text-3xl">
                {isEditMode
                  ? `Edit: ${constitution.name} (v${constitution.version})`
                  : "Buat Constitution Baru"}
              </h1>
              <p className="text-narrative text-sm text-muted-foreground">
                {isEditMode
                  ? "Perubahan akan membuat versi baru. Versi sebelumnya tetap tersimpan di riwayat."
                  : "Constitution baru akan tidak aktif secara default."}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="focus-ring inline-flex h-8 items-center rounded-action border-main border border-border px-3 py-1.5 text-xs font-mono font-medium text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                form="constitution-form"
                disabled={!hasChanges || isSubmitting}
                className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {isSubmitting
                  ? "Menyimpan..."
                  : isEditMode
                    ? `Simpan (Buat v${constitution.version + 1})`
                    : "Buat Constitution"}
              </button>
            </div>
          </div>

          <form id="constitution-form" onSubmit={handleSubmit}>
            {/* Metadata fields */}
            <div className="mb-6 grid gap-4 md:grid-cols-5">
              {/* Nama */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="constitution-name" className="text-interface text-xs">
                  Nama Constitution *
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
                  className="text-interface text-xs"
                >
                  Deskripsi (Opsional)
                </Label>
                <Input
                  id="constitution-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat tentang constitution ini"
                  className="rounded-action"
                />
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <Label htmlFor="constitution-content" className="text-interface text-xs">
                Konten Constitution *
              </Label>
              <Textarea
                id="constitution-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Tulis style constitution di sini (mendukung Markdown)..."
                className="h-[calc(100vh-450px)] min-h-[50vh] resize-y rounded-action font-mono text-sm"
              />
              <p className="text-interface text-xs text-muted-foreground">
                Gunakan format Markdown. Constitution berisi aturan gaya penulisan
                untuk Refrasa.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
