# Json Renderer V2 — Interactive Choice Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** The model emits interactive choice cards by calling an `emitChoiceCard` tool during phase-one drafting stages (gagasan, topik, outline). Zero extra LLM calls, zero skip logic, zero workflow interference.

**Architecture:** Model calls `emitChoiceCard` tool → tool compiles spec deterministically → stream loop intercepts `tool-output-available` → emits `data-json-renderer-choice` part → frontend renders card → user clicks → interactionEvent sent back → model continues. All naming uses "choice" (not "recommendation") because the card serves recommendations, neutral options, and confirmations.

**Tech Stack:** AI SDK tool calling, `@json-render/core` + `@json-render/react` (v0.14.0, already installed), Convex mutations, shadcn/ui, Zod schemas.

**Design doc:** `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/json-renderer-ui/2026-03-18-json-renderer-v2-design.md`
**Context doc:** `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/json-renderer-ui/2026-03-18-json-renderer-as-model-visual-language.md`
**V1 backup branch:** `backup/json-renderer-v1-before-rollback` (reusable components — rename "Recommendation" → "Choice", state path `/recommendation/` → `/selection/`)
**Rollback tag:** `safe-rollback-pre-jsonrenderer-v2` (commit `be20116c`)

**Baseline health:**
- `npm run typecheck` has 2 pre-existing errors in `ChatInput.mobile-layout.test.tsx` (unrelated, do not fix)
- Dev server starts cleanly
- `@json-render/core` and `@json-render/react` v0.14.0 installed

---

## Layer 1: Foundation (Schema + Payload + Catalog + Submit Contracts)

### Task 1.1: Convex Schema — Add Choice Fields

**Files:**
- Modify: `convex/schema.ts:122-165` (messages table)
- Modify: `convex/messages.ts:89-124` (createMessage mutation)

**Step 1: Add fields to messages table in schema**

In `convex/schema.ts`, add two fields to the `messages` table definition, right after the `reasoningTrace` field block (after line ~165):

```typescript
// Json Renderer V2: persisted choice card payload (JSON string)
jsonRendererChoice: v.optional(v.string()),
// UI message ID for history rehydration
uiMessageId: v.optional(v.string()),
```

Also expand the `metadata` object (line ~129) to include `uiMessageId`:

```typescript
metadata: v.optional(v.object({
    model: v.optional(v.string()),
    tokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    uiMessageId: v.optional(v.string()),
})),
```

**Step 2: Add fields to createMessage mutation args**

In `convex/messages.ts`, add to the `args` object of `createMessage` (line ~90), after `reasoningTrace`:

```typescript
jsonRendererChoice: v.optional(v.string()),
uiMessageId: v.optional(v.string()),
```

Also expand the `metadata` arg to include `uiMessageId`:

```typescript
metadata: v.optional(v.object({
    model: v.optional(v.string()),
    tokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    uiMessageId: v.optional(v.string()),
})),
```

No handler changes needed — `...args` spread already includes any new fields.

**Step 3: Verify schema**

Run: `npx convex dev --typecheck=enable --once`
Expected: Schema validation passes (or "Convex functions ready!" in local dev).

If Convex is not running locally, verify with `npm run typecheck` that no type errors are introduced.

**Step 4: Commit**

```bash
git add convex/schema.ts convex/messages.ts
git commit -m "feat: add jsonRendererChoice + uiMessageId to messages schema"
```

---

### Task 1.2: Choice Payload Schema

**Files:**
- Create: `src/lib/json-render/choice-payload.ts`
- Test: `src/lib/json-render/__tests__/choice-payload.test.ts`

**Step 1: Write the failing test**

Create `src/lib/json-render/__tests__/choice-payload.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  parseJsonRendererChoicePayload,
  cloneSpecWithReadOnlyState,
  type JsonRendererChoicePayload,
} from "../choice-payload"

const validPayload: JsonRendererChoicePayload = {
  version: 1,
  engine: "json-render",
  stage: "gagasan",
  kind: "single-select",
  spec: {
    root: "gagasan-choice-card",
    elements: {
      "gagasan-choice-card": {
        type: "ChoiceCardShell",
        props: { title: "Arah Gagasan Penelitian" },
        children: ["fokus-berpikir-kritis", "gagasan-choice-submit"],
      },
      "fokus-berpikir-kritis": {
        type: "ChoiceOptionButton",
        props: {
          optionId: "fokus-berpikir-kritis",
          label: "Fokus berpikir kritis",
          recommended: true,
          selected: true,
          disabled: false,
        },
        children: [],
        on: {
          press: {
            action: "setState",
            params: {
              statePath: "/selection/selectedOptionId",
              value: "fokus-berpikir-kritis",
            },
          },
        },
      },
      "gagasan-choice-submit": {
        type: "ChoiceSubmitButton",
        props: { label: "Lanjutkan", disabled: false },
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
    selection: { selectedOptionId: "fokus-berpikir-kritis", customText: "" },
  },
  options: [
    { id: "fokus-berpikir-kritis", label: "Fokus berpikir kritis" },
  ],
}

describe("parseJsonRendererChoicePayload", () => {
  it("accepts a valid payload", () => {
    const result = parseJsonRendererChoicePayload(validPayload)
    expect(result.version).toBe(1)
    expect(result.stage).toBe("gagasan")
  })

  it("rejects payload with invalid version", () => {
    expect(() =>
      parseJsonRendererChoicePayload({ ...validPayload, version: 2 })
    ).toThrow()
  })

  it("rejects payload with unknown stage", () => {
    expect(() =>
      parseJsonRendererChoicePayload({ ...validPayload, stage: "invalid" })
    ).toThrow()
  })

  it("rejects payload with missing root element in spec", () => {
    const badSpec = {
      ...validPayload,
      spec: {
        root: "nonexistent",
        elements: validPayload.spec.elements,
      },
    }
    expect(() => parseJsonRendererChoicePayload(badSpec)).toThrow()
  })
})

describe("cloneSpecWithReadOnlyState", () => {
  it("disables all interactive elements", () => {
    const readOnly = cloneSpecWithReadOnlyState(validPayload.spec)
    const submit = readOnly.elements["gagasan-choice-submit"]
    expect(submit.props.disabled).toBe(true)
    expect(submit.props.label).toBe("Sudah dikirim")
    expect(submit.on).toBeUndefined()
  })

  it("disables option buttons", () => {
    const readOnly = cloneSpecWithReadOnlyState(validPayload.spec)
    const option = readOnly.elements["fokus-berpikir-kritis"]
    expect(option.props.disabled).toBe(true)
    expect(option.on).toBeUndefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/json-render/__tests__/choice-payload.test.ts`
Expected: FAIL (module not found)

**Step 3: Write implementation**

Create `src/lib/json-render/choice-payload.ts`. This is adapted from V1's `recommendation-payload.ts` with renaming:

