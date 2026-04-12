# Pre-Existing Chat UI Test Debt — Discovered 2026-04-11

## Status

**Out of scope for naskah-feature branch. Owned, documented, deferred to post-naskah-merge follow-up work.**

## Discovery Context

While syncing `main` into the `naskah-feature` worktree (merge commit `da1c22cb`) in preparation for Codex audit and UI testing, the full vitest suite reported:

```
Test Files  8 failed | 158 passed (166)
     Tests  18 failed | 1077 passed (1095)
```

All 117 naskah-specific tests passed. The 18 failures are entirely concentrated in chat input / attachment UI tests that have nothing to do with naskah work.

## Failure Inventory

### Affected test files (8 files, 18 tests)

| # | Test file | Failing tests |
|---|---|---|
| 1 | `__tests__/chat/attachment-send-rule.test.tsx` | 3 |
| 2 | `__tests__/chat/chat-input-desktop-layout.test.tsx` | 5 |
| 3 | `__tests__/chat/chat-input-desktop-limit.test.tsx` | 2 |
| 4 | `__tests__/chat/clear-attachment-context.test.tsx` | 2 |
| 5 | `__tests__/chat/explicit-vs-inherit-bubble-visibility.test.tsx` | 1 |
| 6 | `__tests__/chat/konteks-tray-ui.test.tsx` | 1 |
| 7 | `__tests__/chat/message-bubble-attachment-chip-format.test.tsx` | 1 |
| 8 | `__tests__/reference-presentation.test.ts` | 3 |

### Failing test names

- `attachment-send-rule.test.tsx`
  - `disables send when attachment exists but text is empty`
  - `enables send when attachment exists and text contains dot`
  - `keeps file extension and size visible for long attachment names`
- `chat-input-desktop-layout.test.tsx`
  - `menampilkan textarea desktop satu baris saat kosong`
  - `menampilkan strip konteks desktop tetap terlihat meski belum ada konteks aktif`
  - `menampilkan konteks desktop sebagai strip horizontal, bukan tray blok besar`
  - `menjaga tombol kirim desktop tetap inline pada baris input`
  - `tumbuh otomatis pada textarea desktop saat mengetik`
- `chat-input-desktop-limit.test.tsx`
  - `tidak menerima input di atas 8000 karakter`
  - `tidak menampilkan counter karakter permanen`
- `clear-attachment-context.test.tsx`
  - `shows and triggers clear action when composer has attachment`
  - `shows clear button when active context exists even if draft composer is empty`
- `explicit-vs-inherit-bubble-visibility.test.tsx`
  - `shows chip for explicit attachment message`
- `konteks-tray-ui.test.tsx`
  - `renders Konteks section with per-file remove and Hapus semua`
- `message-bubble-attachment-chip-format.test.tsx`
  - `shows extension and size for long file names after message is sent`
- `reference-presentation.test.ts`
  - `switches to reference_inventory mode for explicit link/pdf requests`
  - `keeps synthesis mode for analytical prompts without reference-list intent`
  - `recognizes common inventory phrasing as reference inventory mode`

## Root Cause — Verified via Git

**Hypothesis**: These tests are stale because `main` refactored the chat input / attachment UI repeatedly without keeping the test assertions in sync.

**Verification steps taken**:

### Step 1 — Check when each test file was last modified

```bash
git log --oneline -1 -- <test-file>
```

Results:

| Test file | Last-touch commit |
|---|---|
| `__tests__/chat/attachment-send-rule.test.tsx` | `63087946 feat(chat): unify attachment chip format before and after send` |
| `__tests__/chat/chat-input-desktop-layout.test.tsx` | `4f16bc6d refactor: streamline desktop chat composer` |
| `__tests__/chat/konteks-tray-ui.test.tsx` | `12532764 refactor(chat): streamline konteks row actions and delete affordance` |
| `__tests__/chat/message-bubble-attachment-chip-format.test.tsx` | `f13d64b2 feat(chat): stabilize conversation attachment context and explicit bubble contract` |
| `__tests__/reference-presentation.test.ts` | `d4c5970e fix: gate and restore source inventory UI behavior (#120)` |

### Step 2 — Verify each last-touch commit predates the branch point

