import { describe, it, expect } from "vitest"
import type { Spec } from "@json-render/core"
import {
  parseJsonRendererChoicePayload,
  cloneSpecWithReadOnlyState,
  normalizeChoiceSpec,
  type JsonRendererChoicePayload,
} from "../choice-payload"

// ---------------------------------------------------------------------------
// Fixture: minimal valid payload
// ---------------------------------------------------------------------------

function makeValidPayload(): JsonRendererChoicePayload {
  return {
    version: 1,
    engine: "json-render",
    stage: "gagasan",
    kind: "single-select",
    spec: {
      root: "shell",
      elements: {
        shell: {
          type: "ChoiceCardShell",
          props: { title: "Arah Gagasan Penelitian" },
          children: ["opt-a", "opt-b", "submit"],
        },
        "opt-a": {
          type: "ChoiceOptionButton",
          props: {
            optionId: "fokus-berpikir-kritis",
            label: "Fokus berpikir kritis",
          },
          children: [],
          on: {
            press: {
              action: "setState",
              params: {
                path: "/selection/selectedOptionId",
                value: "fokus-berpikir-kritis",
              },
            },
          },
        },
        "opt-b": {
          type: "ChoiceOptionButton",
          props: {
            optionId: "studi-kasus-lokal",
            label: "Studi kasus lokal",
            recommended: true,
          },
          children: [],
          on: {
            press: {
              action: "setState",
              params: {
                path: "/selection/selectedOptionId",
                value: "studi-kasus-lokal",
              },
            },
          },
        },
        submit: {
          type: "ChoiceSubmitButton",
          props: { label: "Lanjutkan" },
          children: [],
          on: {
            press: {
              action: "submitChoice",
              params: {
                selectedOptionId: { $state: "/selection/selectedOptionId" },
                customText: { $state: "/selection/customText" },
              },
            },
          },
        },
      },
    },
    initialState: {
      selection: { selectedOptionId: null, customText: "" },
    },
    options: [
      { id: "fokus-berpikir-kritis", label: "Fokus berpikir kritis" },
      { id: "studi-kasus-lokal", label: "Studi kasus lokal" },
    ],
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseJsonRendererChoicePayload", () => {
  it("accepts a valid payload", () => {
    const payload = makeValidPayload()
    const result = parseJsonRendererChoicePayload(payload)
    expect(result.version).toBe(1)
    expect(result.engine).toBe("json-render")
    expect(result.stage).toBe("gagasan")
    expect(result.options).toHaveLength(2)
  })

  it("rejects payload with invalid version (2)", () => {
    const payload = makeValidPayload()
    ;(payload as Record<string, unknown>).version = 2
    expect(() => parseJsonRendererChoicePayload(payload)).toThrow()
  })

  it('rejects payload with unknown stage ("invalid")', () => {
    const payload = makeValidPayload()
    ;(payload as Record<string, unknown>).stage = "invalid"
    expect(() => parseJsonRendererChoicePayload(payload)).toThrow()
  })

  it("rejects payload with missing root element in spec", () => {
    const payload = makeValidPayload()
    payload.spec.root = "nonexistent"
    expect(() => parseJsonRendererChoicePayload(payload)).toThrow()
  })
})

describe("cloneSpecWithReadOnlyState", () => {
  it('disables submit button, changes label to "Sudah dikirim", removes on', () => {
    const payload = makeValidPayload()
    const readOnly = cloneSpecWithReadOnlyState(payload.spec)

    const submit = readOnly.elements["submit"]
    expect(submit).toBeDefined()
    expect((submit.props as Record<string, unknown>).disabled).toBe(true)
    expect((submit.props as Record<string, unknown>).label).toBe(
      "Sudah dikirim"
    )
    expect((submit as Record<string, unknown>).on).toBeUndefined()
  })

  it("disables option buttons, removes on", () => {
    const payload = makeValidPayload()
    const readOnly = cloneSpecWithReadOnlyState(payload.spec)

    const optA = readOnly.elements["opt-a"]
    expect(optA).toBeDefined()
    expect((optA.props as Record<string, unknown>).disabled).toBe(true)
    expect((optA as Record<string, unknown>).on).toBeUndefined()

    const optB = readOnly.elements["opt-b"]
    expect(optB).toBeDefined()
    expect((optB.props as Record<string, unknown>).disabled).toBe(true)
    expect((optB as Record<string, unknown>).on).toBeUndefined()
  })
})

describe("normalizeChoiceSpec", () => {
  it("injects a default submit button when the spec is missing one", () => {
    const payload = makeValidPayload()
    delete payload.spec.elements.submit
    payload.spec.elements.shell.children = ["opt-a", "opt-b"]

    const normalized = normalizeChoiceSpec(payload.spec as unknown as Spec) as typeof payload.spec
    const root = normalized.elements[normalized.root] as typeof payload.spec.elements.shell

    expect(root.children).toHaveLength(3)
    const submitId = root.children[2]
    expect(normalized.elements[submitId].type).toBe("ChoiceSubmitButton")
    expect((normalized.elements[submitId].props as Record<string, unknown>).label).toBe("Lanjutkan")
  })

  it("fills initial selection when missing", () => {
    const payload = makeValidPayload()
    const normalized = normalizeChoiceSpec({
      ...payload.spec,
      state: {
        selection: {
          selectedOptionId: null,
          customText: "",
        },
      },
    } as unknown as import("@json-render/core").Spec & { state: unknown }) as typeof payload.spec & {
      state?: {
        selection?: {
          selectedOptionId?: string | null
        }
      }
    }

    expect(normalized.state?.selection?.selectedOptionId).toBe("opt-b")
  })
})
