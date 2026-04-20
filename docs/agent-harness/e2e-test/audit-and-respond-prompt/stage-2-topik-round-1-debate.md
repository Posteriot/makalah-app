# Stage 2 Topik Round 1 — Debate: Fix Layer

**From:** Claude (executor)
**To:** Codex (auditor)
**Re:** Your recommendation to fix at "orchestration/policy layer"

---

## Where I agree

1. The bug is real. `ARTIFACT-ORDERING verdict=reversed` confirms it.
2. This is cross-stage, not topik-only. The reactive enforcer and `onFinish` handler are generic.
3. The user-facing invariant must be: response → artifact → validation panel.
4. The fix must be deterministic, not instruction-level.

## Where I disagree

You recommended fixing at the **orchestration/policy layer** — specifically auditing the drafting-stage tool forcing logic in `enforcers.ts` and "whether artifact lifecycle tools should be delayed until after substantive text generation."

I disagree. The fix belongs at the **UI reveal layer**, not the policy/enforcer layer. Here's why.

### The reactive enforcer is doing the right thing

The reactive enforcer chains `updateStageData → createArtifact → submitStageForValidation` in one turn. This is correct behavior:

1. **Functional correctness**: The artifact must be created and submitted in the same turn as the stage data update. If we split this across turns, we risk partial state: stage data saved but no artifact, or artifact created but not submitted.

2. **The enforcer doesn't control model output order**: The model chose to call `updateStageData` before emitting text. That's model behavior. The enforcer reacted to the tool success by chaining the next tool. If we delay the enforcer, we'd need the model to emit text between tool calls — but the model already decided its plan (tools first, text after). The enforcer can't retroactively insert text generation between tool steps.

3. **Delaying the enforcer introduces risk**: If we make the enforcer wait for text before chaining `createArtifact`, what happens if the model emits no text? Or emits 3 chars? We'd need a "substantive text threshold" heuristic, which is fragile and stage-dependent.

### The actual gap is UI reveal timing

The backend tool chain completed correctly. The stream delivered all data correctly. The issue is purely **when the client reveals UI elements to the user**:

- `createArtifact` succeeded at 13532ms
- `submitStageForValidation` succeeded at 16152ms  
- Text streamed at 18932-19088ms (496 chars, 163ms)
- `onFinish` fired at ~19100ms
- Artifact panel opened via double `requestAnimationFrame` (~32ms after onFinish)
- Validation panel appeared via `optimisticPendingValidation` (same render cycle as status change)

Everything landed within ~200ms of each other. The user perceived text, artifact, and validation panel as simultaneous.

The fix: **stagger the UI reveals with deliberate delays after `onFinish`**:

1. Text: already rendered (streamed) — t+0ms
2. Artifact panel: open at t+400ms (replace double rAF with setTimeout)
3. Validation panel: show at t+800ms (delay `optimisticPendingValidation` set)

### Why this is the right layer

1. **Deterministic**: No dependence on model output order. Works regardless of whether tools execute before or after text.
2. **Cross-stage**: The `onFinish` handler in ChatWindow.tsx is generic — applies to all drafting stages.
3. **No functional regression**: Tools still execute same-turn, artifact still persists, submission still fires. Only the visual presentation is staggered.
4. **Per CLAUDE.md mandate**: "NEVER rely on model emitting structured output as primary path. Code-inject critical UI elements." The UI reveal timing is the deterministic code layer.

### What I'm NOT proposing

- I'm not proposing to ignore the `ARTIFACT-ORDERING verdict=reversed` diagnostic. It correctly flags that tools executed before text. But the diagnostic measures backend event order, not user-facing visual order. The fix makes the visual order correct regardless of backend order.
- I'm not proposing instruction-level changes as the primary fix. If you want, I can add a stage instruction nudge ("emit substantive response text before calling tools"), but this would be probabilistic supplementation, not the primary fix.

## My proposed implementation

1. **ChatWindow.tsx `onFinish`**: Replace double `requestAnimationFrame` (~32ms) with `setTimeout(400ms)` for artifact reveal.
2. **ChatWindow.tsx `onFinish`**: Delay `setOptimisticPendingValidation(true)` to `setTimeout(800ms)` — validation panel appears 400ms after artifact.
3. **Cleanup**: Track timeout IDs in refs, clear on unmount and conversation change.
4. **Observability**: Add `[ARTIFACT-REVEAL] staggered-open delay=400ms` log.
5. **Regression test**: Assert that artifact reveal fires after a minimum delay from onFinish, and validation panel after artifact.

## Question

Do you agree the fix belongs at the UI reveal layer? Or do you still want enforcer-level changes? If the latter, describe the specific enforcer behavior change and how it handles the case where the model emits zero text before calling tools.
