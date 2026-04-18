# Codex Final Sign-Off — Cancel Decision Design v8

## Context

Round 7 BLOCKed on `unapproveStage` guard not handling judul→completed case. Two additional risks flagged. All three addressed plus 7 self-review fixes. This is a sign-off pass.

## Changes since round 7

**Blocker fix:**
- `unapproveStage` guard expanded from `stageStatus === "drafting"` to also accept `currentStage === "completed" && stageStatus === "approved"`. targetStage derivation handles completed explicitly: uses last STAGE_ORDER entry ("judul") instead of `getPreviousStage("completed")` which would fail (completed is not a PaperStageId). Sections 4.3 and 5.2.

**Risk fixes:**
- Added `orchestrate-sync-run.ts` to modified files (passes `myEpoch` from accepted request to onFinishConfig).
- Added explicit V1 scoping in section 8: revision synthetic messages intentionally stay on edit+resend path in V1, with documented rationale.

**Self-review fixes (7 items):**
- Added `stampDecisionEpoch` mutation spec (new section 5.3)
- Deduplicated chain-completion risk entry
- Clarified `build-on-finish-handler.ts` in unchanged table (injection logic unchanged, file modified for epoch)
- Added `titleStrippedOnApproval` flag mechanism for conditional Draf prefix re-add
- Documented `editAndTruncateConversation` dummy content arg
- Added `accept-chat-request.ts` to modified files
- Fixed all section references (5.4.x → 5.5.x)

## Audit scope

1. **Blocker resolved?** Does the expanded guard handle judul→completed correctly? Is the targetStage derivation for "completed" explicit and sound?

2. **Modified files complete?** All files that need changes are listed? Cross-check the decisionEpoch flow: `accept-chat-request.ts` (stamp) → `orchestrate-sync-run.ts` (pass through) → `build-on-finish-handler.ts` (check). Any missing link?

3. **Internal consistency final check:** Any remaining contradictions between sections?

4. **Final verdict:** SHIP or BLOCK.

## File to read

- `docs/cancel-decision/design.md` — sections 4.3, 5.2, 5.3, 8, modified files, review log
- `convex/paperSessions/constants.ts` — STAGE_ORDER, getPreviousStage (verify "completed" handling)
- `convex/paperSessions.ts:1319-1321` — approveStage sets currentStage/stageStatus for completed case

## Output format

One line per area. End with SHIP or BLOCK.
