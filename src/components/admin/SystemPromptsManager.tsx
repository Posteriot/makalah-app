"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Plus,
  Pencil,
  History,
  Power,
  PowerOff,
  Trash2,
  FileText,
} from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"
import { SystemPromptFormDialog } from "./SystemPromptFormDialog"
import { VersionHistoryDialog } from "./VersionHistoryDialog"

interface SystemPrompt {
  _id: Id<"systemPrompts">
  name: string
  content: string
  description?: string
  version: number
  isActive: boolean
  createdBy: Id<"users">
  createdAt: number
  creatorEmail: string
}

interface SystemPromptsManagerProps {
  userId: Id<"users">
}

export function SystemPromptsManager({ userId }: SystemPromptsManagerProps) {
  const prompts = useQuery(api.systemPrompts.listSystemPrompts, {
    requestorUserId: userId,
  })

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<SystemPrompt | null>(null)
  const [historyPrompt, setHistoryPrompt] = useState<SystemPrompt | null>(null)
  const [deletePrompt, setDeletePrompt] = useState<SystemPrompt | null>(null)
  const [activatePrompt, setActivatePrompt] = useState<SystemPrompt | null>(null)
  const [deactivatePrompt, setDeactivatePrompt] = useState<SystemPrompt | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activateMutation = useMutation(api.systemPrompts.activateSystemPrompt)
  const deactivateMutation = useMutation(api.systemPrompts.deactivateSystemPrompt)
  const deleteMutation = useMutation(api.systemPrompts.deletePromptChain)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleActivate = async () => {
    if (!activatePrompt) return

    setIsLoading(true)
    try {
      const result = await activateMutation({
        requestorUserId: userId,
        promptId: activatePrompt._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setActivatePrompt(null)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivatePrompt) return

    setIsLoading(true)
    try {
      const result = await deactivateMutation({
        requestorUserId: userId,
        promptId: deactivatePrompt._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeactivatePrompt(null)
    }
  }

  const handleDelete = async () => {
    if (!deletePrompt) return

    setIsLoading(true)
    try {
      const result = await deleteMutation({
        requestorUserId: userId,
        promptId: deletePrompt._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeletePrompt(null)
    }
  }

  if (prompts === undefined) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                System Prompts
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola system prompt untuk AI chat. Hanya satu prompt yang bisa aktif.
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Prompt Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Versi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat Oleh</TableHead>
                  <TableHead>Terakhir Diupdate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-muted-foreground py-8"
                    >
                      Belum ada system prompt. Klik &quot;Buat Prompt Baru&quot; untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  prompts.map((prompt) => (
                    <TableRow key={prompt._id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{prompt.name}</div>
                          {prompt.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {prompt.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{prompt.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {prompt.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {prompt.creatorEmail}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(prompt.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPrompt(prompt)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryPrompt(prompt)}
                            title="Riwayat Versi"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {prompt.isActive ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeactivatePrompt(prompt)}
                              title="Nonaktifkan"
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <PowerOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActivatePrompt(prompt)}
                                title="Aktifkan"
                                className="text-green-600 hover:text-green-700"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeletePrompt(prompt)}
                                title="Hapus"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {prompts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Catatan: Jika tidak ada prompt yang aktif, AI akan menggunakan fallback
              prompt default.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <SystemPromptFormDialog
        open={isCreateDialogOpen || !!editingPrompt}
        prompt={editingPrompt}
        userId={userId}
        onClose={() => {
          setIsCreateDialogOpen(false)
          setEditingPrompt(null)
        }}
      />

      {/* Version History Dialog */}
      <VersionHistoryDialog
        prompt={historyPrompt}
        userId={userId}
        onClose={() => setHistoryPrompt(null)}
      />

      {/* Activate Confirmation */}
      <AlertDialog
        open={!!activatePrompt}
        onOpenChange={(open) => !open && setActivatePrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktifkan Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengaktifkan &quot;{activatePrompt?.name}&quot; v
              {activatePrompt?.version}? Prompt lain yang sedang aktif akan
              dinonaktifkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Aktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirmation */}
      <AlertDialog
        open={!!deactivatePrompt}
        onOpenChange={(open) => !open && setDeactivatePrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menonaktifkan &quot;{deactivatePrompt?.name}&quot;?
              AI akan menggunakan fallback prompt default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Nonaktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletePrompt}
        onOpenChange={(open) => !open && setDeletePrompt(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Prompt</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deletePrompt?.name}&quot; beserta
              seluruh riwayat versinya? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
