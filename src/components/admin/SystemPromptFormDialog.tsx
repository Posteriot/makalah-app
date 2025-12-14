"use client"

import { useState, useEffect } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
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
import type { Id } from "@convex/_generated/dataModel"

interface SystemPrompt {
  _id: Id<"systemPrompts">
  name: string
  content: string
  description?: string
  version: number
  isActive: boolean
}

interface SystemPromptFormDialogProps {
  open: boolean
  prompt: SystemPrompt | null
  userId: Id<"users">
  onClose: () => void
}

export function SystemPromptFormDialog({
  open,
  prompt,
  userId,
  onClose,
}: SystemPromptFormDialogProps) {
  const [name, setName] = useState("")
  const [content, setContent] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const createMutation = useMutation(api.systemPrompts.createSystemPrompt)
  const updateMutation = useMutation(api.systemPrompts.updateSystemPrompt)

  // Reset form when dialog opens/closes or prompt changes
  useEffect(() => {
    if (open) {
      if (prompt) {
        // Editing existing prompt
        setName(prompt.name)
        setContent(prompt.content)
        setDescription(prompt.description ?? "")
      } else {
        // Creating new prompt
        setName("")
        setContent("")
        setDescription("")
      }
    }
  }, [open, prompt])

  const isEditing = !!prompt
  const hasChanges = isEditing
    ? content !== prompt.content || description !== (prompt.description ?? "")
    : name.trim() !== "" && content.trim() !== ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      toast.error("Konten prompt tidak boleh kosong")
      return
    }

    if (!isEditing && !name.trim()) {
      toast.error("Nama prompt tidak boleh kosong")
      return
    }

    setIsLoading(true)
    try {
      if (isEditing) {
        // Update (creates new version)
        const result = await updateMutation({
          requestorUserId: userId,
          promptId: prompt._id,
          content: content.trim(),
          description: description.trim() || undefined,
        })
        toast.success(result.message)
      } else {
        // Create new prompt
        const result = await createMutation({
          requestorUserId: userId,
          name: name.trim(),
          content: content.trim(),
          description: description.trim() || undefined,
        })
        toast.success(result.message)
      }
      onClose()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? `Edit Prompt: ${prompt.name} (v${prompt.version})`
              : "Buat Prompt Baru"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Perubahan akan membuat versi baru. Versi sebelumnya tetap tersimpan di riwayat."
              : "Buat system prompt baru untuk AI chat. Prompt baru akan tidak aktif secara default."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="name">Nama Prompt *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Academic Assistant, Casual Helper"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi (Opsional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat tentang prompt ini"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Konten Prompt *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Tulis system prompt di sini..."
              rows={20}
              className="font-mono text-sm"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Gunakan format teks biasa. Mendukung newline dan struktur seperti
              heading, list, dll.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={!hasChanges || isLoading}>
              {isLoading
                ? "Menyimpan..."
                : isEditing
                  ? `Simpan (Buat v${prompt.version + 1})`
                  : "Buat Prompt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
