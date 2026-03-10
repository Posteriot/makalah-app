"use client"

import { useMemo, useState } from "react"
import { NavArrowLeft, NavArrowRight, Trash } from "iconoir-react"
import { formatRelativeTime } from "@/lib/date/formatters"
import { cn } from "@/lib/utils"
import { DeleteAllConversationsDialog } from "./DeleteAllConversationsDialog"
import { DeleteSelectedDialog } from "./DeleteSelectedDialog"

interface ConversationRow {
  _id: string
  title: string
  lastMessageAt: number
}

interface ConversationManagerTableProps {
  items: ConversationRow[]
  totalCount: number
  page: number
  pageSize: number
  isLoading: boolean
  onPageChange: (page: number) => void
  onDeleteSingle: (id: string) => void | Promise<void>
  onDeleteSelected?: (ids: string[]) => void
  onDeleteAll?: () => void
}

export function ConversationManagerTable({
  items,
  totalCount,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onDeleteSingle,
  onDeleteSelected,
  onDeleteAll,
}: ConversationManagerTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false)
  const [deleteSingleId, setDeleteSingleId] = useState<string | null>(null)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const pageStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const pageEnd = Math.min(totalCount, page * pageSize)
  const scopedSelectedIds = useMemo(
    () => selectedIds.filter((id) => items.some((item) => item._id === id)),
    [items, selectedIds]
  )
  const selectedCount = scopedSelectedIds.length

  const allSelected = useMemo(
    () => items.length > 0 && items.every((item) => scopedSelectedIds.includes(item._id)),
    [items, scopedSelectedIds]
  )
  const isPartiallySelected = selectedCount > 0 && !allSelected

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : items.map((item) => item._id))
  }

  const handleDeleteSelectedConfirm = async () => {
    await onDeleteSelected?.(scopedSelectedIds)
    setDeleteSelectedOpen(false)
    setSelectedIds([])
  }

  const handleDeleteSingleConfirm = async () => {
    if (!deleteSingleId) return
    await onDeleteSingle(deleteSingleId)
    setDeleteSingleId(null)
    setSelectedIds((current) => current.filter((id) => id !== deleteSingleId))
  }

  const handleDeleteAllConfirm = async () => {
    await onDeleteAll?.()
    setDeleteAllOpen(false)
    setSelectedIds([])
  }

  return (
    <>
      <DeleteSelectedDialog
        open={deleteSelectedOpen || deleteSingleId !== null}
        count={deleteSingleId ? 1 : selectedCount}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteSelectedOpen(false)
            setDeleteSingleId(null)
          } else if (deleteSingleId === null) {
            setDeleteSelectedOpen(true)
          }
        }}
        onConfirm={deleteSingleId ? handleDeleteSingleConfirm : handleDeleteSelectedConfirm}
      />
      <DeleteAllConversationsDialog
        open={deleteAllOpen}
        totalCount={totalCount}
        onOpenChange={setDeleteAllOpen}
        onConfirm={handleDeleteAllConfirm}
      />
      <section className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[color:var(--chat-border)] bg-[var(--chat-card)] px-5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {totalCount > 0 ? (
              <input
                aria-label="Pilih semua percakapan di halaman aktif"
                type="checkbox"
                checked={allSelected}
                ref={(node) => {
                  if (node) {
                    node.indeterminate = isPartiallySelected
                  }
                }}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border border-[color:var(--chat-border)] bg-[var(--chat-background)]"
              />
            ) : null}
            <span className="truncate text-xs font-mono font-semibold uppercase tracking-[0.16em] text-[var(--chat-muted-foreground)]">
              {selectedCount > 0 ? `${selectedCount} terpilih` : `${totalCount} percakapan`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Hapus pilihan"
              title="Hapus pilihan"
              disabled={selectedCount === 0}
              onClick={() => setDeleteSelectedOpen(true)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-action transition-colors duration-150",
                selectedCount === 0
                  ? "cursor-not-allowed text-[var(--chat-muted-foreground)] opacity-50"
                  : "text-[var(--chat-destructive)] hover:bg-[var(--chat-accent)]"
              )}
            >
              <Trash className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-5 py-6 text-sm text-[var(--chat-muted-foreground)]">Memuat percakapan...</div>
        ) : items.length === 0 ? (
          <div className="px-5 py-6 text-sm text-[var(--chat-muted-foreground)]">Belum ada percakapan.</div>
        ) : (
          <div className="divide-y divide-[color:var(--chat-border)]">
            {items.map((item) => (
              <div
                key={item._id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--chat-accent)]"
              >
                <span className="flex shrink-0 items-center justify-center">
                  <input
                    aria-label={`Pilih percakapan ${item.title}`}
                    type="checkbox"
                    checked={scopedSelectedIds.includes(item._id)}
                    onChange={() => toggleSelection(item._id)}
                    className="h-4 w-4 rounded border border-[color:var(--chat-border)] bg-[var(--chat-background)]"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--chat-foreground)]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] font-mono text-[var(--chat-muted-foreground)]">
                    {formatRelativeTime(item.lastMessageAt)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Hapus percakapan ${item.title}`}
                  title={`Hapus percakapan ${item.title}`}
                  onClick={() => setDeleteSingleId(item._id)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-action text-[var(--chat-muted-foreground)] transition-colors duration-150 hover:bg-[var(--chat-accent)] hover:text-[var(--chat-destructive)]"
                >
                  <Trash className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-[color:var(--chat-border)] px-5 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="inline-flex h-8 w-8 items-center justify-center rounded-action text-[var(--chat-foreground)] transition-colors hover:bg-[var(--chat-accent)] disabled:cursor-not-allowed disabled:text-[var(--chat-muted-foreground)]"
            aria-label="Halaman sebelumnya"
          >
            <NavArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="inline-flex h-8 w-8 items-center justify-center rounded-action text-[var(--chat-foreground)] transition-colors hover:bg-[var(--chat-accent)] disabled:cursor-not-allowed disabled:text-[var(--chat-muted-foreground)]"
            aria-label="Halaman berikutnya"
          >
            <NavArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <span className="text-xs font-mono text-[var(--chat-muted-foreground)]">
          Menampilkan {pageStart}-{pageEnd} dari {totalCount}
        </span>
        <button
          type="button"
          aria-label="Hapus semua"
          disabled={totalCount === 0}
          onClick={() => setDeleteAllOpen(true)}
          className={cn(
            "inline-flex h-8 items-center rounded-action px-3 text-xs font-medium transition-colors duration-150",
            totalCount === 0
              ? "cursor-not-allowed text-[var(--chat-muted-foreground)] opacity-50"
              : "text-[var(--chat-destructive)] hover:bg-[var(--chat-accent)]"
          )}
        >
          Hapus semua
        </button>
      </div>
      </section>
    </>
  )
}
