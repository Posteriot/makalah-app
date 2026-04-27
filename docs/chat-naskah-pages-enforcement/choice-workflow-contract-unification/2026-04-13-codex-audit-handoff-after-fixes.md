# Codex Audit Handoff After Priority Fixes

## Scope of this patch

This patch implements the three follow-up priorities that remained after the larger `workflowAction` unification work:

1. Fix `compile_then_finalize` so `daftar_pustaka` truly follows a compile-first post-choice path.
2. Restore backward-compatible rendering for legacy persisted choice cards that do not have `workflowAction`.
3. Add stage-aware validation so illegal `stage + workflowAction` combinations do not pass through the v2 resolver unchecked.

This handoff is for audit/review only. It is not a design document. The design context already exists in the other documents in this folder.

## What changed

### 1. `daftar_pustaka` post-choice now uses compile-first note

Problem before this patch:
- `resolvedWorkflow.action === "compile_then_finalize"` still fell into the generic `post-choice-finalize` note.
- That generic note incorrectly instructed:
  - `updateStageData`
  - `createArtifact`
  - `submitStageForValidation`
- This contradicted the documented contract for bibliography compilation.

Fix:
- Added a dedicated `post-choice-compile-finalize` branch in:
  - `src/lib/chat/choice-request.ts`
- The note now instructs:
  - `compileDaftarPustaka({ mode: 'persist' })`
  - `createArtifact` or `updateArtifact`
  - `submitStageForValidation`
- The note explicitly forbids direct `updateStageData` in this path.

Key file:
- `src/lib/chat/choice-request.ts`

### 2. Legacy persisted choice cards can render again

Problem before this patch:
- `workflowAction` became required in the strict choice spec schema.
- `MessageBubble` validated persisted specs with that strict schema.
- Old choice cards saved in history without `workflowAction` would fail parse and disappear after reload/history hydration.

Fix:
- Keep the emit contract strict for new payloads:
  - `parseJsonRendererChoicePayload()` still requires `workflowAction`.
- Add a render-only compatibility parser:
  - `parseChoiceSpecForRender()`
- The render parser accepts legacy shell props where:
  - `workflowAction` may be missing
  - `decisionMode` may still exist
- `MessageBubble` now uses the render parser for persisted/spec replay paths.
- `ChoiceCardShell` and `choice-catalog` were loosened for render compatibility only.

Key files:
- `src/lib/json-render/choice-payload.ts`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/json-renderer/components/ChoiceCardShell.tsx`
- `src/lib/json-render/choice-catalog.ts`

### 3. Illegal `stage + workflowAction` pairs now normalize to safe fallback

Problem before this patch:
- The v2 resolver accepted any enum-valid `workflowAction` for any stage.
- That left room for new split-brain failures if the model emitted a wrong action for the stage.

Fix:
- Added `allowedActions` to each stage entry in the registry.
- Added a conservative fallback in the resolver:
  - illegal combinations normalize to `continue_discussion`
  - `reason = "invalid_action_for_stage_fallback"`
  - `contractVersion = "v2"`
- This avoids throws in runtime chat flow and gives audit-friendly observability.

Examples now normalized safely:
- `gagasan + compile_then_finalize`
- `topik + special_finalize`
- `outline + validation_ready`

Legal combinations still resolve normally:
- `daftar_pustaka + compile_then_finalize`
- `judul/lampiran/hasil + special_finalize`
- general commit stages + `finalize_stage`
- discussion turns + `continue_discussion`

Key file:
- `src/lib/chat/choice-workflow-registry.ts`

## Files changed in this patch

- `src/lib/chat/choice-request.ts`
- `src/lib/chat/choice-workflow-registry.ts`
- `src/lib/json-render/choice-payload.ts`
- `src/lib/json-render/choice-catalog.ts`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/json-renderer/components/ChoiceCardShell.tsx`
- `src/lib/chat/__tests__/choice-request.test.ts`
- `src/lib/chat/__tests__/choice-workflow-resolver.test.ts`
- `src/lib/chat/__tests__/choice-workflow-observability.test.ts`
- `src/lib/json-render/__tests__/choice-payload.test.ts`

## Verification actually run

### Focused tests

Command:

```bash
npm test -- --run src/lib/chat/__tests__/choice-request.test.ts src/lib/chat/__tests__/choice-workflow-resolver.test.ts src/lib/chat/__tests__/choice-workflow-observability.test.ts src/lib/json-render/__tests__/choice-payload.test.ts
```

Result:
- `4/4 test files passed`
- `74/74 tests passed`

### Typecheck

Command:

```bash
npx tsc --noEmit
```

Result:
- clean

## Full suite status

I also ran the full test suite:

```bash
npm test -- --run
```

Result:
- the suite is **not full-green**
- failures remain in areas unrelated to this patch

Observed failing files from that run included:
- `__tests__/reference-presentation.test.ts`
- `__tests__/chat/chat-input-desktop-layout.test.tsx`
- `src/lib/ai/recovery-leakage-guard.test.ts`
- `__tests__/chat/attachment-send-rule.test.tsx`

Important:
- these failures were already outside the scope of the three priority fixes above
- they should be treated as existing branch-wide failures unless audit finds this patch indirectly affected one of them

## What Codex should audit next

### Highest priority audit checks

1. Confirm that `daftar_pustaka` compile-first logic is now correct and there is no remaining generic finalize leakage.
2. Confirm the render compatibility shim is truly read-only:
   - legacy payloads render
   - new emit contract still requires `workflowAction`
   - `decisionMode` is not reintroduced as the source of truth
3. Confirm safe fallback behavior for illegal `stage + workflowAction` pairs is the right runtime policy.

### Specific code questions to verify

1. Is `parseChoiceSpecForRender()` the right layer for legacy compatibility, or should some of that logic be moved lower/higher?
2. Is loosening `choice-catalog` for optional `workflowAction` acceptable for render compatibility, or does it weaken validation in unintended paths?
3. Are there any runtime callers still depending on the old assumption that every parsed render spec already has `workflowAction`?
4. Is `validation_ready` intentionally treated as illegal in `resolveChoiceWorkflow()` and handled elsewhere, or is there any runtime path that expected the resolver to preserve it?
5. Are there any additional stage/action combinations that should be explicitly allowed or explicitly normalized?

## Intended acceptance criteria for audit

Codex review should be able to confirm these statements:

1. `compile_then_finalize` now produces a compile-first note for `daftar_pustaka`.
2. Legacy choice cards without `workflowAction` can still render after reload.
3. Illegal `stage + workflowAction` combinations no longer pass raw into the resolver’s finalize path.
4. New payload emission remains strict.
5. No hidden regression was introduced in the touched files.
