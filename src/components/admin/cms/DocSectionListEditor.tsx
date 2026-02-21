"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Plus, EditPencil, Trash } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  userId: Id<"users">
  group?: string
  onSelectSection: (slug: string) => void
  onCreateNew: () => void
}

const GROUP_ORDER = ["Mulai", "Fitur Utama", "Subskripsi", "Panduan Lanjutan"]

export function DocSectionListEditor({ userId, group, onSelectSection, onCreateNew }: Props) {
  const sections = useQuery(api.documentationSections.listAllSections, {
    requestorId: userId,
  })

  const deleteSection = useMutation(api.documentationSections.deleteSection)

  async function handleDelete(id: Id<"documentationSections">, title: string) {
    const confirmed = window.confirm(
      `Hapus section '${title}'? Tindakan ini tidak bisa dibatalkan.`
    )
    if (!confirmed) return

    await deleteSection({ requestorId: userId, id })
  }

  // Loading skeleton
  if (sections === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-44" />
        </div>
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Filter by group if specified
  const filtered = group
    ? sections.filter((s) => s.group === group)
    : sections

  // Group sections by group field
  const grouped = new Map<string, typeof sections>()
  for (const section of filtered) {
    const g = section.group
    if (!grouped.has(g)) {
      grouped.set(g, [])
    }
    grouped.get(g)!.push(section)
  }

  // Sort groups: predefined order first, then any others alphabetically
  const sortedGroups: string[] = []
  for (const g of GROUP_ORDER) {
    if (grouped.has(g)) sortedGroups.push(g)
  }
  for (const g of grouped.keys()) {
    if (!sortedGroups.includes(g)) sortedGroups.push(g)
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          Dokumentasi{group ? `: ${group}` : ""}
        </h3>
        <button
          type="button"
          onClick={onCreateNew}
          className="flex items-center gap-1.5 rounded-action border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-50 hover:bg-muted/50"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Tambah Section Baru
        </button>
      </div>

      {/* Grouped list */}
      {sortedGroups.length === 0 ? (
        <p className="text-interface text-sm text-muted-foreground">
          Belum ada section dokumentasi.
        </p>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map((groupName) => {
            const items = grouped.get(groupName)!
            return (
              <div key={groupName}>
                {/* Group header */}
                <span className="text-signal mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {groupName}
                </span>

                {/* Section rows */}
                <div className="flex flex-col gap-dense">
                  {items.map((section) => (
                    <div
                      key={section._id}
                      className="flex items-center justify-between rounded-action border border-border p-3"
                    >
                      {/* Left: title + group badge + published dot */}
                      <div className="flex items-center gap-3">
                        {/* Published status dot */}
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            section.isPublished ? "bg-emerald-500" : "bg-slate-400"
                          }`}
                          title={section.isPublished ? "Published" : "Draft"}
                        />

                        {/* Title */}
                        <span className="text-interface text-sm font-medium text-foreground">
                          {section.title}
                        </span>

                        {/* Group badge */}
                        <span className="text-signal rounded-badge bg-muted/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {section.group}
                        </span>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectSection(section.slug)}
                          className="flex items-center gap-1 rounded-action border border-border px-2 py-1 text-xs text-muted-foreground transition-colors duration-50 hover:bg-muted/50 hover:text-foreground"
                        >
                          <EditPencil className="h-3 w-3" strokeWidth={1.5} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(section._id, section.title)}
                          className="rounded-action p-1 text-rose-400 transition-colors duration-50 hover:text-rose-300"
                          title={`Hapus ${section.title}`}
                        >
                          <Trash className="h-4 w-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
