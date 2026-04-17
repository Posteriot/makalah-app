import { describe, it, expect } from "vitest"
import { compileChoiceSpec } from "../compile-choice-spec"

describe("compileChoiceSpec", () => {
  it("compiles a basic choice spec", () => {
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Arah Gagasan Penelitian",
      options: [
        { id: "fokus-berpikir-kritis", label: "Fokus berpikir kritis" },
        { id: "pendekatan-kolaboratif", label: "Pendekatan kolaboratif" },
      ],
      recommendedId: "fokus-berpikir-kritis",
      appendValidationOption: true,
    })
    expect(result.spec.root).toBe("gagasan-choice-card")
    expect(result.normalizedOptions.length).toBe(3) // 2 + validation
    expect(result.normalizedOptions[2].id).toBe("sudah-cukup-lanjut-validasi")
    const root = result.spec.elements[result.spec.root]
    expect(root.type).toBe("ChoiceCardShell")
    expect(root.children.length).toBe(4) // 3 options + 1 submit
  })

  it("normalizes option IDs via slugify", () => {
    const result = compileChoiceSpec({
      stage: "topik",
      kind: "single-select",
      title: "Fokus Topik",
      options: [
        { id: "Opsi Satu", label: "Opsi Satu" },
        { id: "Opsi Dua", label: "Opsi Dua" },
      ],
      appendValidationOption: false,
    })
    expect(result.normalizedOptions[0].id).toBe("opsi-satu")
    expect(result.normalizedOptions[1].id).toBe("opsi-dua")
  })

  it("deduplicates colliding IDs", () => {
    const result = compileChoiceSpec({
      stage: "outline",
      kind: "single-select",
      title: "Struktur Outline",
      options: [
        { id: "opsi", label: "Opsi A" },
        { id: "opsi", label: "Opsi B" },
      ],
      appendValidationOption: false,
    })
    const ids = result.normalizedOptions.map((o) => o.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("skips validation option when appendValidationOption is false", () => {
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Test",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      appendValidationOption: false,
    })
    expect(
      result.normalizedOptions.every(
        (o) => o.id !== "sudah-cukup-lanjut-validasi"
      )
    ).toBe(true)
  })

  it("marks recommended option in spec", () => {
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Test",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      recommendedId: "a",
      appendValidationOption: false,
    })
    const optionA = result.spec.elements["a"]
    expect((optionA.props as Record<string, unknown>).recommended).toBe(true)
    expect((optionA.props as Record<string, unknown>).selected).toBe(true)
    const optionB = result.spec.elements["b"]
    expect((optionB.props as Record<string, unknown>).recommended).toBe(false)
    expect((optionB.props as Record<string, unknown>).selected).toBe(false)
  })

  it("uses custom submitLabel", () => {
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Test",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      submitLabel: "Pilih fokus",
      appendValidationOption: false,
    })
    const submit = result.spec.elements["gagasan-choice-submit"]
    expect((submit.props as Record<string, unknown>).label).toBe("Pilih fokus")
  })

  it("detects validation-like options and replaces them", () => {
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Test",
      options: [
        { id: "a", label: "A" },
        { id: "setuju-lanjutkan", label: "Setuju, lanjutkan" },
      ],
      appendValidationOption: true,
    })
    // The validation-like option should be replaced, not duplicated
    const validationOptions = result.normalizedOptions.filter(
      (o) => o.id === "sudah-cukup-lanjut-validasi"
    )
    expect(validationOptions.length).toBe(1)
    expect(validationOptions[0].label).toBe("Sudah cukup, lanjut validasi")
  })

  it("propagates workflowAction into ChoiceCardShell props when provided", () => {
    // This test will FAIL until Task 2 adds workflowAction support to compileChoiceSpec.
    // For now it documents the expected contract.
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Test",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      appendValidationOption: false,
      workflowAction: "continue_discussion",
    })
    const root = result.spec.elements[result.spec.root]
    expect((root.props as Record<string, unknown>).workflowAction).toBe("continue_discussion")
  })

  it("does not set recommended to validation option", () => {
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Test",
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      recommendedId: "sudah-cukup-lanjut-validasi",
      appendValidationOption: true,
    })
    // Should fall back to first non-validation option
    const optionA = result.spec.elements["a"]
    expect((optionA.props as Record<string, unknown>).recommended).toBe(true)
  })

  // ────────────────────────────────────────────────────────────────
  // Iteration 7 — fallback choice card was rendered unclickable in
  // test-4 rerun. Three bugs:
  //   1. Option press action emitted params.path (AI SDK built-in
  //      setState reads params.statePath → no-op → UI never
  //      updates selectedOptionId → submit returns early)
  //   2. /\blanjut(kan)?/i in VALIDATION_PATTERNS stripped an
  //      option like "Lanjutkan diskusi" entirely, leaving only
  //      the appended validation option.
  //   3. workflowAction was not accepted on shell → spec failed
  //      the strict (v2) schema and fell back to legacy-render.
  // ────────────────────────────────────────────────────────────────

  it("emits setState action with params.statePath (not params.path) for option buttons", async () => {
    // AI SDK / @json-render built-in setState reads resolved.params.statePath.
    // Emitting params.path produces a silent no-op at click time.
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Test",
      options: [
        { id: "foo", label: "Foo" },
        { id: "bar", label: "Bar" },
      ],
      appendValidationOption: false,
    })
    const fooOption = result.spec.elements["foo"] as {
      on?: { press?: { action?: string; params?: Record<string, unknown> } }
    }
    expect(fooOption.on?.press?.action).toBe("toggleOption")
    expect(fooOption.on?.press?.params?.optionId).toBe("foo")
  })

  it('keeps a plain "Lanjutkan diskusi" option (not a validation option)', async () => {
    // Regression for iteration-7 test-4 bug: /\blanjut(kan)?/i was too
    // broad and swallowed legitimate "continue discussion" options.
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Apa langkah selanjutnya?",
      options: [
        { id: "lanjutkan-diskusi", label: "Lanjutkan diskusi" },
      ],
      recommendedId: "lanjutkan-diskusi",
      appendValidationOption: true,
    })
    // Two options expected: the original discussion option + the appended
    // validation option. NOT one option.
    expect(result.normalizedOptions).toHaveLength(2)
    const ids = result.normalizedOptions.map((o) => o.id)
    expect(ids).toContain("lanjutkan-diskusi")
    expect(ids).toContain("sudah-cukup-lanjut-validasi")
    // Original discussion option should be present in the spec elements.
    expect(result.spec.elements["lanjutkan-diskusi"]).toBeDefined()
    const discussionOption = result.spec.elements["lanjutkan-diskusi"] as {
      type?: string
    }
    expect(discussionOption.type).toBe("ChoiceOptionButton")
  })

  it("recommends the discussion option (not the appended validation option)", async () => {
    // With the regex fix, resolvedRecommended should land on
    // "lanjutkan-diskusi" itself, so the user sees the non-validation
    // option pre-selected as the recommendation.
    const result = compileChoiceSpec({
      stage: "gagasan",
      kind: "single-select",
      title: "Apa langkah selanjutnya?",
      options: [
        { id: "lanjutkan-diskusi", label: "Lanjutkan diskusi" },
      ],
      recommendedId: "lanjutkan-diskusi",
      appendValidationOption: true,
    })
    const discussionOption = result.spec.elements["lanjutkan-diskusi"] as {
      props?: { recommended?: boolean; selected?: boolean }
    }
    expect(discussionOption.props?.recommended).toBe(true)
    expect(discussionOption.props?.selected).toBe(true)
    const validationOption = result.spec.elements["sudah-cukup-lanjut-validasi"] as {
      props?: { recommended?: boolean }
    }
    expect(validationOption.props?.recommended).toBe(false)
  })
})
