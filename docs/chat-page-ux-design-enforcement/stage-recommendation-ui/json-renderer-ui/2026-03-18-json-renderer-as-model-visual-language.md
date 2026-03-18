# Json Renderer as Model Visual Language

Date: 2026-03-18
Status: context baseline for reimplementation
Predecessor: `../README.md` (stage recommendation UI context)
Supersedes: `../json-renderer-ui/2026-03-17-json-renderer-ui-design.md` (v1, rolled back)

## Why This Document Exists

The first implementation of json-renderer recommendation UI (v1) was rolled back because it treated the card as an **afterthought appended to the model's prose**. The model wrote full option lists in text, then a second LLM call attempted to extract those options into a card. This caused:

1. **Workflow interference**: The extra LLM call blocked stream closure, delaying validation panel appearance and disrupting the 14-stage paper workflow.
2. **Duplicate content**: Model wrote options in prose AND the card displayed the same options — redundant, not complementary.
3. **Unreliable emission**: The second LLM call could fail (`AI_NoOutputGeneratedError`), leaving users without a card and forcing them to type manually.
4. **Complex skip logic**: 6+ conditions were needed to suppress card generation during validation, transition, and approval turns — a clear sign the architecture was fighting the workflow instead of working with it.

This document defines the correct paradigm and constraints for v2.

## Core Paradigm: Json Renderer Is the Model's Visual Language

The json-renderer card is **not a separate system that interprets the model's prose**. It is a **native output modality** of the model — the same way the model can output text, call tools, or emit reasoning traces.

The model has two output channels:

1. **Text** — for analysis, context, reasoning, narration
2. **Visual card** — for any structured interaction that requires the user to make an explicit decision

The visual card is the model's way of saying "I need you to choose" — whether that is:
- **Recommendations** (model has a strong preference among options)
- **Neutral options** (all choices are equally valid, model presents without bias)
- **Confirmations** (proceed vs reconsider — binary decision points)
- **Prioritization requests** (future: rank items by importance)
- **Action selections** (future: choose what to do next from a set of actions)

In short: **any moment where clicking is faster, clearer, and less ambiguous than typing** is a valid use case for the visual card.

These two channels work together in the same response:
- Model writes context/analysis as prose (paragraphs 1-2)
- Model emits a structured choice block (replaces what would have been paragraphs 3-4 of option listings)
- Frontend renders prose + card as one coherent message
- User reads context, then clicks choice in card

The model **knows** the card will appear. It does not duplicate the choices in prose because it knows the card handles that.

## How This Differs From V1

| Aspect | V1 (rolled back) | V2 (this design) |
|--------|-------------------|-------------------|
| Card generation | Post-hoc: second LLM call extracts from prose | Native: model emits structured block directly |
| LLM calls per turn | 2 (model + card generator) | 1 (model only) |
| Model awareness | Unaware card will appear | Knows card will appear, writes accordingly |
| Skip logic | 6+ conditions in route.ts | Zero — model decides when to emit card |
| Workflow interference | Blocked stream closure, delayed validation | Zero — no extra async work |
| Failure mode | Silent (card doesn't appear, user types) | Explicit (model either emits card or doesn't) |
| Option duplication | Prose + card show same options | Prose gives context, card gives choices |

## Technical Mechanism: Tool-Based Emission

The model emits a visual card by calling a **tool** (`emitChoiceCard`). This is the natural AI SDK pattern — tools are how models produce structured output alongside text.

```
Model response flow:
1. Model streams text (analysis, context)
2. Model calls `emitChoiceCard` tool with structured payload
3. Backend compiles payload into json-render spec
4. Backend emits `data-json-renderer-choice` part to stream
5. Frontend renders card inside the message bubble
6. Model continues with closing text if needed
```

Why a tool and not structured output or a magic token:
- Tools are the standard AI SDK mechanism for structured side-effects
- The model naturally decides WHEN to call a tool based on conversation context
- No skip logic needed — the model simply doesn't call the tool when it's not appropriate (e.g., during validation submission, stage transitions, approvals)
- Tool results can feed back into model reasoning if needed
- Works identically across primary and fallback providers

## Constraints: What Must Not Change

### 1. Paper workflow must not be disrupted

The 14-stage workflow (gagasan → judul) has its own lifecycle: `drafting → pending_validation → approved/revision`. The visual card is a UX enhancement within the `drafting` phase. It must not:

