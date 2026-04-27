import { describe, expect, it, vi } from "vitest"
import { maybeEmitGuaranteedChoiceSpec } from "./orchestrator"
import { SPEC_DATA_PART_TYPE } from "@json-render/core"
import type { Spec } from "@json-render/core"

// ────────────────────────────────────────────────────────────────
// Regression test: search-turn fallback choice card reaches live stream
//
// Bug: When the compose model did NOT emit a YAML choice card, the
// deterministic fallback was only persisted to DB (via onFinish) but
// never emitted to the live stream. The client missed the choice card
// until a full page refresh rehydrated it from history.
//
// Fix: maybeEmitGuaranteedChoiceSpec emits a SPEC_DATA_PART_TYPE chunk
// to the writer inside the orchestrator's finish handler, BEFORE the
// finish chunk is forwarded.
// ────────────────────────────────────────────────────────────────

function createFallbackSpec(): Spec {
  return {
    root: "gagasan-choice-card",
    elements: {
      "gagasan-choice-card": {
        type: "ChoiceCardShell",
        props: { title: "Bagaimana kita akan melanjutkan?" },
        children: ["lanjutkan-diskusi", "gagasan-choice-submit"],
      },
      "lanjutkan-diskusi": {
        type: "ChoiceOptionButton",
        props: { optionId: "lanjutkan-diskusi", label: "Lanjutkan diskusi", recommended: true, selected: true, disabled: false },
        children: [],
        on: { press: { action: "toggleOption", params: { optionId: "lanjutkan-diskusi", currentSelectedId: { $state: "/selection/selectedOptionId" } } } },
      },
      "gagasan-choice-submit": {
        type: "ChoiceSubmitButton",
        props: { label: "Lanjutkan", disabled: false },
        children: [],
        on: { press: { action: "submitChoice", params: { selectedOptionId: { $state: "/selection/selectedOptionId" }, customText: { $state: "/selection/customText" } } } },
      },
    },
  } as unknown as Spec
}

describe("maybeEmitGuaranteedChoiceSpec", () => {
  it("emits SPEC_DATA_PART_TYPE when model did not produce a choice spec", () => {
    const writer = { write: vi.fn() }
    const fallbackSpec = createFallbackSpec()
    const compileGuaranteedChoiceSpec = vi.fn().mockReturnValue(fallbackSpec)

    const result = maybeEmitGuaranteedChoiceSpec({
      capturedChoiceSpec: null,
      compileGuaranteedChoiceSpec,
      currentStage: "gagasan",
      writer,
    })

    // Callback was invoked
    expect(compileGuaranteedChoiceSpec).toHaveBeenCalledOnce()

    // Writer received SPEC_DATA_PART_TYPE chunk
    expect(writer.write).toHaveBeenCalledOnce()
    expect(writer.write).toHaveBeenCalledWith({
      type: SPEC_DATA_PART_TYPE,
      data: { type: "flat", spec: fallbackSpec },
    })

    // Returns the spec for capturedChoiceSpec assignment
    expect(result).toBe(fallbackSpec)
  })

  it("emits SPEC_DATA_PART_TYPE when capturedChoiceSpec has no root", () => {
    const writer = { write: vi.fn() }
    const fallbackSpec = createFallbackSpec()
    const compileGuaranteedChoiceSpec = vi.fn().mockReturnValue(fallbackSpec)

    // Spec captured but root is empty — model produced partial/broken spec
    const result = maybeEmitGuaranteedChoiceSpec({
      capturedChoiceSpec: { root: "", elements: {} } as Spec,
      compileGuaranteedChoiceSpec,
      currentStage: "gagasan",
      writer,
    })

    expect(compileGuaranteedChoiceSpec).toHaveBeenCalledOnce()
    expect(writer.write).toHaveBeenCalledOnce()
    expect(result).toBe(fallbackSpec)
  })

  it("does NOT emit when model already produced a valid choice spec", () => {
    const writer = { write: vi.fn() }
    const modelSpec = createFallbackSpec()
    const compileGuaranteedChoiceSpec = vi.fn()

    const result = maybeEmitGuaranteedChoiceSpec({
      capturedChoiceSpec: modelSpec,
      compileGuaranteedChoiceSpec,
      currentStage: "gagasan",
      writer,
    })

    // Callback was NOT invoked — model spec is valid
    expect(compileGuaranteedChoiceSpec).not.toHaveBeenCalled()
    expect(writer.write).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it("does NOT emit when no compileGuaranteedChoiceSpec callback is provided", () => {
    const writer = { write: vi.fn() }

    const result = maybeEmitGuaranteedChoiceSpec({
      capturedChoiceSpec: null,
      compileGuaranteedChoiceSpec: undefined,
      currentStage: "gagasan",
      writer,
    })

    expect(writer.write).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it("does NOT emit when callback returns undefined", () => {
    const writer = { write: vi.fn() }
    const compileGuaranteedChoiceSpec = vi.fn().mockReturnValue(undefined)

    const result = maybeEmitGuaranteedChoiceSpec({
      capturedChoiceSpec: null,
      compileGuaranteedChoiceSpec,
      currentStage: "gagasan",
      writer,
    })

    expect(compileGuaranteedChoiceSpec).toHaveBeenCalledOnce()
    expect(writer.write).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it("does NOT emit when callback returns spec without root", () => {
    const writer = { write: vi.fn() }
    const badSpec = { root: "", elements: {} } as Spec
    const compileGuaranteedChoiceSpec = vi.fn().mockReturnValue(badSpec)

    const result = maybeEmitGuaranteedChoiceSpec({
      capturedChoiceSpec: null,
      compileGuaranteedChoiceSpec,
      currentStage: "gagasan",
      writer,
    })

    expect(compileGuaranteedChoiceSpec).toHaveBeenCalledOnce()
    expect(writer.write).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })
})
