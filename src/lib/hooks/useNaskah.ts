"use client"

import { useMutation, useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { deriveNaskahUpdatePending } from "@/lib/naskah/updatePending"
import type {
  NaskahCompiledSnapshot,
  NaskahSection,
  NaskahSourceArtifactRef,
} from "@/lib/naskah/types"

type NaskahSnapshotRecord = NaskahCompiledSnapshot & {
  revision: number
}

function normalizeSnapshot(
  snapshot: unknown,
): NaskahSnapshotRecord | null | undefined {
  if (snapshot === undefined) return undefined
  if (snapshot === null) return null
  const record = snapshot as NaskahCompiledSnapshot & {
    revision: number
    sections: unknown
    sourceArtifactRefs: unknown
  }
  return {
    ...record,
    sections: record.sections as NaskahSection[],
    sourceArtifactRefs: record.sourceArtifactRefs as NaskahSourceArtifactRef[],
  } as NaskahSnapshotRecord
}

export function useNaskah(sessionId?: Id<"paperSessions">) {
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const canQuery = Boolean(sessionId && user?._id && !isUserLoading)

  const availability = useQuery(
    api.naskah.getAvailability,
    canQuery && sessionId ? { sessionId } : "skip",
  )
  const latestSnapshot = useQuery(
    api.naskah.getLatestSnapshot,
    canQuery && sessionId ? { sessionId } : "skip",
  )
  const viewState = useQuery(
    api.naskah.getViewState,
    canQuery && sessionId ? { sessionId } : "skip",
  )

  // Viewed-revision snapshot: only fetch when the user has a recorded
  // lastViewedRevision. On first visit (viewState === null), this query
  // is skipped and the route falls back to latestSnapshot for display
  // while firing markViewed as a bootstrap side effect. See D-018 and
  // the NaskahConversationPage useEffect for the full flow.
  const viewedRevision =
    viewState && typeof viewState.lastViewedRevision === "number"
      ? viewState.lastViewedRevision
      : undefined
  const viewedSnapshot = useQuery(
    api.naskah.getSnapshotByRevision,
    canQuery && sessionId && viewedRevision != null
      ? { sessionId, revision: viewedRevision }
      : "skip",
  )

  const markViewedMutation = useMutation(api.naskah.markViewed)

  const normalizedLatestSnapshot = normalizeSnapshot(latestSnapshot)
  const normalizedViewedSnapshot = normalizeSnapshot(viewedSnapshot)

  const updatePending = deriveNaskahUpdatePending({
    latestRevision: normalizedLatestSnapshot?.revision,
    viewedRevision: viewState?.lastViewedRevision,
  })

  const markViewed = async () => {
    if (
      !sessionId ||
      !user?._id ||
      normalizedLatestSnapshot?.revision == null
    ) {
      return
    }
    return await markViewedMutation({
      sessionId,
      revision: normalizedLatestSnapshot.revision,
    })
  }

  // Loading gate: wait for the three always-issued queries. viewedSnapshot
  // is conditional (only fires when viewedRevision is set), so it is only
  // part of the loading gate when the conditional is active.
  const viewedSnapshotPending =
    canQuery && viewedRevision != null && viewedSnapshot === undefined
  const isLoading =
    isUserLoading ||
    (canQuery &&
      (availability === undefined ||
        latestSnapshot === undefined ||
        viewState === undefined ||
        viewedSnapshotPending))

  return {
    availability,
    latestSnapshot: normalizedLatestSnapshot,
    viewedSnapshot: normalizedViewedSnapshot,
    viewState,
    updatePending,
    markViewed,
    isLoading,
  }
}
