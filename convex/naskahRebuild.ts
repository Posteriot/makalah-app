import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  STAGE_ORDER,
  type PaperStageId,
} from "./paperSessions/constants";
import { compileNaskahSnapshot } from "../src/lib/naskah/compiler";
import type {
  NaskahArtifactRecord,
  NaskahCompiledSnapshot,
  NaskahSection,
} from "../src/lib/naskah/types";

/**
 * rebuildNaskahSnapshot — wraps the pure compiler with Convex ctx and
 * persists a new `naskahSnapshots` row when the compiled output meaningfully
 * changes vs the previous snapshot.
 *
 * Called from the tail of `approveStage` and `rewindToStage` in
 * `convex/paperSessions.ts`. The mutation handler is the only rebuild
 * trigger; this helper does NOT do its own auth check (the calling
 * mutation already verified ownership).
 *
 * Returns:
 *   - `{ written: true, revision }` when a new row was inserted
 *   - `{ written: false, revision }` when the new compile matches the
 *     latest existing snapshot (no insert)
 *
 * Errors propagate. The Convex transaction wrapping the calling mutation
 * will roll back the entire mutation (including the prior db.patch on the
 * session) if rebuild fails. This is intentional: a stale snapshot is
 * worse than a failed approval.
 */
export async function rebuildNaskahSnapshot(
  ctx: MutationCtx,
  sessionId: Id<"paperSessions">,
): Promise<{ written: boolean; revision: number | null }> {
  const session = await ctx.db.get(sessionId);
  if (!session) {
    // Should never happen — caller verified the session exists. Defensive
    // no-op rather than throw, since this would only fire on a race the
    // calling mutation already protects against.
    return { written: false, revision: null };
  }

  // Build artifactsById by fetching every validated stage's artifact
  // exactly once. The rebuild does NOT pre-filter on invalidatedAt or
  // empty content — it just collects raw inputs and lets the pure
  // compiler decide eligibility and fallback semantics.
  const stageData = (session as { stageData?: Record<string, unknown> })
    .stageData as Record<string, Record<string, unknown> | undefined> | undefined;
  const artifactsById: Record<string, NaskahArtifactRecord> = {};

  if (stageData) {
    for (const stage of STAGE_ORDER) {
      const stageObj = stageData[stage as PaperStageId];
      if (!stageObj) continue;
      if (typeof stageObj.validatedAt !== "number") continue;
      const artifactId = stageObj.artifactId;
      if (typeof artifactId !== "string") continue;

      const artifact = await ctx.db.get(artifactId as Id<"artifacts">);
      if (!artifact) continue;

      artifactsById[artifactId] = {
        _id: artifactId,
        content:
          typeof (artifact as { content?: unknown }).content === "string"
            ? ((artifact as { content: string }).content)
            : "",
        format: (artifact as { format?: NaskahArtifactRecord["format"] }).format,
        invalidatedAt: (artifact as { invalidatedAt?: number }).invalidatedAt,
        title: (artifact as { title?: string }).title,
      };
    }
  }

  const compiled = compileNaskahSnapshot({
    stageData: stageData ?? {},
    artifactsById,
    paperTitle:
      (session as { paperTitle?: string | null }).paperTitle ?? null,
    workingTitle:
      (session as { workingTitle?: string | null }).workingTitle ?? null,
  });

  // Look up the latest snapshot for hash comparison.
  const latest = await ctx.db
    .query("naskahSnapshots")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .order("desc")
    .first();

  const newHash = hashCompiledSnapshot(compiled);

  if (latest) {
    const latestHash = hashCompiledSnapshot({
      title: latest.title,
      sections: latest.sections as NaskahSection[],
    });
    if (latestHash === newHash) {
      return { written: false, revision: latest.revision };
    }
  }

  const newRevision = (latest?.revision ?? 0) + 1;

  await ctx.db.insert("naskahSnapshots", {
    sessionId,
    revision: newRevision,
    compiledAt: Date.now(),
    status: compiled.status,
    title: compiled.title,
    titleSource: compiled.titleSource,
    sections: compiled.sections,
    pageEstimate: compiled.pageEstimate,
    sourceArtifactRefs: compiled.sourceArtifactRefs.map((ref) => ({
      ...ref,
      // sourceArtifactRefs[].artifactId is typed as string in the pure
      // compiler but the Convex schema validator expects Id<"artifacts">.
      // The compiler always passes through whatever was on stageData, so
      // the round-trip is safe at runtime.
      artifactId: ref.artifactId as Id<"artifacts"> | undefined,
    })),
    isAvailable: compiled.isAvailable,
    reasonIfUnavailable: compiled.reasonIfUnavailable,
  });

  return { written: true, revision: newRevision };
}

// ────────────────────────────────────────────────────────────────────────────
// Hash function — FNV-1a over a canonical JSON serialization of the
// snapshot fields that participate in dedupe.
//
// Per implementation plan Task 3 Step 3, dedupe is based on `title + sections`
// only. `sourceArtifactRefs` provenance data is persisted on every snapshot
// row for traceability but MUST NOT participate in hash comparison — otherwise
// a pure provenance change (e.g., revisionCount bump on a winning ref with
// byte-identical content) would create a new revision and surface as a user-
// visible `update pending` notification for something the user cannot see.
// ────────────────────────────────────────────────────────────────────────────

type HashableSnapshot = Pick<NaskahCompiledSnapshot, "title" | "sections">;

function hashCompiledSnapshot(snapshot: HashableSnapshot): string {
  const canonical = JSON.stringify({
    title: snapshot.title,
    sections: snapshot.sections.map((section) => ({
      key: section.key,
      label: section.label,
      content: section.content,
      sourceStage: section.sourceStage,
      sourceArtifactId: section.sourceArtifactId ?? null,
    })),
  });

  let h = 2166136261;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