```typescript
import { z } from "zod"

// ── Phase-one stages ──────────────────────────────────────────
const phaseOneStageSchema = z.enum(["gagasan", "topik", "outline"])

// ── Option label ──────────────────────────────────────────────
const optionLabelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

// ── Initial state ─────────────────────────────────────────────
export const choiceInitialStateSchema = z.object({
  selection: z.object({
    selectedOptionId: z.string().nullable(),
    customText: z.string(),
  }),
})

// ── Spec schema building blocks ───────────────────────────────
const stateReferenceSchema = z.object({ $state: z.string().min(1) })
const bindStateSchema = z.object({ $bindState: z.string().min(1) })

const actionParamValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    stateReferenceSchema,
    bindStateSchema,
    z.array(actionParamValueSchema),
    z.record(z.string(), actionParamValueSchema),
  ])
)

const actionInvocationSchema = z
  .object({
    action: z.string().min(1),
    params: z.record(z.string(), actionParamValueSchema).optional(),
  })
  .passthrough()

const eventBindingsSchema = z.record(
  z.string(),
  z.union([actionInvocationSchema, z.array(actionInvocationSchema)])
)

const componentTypeSchema = z.enum([
  "ChoiceCardShell",
  "ChoiceOptionButton",
  "ChoiceTextarea",
  "ChoiceSubmitButton",
])

const choiceElementSchema = z
  .object({
    type: componentTypeSchema,
    props: z.record(z.string(), z.unknown()),
    children: z.array(z.string()),
    on: eventBindingsSchema.optional(),
    watch: z
      .record(
        z.string(),
        z.union([actionInvocationSchema, z.array(actionInvocationSchema)])
      )
      .optional(),
    visible: z.unknown().optional(),
  })
  .passthrough()

// ── Per-component prop schemas (for superRefine validation) ───
const choiceCardShellPropsSchema = z.object({
  title: z.string().min(1),
})

const choiceOptionButtonPropsSchema = z.object({
  optionId: z.string().min(1),
  label: z.string().min(1),
  recommended: z.boolean().optional(),
  selected: z.boolean().optional(),
  disabled: z.boolean().optional(),
})

const choiceTextareaPropsSchema = z.object({
  label: z.string().min(1),
  placeholder: z.string().nullable().optional(),
  value: z.union([z.string(), z.record(z.string(), z.unknown())]).nullable().optional(),
  disabled: z.boolean().optional(),
})

const choiceSubmitButtonPropsSchema = z.object({
  label: z.string().min(1),
  disabled: z.boolean().optional(),
})

const componentPropsSchemaMap = {
  ChoiceCardShell: choiceCardShellPropsSchema,
  ChoiceOptionButton: choiceOptionButtonPropsSchema,
  ChoiceTextarea: choiceTextareaPropsSchema,
  ChoiceSubmitButton: choiceSubmitButtonPropsSchema,
} as const

// ── Spec schema with structural validation ────────────────────
export const choiceSpecSchema = z
  .object({
    root: z.string().min(1),
    elements: z.record(z.string(), choiceElementSchema),
  })
  .superRefine((spec, ctx) => {
    if (!spec.elements[spec.root]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["root"],
        message: "Root must reference an existing element.",
      })
    }

    for (const [elementId, element] of Object.entries(spec.elements)) {
      const propsSchema =
        componentPropsSchemaMap[element.type as keyof typeof componentPropsSchemaMap]
      if (propsSchema) {
        const result = propsSchema.safeParse(element.props)
        if (!result.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["elements", elementId, "props"],
            message: result.error.issues.map((i) => i.message).join("; "),
          })
        }
      }

      for (const childId of element.children) {
        if (!spec.elements[childId]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["elements", elementId, "children"],
            message: `Child '${childId}' not found in spec.`,
          })
        }
      }
    }
  })

// ── Full payload schema ───────────────────────────────────────
export const choicePayloadSchema = z.object({
  version: z.literal(1),
  engine: z.literal("json-render"),
  stage: phaseOneStageSchema,
  kind: z.literal("single-select"),
  spec: choiceSpecSchema,
  initialState: choiceInitialStateSchema,
  options: z.array(optionLabelSchema).min(1).max(7),
})

// ── Types ─────────────────────────────────────────────────────
export type JsonRendererChoicePayload = z.infer<typeof choicePayloadSchema>
export type JsonRendererChoiceSpec = z.infer<typeof choiceSpecSchema>
export type JsonRendererChoiceStage = z.infer<typeof phaseOneStageSchema>

// ── Parse + validate ──────────────────────────────────────────
export function parseJsonRendererChoicePayload(
  payload: unknown
): JsonRendererChoicePayload {
  return choicePayloadSchema.parse(payload)
}

// ── Read-only clone (post-submission) ─────────────────────────
export function cloneSpecWithReadOnlyState(
  spec: JsonRendererChoiceSpec
): JsonRendererChoiceSpec {
  return {
    root: spec.root,
    elements: Object.fromEntries(
      Object.entries(spec.elements).map(([key, element]) => {
        const next = {
          ...element,
          props: { ...(element.props ?? {}) },
        } as typeof element

        if (next.type === "ChoiceOptionButton") {
          delete (next as { on?: unknown }).on
          ;(next.props as Record<string, unknown>).disabled = true
        }

        if (next.type === "ChoiceTextarea") {
          ;(next.props as Record<string, unknown>).disabled = true
        }

        if (next.type === "ChoiceSubmitButton") {
          delete (next as { on?: unknown }).on
          ;(next.props as Record<string, unknown>).disabled = true
          ;(next.props as Record<string, unknown>).label = "Sudah dikirim"
        }

        return [key, next]
      })
    ),
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/json-render/__tests__/choice-payload.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add src/lib/json-render/choice-payload.ts src/lib/json-render/__tests__/choice-payload.test.ts
git commit -m "feat: add choice payload schema with parse and read-only clone"
```

---

### Task 1.3: Component Catalog

**Files:**
- Create: `src/lib/json-render/choice-catalog.ts`

**Step 1: Write implementation**

Create `src/lib/json-render/choice-catalog.ts`. Adapted from V1's `catalog.ts`, renamed from "Recommendation" to "Choice":

```typescript
import { defineCatalog } from "@json-render/core"
import { schema } from "@json-render/react/schema"
import { z } from "zod"

export const choiceCardShellPropsSchema = z.object({
  title: z.string().min(1),
})

export const choiceOptionButtonPropsSchema = z.object({
  optionId: z.string().min(1),
  label: z.string().min(1),
  recommended: z.boolean().optional(),
  selected: z.boolean().optional(),
  disabled: z.boolean().optional(),
})

export const choiceTextareaPropsSchema = z.object({
  label: z.string().min(1),
  placeholder: z.string().nullable().optional(),
  value: z.union([z.string(), z.record(z.string(), z.unknown())]).nullable().optional(),
  disabled: z.boolean().optional(),
})

export const choiceSubmitButtonPropsSchema = z.object({
  label: z.string().min(1),
  disabled: z.boolean().optional(),
})

export const choiceCatalog = defineCatalog(schema, {
  components: {
    ChoiceCardShell: {
      props: choiceCardShellPropsSchema,
      slots: ["default"],
      description:
        "Root container for an interactive choice card. Displays a title and renders children (option buttons, textarea, submit).",
    },
    ChoiceOptionButton: {
      props: choiceOptionButtonPropsSchema,
      description:
        "Selectable option button. Reads selected state from /selection/selectedOptionId. Emits press event to set state.",
    },
    ChoiceTextarea: {
      props: choiceTextareaPropsSchema,
      description:
        "Optional free-text note field. Bind value with $bindState to /selection/customText.",
    },
    ChoiceSubmitButton: {
      props: choiceSubmitButtonPropsSchema,
      description:
        "Submit button for the choice card. Emits press event bound to submitChoice action.",
    },
  },
  actions: {
    submitChoice: {
      params: z.object({
        selectedOptionId: z.string().min(1),
        customText: z.string().nullable().optional(),
      }),
      description:
        "Submit the user's choice for the active paper stage. selectedOptionId is required. customText is optional.",
    },
  },
})

export type ChoiceCatalog = typeof choiceCatalog
```

**Step 2: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors only, no new errors.

**Step 3: Commit**

```bash
git add src/lib/json-render/choice-catalog.ts
git commit -m "feat: add choice card component catalog for json-render registry"
```

---

### Task 1.4: Submit Event Contracts

