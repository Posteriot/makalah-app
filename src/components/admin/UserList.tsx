"use client"

import { useState } from "react"
import { useMutation, usePaginatedQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
import { ArrowUp, ArrowDown, Trash, NavArrowLeft, NavArrowRight, Expand } from "iconoir-react"
import { UserListFullscreen } from "./UserListFullscreen"
import type { Id } from "@convex/_generated/dataModel"

export interface User {
  _id: Id<"users">
  email: string
  firstName?: string
  lastName?: string
  role: string
  emailVerified: boolean
  subscriptionStatus: string
}

interface UserListProps {
  userId: Id<"users">
  currentUserRole: "superadmin" | "admin" | "user"
}

const PAGE_SIZE = 20

type SubscriptionTier = "free" | "bpp" | "pro"
type TierOrAdmin = SubscriptionTier | "admin"
type DialogAction = "promote" | "demote" | "delete"

const TIER_OPTIONS: Array<{ value: SubscriptionTier; label: string; color: string }> = [
  { value: "free", label: "GRATIS", color: "bg-segment-gratis text-white" },
  { value: "bpp", label: "BPP", color: "bg-segment-bpp text-white" },
  { value: "pro", label: "PRO", color: "bg-segment-pro text-black" },
]
const TIER_HIERARCHY: readonly string[] = ["free", "bpp", "pro", "unlimited"]

const ADMIN_OPTION = { value: "admin" as const, label: "ADMIN", color: "bg-rose-600 text-white" }

function getPromoteOptions(subscriptionStatus: string, role: string, currentUserRole: string): Array<{ value: string; label: string; color: string }> {
  if (role === "admin" || role === "superadmin") return []
  const currentIndex = TIER_HIERARCHY.indexOf(subscriptionStatus)
  const tierOptions = TIER_OPTIONS.filter((_, i) => i > currentIndex)
  // Only superadmin can promote to admin
  if (currentUserRole === "superadmin") {
    return [...tierOptions, ADMIN_OPTION]
  }
  return tierOptions
}

function getDemoteOptions(subscriptionStatus: string, role: string, currentUserRole: string): Array<{ value: string; label: string; color: string }> {
  if (role === "superadmin") return []
  if (role === "admin") {
    // Only superadmin can demote admin
    if (currentUserRole !== "superadmin") return []
    return [...TIER_OPTIONS].reverse()
  }
  const currentIndex = TIER_HIERARCHY.indexOf(subscriptionStatus)
  return TIER_OPTIONS.filter((_, i) => i < currentIndex).reverse()
}

type DynamicColumnKey =
  | "role"
  | "subscription"
  | "emailVerified"
  | "promoteAction"
  | "deleteAction"

const DYNAMIC_COLUMNS: Array<{ key: DynamicColumnKey; label: string }> = [
  { key: "role", label: "Role" },
  { key: "subscription", label: "Subscription" },
  { key: "emailVerified", label: "Status Email" },
  { key: "promoteAction", label: "Promote" },
  { key: "deleteAction", label: "Delete" },
]

function NoAccessIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="7.5" y1="16.5" x2="16.5" y2="7.5" />
    </svg>
  )
}

