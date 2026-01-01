"use client"

import React, { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { PaperSessionsList } from "./PaperSessionsList"
import { PaperSessionsEmpty } from "./PaperSessionsEmpty"
import { Skeleton } from "@/components/ui/skeleton"

type FilterStatus = "all" | "in_progress" | "completed" | "archived"
type SortBy = "updatedAt" | "createdAt"

export function PaperSessionsContainer() {
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [sortBy, setSortBy] = useState<SortBy>("updatedAt")

  // Query dengan filter yang sesuai
  const includeArchived = filterStatus === "archived"
  const queryStatus = filterStatus === "archived" ? "all" : filterStatus

  const sessions = useQuery(
    api.paperSessions.getByUserWithFilter,
    user
      ? {
          userId: user._id,
          status: queryStatus,
          includeArchived,
          sortBy,
        }
      : "skip"
  )

  // Loading state
  if (isUserLoading || sessions === undefined) {
    return <PaperSessionsContainerSkeleton />
  }

  // User not authenticated
  if (!user) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Silakan login untuk melihat paper sessions kamu.
      </div>
    )
  }

  // Filter archived sessions if showing archived tab
  const filteredSessions =
    filterStatus === "archived"
      ? sessions.filter((s) => s.archivedAt !== undefined)
      : sessions

  // Empty state
  if (filteredSessions.length === 0 && filterStatus === "all") {
    return <PaperSessionsEmpty />
  }

  return (
    <PaperSessionsList
      sessions={filteredSessions}
      filterStatus={filterStatus}
      onFilterChange={setFilterStatus}
      sortBy={sortBy}
      onSortChange={setSortBy}
      userId={user._id}
    />
  )
}

function PaperSessionsContainerSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter tabs skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-xl p-6 space-y-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-9" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
