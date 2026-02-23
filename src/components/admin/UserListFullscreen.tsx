"use client"

import { useEffect, useRef, useCallback, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Collapse } from "iconoir-react"
import type { User } from "./UserList"

type DynamicColumnKey =
  | "role"
  | "subscription"
  | "emailVerified"
  | "promoteAction"
  | "deleteAction"

const ALL_COLUMNS: Array<{ key: DynamicColumnKey; label: string }> = [
  { key: "role", label: "Role" },
  { key: "subscription", label: "Subscription" },
  { key: "emailVerified", label: "Status Email" },
  { key: "promoteAction", label: "Promote" },
  { key: "deleteAction", label: "Delete" },
]

interface UserListFullscreenProps {
  isOpen: boolean
  onClose: () => void
  users: User[]
  paginationStatus: string
  loadMore: (count: number) => void
  getFullName: (user: User) => string
  renderDynamicCell: (key: DynamicColumnKey, user: User) => ReactNode
  isCannotModifyRow: (user: User) => boolean
}

export function UserListFullscreen({
  isOpen,
  onClose,
  users,
  paginationStatus,
  loadMore,
  getFullName,
  renderDynamicCell,
  isCannotModifyRow,
}: UserListFullscreenProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Body overflow lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // Focus management: focus close button on open, restore on close
  useEffect(() => {
    if (!isOpen) return

    const previousFocusedElement = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    return () => {
      previousFocusedElement?.focus?.()
    }
  }, [isOpen])

  // Escape key + focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== "Tab") return

      const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const current = document.activeElement as HTMLElement | null

      if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [isOpen, onClose]
  )

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Tutup fullscreen"
      />

      {/* Modal container */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="User Management Fullscreen"
        className="relative z-10 flex h-full w-full flex-col bg-card dark:bg-slate-950"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-slate-200/75 px-4 py-3 dark:bg-slate-900/85 md:px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              User Management
            </h2>
            <span className="rounded-badge border border-border bg-muted px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide text-muted-foreground">
              {users.length} pengguna
            </span>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Tutup fullscreen"
          >
            <Collapse className="h-4 w-4" />
          </button>
        </div>

        {/* Table container */}
        <div className="flex-1 overflow-auto">
          <table className="text-interface w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-slate-300/70 dark:bg-slate-800/95">
              <tr>
                <th className="text-signal h-12 min-w-[140px] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                  Nama
                </th>
                <th className="text-signal h-12 min-w-[180px] bg-slate-200/75 px-4 py-3 text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase dark:bg-slate-900/85">
                  Email
                </th>
                {ALL_COLUMNS.map((column) => (
                  <th
                    key={column.key}
                    className="text-signal h-12 min-w-[100px] px-4 py-3 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={2 + ALL_COLUMNS.length}
                    className="text-narrative py-10 text-center text-muted-foreground"
                  >
                    Tidak ada data pengguna
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user._id}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="text-narrative bg-slate-200/35 px-4 py-3 text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      {getFullName(user)}
                    </td>
                    <td className="text-narrative break-all bg-slate-200/35 px-4 py-3 text-muted-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      {user.email}
                    </td>
                    {isCannotModifyRow(user) ? (
                      <>
                        {ALL_COLUMNS.map((column) => {
                          if (
                            column.key === "promoteAction" ||
                            column.key === "deleteAction"
                          ) {
                            return (
                              <td
                                key={`${user._id}-fs-${column.key}`}
                                className="px-4 py-3 text-center"
                              >
                                <span className="text-narrative inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[11px] tracking-wide text-slate-500 dark:text-slate-400">
                                  <CannotModifyIcon className="h-3.5 w-3.5 text-rose-500" />
                                </span>
                              </td>
                            )
                          }
                          return (
                            <td
                              key={`${user._id}-fs-${column.key}`}
                              className="px-4 py-3 text-center"
                            >
                              <div className="inline-flex items-center justify-center">
                                {renderDynamicCell(column.key, user)}
                              </div>
                            </td>
                          )
                        })}
                      </>
                    ) : (
                      ALL_COLUMNS.map((column) => (
                        <td
                          key={`${user._id}-fs-${column.key}`}
                          className="px-4 py-3 text-center"
                        >
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

        {/* Footer — pagination */}
        {paginationStatus === "CanLoadMore" && (
          <div className="shrink-0 border-t border-border bg-slate-200/75 px-4 py-3 dark:bg-slate-900/85">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => loadMore(20)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-action border border-border px-4 py-2 text-xs font-mono text-foreground transition-colors hover:bg-muted"
              >
                Muat Lebih Banyak
              </button>
            </div>
          </div>
        )}
        {paginationStatus === "Exhausted" && users.length > 20 && (
          <div className="shrink-0 border-t border-border bg-slate-200/75 px-4 py-1.5 dark:bg-slate-900/85">
            <p className="text-center text-xs font-mono text-muted-foreground">
              Semua data ditampilkan
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

function CannotModifyIcon({ className }: { className?: string }) {
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
