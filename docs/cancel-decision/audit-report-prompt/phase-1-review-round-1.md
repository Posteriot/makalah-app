You need to patch Phase 1 of the cancel-decision implementation. This is not a broad rewrite. Fix the concrete gaps below, keep the scope tight, and then report back with exact code references and verification evidence.

Context:
- Design source of truth: `docs/cancel-decision/design.md`
- Phase scope: `docs/cancel-decision/plan.md` -> Phase 1
- Codex audit range: `0a4c2a0f..74daedc3`

Audit findings:

1. Critical: the cancel button is currently exposed on any synthetic choice message, not just the active-stage / latest cancelable choice.

Evidence:
- `src/components/chat/MessageBubble.tsx:1173-1191` renders Batalkan for every `autoAction?.kind === "choice"` as long as `onCancelChoice` exists and `!isStreaming`.
- There is no active-stage check, no "last choice submission" check, and no guard against already-approved historical choices.
- `src/components/chat/ChatWindow.tsx:2362-2366` immediately calls `cancelChoiceDecision({ sessionId, userId })`, and `convex/paperSessions.ts:791-833` always reverts the **current** stage.

Why this is broken:
- Clicking Batalkan on an older `[Choice: ...]` message can revert the current stage instead of the stage represented by that message.
- That violates design section 4.1 and can corrupt stage state + message history alignment.

Required fix:
- Add explicit cancel eligibility computation for choice synthetic messages.
- Only show / allow Batalkan for the single latest cancelable choice of the active stage.
- Hide it for historical choices and once the stage has already moved past that choice.
- Do not keep this as a MessageBubble-only heuristic. Compute the eligibility from actual conversation/session context in `ChatWindow` and pass a boolean prop down.
- Keep the existing streaming guard.

Implementation direction:
- Derive the cancelable choice message in `ChatWindow` from `historyMessages` + current paper session state.
- The derived target must correspond to the active stage only, and it must be the latest synthetic `[Choice: ...]` message that is still logically cancelable.
- Pass something like `canCancelChoice` into `MessageBubble`, and gate the Batalkan branch on that prop in addition to `autoAction.kind === "choice"`.
- Keep the "Batalkan XOR edit" behavior intact.

2. Critical: the submitted-choice key handling is still inconsistent between live `uiMessageId` keys and persisted `_id` keys, so cancel does not reliably reactivate the choice card in the same session.

Evidence:
- `src/components/chat/ChatWindow.tsx:1358-1359` stores the optimistic key from `sourceMessageId`, which is the live `UIMessage.id`.
- `src/components/chat/ChatWindow.tsx:1668-1683` rehydrates persisted keys only as `${prev._id}::${prev._id}-choice-spec`.
- `src/components/chat/ChatWindow.tsx:2393-2395` removes only the persisted `_id` variant on cancel.
- `src/components/chat/ChatWindow.tsx:2866` checks submission state only with `${message.id}::${message.id}-choice-spec`.

Why this is broken:
- Before refresh, the rendered assistant choice card commonly still uses the live `UIMessage.id`.
- After persistence, history rehydration adds `_id`-based keys, which do not match the earlier optimistic key.
- Cancel currently deletes only the `_id`-based key, so the stale optimistic key can survive and keep the card stuck in submitted state even after the synthetic choice message is removed.

Required fix:
- Normalize the key strategy so live and persisted variants are treated as the same logical choice submission.
- The migration path from optimistic -> persisted must actually remove the optimistic key when persistence confirms the same choice.
- Cancel must remove every equivalent key variant for that choice, not just one storage form.
- `isChoiceSubmitted` must still work both before refresh and after refresh.

Implementation direction:
- Introduce a small shared helper in `ChatWindow` to produce all equivalent submission keys for a choice card from the assistant message identity (`uiMessageId` when available, `_id` as fallback).
- Use that helper in:
  - `handleChoiceSubmit`
  - history rehydration
  - cancel removal
  - the `isChoiceSubmitted` check passed to `MessageBubble`
- If you choose a different normalization strategy, it must preserve same-session behavior and refresh behavior. Do not hand-wave this with comments; make the key equivalence explicit in code.

Constraints:
- Do not expand into approval/revision work in this patch.
- Do not rewrite unrelated chat history sync logic.
- Keep `cancelChoiceDecision` and the epoch pipeline unless a narrowly-scoped defensive improvement is absolutely necessary.

Verification required before you report back:
- Demonstrate that a historical `[Choice: ...]` message no longer shows Batalkan when it is not the current cancelable choice.
- Demonstrate that canceling the current choice reactivates the choice card without a page refresh.
- Demonstrate that the card is still shown as submitted after refresh when the synthetic choice message still exists.
- Demonstrate that after cancel, the synthetic choice message and later messages are removed, and the card is interactive again.
- Run the smallest relevant verification you can, but include concrete evidence, not just claims.

Report format:
1. Files changed
2. What you changed for finding 1
3. What you changed for finding 2
4. Verification evidence
5. Remaining risks or none
