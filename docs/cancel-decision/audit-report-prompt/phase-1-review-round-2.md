You need to patch the remaining Phase 1 gap from the previous review. Do not broaden scope. Fix the specific cancel-eligibility bug below, then report back with concrete code references and verification evidence.

Context:
- Design source of truth: `docs/cancel-decision/design.md`
- Original audit: `docs/cancel-decision/audit-report-prompt/phase-1-review-round-1.md`
- Patch 1 report: `docs/cancel-decision/audit-report-prompt/phase-1-patch-round-1-report.md`
- Current status: the dual-key normalization fix is acceptable; the remaining blocker is choice-cancel eligibility during revision flows.

Blocking finding:

1. Critical: choice cancel is still exposed when one or more `[Revisi untuk ...]` synthetic messages exist after the `[Choice: ...]` message.

Evidence:
- `src/components/chat/ChatWindow.tsx:1697-1709` derives `cancelableChoiceMessageId` by scanning backward and only treating `[Approved:]` as a hard stop before `[Choice:]`.
- The scan ignores `[Revisi untuk ...]` completely.
- The repo already emits revision synthetic messages from `src/components/chat/ChatWindow.tsx:2377`.
- `handleCancelChoice` still calls `cancelChoiceDecision`, and `convex/paperSessions.ts` only normalizes `pending_validation -> drafting`; it does not implement a revision-specific cancel rollback.

Why this is broken:
- In a same-stage revision flow, the UI can still expose Batalkan on the old choice message.
- Clicking it will delete the choice + revision messages and clear stage data, while leaving the session in a revision-state path that Phase 1 does not explicitly support.
- That violates the “single latest logically cancelable choice” rule and creates a state/history mismatch risk.

Required fix:
- Update choice-cancel eligibility so revision synthetics are treated as a boundary for Phase 1.
- In other words: if the backward scan encounters `[Revisi untuk ...]` before it encounters `[Choice:]`, then no choice message is cancelable.
- Keep the existing `[Approved:]` boundary and `currentStage === "completed"` boundary.
- Do not try to solve revision cancel in this patch. Phase 1 is choice cancel only.

Implementation direction:
- Tightest valid fix: extend `cancelableChoiceMessageId` scan logic in `ChatWindow.tsx` so both `[Approved:]` and `[Revisi untuk ...]` return `null` before a `[Choice:]` can be selected.
- Keep the computation in `ChatWindow`, not `MessageBubble`.
- Preserve the current prop-based gating into `MessageBubble`.

Constraints:
- No backend changes for this round unless you discover a strictly necessary defensive guard.
- No approval-flow changes.
- No epoch-pipeline changes.
- Do not touch key normalization again unless a tightly-related bug is discovered.

Verification required before you report back:
- Demonstrate that when the latest relevant synthetic is `[Revisi untuk ...]`, no choice message shows Batalkan.
- Demonstrate that a normal current-stage `[Choice:]` with no later approval/revision still shows Batalkan.
- Demonstrate that a historical choice from a previous approved stage still does not show Batalkan.
- Include exact file references and a short explanation of why the new boundary logic is sufficient for Phase 1.

Report format:
1. Files changed
2. What you changed
3. Verification evidence
4. Remaining risks or none