- Block or delay `submitStageForValidation`
- Interfere with validation panel appearance
- Add async work to the stream closure path
- Require changes to `convex/paperSessions.ts` mutations

### 2. Shell chat architecture stays intact

The existing streaming protocol (`createUIMessageStream`, `writer.write`, `data-*` parts) and client-side rendering (`MessageBubble`, `message.parts` extraction) are the foundation. The visual card is a new `data-*` part type (`data-json-renderer-choice`), not a new rendering system.

### 3. User always has text fallback

If the model doesn't emit a card (provider doesn't support tools, error, etc.), the user can still type their choice manually. The card is an enhancement, not a gate.

### 4. Model does not gain new authority

The card presents choices. Clicking a choice sends a structured event back to the chat API. The **application** decides what to do with that event (save to stageData, trigger validation, etc.). The model does not directly mutate paper session state through the card.

## Scope: Phase One

Phase one covers the three stages where choice-driven interaction is most frequent:

- `gagasan` — choose research angle/direction
- `topik` — choose topic focus, structure decisions
- `outline` — choose section structure, organization

Card type: `single-select` only (one option per decision point).

Phase two (future) extends to remaining stages and adds `multi-select`, `ranked-select`, and `action-list` card types.

## Reusable Assets From V1

The following components from the rolled-back v1 (`backup/json-renderer-v1-before-rollback` branch) are reusable with minor modifications:

| Component | Reuse Level | Change Needed |
|-----------|-------------|---------------|
| `RecommendationCardShell.tsx` | High | Rename, update testid |
| `RecommendationOptionButton.tsx` | High | Generalize state path |
| `RecommendationTextarea.tsx` | High | Remove hardcoded placeholder |
| `RecommendationSubmitButton.tsx` | High | Rename to generic |
| `recommendation-payload.ts` (spec schema) | Medium | Extract generic spec validator |
| `catalog.ts` (prop schemas) | Medium | Extract generic prop shapes |
| `registry.tsx` | Low | Rewrite per new catalog |
| `JsonRendererStageRecommendationBlock.tsx` | Low | Generalize to generic block |

## Existing Infrastructure to Leverage

### Streaming protocol
- `writer.write({ type: "data-json-renderer-choice", id, data })` — same pattern as `data-search`, `data-cited-text`, etc.
- Client reads `message.parts` and extracts by type in `MessageBubble.tsx`

### Tool definition pattern
- `tool({ description, inputSchema: z.object({...}), execute: async (args) => {...} })` from AI SDK
- Existing tools: `updateStageData`, `createArtifact`, `submitStageForValidation`, `getCurrentPaperState`

### Persistence
- `convex/schema.ts` messages table stores choice payload as `jsonRendererChoice: v.optional(v.string())` (JSON-serialized, avoids `$state` reserved key issue)
- Rehydration from history: parse stored string back to payload, inject as `data-json-renderer-choice` part

### Read-only lock after submission
- `cloneSpecWithReadOnlyState()` pattern from v1 — disable buttons, change submit label to "Sudah dikirim"

## Key Design Questions for Implementation

All answered in the design doc (`2026-03-18-json-renderer-v2-design.md`):

1. **Tool schema**: `emitChoiceCard` with `kind`, `title`, `options`, optional `recommendedId`, optional `submitLabel`
2. **Spec compilation**: Deterministic in tool `execute` — no LLM call
3. **Stream emission timing**: Intercept `tool-output-available` in `for await` chunk loop, emit `data-json-renderer-choice`
4. **Persistence**: Payload captured from stream, included in `saveAssistantMessage` at `finish`
5. **Submit flow**: `interactionEvent` with `paper.choice.submit` type, context note injected to model
6. **System prompt**: "INTERACTIVE CHOICE CARD" instruction — when to use, when not to use, anti-duplication rule

## Relationship to Other Documents

- `../README.md` — product rationale and scope (still valid, unchanged)
- `../2026-03-16-submit-event-and-streaming-contract-design.md` — streaming contract (partially valid, submit event schema reusable)
- `../2026-03-16-stage-recommendation-persistence-and-ai-tool-mapping.md` — persistence design (partially valid, storage format reusable)
- `2026-03-17-json-renderer-ui-design.md` — v1 design (superseded by this document)
