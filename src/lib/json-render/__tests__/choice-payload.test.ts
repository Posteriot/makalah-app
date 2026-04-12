import { describe, it, expect } from "vitest"
import {
  parseJsonRendererChoicePayload,
  parseChoiceSpecForRender,
  cloneSpecWithReadOnlyState,
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
          props: { title: "Arah Gagasan Penelitian", workflowAction: "continue_discussion" },
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

describe("parseJsonRendererChoicePayload — workflowAction contract", () => {
  it("accepts payload with workflowAction in ChoiceCardShell props", () => {
    const payload = makeValidPayload()
    ;(payload.spec.elements["shell"].props as Record<string, unknown>).workflowAction = "finalize_stage"
    const result = parseJsonRendererChoicePayload(payload)
    expect((result.spec.elements["shell"].props as Record<string, unknown>).workflowAction).toBe("finalize_stage")
  })

  it("rejects payload without workflowAction in ChoiceCardShell props (emit contract stays strict)", () => {
    const payload = makeValidPayload()
    delete (payload.spec.elements["shell"].props as Record<string, unknown>).workflowAction
    expect(() => parseJsonRendererChoicePayload(payload)).toThrow()
  })

  it("accepts legacy render spec without workflowAction when decisionMode exists", () => {
    const payload = makeValidPayload()
    delete (payload.spec.elements["shell"].props as Record<string, unknown>).workflowAction
    ;(payload.spec.elements["shell"].props as Record<string, unknown>).decisionMode = "exploration"

    const result = parseChoiceSpecForRender(payload.spec)
    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error("expected legacy render spec to parse")
    }
    expect(result.spec.elements.shell.props).toMatchObject({
      title: "Arah Gagasan Penelitian",
      decisionMode: "exploration",
    })
    expect((result.spec.elements.shell.props as Record<string, unknown>).workflowAction).toBeUndefined()
    expect(result.contractVersion).toBe("legacy-render")
  })

  it("accepts legacy render spec without workflowAction and without decisionMode via conservative shim", () => {
    const payload = makeValidPayload()
    delete (payload.spec.elements["shell"].props as Record<string, unknown>).workflowAction

    const result = parseChoiceSpecForRender(payload.spec)
    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error("expected conservative legacy render shim to parse")
    }
    expect(result.spec.elements.shell.props).toMatchObject({
      title: "Arah Gagasan Penelitian",
    })
    expect((result.spec.elements.shell.props as Record<string, unknown>).workflowAction).toBeUndefined()
    expect(result.contractVersion).toBe("legacy-render")
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
