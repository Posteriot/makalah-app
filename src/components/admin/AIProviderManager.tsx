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
  Power,
  Trash2,
  ArrowLeftRight,
  Settings2,
  RefreshCw,
} from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"
import { AIProviderFormDialog } from "./AIProviderFormDialog"

interface AIProviderConfig {
  _id: Id<"aiProviderConfigs">
  name: string
  description?: string
  primaryProvider: string
  primaryModel: string
  fallbackProvider: string
  fallbackModel: string
  temperature: number
  topP?: number
  version: number
  isActive: boolean
  createdAt: number
  updatedAt: number
  creatorEmail: string
}

interface AIProviderManagerProps {
  userId: Id<"users">
}

export function AIProviderManager({ userId }: AIProviderManagerProps) {
  const configs = useQuery(api.aiProviderConfigs.listConfigs, {
    requestorUserId: userId,
  })

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<AIProviderConfig | null>(null)
  const [deleteConfig, setDeleteConfig] = useState<AIProviderConfig | null>(null)
  const [activateConfig, setActivateConfig] = useState<AIProviderConfig | null>(null)
  const [swapConfig, setSwapConfig] = useState<AIProviderConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const activateMutation = useMutation(api.aiProviderConfigs.activateConfig)
  const swapMutation = useMutation(api.aiProviderConfigs.swapProviders)
  const deleteMutation = useMutation(api.aiProviderConfigs.deleteConfigChain)

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
    if (!activateConfig) return

    setIsLoading(true)
    try {
      const result = await activateMutation({
        requestorUserId: userId,
        configId: activateConfig._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setActivateConfig(null)
    }
  }

  const handleSwap = async () => {
    if (!swapConfig) return

    setIsLoading(true)
    try {
      const result = await swapMutation({
        requestorUserId: userId,
        configId: swapConfig._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setSwapConfig(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfig) return

    setIsLoading(true)
    try {
      const result = await deleteMutation({
        requestorUserId: userId,
        configId: deleteConfig._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setDeleteConfig(null)
    }
  }

  const handleReloadConfig = async () => {
    // Call API to invalidate server-side cache
    try {
      // For now, just show success message
      // In production, you might want to call an API endpoint to invalidate cache
      toast.success("Config cache akan di-refresh otomatis dalam 5 menit, atau segera di request chat berikutnya")
    } catch {
      toast.error("Gagal reload config cache")
    }
  }

  if (configs === undefined) {
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
                <Settings2 className="h-5 w-5" />
                AI Provider Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Kelola provider AI, model, dan API keys. Hanya satu config yang bisa aktif.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReloadConfig}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Cache
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Config Baru
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Primary Provider</TableHead>
                  <TableHead>Fallback Provider</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>Versi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Terakhir Update</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-8"
                    >
                      Belum ada config. Klik &quot;Buat Config Baru&quot; untuk memulai.
                    </TableCell>
                  </TableRow>
                ) : (
                  configs.map((config) => (
                    <TableRow key={config._id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{config.name}</div>
                          {config.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {config.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium capitalize">
                            {config.primaryProvider.replace("-", " ")}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {config.primaryModel}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium capitalize">
                            {config.fallbackProvider.replace("-", " ")}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {config.fallbackModel}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{config.temperature}</TableCell>
                      <TableCell>
                        <Badge variant="outline">v{config.version}</Badge>
                      </TableCell>
                      <TableCell>
                        {config.isActive ? (
                          <Badge variant="default" className="bg-green-600">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Tidak Aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(config.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingConfig(config)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSwapConfig(config)}
                            title="Tukar Primary ↔ Fallback"
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
                          {config.isActive ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Config sedang aktif"
                              disabled
                            >
                              <Power className="h-4 w-4 text-green-600" />
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setActivateConfig(config)}
                                title="Aktifkan"
                                className="text-green-600 hover:text-green-700"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfig(config)}
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

          {configs.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4">
              Catatan: Jika tidak ada config yang aktif, AI akan menggunakan
              hardcoded fallback config. Config cache akan otomatis refresh setiap 5
              menit.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <AIProviderFormDialog
        open={isCreateDialogOpen || !!editingConfig}
        config={editingConfig}
        userId={userId}
        onClose={() => {
          setIsCreateDialogOpen(false)
          setEditingConfig(null)
        }}
      />

      {/* Activate Confirmation */}
      <AlertDialog
        open={!!activateConfig}
        onOpenChange={(open) => !open && setActivateConfig(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktifkan Config</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengaktifkan &quot;{activateConfig?.name}&quot; v
              {activateConfig?.version}? Config lain yang sedang aktif akan
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

      {/* Swap Confirmation */}
      <AlertDialog
        open={!!swapConfig}
        onOpenChange={(open) => !open && setSwapConfig(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tukar Provider</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menukar primary ↔ fallback provider di config
              &quot;{swapConfig?.name}&quot;? Ini akan membuat versi baru (v
              {swapConfig && swapConfig.version + 1}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwap} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Tukar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfig}
        onOpenChange={(open) => !open && setDeleteConfig(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Config</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus &quot;{deleteConfig?.name}&quot;
              beserta seluruh riwayat versinya? Tindakan ini tidak dapat dibatalkan.
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
