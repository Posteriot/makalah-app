import { describe, expect, it } from "vitest"
import type { Id } from "../../../../convex/_generated/dataModel"
import { mapPersistedToSignals, type PersistedArtifact } from "../MessageBubble"

describe("mapPersistedToSignals — recall replay path", () => {
    const makeArtifact = (overrides: Partial<PersistedArtifact> = {}): PersistedArtifact => ({
        _id: "artifact-1" as Id<"artifacts">,
        title: "Test Artifact",
        version: 1,
        ...overrides,
    })

    it("maps recalled artifact to status 'read'", () => {
        const signals = mapPersistedToSignals([
            makeArtifact({ isRecall: true }),
        ])
        expect(signals).toHaveLength(1)
        expect(signals[0].status).toBe("read")
        expect(signals[0].artifactId).toBe("artifact-1")
    })

    it("maps non-recalled artifact to status 'created'", () => {
        const signals = mapPersistedToSignals([
            makeArtifact({ isRecall: false }),
        ])
        expect(signals[0].status).toBe("created")
    })

    it("maps updated artifact (with parentId) to status 'updated'", () => {
        const signals = mapPersistedToSignals([
            makeArtifact({ parentId: "parent-1" as Id<"artifacts"> }),
        ])
        expect(signals[0].status).toBe("updated")
    })

    it("recall takes priority over parentId", () => {
        const signals = mapPersistedToSignals([
            makeArtifact({ isRecall: true, parentId: "parent-1" as Id<"artifacts"> }),
        ])
        expect(signals[0].status).toBe("read")
    })

    it("includes version only when > 1", () => {
        const signals = mapPersistedToSignals([
            makeArtifact({ version: 1 }),
            makeArtifact({ _id: "artifact-2" as Id<"artifacts">, version: 3 }),
        ])
        expect(signals[0].version).toBeUndefined()
        expect(signals[1].version).toBe(3)
    })

    it("handles empty array", () => {
        expect(mapPersistedToSignals([])).toEqual([])
    })

    it("preserves title from persisted artifact", () => {
        const signals = mapPersistedToSignals([
            makeArtifact({ title: "Pemilihan Judul", isRecall: true }),
        ])
        expect(signals[0].title).toBe("Pemilihan Judul")
    })
})
