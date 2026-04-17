import type { JsonRendererChoiceSpec, WorkflowAction } from "./choice-payload"

export const CHOICE_VALIDATE_OPTION_ID = "sudah-cukup-lanjut-validasi"
const CHOICE_VALIDATE_OPTION_LABEL = "Sudah cukup, lanjut validasi"
const DEFAULT_SUBMIT_LABEL = "Lanjutkan"

// Patterns that identify a validation-like option so it can be canonicalised
// to the single server-expected `sudah-cukup-lanjut-validasi` id.
//
// Iteration 7: `/\blanjut(kan)?/i` was removed because it was too broad — it
// matched any option whose label contained "Lanjutkan" (e.g. the legitimate
// "Lanjutkan diskusi" fallback option used when the model abandons the
// choice card). The remaining two patterns ("setuju", "validasi") still
// catch the validation-intent options model typically emits.
const VALIDATION_PATTERNS = [/\bsetuju/i, /\bvalidasi/i]

function slugifyId(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "opsi"
}

function isValidationLike(id: string, label: string): boolean {
  return VALIDATION_PATTERNS.some((p) => p.test(id) || p.test(label))
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
  workflowAction?: WorkflowAction
}): {
  spec: JsonRendererChoiceSpec
  normalizedOptions: NormalizedOption[]
} {
  const {
    stage,
    title,
    options,
    recommendedId,
    submitLabel = DEFAULT_SUBMIT_LABEL,
    appendValidationOption = false,
  } = params

  // --- 1. Slugify and dedup option IDs, detect validation-like options ---
  const seenIds = new Set<string>()
  let hasValidationOption = false
  const normalizedOptions: NormalizedOption[] = []

  for (const opt of options) {
    if (isValidationLike(opt.id, opt.label)) {
      // Replace with canonical validation option
      if (!hasValidationOption) {
        hasValidationOption = true
        seenIds.add(CHOICE_VALIDATE_OPTION_ID)
        normalizedOptions.push({
          id: CHOICE_VALIDATE_OPTION_ID,
          label: CHOICE_VALIDATE_OPTION_LABEL,
          _originalId: opt.id,
        })
      }
      // Skip duplicates of validation-like options
      continue
    }

    let slug = slugifyId(opt.id)
    if (seenIds.has(slug)) {
      let counter = 2
      while (seenIds.has(`${slug}-${counter}`)) counter++
      slug = `${slug}-${counter}`
    }
    seenIds.add(slug)
    normalizedOptions.push({
      id: slug,
      label: opt.label,
      _originalId: opt.id,
    })
  }

  // --- 3. Append validation option if requested and not already present ---
  if (appendValidationOption && !hasValidationOption) {
    normalizedOptions.push({
      id: CHOICE_VALIDATE_OPTION_ID,
      label: CHOICE_VALIDATE_OPTION_LABEL,
      _originalId: CHOICE_VALIDATE_OPTION_ID,
    })
  }

  // --- 4. Resolve recommended ---
  let resolvedRecommendedId: string | null = null
  if (recommendedId != null) {
    const slugifiedRecommended = slugifyId(recommendedId)
    const match = normalizedOptions.find(
      (o) => o._originalId === recommendedId || o.id === slugifiedRecommended
    )
    if (match) {
      if (match.id === CHOICE_VALIDATE_OPTION_ID) {
        // Fall back to first non-validation option
        const fallback = normalizedOptions.find(
          (o) => o.id !== CHOICE_VALIDATE_OPTION_ID
        )
        resolvedRecommendedId = fallback?.id ?? null
      } else {
        resolvedRecommendedId = match.id
      }
    }
  }

  // --- 5. Build spec ---
  const rootId = `${stage}-choice-card`
  const submitId = `${stage}-choice-submit`

  const elements: Record<string, JsonRendererChoiceSpec["elements"][string]> = {}

  const childIds: string[] = []

  for (const opt of normalizedOptions) {
    const isRecommended = opt.id === resolvedRecommendedId
    childIds.push(opt.id)
    elements[opt.id] = {
      type: "ChoiceOptionButton",
      props: {
        optionId: opt.id,
        label: opt.label,
        recommended: isRecommended,
        selected: isRecommended,
        disabled: false,
      },
      children: [],
      on: {
        press: {
          action: "toggleOption",
          params: {
            optionId: opt.id,
            currentSelectedId: { $state: "/selection/selectedOptionId" },
          },
        },
      },
    }
  }

  // Submit button
  childIds.push(submitId)
  elements[submitId] = {
    type: "ChoiceSubmitButton",
    props: {
      label: submitLabel,
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

  // Root element
  elements[rootId] = {
    type: "ChoiceCardShell",
    props: {
      title,
      ...(params.workflowAction ? { workflowAction: params.workflowAction } : {}),
    },
    children: childIds,
  }

  const spec: JsonRendererChoiceSpec = {
    root: rootId,
    elements,
  }

  return { spec, normalizedOptions }
}
