import { z } from "zod"
import type { Spec } from "@json-render/core"

// ---------------------------------------------------------------------------
// Stage
// ---------------------------------------------------------------------------

const choiceStageSchema = z.enum([
  "gagasan",
  "topik",
  "outline",
  "abstrak",
  "pendahuluan",
  "tinjauan_literatur",
  "metodologi",
  "hasil",
  "diskusi",
  "kesimpulan",
  "pembaruan_abstrak",
  "daftar_pustaka",
  "lampiran",
  "judul",
])

export type JsonRendererChoiceStage = z.infer<typeof choiceStageSchema>

// ---------------------------------------------------------------------------
// Option label
// ---------------------------------------------------------------------------

const optionLabelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const choiceInitialStateSchema = z.object({
  selection: z.object({
    selectedOptionId: z.string().nullable(),
    customText: z.string(),
  }),
})

// ---------------------------------------------------------------------------
// Recursive value schemas ($state, $bindState, primitives)
// ---------------------------------------------------------------------------

const stateReferenceSchema = z.object({
  $state: z.string().min(1),
})

const bindStateSchema = z.object({
  $bindState: z.string().min(1),
})

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

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Per-component prop schemas (used in superRefine)
// ---------------------------------------------------------------------------

const nullableString = z.string().nullable().optional()

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
  placeholder: nullableString,
  value: z
    .union([z.string(), z.record(z.string(), z.unknown())])
    .nullable()
    .optional(),
  disabled: z.boolean().optional(),
})

const choiceSubmitButtonPropsSchema = z.object({
  label: z.string().min(1),
  disabled: z.boolean().optional(),
})

const DEFAULT_CHOICE_SUBMIT_LABEL = "Lanjutkan"

// ---------------------------------------------------------------------------
// Component type enum + props map
// ---------------------------------------------------------------------------

const componentTypeSchema = z.enum([
  "ChoiceCardShell",
  "ChoiceOptionButton",
  "ChoiceTextarea",
  "ChoiceSubmitButton",
])

const componentPropsSchemaMap = {
  ChoiceCardShell: choiceCardShellPropsSchema,
  ChoiceOptionButton: choiceOptionButtonPropsSchema,
  ChoiceTextarea: choiceTextareaPropsSchema,
  ChoiceSubmitButton: choiceSubmitButtonPropsSchema,
} as const

// ---------------------------------------------------------------------------
// Element schema
// ---------------------------------------------------------------------------

const jsonRendererElementSchema = z
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

// ---------------------------------------------------------------------------
// Spec schema with superRefine validation
// ---------------------------------------------------------------------------

export const choiceSpecSchema = z
  .object({
    root: z.string().min(1),
    elements: z.record(z.string(), jsonRendererElementSchema),
  })
  .superRefine((spec, ctx) => {
    // Root must reference existing element
    const rootElement = spec.elements[spec.root]
    if (!rootElement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["root"],
        message: "Root must reference an existing element.",
      })
    }

    for (const [elementId, element] of Object.entries(spec.elements)) {
      // Per-component prop validation
      const propsSchema =
        componentPropsSchemaMap[
          element.type as keyof typeof componentPropsSchemaMap
        ]
      if (propsSchema) {
        const propsResult = propsSchema.safeParse(element.props)
        if (!propsResult.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["elements", elementId, "props"],
            message: propsResult.error.issues
              .map((issue) => issue.message)
              .join("; "),
          })
        }
      }

      // Children must reference existing elements
      for (const childId of element.children) {
        if (!spec.elements[childId]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["elements", elementId, "children"],
            message: `Child '${childId}' not found in spec elements.`,
          })
        }
      }
    }
  })

export type JsonRendererChoiceSpec = z.infer<typeof choiceSpecSchema>

// ---------------------------------------------------------------------------
// Full payload schema
// ---------------------------------------------------------------------------