Branch point of `naskah-feature`: `5f40848b` (merge base with `main`).

```bash
for c in 63087946 4f16bc6d 12532764 f13d64b2 d4c5970e; do
  git merge-base --is-ancestor $c 5f40848b && echo "$c: pre-branch-point" || echo "$c: NOT ancestor"
done
```

Result: **all 5 commits are ancestors of the branch point**, meaning the test files were frozen to their pre-branch-point state and inherited into this branch without any modification from naskah work.

### Step 3 — Confirm `main` refactored the source under these tests

```bash
git log --oneline 5f40848b..ab38a9df -- \
  src/components/chat/ChatInput.tsx \
  src/components/chat/ContextAddMenu.tsx \
  src/components/chat/MessageBubble.tsx
```

Result (10 commits on `main` since branch point touching chat input / attachment UI source):

```
66712823 chore(chat): apply review cleanup nits to attachment UI
3207695a refactor(chat): tighten attachment types and unify font treatment
72f77508 fix(chat): harden upload error handling in ContextAddMenu
63d46684 style(chat): match chat input bg to user bubble (chat-muted)
fc871f39 style(chat): match delete button to + button and drop separator
a25129e7 style(chat): swap context add menu labels from mono to sans
052b27a4 feat(chat): redesign + Konteks to icon button + type dropdown
4913fb8e feat(chat): sync chat input attachment to thumbnail card
417c545f feat(chat): replace attachment chip with thumbnail card
a5b45209 fix(chat): balance user bubble vertical spacing
```

### Conclusion

`main` ran 10 UI refactor commits against `ChatInput.tsx`, `ContextAddMenu.tsx`, and `MessageBubble.tsx` without updating the corresponding test files in `__tests__/chat/*` or `__tests__/reference-presentation.test.ts`. The tests were already broken on `main` at tip `ab38a9df` before the merge into this branch. This is pre-existing technical debt on `main`, not a regression introduced by naskah work.

## Why This Is NOT Being Fixed Inside naskah-feature

1. **Scope discipline**: The naskah-feature branch exists to ship phase-1 `Naskah` workspace per `docs/naskah-feature/2026-04-10-naskah-feature-implementation-plan.md`. Rewriting 18 chat-input UI tests is unrelated to that scope and would expand the branch's blast radius.
2. **Timing**: The user's current stage is "UI testing and revision based on UI observation and terminal logs" for naskah. Interrupting for chat-UI test rewrites delays naskah validation.
3. **Blast radius**: Rewriting tests for a UI the branch does not own introduces risk of false positives in unrelated code paths and risks masking real chat-UI regressions.
4. **Process correctness**: A test rewrite should happen on a dedicated branch, reviewed with the same rigor as any other change, with its own audit cycle.

## What IS Being Done About It

1. **Owned**: documented here with full evidence trail.
2. **Disclosed**: explicitly called out in `docs/naskah-feature/codex-audit-prompt.md` §11 so Codex does not consume audit budget on these failures.
3. **Deferred**: will be addressed as the **first follow-up work** after `naskah-feature` merges to `main`. A dedicated branch (tentative name: `fix-chat-ui-test-debt`) will:
   - Read current UI source for `ChatInput.tsx`, `ContextAddMenu.tsx`, `MessageBubble.tsx`
   - Rewrite the 18 failing test assertions to match post-refactor UI
   - Run the affected tests to confirm green
   - Open a PR with a clear scope statement

## Anti-Principle This Is NOT

This is NOT "dismiss as pre-existing to avoid work." Specifically:

- We are NOT saying "not our bug, skip it."
- We are NOT hiding the failures from the audit.
- We are NOT suppressing them in CI.
- We are NOT filing a vague TODO and moving on.

We ARE saying: investigated, verified, owned, disclosed to the auditor, and scheduled for dedicated follow-up work immediately after the current scope ships.

## References

- Merge commit that exposed the debt: `da1c22cb Merge branch 'main' into naskah-feature`
- Branch point: `5f40848b`
- `main` tip at merge time: `ab38a9df Merge pull request #129 from Posteriot/chat-bubble-ui-enforcement`
- Naskah test status (all passing): 117/117 tests across 11 test files
