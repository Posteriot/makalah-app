You need to patch Phase 2 of cancel-decision. The current implementation is not acceptable yet. Fix the blocking issue below first; then report back with exact code references and verification evidence.

Context:
- Design source of truth: `docs/cancel-decision/design.md`
- Phase 2 scope: cancel approval + harness run guard
- Relevant design sections: 4.3, 5.2, 5.5.3

Blocking finding:

1. Critical: the "Batalkan" button for approved synthetic messages is still exposed too broadly. It is not limited to the approval for the current previous stage.

Evidence:
- `src/components/chat/MessageBubble.tsx:1212-1218` gates approved cancel only by:
  - `autoAction?.kind === "approved"`
  - `onCancelApproval`
  - `!isStreaming`
  - 30-second throttle from `allMessages[messageIndex]?.createdAt`
- There is no check that this approved message corresponds to the stage exactly one step behind the current session stage.
- `src/components/chat/ChatWindow.tsx:2446-2476` then calls `unapproveStage` unconditionally for the current session.
- `convex/paperSessions.ts:853-867` derives `targetStage` from the current session state, not from the clicked message. That is correct backend behavior, but it means the UI must not expose cancel on historical approved messages.

Why this is broken:
- If the session is currently in stage `metode`, a historical `[Approved: Gagasan Paper]` message can still show Batalkan after 30 seconds.
- Clicking it will unapprove the actual current previous stage (`topik`, not `gagasan`), because `unapproveStage` uses the current session state.
- That creates a direct mismatch between the clicked message and the reverted stage.
- This violates design section 4.1 / 4.3: approved cancel is only allowed for the approval that is exactly one stage behind the current stage.

Required fix:
- Add explicit eligibility computation for approved synthetic messages.
- Only show / allow Batalkan for the single approved message that corresponds to the current previous stage.
- Keep the existing 30-second throttle and streaming guard.
- Do not move this logic into the backend. The backend is intentionally session-state-driven; the UI must restrict what can be clicked.

Implementation direction:
- Compute approved-cancel eligibility in `ChatWindow.tsx`, not ad hoc inside `MessageBubble`.
- Use actual session state:
  - if `paperSession.currentStage === "completed"`, the only eligible approved synthetic is the approval for `judul`
  - otherwise, derive `getPreviousStage(paperSession.currentStage)` and only allow cancel for the approved synthetic representing that stage
- Pass a prop such as `cancelableApprovalMessageId` (or equivalent boolean per message) into `MessageBubble`
- Gate the approved Batalkan branch on that prop, in addition to the existing throttle + streaming conditions
- Keep edit hidden for all approved synthetics, regardless of whether Batalkan is shown

Important:
- The synthetic approved message stores a stage label, not a canonical stage id. Do not rely on brittle display-text assumptions unless you normalize them carefully.
- The codebase already has access to message ordering and current session state. Use that to derive the single eligible approved message robustly.

Secondary concern to review while patching:
- `convex/paperSessions.ts:907-913` warns and skips stageMessageBoundary removal on stage mismatch, but still proceeds with unapproval.
- If you find a narrowly-scoped safety improvement here that is clearly necessary, include it. If not, leave backend scope alone and mention it in your report.

Constraints:
- No approval-flow redesign.
- No revision-cancel work.
- No epoch / choice-cancel changes.
- Keep the patch tight and Phase-2 scoped.

Verification required before you report back:
- Demonstrate that a historical `[Approved: ...]` message from an older stage no longer shows Batalkan.
- Demonstrate that the current previous-stage approval still shows Batalkan after the throttle window.
- Demonstrate that `currentStage === "completed"` still allows unapproving only the final `judul` approval.
- Include exact file references and explain why the clicked message can no longer disagree with the reverted stage.

Report format:
1. Files changed
2. What you changed
3. Verification evidence
4. Remaining risks or none
