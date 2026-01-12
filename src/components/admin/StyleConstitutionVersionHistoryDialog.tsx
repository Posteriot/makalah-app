"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Id } from "@convex/_generated/dataModel"

interface StyleConstitution {
  _id: Id<"styleConstitutions">
  name: string
  content: string
  description?: string
  version: number
  isActive: boolean
}

interface StyleConstitutionVersion extends StyleConstitution {
  createdAt: number
  creatorEmail: string
}

interface StyleConstitutionVersionHistoryDialogProps {
  constitution: StyleConstitution | null
  userId: Id<"users">
  onClose: () => void
}

export function StyleConstitutionVersionHistoryDialog({
  constitution,
  userId,
  onClose,
}: StyleConstitutionVersionHistoryDialogProps) {
  const [deleteVersion, setDeleteVersion] = useState<StyleConstitutionVersion | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const versions = useQuery(
    api.styleConstitutions.getVersionHistory,
    constitution
      ? {
          constitutionId: constitution._id,
          requestorUserId: userId,
        }
      : "skip"
  )

  const deleteMutation = useMutation(api.styleConstitutions.deleteConstitution)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDeleteVersion = async () => {
    if (!deleteVersion) return

    setIsDeleting(true)
    try {
      const result = await deleteMutation({
        requestorUserId: userId,
        constitutionId: deleteVersion._id,
      })
      toast.success(result.message)
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
      setDeleteVersion(null)
    }
  }

  return (
    <Dialog open={!!constitution} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Riwayat Versi: {constitution?.name}</DialogTitle>
        </DialogHeader>

        {versions === undefined ? (
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        ) : versions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Tidak ada riwayat versi ditemukan.
          </p>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto pr-4 space-y-4">
            {/* Sort by version descending (newest first) */}
            {[...versions].reverse().map((version) => (
              <Card
                key={version._id}
                className={version.isActive ? "border-green-500" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      Versi {version.version}
                      {version.isActive && (
                        <Badge variant="default" className="bg-green-600">
                          Aktif
                        </Badge>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-muted-foreground">
                        {formatDate(version.createdAt)} oleh {version.creatorEmail}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteVersion(version as StyleConstitutionVersion)}
                        disabled={version.isActive || isDeleting}
                        title={version.isActive ? "Nonaktifkan dulu untuk menghapus" : "Hapus versi ini"}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {version.description && (
                    <p className="text-sm text-muted-foreground">
                      {version.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-md overflow-x-auto max-h-[300px] overflow-y-auto">
                    {version.content}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>

      <AlertDialog
        open={!!deleteVersion}
        onOpenChange={(open) => !open && setDeleteVersion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Versi Constitution</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus versi {deleteVersion?.version} dari &quot;{deleteVersion?.name}&quot;?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Hapus Versi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
