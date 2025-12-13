"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
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
import { RoleBadge } from "./RoleBadge"
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
import { ArrowUp, ArrowDown } from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"

interface User {
  _id: Id<"users">
  email: string
  firstName?: string
  lastName?: string
  role: string
  emailVerified: boolean
  subscriptionStatus: string
}

interface UserListProps {
  users: User[]
  currentUserRole: "superadmin" | "admin" | "user"
}

export function UserList({ users, currentUserRole }: UserListProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogAction, setDialogAction] = useState<"promote" | "demote" | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)

  const promoteToAdmin = useMutation(api.adminUserManagement.promoteToAdmin)
  const demoteToUser = useMutation(api.adminUserManagement.demoteToUser)

  const handlePromoteClick = (user: User) => {
    setSelectedUser(user)
    setDialogAction("promote")
  }

  const handleDemoteClick = (user: User) => {
    setSelectedUser(user)
    setDialogAction("demote")
  }

  const handleConfirm = async () => {
    if (!selectedUser || !dialogAction) return

    setIsLoading(true)
    try {
      if (dialogAction === "promote") {
        const result = await promoteToAdmin({
          targetUserId: selectedUser._id,
        })
        toast.success(result.message)
      } else {
        const result = await demoteToUser({
          targetUserId: selectedUser._id,
        })
        toast.success(result.message)
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Terjadi kesalahan"
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
      setSelectedUser(null)
      setDialogAction(null)
    }
  }

  const handleCancel = () => {
    setSelectedUser(null)
    setDialogAction(null)
  }

  const getFullName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.firstName || user.lastName || "-"
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead>Status Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  Tidak ada data pengguna
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{getFullName(user)}</TableCell>
                  <TableCell>
                    <RoleBadge
                      role={user.role as "superadmin" | "admin" | "user"}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {user.subscriptionStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.emailVerified ? (
                      <Badge variant="default">Verified</Badge>
                    ) : (
                      <Badge variant="secondary">Belum Verified</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {currentUserRole === "superadmin" ? (
                      <>
                        {user.role === "superadmin" ? (
                          <span className="text-sm text-muted-foreground">
                            Cannot modify
                          </span>
                        ) : user.role === "user" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePromoteClick(user)}
                            disabled={isLoading}
                          >
                            <ArrowUp className="h-4 w-4 mr-2" />
                            Promote
                          </Button>
                        ) : user.role === "admin" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDemoteClick(user)}
                            disabled={isLoading}
                          >
                            <ArrowDown className="h-4 w-4 mr-2" />
                            Demote
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        View only
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={dialogAction !== null}
        onOpenChange={(open) => !open && handleCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === "promote"
                ? "Promote ke Admin"
                : "Demote ke User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === "promote"
                ? `Apakah Anda yakin ingin promote ${selectedUser?.email} menjadi admin? User akan mendapatkan akses ke admin panel.`
                : `Apakah Anda yakin ingin demote ${selectedUser?.email} menjadi user biasa? User akan kehilangan akses admin panel.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? "Memproses..." : "Konfirmasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