**Files:**
- Create: `src/lib/chat/choice-submit.ts`
- Create: `src/lib/chat/choice-request.ts`
- Test: `src/lib/chat/__tests__/choice-submit.test.ts`
- Test: `src/lib/chat/__tests__/choice-request.test.ts`

**Step 1: Write the failing tests**

Create `src/lib/chat/__tests__/choice-submit.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  buildChoiceInteractionEvent,
  buildChoiceSyntheticText,
} from "../choice-submit"

describe("buildChoiceInteractionEvent", () => {
  it("builds a valid event", () => {
    const event = buildChoiceInteractionEvent({
      conversationId: "conv-123",
      sourceMessageId: "msg-456",
      choicePartId: "msg-456-json-renderer-choice",
      stage: "gagasan",
      kind: "single-select",
      selectedOptionId: "fokus-berpikir-kritis",
      customText: "Saya ingin fokus pada aspek ini",
    })
    expect(event.type).toBe("paper.choice.submit")
    expect(event.version).toBe(1)
    expect(event.selectedOptionIds).toEqual(["fokus-berpikir-kritis"])
    expect(event.customText).toBe("Saya ingin fokus pada aspek ini")
    expect(event.submittedAt).toBeGreaterThan(0)
  })

  it("omits customText when empty", () => {
    const event = buildChoiceInteractionEvent({
      conversationId: "conv-123",
      sourceMessageId: "msg-456",
      choicePartId: "msg-456-json-renderer-choice",
      stage: "gagasan",
      kind: "single-select",
      selectedOptionId: "fokus-berpikir-kritis",
      customText: "   ",
    })
    expect(event.customText).toBeUndefined()
  })
})

describe("buildChoiceSyntheticText", () => {
  it("builds display text with option label", () => {
    const text = buildChoiceSyntheticText({
      stage: "gagasan",
      selectedOptionId: "fokus-berpikir-kritis",
      selectedLabel: "Fokus berpikir kritis",
    })
    expect(text).toContain("[Choice: gagasan]")
    expect(text).toContain("Pilihan: Fokus berpikir kritis")
  })

  it("includes custom text when provided", () => {
    const text = buildChoiceSyntheticText({
      stage: "gagasan",
      selectedOptionId: "fokus-berpikir-kritis",
      selectedLabel: "Fokus berpikir kritis",
      customText: "Catatan tambahan",
    })
    expect(text).toContain("Catatan user: Catatan tambahan")
  })
})
```

Create `src/lib/chat/__tests__/choice-request.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import {
  parseOptionalChoiceInteractionEvent,
  buildChoiceContextNote,
} from "../choice-request"

describe("parseOptionalChoiceInteractionEvent", () => {
  it("returns null when no interactionEvent", () => {
    expect(parseOptionalChoiceInteractionEvent({})).toBeNull()
    expect(parseOptionalChoiceInteractionEvent(null)).toBeNull()
  })

  it("parses a valid event", () => {
    const event = parseOptionalChoiceInteractionEvent({
      interactionEvent: {
        type: "paper.choice.submit",
        version: 1,
        conversationId: "conv-123",
        stage: "gagasan",
        sourceMessageId: "msg-456",
        choicePartId: "msg-456-json-renderer-choice",
        kind: "single-select",
        selectedOptionIds: ["fokus-berpikir-kritis"],
        submittedAt: Date.now(),
      },
    })
    expect(event).not.toBeNull()
    expect(event!.type).toBe("paper.choice.submit")
  })
})

describe("buildChoiceContextNote", () => {
  const baseEvent = {
    type: "paper.choice.submit" as const,
    version: 1 as const,
    conversationId: "conv-123",
    stage: "gagasan" as const,
    sourceMessageId: "msg-456",
    choicePartId: "msg-456-json-renderer-choice",
    kind: "single-select" as const,
    selectedOptionIds: ["fokus-berpikir-kritis"],
    submittedAt: Date.now(),
  }

  it("builds decision-to-draft note for normal choice", () => {
    const note = buildChoiceContextNote(baseEvent)
    expect(note).toContain("USER_CHOICE_DECISION:")
    expect(note).toContain("Mode: decision-to-draft")
    expect(note).toContain("fokus-berpikir-kritis")
  })

  it("builds validation-ready note for validation option", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      selectedOptionIds: ["sudah-cukup-lanjut-validasi"],
    })
    expect(note).toContain("Mode: validation-ready")
    expect(note).toContain("submitStageForValidation")
  })

  it("includes custom text when present", () => {
    const note = buildChoiceContextNote({
      ...baseEvent,
      customText: "Tambahan info",
    })
    expect(note).toContain("Custom note: Tambahan info")
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/chat/__tests__/choice-submit.test.ts src/lib/chat/__tests__/choice-request.test.ts`
Expected: FAIL (modules not found)

**Step 3: Write choice-submit implementation**

Create `src/lib/chat/choice-submit.ts`:

```typescript
import type { PaperStageId } from "../../../convex/paperSessions/constants"

export interface ChoiceInteractionEvent {
  type: "paper.choice.submit"
  version: 1
  conversationId: string
  stage: PaperStageId
  sourceMessageId: string
  choicePartId: string
  kind: "single-select"
  selectedOptionIds: string[]
  customText?: string
  submittedAt: number
}

export function buildChoiceInteractionEvent(params: {
  conversationId: string
  sourceMessageId: string
  choicePartId: string
  stage: PaperStageId
  kind: "single-select"
  selectedOptionId: string
  customText?: string
}): ChoiceInteractionEvent {
  return {
    type: "paper.choice.submit",
    version: 1,
    conversationId: params.conversationId,
    stage: params.stage,
    sourceMessageId: params.sourceMessageId,
    choicePartId: params.choicePartId,
    kind: params.kind,
    selectedOptionIds: [params.selectedOptionId],
    ...(params.customText?.trim()
      ? { customText: params.customText.trim() }
      : {}),
    submittedAt: Date.now(),
  }
}

export function buildChoiceSyntheticText(params: {
  stage: PaperStageId
  selectedOptionId: string
  selectedLabel: string
  customText?: string
}): string {
  const lines = [
    `[Choice: ${params.stage}]`,
    `Pilihan: ${params.selectedLabel}`,
  ]

  if (params.customText?.trim()) {
    lines.push(`Catatan user: ${params.customText.trim()}`)
  }

  return lines.join("\n")
}
```

**Step 4: Write choice-request implementation**

Create `src/lib/chat/choice-request.ts`:

```typescript
import { z } from "zod"
import type { PaperStageId } from "../../../convex/paperSessions/constants"

const VALIDATE_OPTION_ID = "sudah-cukup-lanjut-validasi"

const choiceInteractionEventSchema = z.object({
  type: z.literal("paper.choice.submit"),
  version: z.literal(1),
  conversationId: z.string().min(1),
  stage: z.string().min(1),
  sourceMessageId: z.string().min(1),
  choicePartId: z.string().min(1),
  kind: z.literal("single-select"),
  selectedOptionIds: z.array(z.string().min(1)).min(1),
  customText: z.string().optional(),
  submittedAt: z.number(),
})

export type ParsedChoiceInteractionEvent = z.infer<typeof choiceInteractionEventSchema>

export function parseOptionalChoiceInteractionEvent(
  body: unknown
): ParsedChoiceInteractionEvent | null {
  if (!body || typeof body !== "object") return null
  const maybeBody = body as { interactionEvent?: unknown }
  if (typeof maybeBody.interactionEvent === "undefined") return null
  return choiceInteractionEventSchema.parse(maybeBody.interactionEvent)
}

export function validateChoiceInteractionEvent(params: {
  event: ParsedChoiceInteractionEvent
  conversationId: string
  currentStage?: PaperStageId | "completed" | null
  isPaperMode: boolean
}): void {
  const { event, conversationId, currentStage, isPaperMode } = params

  if (!isPaperMode) {
    throw new Error("Choice submit is only valid in paper mode.")
  }
  if (event.conversationId !== conversationId) {
    throw new Error("interactionEvent.conversationId does not match active conversation.")
  }
  if (!currentStage || currentStage === "completed") {
    throw new Error("Choice submit requires an active paper stage.")
  }
  if (event.stage !== currentStage) {
    throw new Error("interactionEvent.stage does not match active paper stage.")
  }
}

export function buildChoiceContextNote(
  event: ParsedChoiceInteractionEvent
): string {
  const selectedOptionIds = event.selectedOptionIds.map((id) => id.trim().toLowerCase())
  const requestedValidation =
    selectedOptionIds.includes(VALIDATE_OPTION_ID) ||
    selectedOptionIds.some(
      (id) =>
        /^setuju(?:-|$)/.test(id) ||
        /^approve(?:-|$)/.test(id) ||
        /(?:validasi|validation)(?:-|$)/.test(id)
    )

  const baseLines = [
    "USER_CHOICE_DECISION:",
    `- Stage: ${event.stage}`,
    `- Kind: ${event.kind}`,
    `- Selected option IDs: ${event.selectedOptionIds.join(", ")}`,
  ]

  if (event.customText?.trim()) {
    baseLines.push(`- Custom note: ${event.customText.trim()}`)
  }

  if (requestedValidation) {
    baseLines.push(
      "- Mode: validation-ready",
      "- Next action: summarize the stage decision, then call updateStageData, createArtifact, and submitStageForValidation in sequence. Do not open new branches.",
      "- If the current stage draft is not yet saved, you MUST call updateStageData first.",
      "- If the current stage does not have an artifact yet, you MUST call createArtifact after updateStageData.",
      "- Once stage data and artifact both exist, call submitStageForValidation in the same response.",
      "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
    )
    return baseLines.join("\n")
  }

  baseLines.push(
    "- Mode: decision-to-draft",
    "- Next action: translate the user's selected direction into a concrete stage draft. If the content becomes mature enough, updateStageData and createArtifact are allowed in this response. Do not submit validation automatically.",
    "- User-facing reply must stay in natural prose only. Do not expose JSON, schema keys, code fences, pseudo-code, or tool internals."
  )

  return baseLines.join("\n")
}
```

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/chat/__tests__/choice-submit.test.ts src/lib/chat/__tests__/choice-request.test.ts`
Expected: PASS (all tests)

**Step 6: Commit**

```bash
git add src/lib/chat/choice-submit.ts src/lib/chat/choice-request.ts src/lib/chat/__tests__/
git commit -m "feat: add choice card submit event builders and request parsers"
```

---

### Layer 1 Gate

Run:
```bash
npm run typecheck
npx vitest run src/lib/json-render/__tests__/ src/lib/chat/__tests__/choice-submit.test.ts src/lib/chat/__tests__/choice-request.test.ts
```
Expected: typecheck passes (same 2 pre-existing errors), all unit tests pass.

---

## Layer 2: Tool + Compilation

### Task 2.1: Spec Compilation Logic

**Files:**
- Create: `src/lib/json-render/compile-choice-spec.ts`
- Test: `src/lib/json-render/__tests__/compile-choice-spec.test.ts`

**Step 1: Write the failing test**

Create `src/lib/json-render/__tests__/compile-choice-spec.test.ts`:

```typescript
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

    // Root has all children
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
    expect(new Set(ids).size).toBe(ids.length) // all unique
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

    expect(result.normalizedOptions.every((o) => o.id !== "sudah-cukup-lanjut-validasi")).toBe(true)
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

    const submitId = `gagasan-choice-submit`
    const submit = result.spec.elements[submitId]
    expect((submit.props as Record<string, unknown>).label).toBe("Pilih fokus")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/json-render/__tests__/compile-choice-spec.test.ts`
Expected: FAIL (module not found)

**Step 3: Write implementation**

Create `src/lib/json-render/compile-choice-spec.ts`. This extracts and adapts `buildSpecFromDraft`, `normalizeRecommendationDraft`, `withValidationChoice`, and `slugifyRecommendationId` from V1's `json-renderer-recommendation.ts`:

```typescript
import type { JsonRendererChoiceSpec } from "./choice-payload"

export const CHOICE_VALIDATE_OPTION_ID = "sudah-cukup-lanjut-validasi"
const CHOICE_VALIDATE_OPTION_LABEL = "Sudah cukup, lanjut validasi"
const DEFAULT_SUBMIT_LABEL = "Lanjutkan"

function slugifyId(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "opsi"
}

export interface NormalizedOption {
  id: string
  label: string
  _originalId: string
}