export function UserList({ userId, currentUserRole }: UserListProps) {
  const { results: users, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.users.listUsersPaginated,
    { requestorUserId: userId },
    { initialNumItems: PAGE_SIZE }
  )
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [dynamicColumnStart, setDynamicColumnStart] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [pendingTier, setPendingTier] = useState<TierOrAdmin | null>(null)

  const promoteToAdmin = useMutation(api.adminUserManagement.promoteToAdmin)
  const demoteFromAdmin = useMutation(api.adminUserManagement.demoteFromAdmin)
  const updateTier = useMutation(api.adminUserManagement.updateSubscriptionTier)

  const handlePromoteClick = (user: User) => {
    setSelectedUser(user)
    setPendingTier(null)
    setDialogAction("promote")
  }

  const handleDemoteClick = (user: User) => {
    setSelectedUser(user)
    setPendingTier(null)
    setDialogAction("demote")
  }

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setDialogAction("delete")
  }

  const deleteUserFromAdmin = async (user: User) => {
    const response = await fetch("/api/admin/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: user._id }),
    })

    const payload = (await response.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null

    if (!response.ok) {
      throw new Error(payload?.error ?? "Gagal menghapus user")
    }

    return payload?.message ?? "User berhasil dihapus"
  }

  const handleConfirm = async () => {
    if (!selectedUser || !dialogAction) return
    if (dialogAction !== "delete" && !pendingTier) return

    setIsLoading(true)
    try {
      if (dialogAction === "delete") {
        const message = await deleteUserFromAdmin(selectedUser)
        toast.success(message)
      } else if (pendingTier === "admin") {
        // Promote to admin (role change)
        const result = await promoteToAdmin({ targetUserId: selectedUser._id })
        toast.success(result.message)
      } else if (selectedUser.role === "admin") {
        // Demote from admin to specific tier
        const result = await demoteFromAdmin({
          targetUserId: selectedUser._id,
          targetTier: pendingTier as "free" | "bpp" | "pro",
        })
        toast.success(result.message)
      } else {
        // Tier change for regular user
        const result = await updateTier({
          targetUserId: selectedUser._id,
          newTier: pendingTier as "free" | "bpp" | "pro",
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
      setPendingTier(null)
    }
  }

  const handleCancel = () => {
    setSelectedUser(null)
    setDialogAction(null)
    setPendingTier(null)
  }

  const getFullName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.firstName || user.lastName || "-"
  }

  const DESKTOP_DYNAMIC_COLUMN_COUNT = 2

  const visibleDynamicColumnsDesktop = Array.from(
    { length: DESKTOP_DYNAMIC_COLUMN_COUNT },
    (_, offset) => DYNAMIC_COLUMNS[(dynamicColumnStart + offset) % DYNAMIC_COLUMNS.length]
  )

  const visibleDynamicColumnsMobile = Array.from(
    { length: 1 },
    (_, offset) => DYNAMIC_COLUMNS[(dynamicColumnStart + offset) % DYNAMIC_COLUMNS.length]
  )

  const goToPrevColumns = () => {
    setDynamicColumnStart(
      (prev) => (prev - 1 + DYNAMIC_COLUMNS.length) % DYNAMIC_COLUMNS.length
    )
  }

  const goToNextColumns = () => {
    setDynamicColumnStart((prev) => (prev + 1) % DYNAMIC_COLUMNS.length)
  }

  const getAvailableActions = (user: User): DialogAction[] => {
    const actions: DialogAction[] = []
    const promoteOpts = getPromoteOptions(user.subscriptionStatus, user.role, currentUserRole)
    const demoteOpts = getDemoteOptions(user.subscriptionStatus, user.role, currentUserRole)
    if (promoteOpts.length > 0) actions.push("promote")
    if (demoteOpts.length > 0) actions.push("demote")
    // Delete permissions unchanged
    if (currentUserRole === "superadmin" && user.role !== "superadmin") {
      actions.push("delete")
    } else if (currentUserRole === "admin" && user.role === "user") {
      actions.push("delete")
    }
    return actions
  }

  const isCannotModifyRow = (user: User) =>
    currentUserRole === "superadmin" && user.role === "superadmin"

  const canDeleteUser = (user: User) => getAvailableActions(user).includes("delete")

  const renderPromoteDemoteCell = (user: User) => {
    const promoteOpts = getPromoteOptions(user.subscriptionStatus, user.role, currentUserRole)
    const demoteOpts = getDemoteOptions(user.subscriptionStatus, user.role, currentUserRole)

    if (promoteOpts.length === 0 && demoteOpts.length === 0) {
      return <span className="text-narrative text-muted-foreground">-</span>
    }

    return (
      <div className="flex items-center gap-1.5">
        {promoteOpts.length > 0 && (
          <button
            className="focus-ring inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-action border-main border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handlePromoteClick(user)}
            disabled={isLoading}
          >
            <ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Promote</span>
          </button>
        )}
        {demoteOpts.length > 0 && (
          <button
            className="focus-ring inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-action border-main border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handleDemoteClick(user)}
            disabled={isLoading}
          >
            <ArrowDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>Demote</span>
          </button>
        )}
      </div>
    )
  }

  const renderDeleteActionCell = (user: User) => {
    if (canDeleteUser(user)) {
      return (
      <button
        className="focus-ring inline-flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-action border-main border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => handleDeleteClick(user)}
        disabled={isLoading}
      >
          <Trash className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span>Delete</span>
        </button>
      )
    }

    return <span className="text-narrative text-muted-foreground">-</span>
  }

  const renderMobilePromoteDemoteCell = (user: User) => {
    const promoteOpts = getPromoteOptions(user.subscriptionStatus, user.role, currentUserRole)
    const demoteOpts = getDemoteOptions(user.subscriptionStatus, user.role, currentUserRole)

    if (promoteOpts.length === 0 && demoteOpts.length === 0) {
      return <span className="text-muted-foreground">-</span>
    }

    return (
      <div className="flex items-center gap-1">
        {promoteOpts.length > 0 && (
          <button
            type="button"
            aria-label="Promote user"
            onClick={() => handlePromoteClick(user)}
            disabled={isLoading}
            className="focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
        {demoteOpts.length > 0 && (
          <button
            type="button"
            aria-label="Demote user"
            onClick={() => handleDemoteClick(user)}
            disabled={isLoading}
            className="focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-action border-main border border-border text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  const renderMobileDeleteActionIconCell = (user: User) => {
    if (canDeleteUser(user)) {
      return (
        <button
          type="button"
          aria-label="Delete user"
          onClick={() => handleDeleteClick(user)}
          disabled={isLoading}
          className="focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash className="h-4 w-4" />
        </button>
      )
    }

    return <span className="text-muted-foreground">-</span>
  }

  const isActionWindow = (columns: Array<{ key: DynamicColumnKey }>) => {
    const keys = new Set(columns.map((column) => column.key))
    return keys.has("promoteAction") && keys.has("deleteAction")
  }

  const renderDynamicCell = (columnKey: DynamicColumnKey, user: User) => {
    if (columnKey === "role") {
      return (
        <RoleBadge
          role={user.role as "superadmin" | "admin" | "user"}
        />
      )
    }

    if (columnKey === "subscription") {
      const tierOption = TIER_OPTIONS.find((t) => t.value === user.subscriptionStatus)
      return (
        <span className={cn(
          "inline-flex items-center rounded-badge px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
          tierOption?.color ?? "bg-slate-700 text-slate-100"
        )}>
          {tierOption?.label ?? user.subscriptionStatus}
        </span>
      )
    }

    if (columnKey === "emailVerified") {
      return user.emailVerified ? (
        <span className="inline-flex items-center rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
          Verified
        </span>
      ) : (
        <span className="inline-flex items-center rounded-badge border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-amber-600 uppercase dark:text-amber-400">
          Belum Verified
        </span>
      )
    }

    if (columnKey === "promoteAction") {
      return renderPromoteDemoteCell(user)
    }

    if (columnKey === "deleteAction") {
      return renderDeleteActionCell(user)
    }
  }

  if (paginationStatus === "LoadingFirstPage") {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-1/3 rounded-action bg-muted" />
        <div className="h-56 rounded-shell bg-muted" />
      </div>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground">
          {users.length} pengguna
        </p>
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          aria-label="Fullscreen tabel"
          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>

      <UserListFullscreen
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        users={users}
        paginationStatus={paginationStatus}
        loadMore={loadMore}
        getFullName={getFullName}
        renderDynamicCell={renderDynamicCell}
        isCannotModifyRow={isCannotModifyRow}
      />

      <div className="hidden overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 md:block">
        <table className="text-interface w-full table-fixed border-collapse text-left text-sm">
          <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
            <tr>
              <th className="text-signal h-12 w-[16%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">Nama</th>
              <th className="text-signal h-12 w-[20%] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">Email</th>
              <th className="h-12 w-[6%] border-l border-border bg-slate-200/75 px-2 py-2 dark:bg-slate-900/85">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={goToPrevColumns}
                    aria-label="Kolom sebelumnya"
                    className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <NavArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextColumns}
                    aria-label="Kolom berikutnya"
                    className="focus-ring inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <NavArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </th>
              {visibleDynamicColumnsDesktop.map((column) => (
                <th
                  key={column.key}
                  className="text-signal h-12 w-[16%] px-4 py-3 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-narrative py-10 text-center text-muted-foreground">
                  Tidak ada data pengguna
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="group transition-colors hover:bg-muted/50">
                  <td className="text-narrative bg-slate-200/35 px-4 py-3 text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">{getFullName(user)}</td>
                  <td className="text-narrative break-all bg-slate-200/35 px-4 py-3 text-muted-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">{user.email}</td>
                  <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-2 py-3 group-hover:from-slate-300/65 group-hover:to-muted/40 dark:from-slate-900/80 dark:to-slate-900/40 dark:group-hover:from-slate-800/95 dark:group-hover:to-slate-800/50" />
                  {isCannotModifyRow(user) && isActionWindow(visibleDynamicColumnsDesktop) ? (
                    <td colSpan={2} className="px-4 py-3 text-center">
                      <span className="text-narrative inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] tracking-wide text-slate-500 dark:text-slate-400">
                        <NoAccessIcon className="h-3.5 w-3.5 text-rose-500" />
                        Cannot modify
                      </span>
                    </td>
                  ) : (
                    visibleDynamicColumnsDesktop.map((column) => (
                      <td key={`${user._id}-${column.key}`} className="px-4 py-3 text-center">
                        <div className="inline-flex items-center justify-center">
                          {renderDynamicCell(column.key, user)}
                        </div>
                      </td>
                    ))
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90 md:hidden">
        <table className="text-interface w-full table-fixed border-collapse text-left text-xs">
          <thead className="border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
            <tr>
              <th className="text-signal h-11 w-[28%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                Nama
              </th>
              <th className="text-signal h-11 w-[36%] bg-slate-200/75 px-2 py-2 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                Email
              </th>
              <th className="h-11 w-[16%] border-l border-border bg-slate-200/75 px-1 py-1 dark:bg-slate-900/85">
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={goToPrevColumns}
                    aria-label="Kolom sebelumnya"
                    className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <NavArrowLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextColumns}
                    aria-label="Kolom berikutnya"
                    className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-action border-main border border-border text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800"
                  >
                    <NavArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </th>
              {visibleDynamicColumnsMobile.map((column) => (
                <th
                  key={`mobile-${column.key}`}
                  className="text-signal h-11 w-[20%] px-2 py-2 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-narrative py-10 text-center text-muted-foreground">
                  Tidak ada data pengguna
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="group transition-colors hover:bg-muted/50">
                  <td className="text-narrative bg-slate-200/35 px-2 py-3 align-top text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                    {getFullName(user)}
                  </td>
                  <td className="text-narrative break-all bg-slate-200/35 px-2 py-3 align-top text-muted-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                    {user.email}
                  </td>
                  <td className="border-l border-border bg-gradient-to-r from-slate-300/45 to-card/40 px-1 py-3 dark:from-slate-900/80 dark:to-slate-900/40" />
                  {visibleDynamicColumnsMobile.map((column) => (
                    <td key={`${user._id}-mobile-${column.key}`} className="px-2 py-3 text-center align-top">
                      <div className="inline-flex items-center justify-center">
                        {column.key === "promoteAction"
                          ? isCannotModifyRow(user)
                            ? (
                              <span className="inline-flex items-center justify-center text-rose-500">
                                <NoAccessIcon className="h-4 w-4" />
                              </span>
                            )
                            : renderMobilePromoteDemoteCell(user)
                          : column.key === "deleteAction"
                            ? isCannotModifyRow(user)
                              ? (
                                <span className="inline-flex items-center justify-center text-rose-500">
                                  <NoAccessIcon className="h-4 w-4" />
                                </span>
                              )
                              : renderMobileDeleteActionIconCell(user)
                            : renderDynamicCell(column.key, user)}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginationStatus === "CanLoadMore" && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => loadMore(PAGE_SIZE)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-action border border-border px-4 py-2 text-xs font-mono text-foreground transition-colors hover:bg-muted"
          >
            Muat Lebih Banyak
          </button>
        </div>
      )}
      {paginationStatus === "Exhausted" && users.length > PAGE_SIZE && (
        <p className="pt-4 text-center text-xs font-mono text-muted-foreground">
          Semua data ditampilkan
        </p>
      )}

      <AlertDialog
        open={dialogAction !== null}
        onOpenChange={(open) => !open && handleCancel()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === "promote"
                ? "Promote User"
                : dialogAction === "demote"
                  ? "Demote User"
                  : "Hapus User"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              {dialogAction === "promote" || dialogAction === "demote" ? (
                <div className="space-y-3">
                  <p>
                    Pilih tier baru untuk <span className="font-medium text-foreground">{selectedUser?.email}</span>:
                  </p>
                  {(() => {
                    const currentTierOption = selectedUser?.role === "admin"
                      ? { label: "ADMIN (UNLIMITED)", color: "bg-rose-600 text-white" }
                      : TIER_OPTIONS.find((t) => t.value === selectedUser?.subscriptionStatus)
                    return currentTierOption ? (
                      <div className="rounded-action border-2 border-border px-3 py-2 text-center opacity-50">
                        <span className={cn(
                          "inline-flex items-center rounded-badge px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                          currentTierOption.color
                        )}>
                          {currentTierOption.label}
                        </span>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">Saat ini</p>
                      </div>
                    ) : null
                  })()}
                  <div className="flex flex-wrap gap-2">
                    {(dialogAction === "promote"
                      ? getPromoteOptions(selectedUser?.subscriptionStatus ?? "free", selectedUser?.role ?? "user", currentUserRole)
                      : getDemoteOptions(selectedUser?.subscriptionStatus ?? "free", selectedUser?.role ?? "user", currentUserRole)
                    ).map((option) => {
                      const isSelected = pendingTier === option.value
                      const isAdminOption = option.value === "admin"
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPendingTier(option.value as TierOrAdmin)}
                          className={cn(
                            "flex-1 min-w-[80px] rounded-action border-2 px-3 py-2 text-center transition-all",
                            isSelected
                              ? isAdminOption
                                ? "border-rose-500 bg-rose-500/10"
                                : "border-primary bg-primary/10"
                              : isAdminOption
                                ? "border-rose-500/30 hover:border-rose-500"
                                : "border-border hover:border-muted-foreground"
                          )}
                        >
                          <span className={cn(
                            "inline-flex items-center rounded-badge px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                            option.color
                          )}>
                            {option.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {pendingTier === "admin" && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      User akan mendapatkan akses admin panel.
                    </p>
                  )}
                  {dialogAction === "demote" && selectedUser?.role === "admin" && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      User akan kehilangan akses admin panel.
                    </p>
                  )}
                </div>
              ) : (
                <p>
                  Apakah Anda yakin ingin menghapus {selectedUser?.email}? User akan dihapus dan tidak bisa login lagi.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel} disabled={isLoading}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isLoading || (dialogAction !== "delete" && !pendingTier)}
            >
              {isLoading
                ? "Memproses..."
                : dialogAction === "delete"
                  ? "Hapus"
                  : "Konfirmasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
