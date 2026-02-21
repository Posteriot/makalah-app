import type { Doc } from "@convex/_generated/dataModel"

export type BlogPost = Doc<"blogSections"> & { coverImageUrl?: string | null }

export const CATEGORY_OPTIONS = ["Semua", "Update", "Tutorial", "Opini", "Event"] as const
export type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]
export type CanonicalCategory = Exclude<CategoryFilter, "Semua">

export const TIME_RANGE_OPTIONS = [
  { id: "all", label: "Semua" },
  { id: "7d", label: "7 hari" },
  { id: "30d", label: "30 hari" },
  { id: "90d", label: "90 hari" },
  { id: "year", label: "Tahun ini" },
] as const
export type TimeRangeFilter = (typeof TIME_RANGE_OPTIONS)[number]["id"]

export const SORT_OPTIONS = [
  { id: "newest", label: "Terbaru" },
  { id: "oldest", label: "Terlama" },
] as const
export type SortFilter = (typeof SORT_OPTIONS)[number]["id"]
