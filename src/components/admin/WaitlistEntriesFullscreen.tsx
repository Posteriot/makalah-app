"use client"

import { useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { Collapse, Mail, RefreshDouble, Trash } from "iconoir-react"
import { WaitlistStatusBadge } from "./WaitlistStatusBadge"
import type { Id } from "@convex/_generated/dataModel"

interface WaitlistEntry {
  _id: Id<"waitlistEntries">
  firstName: string
  lastName: string
  email: string
  status: "pending" | "invited" | "registered"
  createdAt: number
}

interface WaitlistEntriesFullscreenProps {
  isOpen: boolean
  onClose: () => void
  entries: WaitlistEntry[]
  paginationStatus: string
  loadMore: (count: number) => void
  formatDate: (timestamp: number) => string
  invitingId: Id<"waitlistEntries"> | null
  onInvite: (entryId: Id<"waitlistEntries">) => void
  onResetToPending: (entryId: Id<"waitlistEntries">) => void
  onDelete: (entryId: Id<"waitlistEntries">) => void
}

export function WaitlistEntriesFullscreen({
  isOpen,
  onClose,
  entries,
  paginationStatus,
  loadMore,
  formatDate,
  invitingId,
  onInvite,
  onResetToPending,
  onDelete,
}: WaitlistEntriesFullscreenProps) {
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

  // Focus management
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
        aria-label="Daftar Tunggu Fullscreen"
        className="relative z-10 flex h-full w-full flex-col bg-card dark:bg-slate-950"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-slate-200/75 px-4 py-3 dark:bg-slate-900/85 md:px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Daftar Tunggu
            </h2>
            <span className="rounded-badge border border-border bg-muted px-2 py-0.5 text-[10px] font-bold font-mono tracking-wide text-muted-foreground">
              {entries.length} pendaftar
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
                <th className="text-signal h-12 min-w-[100px] px-4 py-3 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                  Status
                </th>
                <th className="text-signal h-12 min-w-[140px] px-4 py-3 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                  Tanggal
                </th>
                <th className="text-signal h-12 min-w-[120px] px-4 py-3 text-center text-[10px] font-bold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-narrative py-10 text-center text-muted-foreground"
                  >
                    Belum ada pendaftar di waiting list
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={entry._id}
                    className="group transition-colors hover:bg-muted/50"
                  >
                    <td className="text-narrative whitespace-nowrap bg-slate-200/35 px-4 py-3 text-xs font-mono text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      {entry.firstName} {entry.lastName}
                    </td>
                    <td className="text-narrative break-all bg-slate-200/35 px-4 py-3 text-xs font-mono text-foreground group-hover:bg-slate-200/55 dark:bg-slate-900/55 dark:group-hover:bg-slate-800/70">
                      {entry.email}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <WaitlistStatusBadge status={entry.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className="text-narrative text-xs text-muted-foreground">
                        {formatDate(entry.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {entry.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => onInvite(entry._id)}
                            disabled={invitingId === entry._id}
                            title="Undang"
                            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border px-2.5 text-xs font-mono text-sky-600 transition-colors hover:bg-sky-500/10 disabled:opacity-50 dark:text-sky-400"
                          >
                            {invitingId === entry._id ? (
                              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Mail className="h-3.5 w-3.5" />
                            )}
                            Undang
                          </button>
                        )}
                        {(entry.status === "invited" || entry.status === "registered") && (
                          <button
                            type="button"
                            onClick={() => onResetToPending(entry._id)}
                            title="Reset ke Menunggu"
                            className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border px-2.5 text-xs font-mono text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
                          >
                            <RefreshDouble className="h-3.5 w-3.5" />
                            Reset
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDelete(entry._id)}
                          title="Hapus"
                          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-action border-main border border-border text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
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
        {paginationStatus === "Exhausted" && entries.length > 20 && (
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