export function compileChoiceSpec(params: {
  stage: string
  kind: "single-select"
  title: string
  options: Array<{ id: string; label: string }>
  recommendedId?: string
  submitLabel?: string
  appendValidationOption?: boolean
}): {
  spec: JsonRendererChoiceSpec
  normalizedOptions: NormalizedOption[]
} {
  // 1. Normalize option IDs
  const usedIds = new Set<string>()
  const normalizedOptions: NormalizedOption[] = []

  for (const option of params.options) {
    const isValidationLike = isValidationOption(option)
    const baseId = isValidationLike
      ? CHOICE_VALIDATE_OPTION_ID
      : slugifyId(option.id || option.label)
    let nextId = baseId
    let suffix = 2

    while (usedIds.has(nextId)) {
      nextId = `${baseId}-${suffix}`
      suffix += 1
    }

    usedIds.add(nextId)
    normalizedOptions.push({
      id: nextId,
      label: isValidationLike ? CHOICE_VALIDATE_OPTION_LABEL : option.label,
      _originalId: option.id,
    })
  }

  // 2. Append validation option if requested and not already present
  if (params.appendValidationOption) {
    const hasValidation = normalizedOptions.some(
      (o) => o.id === CHOICE_VALIDATE_OPTION_ID
    )
    if (!hasValidation) {
      normalizedOptions.push({
        id: CHOICE_VALIDATE_OPTION_ID,
        label: CHOICE_VALIDATE_OPTION_LABEL,
        _originalId: CHOICE_VALIDATE_OPTION_ID,
      })
    }
  }

  // 3. Resolve recommended option (prefer non-validation)
  const resolvedRecommendedId = resolveRecommendedId(
    params.recommendedId,
    normalizedOptions
  )

  // 4. Build spec
  const rootId = `${params.stage}-choice-card`
  const submitId = `${params.stage}-choice-submit`
  const children = normalizedOptions.map((o) => o.id)
  children.push(submitId)

  const elements: JsonRendererChoiceSpec["elements"] = {
    [rootId]: {
      type: "ChoiceCardShell",
      props: { title: params.title },
      children,
    },
    [submitId]: {
      type: "ChoiceSubmitButton",
      props: {
        label: params.submitLabel?.trim() || DEFAULT_SUBMIT_LABEL,
        disabled: false,
      },
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
  }

  for (const option of normalizedOptions) {
    const isRecommended = option.id === resolvedRecommendedId
    elements[option.id] = {
      type: "ChoiceOptionButton",
      props: {
        optionId: option.id,
        label: option.label,
        recommended: isRecommended,
        selected: isRecommended,
        disabled: false,
      },
      children: [],
      on: {
        press: {
          action: "setState",
          params: {
            statePath: "/selection/selectedOptionId",
            value: option.id,
          },
        },
      },
    }
  }

  return {
    spec: { root: rootId, elements },
    normalizedOptions,
  }
}

// ── Helpers ───────────────────────────────────────────────────

const VALIDATION_PATTERNS = [
  /\bsetuju(?:i)?\b/i,
  /\bvalidasi\b/i,
  /\blanjut(?:kan)?\b/i,
]

function isValidationOption(option: { id: string; label: string }): boolean {
  return [option.id, option.label].some((v) =>
    VALIDATION_PATTERNS.some((p) => p.test(v))
  )
}

function resolveRecommendedId(
  rawRecommendedId: string | undefined,
  options: NormalizedOption[]
): string | null {
  if (!rawRecommendedId) return null

  const match = options.find(
    (o) =>
      o._originalId === rawRecommendedId ||
      o.id === slugifyId(rawRecommendedId)
  )

  // Prefer non-validation option as recommended
  if (match && match.id !== CHOICE_VALIDATE_OPTION_ID) {
    return match.id
  }

  return options.find((o) => o.id !== CHOICE_VALIDATE_OPTION_ID)?.id ?? null
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/json-render/__tests__/compile-choice-spec.test.ts`
Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/json-render/compile-choice-spec.ts src/lib/json-render/__tests__/compile-choice-spec.test.ts
git commit -m "feat: add deterministic choice spec compiler"
```

---

### Task 2.2: `emitChoiceCard` Tool

**Files:**
- Modify: `src/lib/ai/paper-tools.ts`

**Step 1: Add imports at top of file**

Add after existing imports:

```typescript
import { compileChoiceSpec, type NormalizedOption } from "@/lib/json-render/compile-choice-spec"
import { parseJsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
```

**Step 2: Add stage + status context to `createPaperTools`**

The current `createPaperTools` context doesn't include `currentStage` or `stageStatus`. These are auto-fetched inside tool execute functions from the session. For the `emitChoiceCard` tool, we need to know the stage at tool registration time (to gate availability).

Add to the context type:

```typescript
export const createPaperTools = (context: {
    userId: Id<"users">,
    conversationId: Id<"conversations">
    convexToken?: string
    availableSources?: Array<{ url: string; title: string; publishedAt?: number }>
    hasRecentSources?: boolean
    paperStageScope?: string   // NEW: current stage for tool gating
    paperStageStatus?: string  // NEW: drafting/pending_validation/approved/revision
}) => { ... }
```

**Step 3: Add the tool after the existing tools (before the closing `}`)**

```typescript
// ── Choice Card Tool (phase-one drafting stages only) ──────
const isPhaseOneDraftingStage =
  (context.paperStageScope === "gagasan" ||
    context.paperStageScope === "topik" ||
    context.paperStageScope === "outline") &&
  context.paperStageStatus === "drafting"

...(isPhaseOneDraftingStage
  ? {
      emitChoiceCard: tool({
        description:
          "Present an interactive choice card to the user. Use this when the user needs to make a decision by choosing from 2-5 options. The frontend renders an interactive card — the user clicks instead of typing. Do NOT list the options as a numbered/bulleted list in your prose when using this tool.",
        inputSchema: z.object({
          kind: z.enum(["single-select"]).describe(
            "Interaction type. Currently only single-select is supported."
          ),
          title: z.string().min(1).describe(
            "Short heading for the decision point, in Indonesian."
          ),
          options: z
            .array(
              z.object({
                id: z.string().min(1).describe("Kebab-case identifier."),
                label: z.string().min(1).describe("Human-readable label in Indonesian, under 60 chars."),
              })
            )
            .min(2)
            .max(5)
            .describe("The selectable options."),
          recommendedId: z
            .string()
            .optional()
            .describe(
              "The id of the option you recommend. Omit if all options are equally valid."
            ),
          submitLabel: z
            .string()
            .max(40)
            .optional()
            .describe("Button label. Defaults to 'Lanjutkan'."),
        }),
        execute: async (input) => {
          const { spec, normalizedOptions } = compileChoiceSpec({
            stage: context.paperStageScope!,
            kind: input.kind,
            title: input.title,
            options: input.options,
            recommendedId: input.recommendedId,
            submitLabel: input.submitLabel,
            appendValidationOption: true,
          })

          const selectedOptionId = input.recommendedId
            ? normalizedOptions.find(
                (o: NormalizedOption) => o._originalId === input.recommendedId
              )?.id ?? null
            : null

          return {
            success: true,
            payload: parseJsonRendererChoicePayload({
              version: 1,
              engine: "json-render",
              stage: context.paperStageScope!,
              kind: input.kind,
              spec,
              initialState: {
                selection: { selectedOptionId, customText: "" },
              },
              options: normalizedOptions.map((o: NormalizedOption) => ({
                id: o.id,
                label: o.label,
              })),
            }),
          }
        },
      }),
    }
  : {}),
```

**Step 4: Update caller in route.ts**

In `src/app/api/chat/route.ts` where `createPaperTools` is called (line ~1674), add the new context params:

```typescript
...createPaperTools({
    userId: userId as Id<"users">,
    conversationId: currentConversationId as Id<"conversations">,
    convexToken,
    availableSources: recentSourcesList,
    hasRecentSources: hasRecentSourcesInDb,
    paperStageScope: paperStageScope,                    // NEW
    paperStageStatus: paperSession?.stageStatus,         // NEW
}),
```

**Step 5: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors only, no new errors.

**Step 6: Commit**

```bash
git add src/lib/ai/paper-tools.ts src/app/api/chat/route.ts
git commit -m "feat: add emitChoiceCard tool with deterministic spec compilation"
```

---

### Layer 2 Gate

Run:
```bash
npm run typecheck
npx vitest run src/lib/json-render/__tests__/
```
Expected: All passes.

---

## Layer 3: Stream + Persist

### Task 3.1: Stream Loop Interception

**File:** `src/app/api/chat/route.ts`

**Step 1: Add import**

```typescript
import type { JsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
```

**Step 2: Declare capture variable in stream scope**

Before the `for await` loop (around line ~2330), add:

```typescript
let streamChoicePayload: JsonRendererChoicePayload | null = null
```

**Step 3: Add interception in primary stream loop**

In the `for await` chunk loop, BEFORE the `tool-input-start` check (line ~2360) and BEFORE the default `writer.write(chunk)` (line ~2400), add:

```typescript
// ── Choice card interception ──────────────────────
if (chunk.type === "tool-result") {
    const toolChunk = chunk as { type: string; toolName?: string; result?: unknown }
    if (toolChunk.toolName === "emitChoiceCard") {
        const output = toolChunk.result as { success?: boolean; payload?: JsonRendererChoicePayload } | undefined
        if (output?.success && output?.payload?.engine === "json-render") {
            streamChoicePayload = output.payload
            ensureStart()
            writer.write({
                type: "data" as const,
                data: [{
                    type: "json-renderer-choice",
                    id: `${messageId}-json-renderer-choice`,
                    payload: output.payload,
                }],
            })
        }
        // Pass through the original chunk (tool part hidden by MessageBubble)
        ensureStart()
        writer.write(chunk)
        continue
    }
}
```

> **IMPORTANT NOTE:** The exact chunk type for tool output may be `tool-result` or `tool-output-available` depending on the AI SDK stream variant. The implementer MUST verify by checking what chunk types actually flow through the loop. Log `chunk.type` values during a test run with any existing tool (like `getCurrentPaperState`) to identify the correct type.
>
> Also verify the `data` part emission format by checking how existing `data-search`, `data-cited-text` etc. are emitted in the codebase. The format may be `writer.write({ type: "data", data: [...] })` or `writer.write({ type: "data-json-renderer-choice", ... })` — check existing patterns.

**Step 4: Mirror in fallback stream loop**

Add the same interception + capture variable in the fallback stream loop (`runFallbackWithoutSearch`, around line ~2600+). Same pattern, separate `streamChoicePayload` variable.

**Step 5: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors.

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: intercept emitChoiceCard tool output in stream loop"
```

---

### Task 3.2: Persistence Integration

**File:** `src/app/api/chat/route.ts`

**Step 1: Extend `saveAssistantMessage` signature**

Add `jsonRendererChoice` and `uiMessageId` parameters:

```typescript
const saveAssistantMessage = async (
    content: string,
    sources?: { url: string; title: string; publishedAt?: number | null }[],
    usedModel?: string,
    reasoningTrace?: PersistedCuratedTraceSnapshot,
    jsonRendererChoice?: JsonRendererChoicePayload,  // NEW
    uiMessageId?: string                             // NEW
) => {
    // ... existing normalizedSources logic ...

    await retryMutation(
        () => fetchMutationWithToken(api.messages.createMessage, {
            conversationId: currentConversationId as Id<"conversations">,
            role: "assistant",
            content: content,
            metadata: {
                model: usedModel ?? modelNames.primary.model,
                ...(uiMessageId ? { uiMessageId } : {}),  // NEW
            },
            sources: normalizedSources && normalizedSources.length > 0 ? normalizedSources : undefined,
            reasoningTrace: sanitizeReasoningTraceForPersistence(reasoningTrace),
            ...(jsonRendererChoice
                ? { jsonRendererChoice: JSON.stringify(jsonRendererChoice) }
                : {}),                                      // NEW
            ...(uiMessageId ? { uiMessageId } : {}),       // NEW (top-level)
        }),
        "messages.createMessage(assistant)"
    )
}
```

**Step 2: Pass `streamChoicePayload` at persist points**

At `onFinish` (line ~2238):
```typescript
await saveAssistantMessage(
    persistedContent,
    normalizedText.length > 0 ? sources : undefined,
    modelNames.primary.model,
    persistedReasoningTrace,
    streamChoicePayload ?? undefined,  // NEW
    messageId                          // NEW
)
```

Same in fallback `onFinish`.

**Step 3: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors.

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: persist choice card payload and uiMessageId with assistant messages"
```

---

### Task 3.3: System Prompt Injection

**File:** `src/app/api/chat/route.ts`

**Step 1: Define the instruction constant**

Near other constants at top of file:

```typescript
const CHOICE_CARD_INSTRUCTION = `INTERACTIVE CHOICE CARD:
You have access to the \`emitChoiceCard\` tool. This is your visual language for presenting structured choices to the user. Use it whenever the user needs to make a decision by choosing from 2-5 options — whether that is a recommendation (you have a preference), a neutral option set (all equally valid), or a confirmation (proceed vs reconsider).

How to use:
1. Write your analysis, context, and reasoning as normal prose.
2. Do NOT list the options as a numbered/bulleted list in your prose. The card replaces that section entirely.
3. When you reach the decision point, write a short transition (e.g., "Berikut beberapa arah yang bisa dipilih:") and immediately call emitChoiceCard.
4. If you have a strong recommendation, set recommendedId to that option. If all options are equally valid, omit recommendedId.
5. After the tool call, you may write a brief closing sentence if needed.

The frontend renders an interactive card. The user clicks their choice instead of typing.

When NOT to use this tool:
- When saving stage data (updateStageData, createArtifact, submitStageForValidation)
- When responding to an approval or revision
- When having a general discussion without concrete options
- When there is only one obvious next step (no real choice needed)
- When the user explicitly asked to type their preference`
```

**Step 2: Derive gating flag and inject**

Compute `isPhaseOneDraftingStage` in the route handler (near where `paperStageScope` is derived, around line ~350):

```typescript
const isPhaseOneDraftingStage =
    (paperStageScope === "gagasan" ||
      paperStageScope === "topik" ||
      paperStageScope === "outline") &&
    paperSession?.stageStatus === "drafting"
```

In `fullMessagesBase` construction (line ~672), add before `...trimmedModelMessages`:

```typescript
...(isPhaseOneDraftingStage
    ? [{ role: "system" as const, content: CHOICE_CARD_INSTRUCTION }]
    : []),
```

**Step 3: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors.

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: inject choice card system prompt during phase-one drafting"
```

---

### Task 3.4: Interaction Event Handling

**File:** `src/app/api/chat/route.ts`

**Step 1: Add imports**

```typescript
import {
    parseOptionalChoiceInteractionEvent,
    validateChoiceInteractionEvent,
    buildChoiceContextNote,
} from "@/lib/chat/choice-request"
```

**Step 2: Parse interaction event from request body**

In the request body parsing section (around line ~98), after destructuring:

```typescript
// Parse optional choice interaction event
const choiceInteractionEvent = parseOptionalChoiceInteractionEvent(body)
```

**Step 3: Validate and build context note**

After paper session is loaded (around line ~350), if event exists:

```typescript
let choiceContextNote: string | undefined
if (choiceInteractionEvent) {
    validateChoiceInteractionEvent({
        event: choiceInteractionEvent,
        conversationId: currentConversationId,
        currentStage: paperStageScope ?? null,
        isPaperMode: !!paperModePrompt,
    })
    choiceContextNote = buildChoiceContextNote(choiceInteractionEvent)
}
```

**Step 4: Inject context note into messages**

In `fullMessagesBase` construction, add before `...trimmedModelMessages`:

```typescript
...(choiceContextNote
    ? [{ role: "system" as const, content: choiceContextNote }]
    : []),
```

**Step 5: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors.

**Step 6: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: handle choice interaction events with context note injection"
```

---

### Layer 3 Gate

Run:
```bash
npm run typecheck
npx eslint src/app/api/chat/route.ts src/lib/ai/paper-tools.ts --max-warnings 0 2>&1 | tail -3
```
Expected: typecheck same 2 pre-existing, eslint clean or only pre-existing warnings.

Start dev server and verify no runtime errors:
```bash
npm run dev
```

---

## Layer 4: Frontend

### Task 4.1: Card Components

**Files:**
- Create: `src/components/chat/json-renderer/components/ChoiceCardShell.tsx`
- Create: `src/components/chat/json-renderer/components/ChoiceOptionButton.tsx`
- Create: `src/components/chat/json-renderer/components/ChoiceTextarea.tsx`
- Create: `src/components/chat/json-renderer/components/ChoiceSubmitButton.tsx`
- Create: `src/components/chat/json-renderer/registry.tsx`
- Create: `src/components/chat/json-renderer/JsonRendererChoiceBlock.tsx`

**Step 1: Create ChoiceCardShell**

Adapted from V1's `RecommendationCardShell.tsx`:

```tsx
"use client"

import type { BaseComponentProps } from "@json-render/react"

interface ChoiceCardShellProps {
  title: string
}

export function ChoiceCardShell({
  props,
  children,
}: BaseComponentProps<ChoiceCardShellProps>) {
  return (
    <section
      className="mt-3 rounded-shell border border-[color:var(--chat-border)] bg-[var(--chat-card)] p-4 shadow-none animate-in fade-in slide-in-from-bottom-2 duration-300"
      data-testid="json-render-choice-card"
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--chat-foreground)]">
          {props.title}
        </h3>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}
```

**Step 2: Create ChoiceOptionButton**

Adapted from V1's `RecommendationOptionButton.tsx`, state path changed `/recommendation/` → `/selection/`:

```tsx
"use client"

import { Check } from "iconoir-react"
import { useStateValue, type BaseComponentProps } from "@json-render/react"
import { cn } from "@/lib/utils"

interface ChoiceOptionButtonProps {
  optionId: string
  label: string
  recommended?: boolean
  selected?: boolean
  disabled?: boolean
}

export function ChoiceOptionButton({
  props,
  emit,
}: BaseComponentProps<ChoiceOptionButtonProps>) {
  const selectedOptionId = useStateValue<string>("/selection/selectedOptionId")
  const isSelected = selectedOptionId === props.optionId
  const disabled = props.disabled === true

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => emit("press")}
      className={cn(
        "w-full rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-3 py-3 text-left transition-colors",
        "focus-ring disabled:cursor-not-allowed disabled:opacity-60",
        isSelected
          ? "border-sky-500/70 bg-sky-500/10"
          : "hover:bg-[var(--chat-accent)]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 flex-1 text-sm font-medium text-[var(--chat-foreground)]">
          {props.label}
        </span>
        <span
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-action border",
            isSelected
              ? "border-sky-500 bg-sky-500 text-white"
              : "border-[color:var(--chat-border)] text-transparent"
          )}
          aria-hidden="true"
        >
          <Check className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}
