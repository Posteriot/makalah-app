import { describe, expect, it } from "vitest"
import {
  normalizeDescription,
  sanitizeToolStates,
  buildClientSnapshot,
} from "@/lib/technical-report/payload"

describe("technical-report payload guards", () => {
  it("normalizes and trims description", () => {
    expect(normalizeDescription("  error tool  ")).toBe("error tool")
  })

  it("rejects empty description", () => {
    expect(() => normalizeDescription("   ")).toThrow("Deskripsi laporan wajib diisi.")
  })

  it("caps tool state item count", () => {
    const states = Array.from({ length: 12 }).map((_, i) => ({
      toolName: `tool-${i}`,
      state: "error",
      errorText: "gagal",
    }))

    expect(sanitizeToolStates(states)).toHaveLength(8)
  })

  it("removes undefined snapshot keys", () => {
    const snapshot = buildClientSnapshot({
      routePath: "/chat/abc",
      chatStatus: "error",
      model: undefined,
      toolStates: [],
    })

    expect(snapshot).toEqual({
      routePath: "/chat/abc",
      chatStatus: "error",
    })
  })
})
