"use client"

import { useState, useEffect } from "react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  EditPencil,
  ClockRotateRight,
  SwitchOn,
  SwitchOff,
  Trash,
  Journal,
  InfoCircle,
  Download,
  WarningCircle,
  Settings,
} from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { StyleConstitutionVersionHistoryDialog } from "./StyleConstitutionVersionHistoryDialog"

interface StyleConstitution {
  _id: Id<"styleConstitutions">
  name: string
  content: string
  description?: string
  version: number
  isActive: boolean
  createdBy: Id<"users">
  createdAt: number
  updatedAt: number
  creatorEmail: string
}

interface StyleConstitutionManagerProps {
  userId: Id<"users">
}

export function StyleConstitutionManager({ userId }: StyleConstitutionManagerProps) {
  const constitutions = useQuery(api.styleConstitutions.list, {
    requestorUserId: userId,
  })

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingConstitution, setEditingConstitution] = useState<StyleConstitution | null>(null)
  const [historyConstitution, setHistoryConstitution] = useState<StyleConstitution | null>(null)
  const [deleteConstitution, setDeleteConstitution] = useState<StyleConstitution | null>(null)
  const [activateConstitution, setActivateConstitution] = useState<StyleConstitution | null>(null)
  const [deactivateConstitution, setDeactivateConstitution] = useState<StyleConstitution | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSeedingDefault, setIsSeedingDefault] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formContent, setFormContent] = useState("")
  const [formDescription, setFormDescription] = useState("")

  const activateMutation = useMutation(api.styleConstitutions.activate)
  const deactivateMutation = useMutation(api.styleConstitutions.deactivate)
  const deleteMutation = useMutation(api.styleConstitutions.deleteChain)
  const createMutation = useMutation(api.styleConstitutions.create)
  const updateMutation = useMutation(api.styleConstitutions.update)
  const seedDefaultMutation = useMutation(api.styleConstitutions.seedDefault)

  // Refrasa tool visibility toggle
  const isRefrasaEnabled = useQuery(api.aiProviderConfigs.getRefrasaEnabled)
  const setRefrasaEnabledMutation = useMutation(api.aiProviderConfigs.setRefrasaEnabled)
  const [isTogglingRefrasa, setIsTogglingRefrasa] = useState(false)

  // Reset form when dialog opens/closes or editing constitution changes
  useEffect(() => {
    if (isCreateDialogOpen || editingConstitution) {
      if (editingConstitution) {
        setFormName(editingConstitution.name)
        setFormContent(editingConstitution.content)
        setFormDescription(editingConstitution.description ?? "")
      } else {
        setFormName("")
        setFormContent("")
        setFormDescription("")
      }
    }
  }, [isCreateDialogOpen, editingConstitution])

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
    if (!activateConstitution) return

    setIsLoading(true)
    try {
      const result = await activateMutation({
        requestorUserId: userId,
        constitutionId: activateConstitution._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setActivateConstitution(null)
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateConstitution) return

    setIsLoading(true)
    try {
      const result = await deactivateMutation({
        requestorUserId: userId,
        constitutionId: deactivateConstitution._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeactivateConstitution(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConstitution) return

    setIsLoading(true)
    try {
      const result = await deleteMutation({
        requestorUserId: userId,
        constitutionId: deleteConstitution._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeleteConstitution(null)
    }
  }

  const handleSeedDefault = async () => {
    setIsSeedingDefault(true)
    try {
      const result = await seedDefaultMutation({
        requestorUserId: userId,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsSeedingDefault(false)
    }
  }

  const handleToggleRefrasa = async (enabled: boolean) => {
    setIsTogglingRefrasa(true)
    try {
      const result = await setRefrasaEnabledMutation({
        requestorUserId: userId,
        enabled,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsTogglingRefrasa(false)
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formContent.trim()) {
      toast.error("Konten constitution tidak boleh kosong")
      return
    }

    if (!editingConstitution && !formName.trim()) {
      toast.error("Nama constitution tidak boleh kosong")
      return
    }

    setIsLoading(true)
    try {
      if (editingConstitution) {
        // Update (creates new version)
        const result = await updateMutation({
          requestorUserId: userId,
          constitutionId: editingConstitution._id,
          content: formContent.trim(),
          description: formDescription.trim() || undefined,
        })
        toast.success(result.message)
      } else {
        // Create new constitution
        const result = await createMutation({
          requestorUserId: userId,
          name: formName.trim(),
          content: formContent.trim(),
          description: formDescription.trim() || undefined,
        })
        toast.success(result.message)
      }
      handleCloseFormDialog()
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseFormDialog = () => {
    if (!isLoading) {
      setIsCreateDialogOpen(false)
      setEditingConstitution(null)
    }
  }

  const isEditing = !!editingConstitution
  const hasChanges = isEditing
    ? formContent !== editingConstitution.content || formDescription !== (editingConstitution.description ?? "")
    : formName.trim() !== "" && formContent.trim() !== ""

  if (constitutions === undefined) {
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
      {/* Refrasa Tool Status Toggle */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Status Tool Refrasa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="refrasa-toggle" className="text-sm font-medium">
                Aktifkan Refrasa Tool
              </Label>
              <p className="text-xs text-muted-foreground">
                Jika dinonaktifkan, tombol Refrasa tidak akan muncul di artifact viewer untuk semua user.
              </p>
            </div>
            <Switch
              id="refrasa-toggle"
              checked={isRefrasaEnabled ?? true}
              onCheckedChange={handleToggleRefrasa}
              disabled={isTogglingRefrasa || isRefrasaEnabled === undefined}
            />
          </div>
          {isRefrasaEnabled === false && (
            <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md">
              <p className="text-xs text-orange-700 dark:text-orange-300">
                <strong>Mode Maintenance:</strong> Tombol Refrasa saat ini disembunyikan dari semua user.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Style Constitution Manager */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Journal className="h-5 w-5" />
                Refrasa - Style Constitution
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola panduan gaya penulisan (Layer 2) untuk Refrasa tool. Hanya satu constitution yang bisa aktif.
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Buat Constitution Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Information Note */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4 flex items-start gap-2">
            <InfoCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Catatan:</strong> Constitution hanya untuk style rules (Layer 2).
              Naturalness criteria (Layer 1) sudah hardcoded dan tidak bisa di-override.
            </p>
          </div>

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
                {constitutions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-0">
                      {/* Empty State with Seed Default Option */}
                      <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3 mb-4">
                          <WarningCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          Belum Ada Style Constitution
                        </h3>
                        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                          Refrasa membutuhkan Style Constitution (Layer 2) untuk panduan gaya penulisan.
                          Gunakan constitution default atau buat sendiri.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={handleSeedDefault}
                            disabled={isSeedingDefault}
                            className="gap-2"
                          >
                            <Download className="h-4 w-4" />
                            {isSeedingDefault ? "Memproses..." : "Gunakan Default Constitution"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsCreateDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Buat Sendiri
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          Default: &quot;Makalah Style Constitution&quot; - panduan gaya penulisan akademis Bahasa Indonesia
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  constitutions.map((constitution) => (
                    <TableRow key={constitution._id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{constitution.name}</div>
                          {constitution.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {constitution.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{constitution.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {constitution.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {constitution.creatorEmail}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(constitution.updatedAt ?? constitution.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingConstitution(constitution)}
                            title="Edit"
                          >
                            <EditPencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryConstitution(constitution)}
                            title="Riwayat Versi"
                          >
                            <ClockRotateRight className="h-4 w-4" />
                          </Button>
                          {constitution.isActive ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeactivateConstitution(constitution)}
                              title="Nonaktifkan"
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <SwitchOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActivateConstitution(constitution)}
                                title="Aktifkan"
                                className="text-green-600 hover:text-green-700"
                              >
                                <SwitchOn className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConstitution(constitution)}
                                title="Hapus Semua Versi"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash className="h-4 w-4" />
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

          {constitutions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Catatan: Jika tidak ada constitution yang aktif, Refrasa akan menggunakan hanya Layer 1 (Core Naturalness Criteria).
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || !!editingConstitution}
        onOpenChange={handleCloseFormDialog}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing
                ? `Edit Constitution: ${editingConstitution.name} (v${editingConstitution.version})`
                : "Buat Constitution Baru"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Perubahan akan membuat versi baru. Versi sebelumnya tetap tersimpan di riwayat."
                : "Buat style constitution baru untuk Refrasa. Constitution baru akan tidak aktif secara default."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="name">Nama Constitution *</Label>
                <Input
                  id="name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Makalah Style Constitution"
                  disabled={isLoading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi (Opsional)</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Deskripsi singkat tentang constitution ini"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Konten Constitution *</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Tulis style constitution di sini (mendukung Markdown)..."
                rows={20}
                className="font-mono text-sm"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Gunakan format Markdown. Constitution berisi panduan gaya penulisan yang akan digunakan Refrasa (Layer 2).
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseFormDialog}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button type="submit" disabled={!hasChanges || isLoading}>
                {isLoading
                  ? "Menyimpan..."
                  : isEditing
                    ? `Simpan (Buat v${editingConstitution.version + 1})`
                    : "Buat Constitution"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <StyleConstitutionVersionHistoryDialog
        constitution={historyConstitution}
        userId={userId}
        onClose={() => setHistoryConstitution(null)}
      />

      {/* Activate Confirmation */}
      <AlertDialog
        open={!!activateConstitution}
        onOpenChange={(open) => !open && setActivateConstitution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktifkan Constitution</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengaktifkan &quot;{activateConstitution?.name}&quot; v
              {activateConstitution?.version}? Constitution lain yang sedang aktif akan
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
        open={!!deactivateConstitution}
        onOpenChange={(open) => !open && setDeactivateConstitution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Constitution</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menonaktifkan &quot;{deactivateConstitution?.name}&quot;?
              Refrasa akan menggunakan hanya Layer 1 (Core Naturalness Criteria).
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
        open={!!deleteConstitution}
        onOpenChange={(open) => !open && setDeleteConstitution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Constitution</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deleteConstitution?.name}&quot; beserta
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