```

**Step 3: Create ChoiceTextarea**

Adapted from V1's `RecommendationTextarea.tsx`, binding path changed:

```tsx
"use client"

import { useBoundProp, type BaseComponentProps } from "@json-render/react"
import { Textarea } from "@/components/ui/textarea"

interface ChoiceTextareaProps {
  label: string
  placeholder?: string | null
  value?: string | Record<string, unknown> | null
  disabled?: boolean
}

export function ChoiceTextarea({
  props,
  bindings,
}: BaseComponentProps<ChoiceTextareaProps>) {
  const textareaId = `json-render-choice-note-${props.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}`
  const [value, setValue] = useBoundProp<string | null>(
    typeof props.value === "string" ? props.value : null,
    bindings?.value
  )

  return (
    <div>
      <label
        htmlFor={textareaId}
        className="mb-2 block text-signal text-[10px] text-[var(--chat-muted-foreground)]"
      >
        {props.label}
      </label>
      <Textarea
        id={textareaId}
        value={value ?? ""}
        onChange={(event) => setValue(event.target.value)}
        placeholder={props.placeholder ?? "Tambahkan preferensi kalau perlu"}
        disabled={props.disabled === true}
        className="min-h-24 rounded-action border-[color:var(--chat-border)] bg-[var(--chat-background)] text-sm shadow-none"
      />
    </div>
  )
}
```

**Step 4: Create ChoiceSubmitButton**

Adapted from V1's `RecommendationSubmitButton.tsx`:

```tsx
"use client"

