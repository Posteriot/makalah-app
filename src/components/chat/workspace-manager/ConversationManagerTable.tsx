"use client"

import { useMemo, useState } from "react"
import { Trash } from "iconoir-react"
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
  onDeleteSelected,
  onDeleteAll,
}: ConversationManagerTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteSelectedOpen, setDeleteSelectedOpen] = useState(false)
  const [deleteAllOpen, setDeleteAllOpen] = useState(false)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const scopedSelectedIds = useMemo(
    () => selectedIds.filter((id) => items.some((item) => item._id === id)),
    [items, selectedIds]
  )
  const selectedCount = scopedSelectedIds.length

  const allSelected = useMemo(
    () => items.length > 0 && items.every((item) => scopedSelectedIds.includes(item._id)),
    [items, scopedSelectedIds]
  )

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

  const handleDeleteAllConfirm = async () => {
    await onDeleteAll?.()
    setDeleteAllOpen(false)
    setSelectedIds([])
  }

  return (
    <>
      <DeleteSelectedDialog
        open={deleteSelectedOpen}
        count={selectedCount}
        onOpenChange={setDeleteSelectedOpen}
        onConfirm={handleDeleteSelectedConfirm}
      />
      <DeleteAllConversationsDialog
        open={deleteAllOpen}
        totalCount={totalCount}
        onOpenChange={setDeleteAllOpen}
        onConfirm={handleDeleteAllConfirm}
      />
      <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
              Manajemen percakapan
            </p>
            <p className="mt-1 text-sm text-[var(--chat-muted-foreground)]">
              {totalCount} percakapan tersedia pada workspace ini.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-muted)] px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-[0.16em] text-[var(--chat-muted-foreground)]">
              {selectedCount} terpilih
            </span>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setDeleteSelectedOpen(true)}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-action border px-3 text-xs font-medium transition-colors",
                selectedCount === 0
                  ? "cursor-not-allowed border-[color:var(--chat-border)] bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)] opacity-60"
                  : "border-[color:var(--chat-destructive)] bg-[var(--chat-background)] text-[var(--chat-destructive)] hover:bg-[var(--chat-accent)]"
              )}
            >
              <Trash className="h-4 w-4" aria-hidden="true" />
              Hapus pilihan
            </button>
            <button
              type="button"
              disabled={totalCount === 0}
              onClick={() => setDeleteAllOpen(true)}
              className={cn(
                "inline-flex h-8 items-center gap-2 rounded-action border px-3 text-xs font-medium transition-colors",
                totalCount === 0
                  ? "cursor-not-allowed border-[color:var(--chat-border)] bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)] opacity-60"
                  : "border-[color:var(--chat-destructive)] bg-[var(--chat-destructive)] text-[var(--chat-destructive-foreground)] hover:opacity-90"
              )}
            >
              Hapus semua
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)]">
        <div className="grid grid-cols-[40px_minmax(0,1fr)_140px] items-center gap-3 border-b border-[color:var(--chat-border)] px-4 py-3 text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
          <label className="flex items-center justify-center">
            <input
              aria-label="Pilih semua percakapan di halaman aktif"
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border border-[color:var(--chat-border)] bg-[var(--chat-background)]"
            />
          </label>
          <span>Judul</span>
          <span>Aktivitas</span>
        </div>

        {isLoading ? (
          <div className="px-4 py-6 text-sm text-[var(--chat-muted-foreground)]">Memuat percakapan...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-sm text-[var(--chat-muted-foreground)]">Belum ada percakapan.</div>
        ) : (
          <div className="divide-y divide-[color:var(--chat-border)]">
            {items.map((item) => (
              <label
                key={item._id}
                className="grid grid-cols-[40px_minmax(0,1fr)_140px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--chat-accent)]"
              >
                <span className="flex items-center justify-center">
                  <input
                    aria-label={`Pilih percakapan ${item.title}`}
                    type="checkbox"
                    checked={scopedSelectedIds.includes(item._id)}
                    onChange={() => toggleSelection(item._id)}
                    className="h-4 w-4 rounded border border-[color:var(--chat-border)] bg-[var(--chat-background)]"
                  />
                </span>
                <span className="min-w-0 truncate text-sm font-medium text-[var(--chat-foreground)]">
                  {item.title}
                </span>
                <span className="text-xs font-mono text-[var(--chat-muted-foreground)]">
                  {formatRelativeTime(item.lastMessageAt)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-4 py-3">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-8 items-center rounded-action border border-[color:var(--chat-border)] px-3 text-xs font-medium text-[var(--chat-foreground)] transition-colors hover:bg-[var(--chat-accent)] disabled:cursor-not-allowed disabled:text-[var(--chat-muted-foreground)]"
        >
          Sebelumnya
        </button>
        <span className="text-xs font-mono text-[var(--chat-muted-foreground)]">
          Halaman {page} dari {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex h-8 items-center rounded-action border border-[color:var(--chat-border)] px-3 text-xs font-medium text-[var(--chat-foreground)] transition-colors hover:bg-[var(--chat-accent)] disabled:cursor-not-allowed disabled:text-[var(--chat-muted-foreground)]"
        >
          Berikutnya
        </button>
      </div>
      </section>
    </>
  )
}
