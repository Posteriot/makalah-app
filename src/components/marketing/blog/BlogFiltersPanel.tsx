"use client"

import { Input } from "@/components/ui/input"
import { Search } from "iconoir-react"
import { cn } from "@/lib/utils"
import {
  CATEGORY_OPTIONS,
  type CategoryFilter,
  type CanonicalCategory,
  SORT_OPTIONS,
  type SortFilter,
  TIME_RANGE_OPTIONS,
  type TimeRangeFilter,
} from "./types"

interface BlogFiltersPanelProps {
  mobile?: boolean
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  categoryFilter: CategoryFilter
  onCategoryFilterChange: (value: CategoryFilter) => void
  timeRangeFilter: TimeRangeFilter
  onTimeRangeFilterChange: (value: TimeRangeFilter) => void
  sortFilter: SortFilter
  onSortFilterChange: (value: SortFilter) => void
  allPostsCount: number
  categoryCounts: Record<CanonicalCategory, number>
}

export function BlogFiltersPanel({
  mobile = false,
  searchQuery,
  onSearchQueryChange,
  categoryFilter,
  onCategoryFilterChange,
  timeRangeFilter,
  onTimeRangeFilterChange,
  sortFilter,
  onSortFilterChange,
  allPostsCount,
  categoryCounts,
}: BlogFiltersPanelProps) {
  const groupClassName = "border-b border-slate-300 dark:border-slate-700 pb-4 last:border-b-0 last:pb-0"

  return (
    <div className={cn("space-y-4", mobile && "px-1 pb-4")}>
      <div className={groupClassName}>
        <p className="text-narrative mb-2 text-sm font-medium text-slate-600 dark:text-slate-200">
          Cari Konten
        </p>
        <div className="relative">
          <Search className="icon-interface absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={searchQuery.trim().length > 0 ? "" : "Cari..."}
            className="blog-neutral-input text-interface h-10 rounded-action border-main border-slate-300 dark:border-slate-600 bg-background pr-3 pl-10 text-xs"
          />
        </div>
      </div>

      <div className={groupClassName}>
        <p className="text-narrative mb-2 text-sm font-medium text-slate-600 dark:text-slate-200">
          Kategori
        </p>
        <div className="grid grid-cols-1 gap-2">
          {CATEGORY_OPTIONS.map((option) => {
            const count = option === "Semua" ? allPostsCount : categoryCounts[option]

            return (
              <button
                key={option}
                type="button"
                onClick={() => onCategoryFilterChange(option)}
                className={cn(
                  "text-interface flex items-center justify-between rounded-action border-main px-3 py-2 text-sm transition-colors",
                  categoryFilter === option
                    ? "border-slate-500 bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                    : "border-border text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-500 hover:text-slate-50"
                )}
              >
                <span>{option}</span>
                <span className="text-[11px]">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={groupClassName}>
        <p className="text-narrative mb-2 text-sm font-medium text-slate-600 dark:text-slate-200">
          Waktu
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TIME_RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onTimeRangeFilterChange(option.id)}
              className={cn(
                "text-interface rounded-action border-main px-3 py-2 text-xs transition-colors",
                timeRangeFilter === option.id
                  ? "border-slate-500 bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                  : "border-border text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-500 hover:text-slate-50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={groupClassName}>
        <p className="text-narrative mb-2 text-sm font-medium text-slate-600 dark:text-slate-200">
          Urutkan
        </p>
        <div className="grid grid-cols-2 gap-2">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSortFilterChange(option.id)}
              className={cn(
                "text-interface rounded-action border-main px-3 py-2 text-xs transition-colors",
                sortFilter === option.id
                  ? "border-slate-500 bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                  : "border-border text-muted-foreground hover:bg-slate-200 dark:hover:bg-slate-500 hover:text-slate-50"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