import { Send } from "iconoir-react"
import type { BaseComponentProps } from "@json-render/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ChoiceSubmitButtonProps {
  label: string
  disabled?: boolean
}

export function ChoiceSubmitButton({
  props,
  emit,
}: BaseComponentProps<ChoiceSubmitButtonProps>) {
  const disabled = props.disabled === true

  return (
    <div className="flex items-center justify-end">
      <Button
        type="button"
        size="sm"
        onClick={() => emit("press")}
        disabled={disabled}
        className={cn(
          "h-9 rounded-action px-4",
          disabled
            ? "border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)]"
            : "chat-validation-approve-button"
        )}
      >
        <Send className="h-3.5 w-3.5" />
        {props.label}
      </Button>
    </div>
  )
}
```

**Step 5: Create registry**

```tsx
"use client"

import { defineRegistry } from "@json-render/react"
import { choiceCatalog } from "@/lib/json-render/choice-catalog"
import { ChoiceCardShell } from "./components/ChoiceCardShell"
import { ChoiceOptionButton } from "./components/ChoiceOptionButton"
import { ChoiceTextarea } from "./components/ChoiceTextarea"
import { ChoiceSubmitButton } from "./components/ChoiceSubmitButton"

export const choiceRegistry = defineRegistry(choiceCatalog, {
  components: {
    ChoiceCardShell,
    ChoiceOptionButton,
    ChoiceTextarea,
    ChoiceSubmitButton,
  },
  actions: {
    submitChoice: async () => {
      // Actual handler injected by ActionProvider in JsonRendererChoiceBlock
    },
  },
})
```

**Step 6: Create JsonRendererChoiceBlock**

```tsx
"use client"

import { useMemo } from "react"
import { JSONUIProvider, Renderer } from "@json-render/react"
import type { Spec } from "@json-render/core"
import {
  cloneSpecWithReadOnlyState,
  type JsonRendererChoicePayload,
} from "@/lib/json-render/choice-payload"
import { choiceRegistry } from "./registry"

interface JsonRendererChoiceBlockProps {
  payload: JsonRendererChoicePayload
  isSubmitted?: boolean
  onSubmit?: (params: {
    selectedOptionId: string
    customText?: string
  }) => void | Promise<void>
}

