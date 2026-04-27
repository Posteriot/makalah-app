import { defineCatalog } from "@json-render/core"
import { schema } from "@json-render/react/schema"
import { z } from "zod"
import { workflowActionSchema } from "./choice-payload"

export const choiceCardShellPropsSchema = z.object({
  title: z.string().min(1),
  workflowAction: workflowActionSchema.optional(),
  decisionMode: z.enum(["exploration", "commit"]).optional(),
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
  value: z
    .union([z.string(), z.record(z.string(), z.unknown())])
    .nullable()
    .optional(),
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
    toggleOption: {
      params: z.object({
        optionId: z.string().min(1),
        currentSelectedId: z.string().nullable().optional(),
      }),
      description:
        "Toggle option selection. If the option is already selected, deselect it (set to null). Otherwise, select it.",
    },
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
