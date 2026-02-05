"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
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
import { ArrowUp, ArrowDown } from "iconoir-react"
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
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nama</th>
              <th>Role</th>
              <th>Subscription</th>
              <th>Status Email</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-8">
                  Tidak ada data pengguna
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id}>
                  <td className="cell-email">{user.email}</td>
                  <td className="cell-name">{getFullName(user)}</td>
                  <td>
                    <RoleBadge
                      role={user.role as "superadmin" | "admin" | "user"}
                    />
                  </td>
                  <td>
                    <span className="sub-badge capitalize">
                      {user.subscriptionStatus}
                    </span>
                  </td>
                  <td>
                    {user.emailVerified ? (
                      <span className="status-badge status-badge--verified">Verified</span>
                    ) : (
                      <span className="status-badge status-badge--unverified">Belum Verified</span>
                    )}
                  </td>
                  <td>
                    {currentUserRole === "superadmin" ? (
                      <div className="flex items-center gap-2">
                        {user.role === "superadmin" ? (
                          <span className="action-disabled">Cannot modify</span>
                        ) : user.role === "user" ? (
                          <button
                            className="action-btn action-btn--promote"
                            onClick={() => handlePromoteClick(user)}
                            disabled={isLoading}
                          >
                            <ArrowUp className="action-icon" />
                            <span>Promote</span>
                          </button>
                        ) : user.role === "admin" ? (
                          <button
                            className="action-btn action-btn--demote"
                            onClick={() => handleDemoteClick(user)}
                            disabled={isLoading}
                          >
                            <ArrowDown className="action-icon" />
                            <span>Demote</span>
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <span className="action-disabled text-sm">View only</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