export const choicePayloadSchema = z.object({
  version: z.literal(1),
  engine: z.literal("json-render"),
  stage: choiceStageSchema,
  kind: z.literal("single-select"),
  spec: choiceSpecSchema,
  initialState: choiceInitialStateSchema,
  options: z.array(optionLabelSchema).min(1).max(7),
})

export type JsonRendererChoicePayload = z.infer<typeof choicePayloadSchema>
export type JsonRendererChoiceRenderPayload = Pick<
  JsonRendererChoicePayload,
  "spec" | "initialState"
>

// ---------------------------------------------------------------------------
// Parse function
// ---------------------------------------------------------------------------

export function parseJsonRendererChoicePayload(
  payload: unknown
): JsonRendererChoicePayload {
  return choicePayloadSchema.parse(payload)
}

export function normalizeChoiceSpec(spec: Spec): Spec {
  if (!spec || typeof spec !== "object") return spec

  const candidate = spec as Spec & {
    root?: unknown
    elements?: Record<string, Record<string, unknown>>
    state?: {
      selection?: {
        selectedOptionId?: string | null
        customText?: string
      }
    }
  }

  if (
    typeof candidate.root !== "string" ||
    !candidate.elements ||
    typeof candidate.elements !== "object"
  ) {
    return spec
  }

  const rootElement = candidate.elements[candidate.root] as {
    type?: unknown
    children?: unknown
    props?: Record<string, unknown>
  } | undefined

  if (!rootElement || rootElement.type !== "ChoiceCardShell") {
    return spec
  }

  const rootChildren = Array.isArray(rootElement.children)
    ? rootElement.children.filter((child): child is string => typeof child === "string")
    : []

  const optionChildIds = rootChildren.filter((childId) => {
    const child = candidate.elements?.[childId] as { type?: unknown } | undefined
    return child?.type === "ChoiceOptionButton"
  })

  if (optionChildIds.length === 0) {
    return spec
  }

  const hasSubmitChild = rootChildren.some((childId) => {
    const child = candidate.elements?.[childId] as { type?: unknown } | undefined
    return child?.type === "ChoiceSubmitButton"
  })

  const nextSpec = {
    ...candidate,
    elements: Object.fromEntries(
      Object.entries(candidate.elements).map(([key, value]) => [
        key,
        value && typeof value === "object"
          ? {
              ...value,
              ...(Array.isArray((value as { children?: unknown }).children)
                ? { children: [...((value as { children: unknown[] }).children ?? [])] }
                : {}),
              ...("props" in value
                ? { props: { ...((value as { props?: Record<string, unknown> }).props ?? {}) } }
                : {}),
            }
          : value,
      ])
    ),
    state: {
      selection: {
        selectedOptionId:
          typeof candidate.state?.selection?.selectedOptionId === "string" &&
          candidate.state.selection.selectedOptionId.trim().length > 0
            ? candidate.state.selection.selectedOptionId
            : (
                optionChildIds.find((childId) => {
                  const child = candidate.elements?.[childId] as {
                    props?: { recommended?: unknown }
                  } | undefined
                  return child?.props?.recommended === true
                }) ?? optionChildIds[0]
              ),
        customText:
          typeof candidate.state?.selection?.customText === "string"
            ? candidate.state.selection.customText
            : "",
      },
    },
  }

  if (!hasSubmitChild) {
    const submitIdBase = `${candidate.root}-submit`
    let submitId = submitIdBase
    let counter = 2
    while (nextSpec.elements[submitId]) {
      submitId = `${submitIdBase}-${counter}`
      counter += 1
    }

    nextSpec.elements[submitId] = {
      type: "ChoiceSubmitButton",
      props: {
        label: DEFAULT_CHOICE_SUBMIT_LABEL,
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
    }

    nextSpec.elements[candidate.root] = {
      ...nextSpec.elements[candidate.root],
      children: [...rootChildren, submitId],
    }
  }

  return nextSpec as Spec
}

// ---------------------------------------------------------------------------
// Read-only clone
// ---------------------------------------------------------------------------

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
