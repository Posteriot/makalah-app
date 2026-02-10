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
      <div className="rounded-shell border border-hairline bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs font-mono">
            <thead className="bg-slate-800/40 border-b border-hairline">
              <tr>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Email</th>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Nama</th>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Role</th>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Subscription</th>
                <th className="px-4 py-3 text-slate-500 uppercase tracking-wider font-bold">Status Email</th>
                <th className="px-4 py-3 text-right text-slate-500 uppercase tracking-wider font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Tidak ada data pengguna
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3 text-slate-200">{getFullName(user)}</td>
                    <td className="px-4 py-3">
                      <RoleBadge
                        role={user.role as "superadmin" | "admin" | "user"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-bold uppercase tracking-wide bg-slate-800 text-slate-300 border border-hairline">
                        {user.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-bold uppercase tracking-wide bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-bold uppercase tracking-wide bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Belum Verified
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {currentUserRole === "superadmin" ? (
                        <div className="flex items-center justify-end gap-2">
                          {user.role === "superadmin" ? (
                            <span className="text-slate-500 italic">Cannot modify</span>
                          ) : user.role === "user" ? (
                            <button
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-action border border-hairline text-slate-200 hover:bg-slate-800 hover-slash focus-ring disabled:opacity-50"
                              onClick={() => handlePromoteClick(user)}
                              disabled={isLoading}
                            >
                              <ArrowUp className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Promote</span>
                            </button>
                          ) : user.role === "admin" ? (
                            <button
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-action border border-hairline text-slate-200 hover:bg-slate-800 hover-slash focus-ring disabled:opacity-50"
                              onClick={() => handleDemoteClick(user)}
                              disabled={isLoading}
                            >
                              <ArrowDown className="h-3.5 w-3.5 text-amber-400" />
                              <span>Demote</span>
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-500">View only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