export function JsonRendererChoiceBlock({
  payload,
  isSubmitted = false,
  onSubmit,
}: JsonRendererChoiceBlockProps) {
  const renderedSpec = useMemo(
    () =>
      isSubmitted
        ? cloneSpecWithReadOnlyState(payload.spec)
        : payload.spec,
    [isSubmitted, payload.spec]
  )

  const handlers = useMemo(
    () => ({
      submitChoice: async (params?: Record<string, unknown>) => {
        if (isSubmitted || !onSubmit) return

        const selectedOptionId =
          typeof params?.selectedOptionId === "string"
            ? params.selectedOptionId.trim()
            : ""

        if (!selectedOptionId) return

        const customText =
          typeof params?.customText === "string" &&
          params.customText.trim().length > 0
            ? params.customText.trim()
            : undefined

        await onSubmit({ selectedOptionId, customText })
      },
    }),
    [isSubmitted, onSubmit]
  )

  return (
    <JSONUIProvider
      registry={choiceRegistry.registry}
      initialState={payload.initialState}
      handlers={handlers}
    >
      <Renderer
        spec={renderedSpec as unknown as Spec}
        registry={choiceRegistry.registry}
      />
    </JSONUIProvider>
  )
}
```

**Step 7: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors only.

**Step 8: Commit**

```bash
git add src/components/chat/json-renderer/
git commit -m "feat: add choice card frontend components with json-render registry"
```

---

### Task 4.2: MessageBubble Integration

**File:** `src/components/chat/MessageBubble.tsx`

**Step 1: Add imports**

```typescript
import { JsonRendererChoiceBlock } from "./json-renderer/JsonRendererChoiceBlock"
import type { JsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
```

**Step 2: Add extractor function**

Add near other extractor functions (around line ~274):

```typescript
function extractJsonRendererChoice(uiMessage: UIMessage): JsonRendererChoicePayload | null {
    for (const part of uiMessage.parts ?? []) {
        if (!part || typeof part !== "object") continue
        const dataPart = part as unknown as { type?: string; data?: unknown[] }
        // Check for data part with json-renderer-choice items
        if (dataPart.type === "data" && Array.isArray(dataPart.data)) {
            for (const item of dataPart.data) {
                if (
                    item &&
                    typeof item === "object" &&
                    (item as { type?: string }).type === "json-renderer-choice" &&
                    (item as { payload?: unknown }).payload
                ) {
                    return (item as { payload: JsonRendererChoicePayload }).payload
                }
            }
        }
    }
    return null
}
```

> **NOTE:** The exact shape of the data part depends on how it was emitted in Task 3.1. The implementer MUST verify by logging `message.parts` in the browser console during a test and adjust this extractor to match.

**Step 3: Add props for choice card**

Extend `MessageBubbleProps`:

```typescript
interface MessageBubbleProps {
    // ... existing props ...
    isChoiceSubmitted?: boolean                          // NEW
    onChoiceSubmit?: (params: {                          // NEW
        sourceMessageId: string
        choicePartId: string
        payload: JsonRendererChoicePayload
        selectedOptionId: string
        customText?: string
    }) => void | Promise<void>
}
```

**Step 4: Extract and render in JSX**

In the component body, extract the payload:

```typescript
const choicePayload = extractJsonRendererChoice(message)
```

In the JSX, render after the message content (before or after sources display):

```tsx
{choicePayload && (
    <JsonRendererChoiceBlock
        payload={choicePayload}
        isSubmitted={isChoiceSubmitted}
        onSubmit={
            onChoiceSubmit
                ? async ({ selectedOptionId, customText }) => {
                      await onChoiceSubmit?.({
                          sourceMessageId: message.id,
                          choicePartId: `${message.id}-json-renderer-choice`,
                          payload: choicePayload,
                          selectedOptionId,
                          customText,
                      })
                  }
                : undefined
        }
    />
)}
```

**Step 5: Hide emitChoiceCard tool parts**

In the parts iteration where tool UI is rendered, add a filter to skip `emitChoiceCard`:

```typescript
// When iterating tool parts, skip emitChoiceCard (card rendered separately)
if (part.type === "tool-invocation" && part.toolName === "emitChoiceCard") continue
```

**Step 6: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors.

**Step 7: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "feat: extract and render choice cards in MessageBubble"
```

---

### Task 4.3: ChatWindow — Submit Handler + History Rehydration

**File:** `src/components/chat/ChatWindow.tsx`

**Step 1: Add imports**

```typescript
import { buildChoiceInteractionEvent, buildChoiceSyntheticText } from "@/lib/chat/choice-submit"
import type { JsonRendererChoicePayload } from "@/lib/json-render/choice-payload"
```

**Step 2: Add submission tracking state**

```typescript
const [submittedChoiceKeys, setSubmittedChoiceKeys] = useState<Set<string>>(new Set())
```

**Step 3: Add submit handler**

```typescript
const handleChoiceSubmit = useCallback(async (params: {
    sourceMessageId: string
    choicePartId: string
    payload: JsonRendererChoicePayload
    selectedOptionId: string
    customText?: string
}) => {
    const submissionKey = `${params.sourceMessageId}::${params.choicePartId}`

    // Mark as submitted immediately (optimistic)
    setSubmittedChoiceKeys((prev) => new Set([...prev, submissionKey]))

    const selectedLabel =
        params.payload.options.find((o) => o.id === params.selectedOptionId)?.label ??
        params.selectedOptionId

    const event = buildChoiceInteractionEvent({
        conversationId: conversationId,
        sourceMessageId: params.sourceMessageId,
        choicePartId: params.choicePartId,
        stage: params.payload.stage as PaperStageId,
        kind: params.payload.kind,
        selectedOptionId: params.selectedOptionId,
        customText: params.customText,
    })

    const syntheticText = buildChoiceSyntheticText({
        stage: params.payload.stage as PaperStageId,
        selectedOptionId: params.selectedOptionId,
        selectedLabel,
        customText: params.customText,
    })

    sendMessage({ text: syntheticText }, { body: { interactionEvent: event } })
}, [conversationId, sendMessage])
```

> **NOTE:** The `sendMessage` call with `body` must match how the existing `sendMessage` from `useChat` accepts extra body params. Check the `useChat` transport setup to verify body params are forwarded. If `sendMessage` doesn't accept `body` directly, use the same pattern as `sendUserMessageWithContext` to add it.

**Step 4: History rehydration**

In the history message mapping section (around line ~2016-2025), add rehydration:

```typescript
// Rehydrate choice card from persisted data
const rawChoice = (historyMsg as Record<string, unknown>)?.jsonRendererChoice
if (rawChoice && typeof rawChoice === "string") {
    try {
        const choicePayload = JSON.parse(rawChoice)
        // Inject as data part for MessageBubble extraction
        const displayParts = (displayMessage as { parts?: unknown[] }).parts ?? []
        displayParts.push({
            type: "data",
            data: [{
                type: "json-renderer-choice",
                id: `${message.id}-json-renderer-choice`,
                payload: choicePayload,
            }],
        })
    } catch {
        // Skip invalid payload silently
    }
}
```

**Step 5: Pass props to MessageBubble**

Where `<MessageBubble>` is rendered (line ~2051), add:

```tsx
<MessageBubble
    // ... existing props ...
    isChoiceSubmitted={submittedChoiceKeys.has(
        `${message.id}::${message.id}-json-renderer-choice`
    )}
    onChoiceSubmit={handleChoiceSubmit}
/>
```

**Step 6: Determine submitted state from history**

When building `submittedChoiceKeys` initial state from history, check if subsequent user messages contain `[Choice: ...]` synthetic text:

```typescript
// Initialize submitted keys from history
useEffect(() => {
    if (!historyMessages || historyMessages.length === 0) return
    const keys = new Set<string>()

    for (let i = 0; i < historyMessages.length; i++) {
        const msg = historyMessages[i]
        // If a user message starts with [Choice:, the preceding assistant message's card was submitted
        if (msg.role === "user" && typeof msg.content === "string" && msg.content.startsWith("[Choice:")) {
            // Find the preceding assistant message with a choice card
            for (let j = i - 1; j >= 0; j--) {
                const prev = historyMessages[j]
                if (prev.role === "assistant" && (prev as Record<string, unknown>).jsonRendererChoice) {
                    const uiMsgId = (prev as Record<string, unknown>).uiMessageId as string | undefined
                    if (uiMsgId) {
                        keys.add(`${uiMsgId}::${uiMsgId}-json-renderer-choice`)
                    }
                    break
                }
            }
        }
    }

    if (keys.size > 0) {
        setSubmittedChoiceKeys(keys)
    }
}, [historyMessages])
```

**Step 7: Verify**

Run: `npm run typecheck`
Expected: Same 2 pre-existing errors.

**Step 8: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat: add choice card submit handler and history rehydration in ChatWindow"
```

---

### Layer 4 Gate

Run:
```bash
npm run typecheck
```
Expected: Same 2 pre-existing errors.

Start dev server:
```bash
npm run dev
```

Manual browser tests (gagasan stage):
1. Model writes context + calls emitChoiceCard → card appears below prose
2. Click option → visual selection updates
3. Click submit → model continues with chosen direction
4. Refresh → card rehydrated from DB
5. Submitted card shows read-only state
6. Validation panel still appears after submitStageForValidation

---

## Post-Implementation Verification Checklist

### Automated
```bash
npm run typecheck                    # Same 2 pre-existing errors
npx vitest run src/lib/json-render/  # All unit tests pass
npx vitest run src/lib/chat/__tests__/choice-  # All unit tests pass
npx eslint src/app/api/chat/route.ts src/lib/ai/paper-tools.ts  # Clean
```

### Browser (manual)

| # | Test | Expected |
|---|------|----------|
| 1 | Gagasan: model presents options | Prose + card, no option list in prose |
| 2 | Click option → submit | Model continues with chosen direction |
| 3 | Refresh after card | Card rehydrated, submitted cards read-only |
| 4 | "Sudah cukup" option | Model calls updateStageData → createArtifact → submitStageForValidation |
| 5 | Validation panel | Appears promptly after submit |
| 6 | Topik stage | Card works identically |
| 7 | Outline stage | Card works identically |
| 8 | Card without recommendedId | No pre-selection |
| 9 | Non-phase-one stage (abstrak) | No card, model writes prose only |
| 10 | Approval turn | No card |
| 11 | Terminal persist logs | Single `[ASSISTANT-DIAG][persist]` per turn |
| 12 | Terminal | Zero `[JSONR-DIAG]` logs |
| 13 | Full gagasan→topik→outline | Smooth transitions |

### Rollback
```bash
git reset --hard safe-rollback-pre-jsonrenderer-v2
```
