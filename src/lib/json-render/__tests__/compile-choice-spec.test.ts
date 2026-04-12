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
    } as Parameters<typeof compileChoiceSpec>[0] & { workflowAction: string })
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
})
