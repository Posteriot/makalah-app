"use client"

import React from "react"
import { Doc, Id } from "@convex/_generated/dataModel"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PaperSessionCard } from "./PaperSessionCard"
import { PaperSessionsEmpty } from "./PaperSessionsEmpty"

type FilterStatus = "all" | "in_progress" | "completed" | "archived"
type SortBy = "updatedAt" | "createdAt"

interface PaperSessionsListProps {
  sessions: Doc<"paperSessions">[]
  filterStatus: FilterStatus
  onFilterChange: (status: FilterStatus) => void
  sortBy: SortBy
  onSortChange: (sort: SortBy) => void
  userId: Id<"users">
}

export function PaperSessionsList({
  sessions,
  filterStatus,
  onFilterChange,
  sortBy,
  onSortChange,
  userId,
}: PaperSessionsListProps) {
  return (
    <div className="space-y-4">
      {/* Filter and Sort Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-shell border border-hairline bg-slate-900/50 p-4">
        <Tabs
          value={filterStatus}
          onValueChange={(value) => onFilterChange(value as FilterStatus)}
        >
          <TabsList className="bg-slate-800/60 border border-hairline">
            <TabsTrigger className="text-interface text-xs" value="all">Semua</TabsTrigger>
            <TabsTrigger className="text-interface text-xs" value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger className="text-interface text-xs" value="completed">Completed</TabsTrigger>
            <TabsTrigger className="text-interface text-xs" value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 text-signal">Urutkan:</span>
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortBy)}>
            <SelectTrigger className="w-[160px] rounded-action border-hairline bg-slate-900 text-interface text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-hairline bg-slate-900 text-interface text-xs">
              <SelectItem value="updatedAt">Terakhir Diubah</SelectItem>
              <SelectItem value="createdAt">Tanggal Dibuat</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <EmptyFilterState filterStatus={filterStatus} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <PaperSessionCard
              key={session._id}
              session={session}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyFilterState({ filterStatus }: { filterStatus: FilterStatus }) {
  const messages: Record<FilterStatus, string> = {
    all: "Belum ada paper sessions.",
    in_progress: "Tidak ada paper yang sedang dikerjakan.",
    completed: "Belum ada paper yang selesai.",
    archived: "Tidak ada paper yang diarsipkan.",
  }

  return (
    <div className="text-center py-12 text-slate-500 rounded-shell border border-hairline bg-slate-900/50">
      <p className="text-interface text-xs">{messages[filterStatus]}</p>
      {filterStatus === "all" && <PaperSessionsEmpty />}
    </div>
  )
}
