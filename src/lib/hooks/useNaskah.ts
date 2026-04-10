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
    canQuery && sessionId && user?._id
      ? { sessionId, userId: user._id }
      : "skip",
  )

  const markViewedMutation = useMutation(api.naskah.markViewed)

  const normalizedLatestSnapshot = latestSnapshot
    ? ({
        ...latestSnapshot,
        sections: latestSnapshot.sections as NaskahSection[],
        sourceArtifactRefs:
          latestSnapshot.sourceArtifactRefs as NaskahSourceArtifactRef[],
      } as NaskahSnapshotRecord)
    : latestSnapshot

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
      userId: user._id,
      revision: normalizedLatestSnapshot.revision,
    })
  }

  return {
    availability,
    latestSnapshot: normalizedLatestSnapshot,
    viewState,
    updatePending,
    markViewed,
    isLoading:
      isUserLoading ||
      (canQuery &&
        (availability === undefined ||
          latestSnapshot === undefined ||
          viewState === undefined)),
  }
}
