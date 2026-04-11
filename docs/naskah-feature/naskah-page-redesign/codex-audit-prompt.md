# Codex Audit Prompt — Naskah Page Redesign (Docs Only)

> **Instruction language policy**: This prompt is in English per CLAUDE.md. Codex output should also be in English.

---

## 1. Audit Mandate

You are Codex. Your job is to audit **two design documents** for the naskah page redesign before Claude Code starts implementing them. This is a **docs-only audit** — no source code has been modified yet. You are reviewing the plan, not the implementation.

Ground rules:

- **Be adversarial, not agreeable.** Assume the docs contain flawed assumptions, missed edge cases, or contract drift until you have personally verified each claim against the current codebase.
- **Verify every concrete claim.** When the design doc says "grep found 3 files" or "ChatLayout is 504 lines" or "proxy.ts uses whitelist pattern," you must run the equivalent verification and confirm or refute.
- **Cite every finding with file paths and line numbers** for the current codebase AND the paragraph/section in the docs you are flagging.
- **Distinguish severity.** Label findings as `BLOCKER`, `HIGH`, `MEDIUM`, or `NIT`.
  - `BLOCKER` = architecturally unsound, contradicts D-019 or a sibling decision, breaks existing working code, or the implementation plan cannot actually be executed as written
  - `HIGH` = real gap that will cause implementation pain or test failures, but recoverable
  - `MEDIUM` = improvement that would meaningfully strengthen the plan
  - `NIT` = pedantic — skip these entirely unless they matter
- **Be skeptical of false positives.** If you are not certain, lower the severity. Unverified speculation is worse than silence.

---

## 2. Audit Scope

You are auditing EXACTLY these two files:

1. `docs/naskah-feature/naskah-page-redesign/design-doc.md` (407 lines)
2. `docs/naskah-feature/naskah-page-redesign/implementation-plan.md` (591 lines)

Both files are at `.worktrees/naskah-feature/docs/naskah-feature/naskah-page-redesign/`.

**Out of scope — do NOT audit these:**
- Any file under `src/` (no code has been changed for this redesign yet)
- Any file under `convex/` (same reason)
- The Codex audit findings already addressed in commit `bcb34a6f` — those are settled
- The 18 pre-existing main-branch test failures documented in `docs/naskah-feature/pre-existing-test-debt-2026-04-11.md` — those are out of naskah scope
- `docs/naskah-feature/2026-04-10-naskah-design-doc.md` — that is the original phase-1 design, NOT the redesign under audit

---

## 3. Branch Context

- **Worktree path:** `.worktrees/naskah-feature/`
- **Branch:** `naskah-feature`
- **Last commit on branch:** `35efee0a chore: expand execution scope policy`
- **Previous relevant commits:**
  - `09c8a459 refactor(naskah): rename topbar buttons to Pratinjau and Percakapan`
  - `bcb34a6f fix(naskah): address Codex audit findings for phase 1`
  - `da1c22cb Merge branch 'main' into naskah-feature`
- **Current state of naskah route:** `/chat/:conversationId/naskah`, uses `ChatLayout` with `routeContext="naskah"`. This is what the redesign proposes to change.
- **Target state after redesign:** `/naskah/:conversationId`, uses a new `NaskahShell` component. No chat chrome.

---

## 4. Authoritative References (READ FIRST)

Read these in order before auditing the two target docs:

1. `docs/naskah-feature/decisions.md` — especially D-018 (manual refresh contract) and D-019 (sibling page via topbar). D-019 is the primary justification for the redesign.
2. `docs/naskah-feature/2026-04-10-naskah-design-doc.md` — original phase-1 design that the redesign builds on. The redesign must NOT contradict any still-active decision here.
3. `docs/naskah-feature/2026-04-10-naskah-feature-implementation-plan.md` — Task 4 and Task 5 sections. The redesign's design doc claims to supersede parts of these.
4. `src/components/chat/layout/ChatLayout.tsx` — the layout currently reused by the naskah route. The redesign claims this is 504 lines and that only the `<TopBar>` mount is relevant.
5. `src/components/chat/shell/TopBar.tsx` — the component whose Link href will change.
6. `src/app/chat/[conversationId]/naskah/page.tsx` — the current naskah page file that will be deleted.
7. `src/proxy.ts` — Next.js 16 proxy middleware. The redesign claims it uses a whitelist pattern and that `/naskah/*` inherits protection.
8. `CLAUDE.md` — project-wide rules. Relevant for the "do not over-engineer" and "do not add unused exports" checks.

---

## 5. Primary Audit Focus Areas

Work through these in order. Each section tells you what to verify and how.

### 5.1 Verify every grep claim in the design doc

The design doc §1.7 claims:

> Grep across the repo found only three source files that reference the current URL pattern:
> - `src/components/chat/shell/TopBar.tsx` (line 110)
> - `src/components/chat/shell/TopBar.test.tsx` (line 83)
> - `src/components/chat/shell/TopBar.naskah-integration.test.tsx` (line 150)

**Verify** by running:

```bash
grep -rn --include='*.ts' --include='*.tsx' \
  -E 'chat/[^/]+/naskah|/chat/\$\{[^}]+\}/naskah' \
  src/
```

Confirm exactly 3 matches in `src/`. If more or fewer, that is a finding.

Also run the implementation plan's Check A command verbatim. If it returns something different from the design doc's claim, that is a finding.

### 5.2 Verify the 504-line ChatLayout claim

The design doc §1.5 claims:

> `src/components/chat/layout/ChatLayout.tsx` is 504 lines of chat shell logic

**Verify** with `wc -l src/components/chat/layout/ChatLayout.tsx`. If the count differs from 504, note it as a NIT unless the delta is > 20 lines.

Also verify §1.5's specific claims:
- Does ChatLayout have a 6-column CSS grid? Read L263-L271 (`getGridTemplateColumns`).
- Does it call `usePaperSession` + `useNaskah` for TopBar props? Read L109-L113.
- Does it derive `resolvedRouteContext` from `usePathname()`? Read L111-L113.

If any of these claims is wrong, flag it.

### 5.3 Verify proxy.ts auth landscape claim

The design doc §1.6 and §9.1 claim:

> `src/proxy.ts` uses a whitelist pattern. PUBLIC_ROUTES does not contain `/naskah`, so the new route is auto-protected via cookie check.

**Verify** by reading `src/proxy.ts` end-to-end. Confirm:
- There is a PUBLIC_ROUTES constant
- `/chat` is NOT in that list (so it is currently protected by fallthrough, not by explicit matching)
- The cookie-presence check uses `ba_session`
- The redirect target is `/sign-in?redirect_url=...`

If the proxy logic actually gates by `/chat`-prefix matching (rather than whitelist fallthrough), the redesign's auth inheritance claim is WRONG and moving to `/naskah/*` would bypass auth. This is a BLOCKER if true.

### 5.4 Verify D-019 citation accuracy

The design doc §1.3 quotes D-019 from `docs/naskah-feature/decisions.md:296-310`. Read those actual lines and confirm the quoted text is accurate and in context. If D-019 has been superseded, moved, or contradicted by a later decision (D-020, D-021, etc.), flag it.

### 5.5 Verify non-contradiction with phase-1 design doc

Read `docs/naskah-feature/2026-04-10-naskah-design-doc.md` looking for anything the redesign would break. Specifically:

- **Section 8 "Route And Shell Design"** — does the original design assume ChatLayout reuse? If yes, verify the redesign's rationale for superseding it.
- **Section 10 "UI Model"** — does the original design say "sidebar kiri" meaning ChatSidebar or NaskahSidebar? If ambiguous, flag it.
- **Section 13 "Frontend Responsibilities"** — any explicit mention of shell sharing? If yes, verify redesign compatibility.

If the original phase-1 design doc explicitly relies on chat shell sharing at sidebar level (not just topbar level), the redesign is in conflict and needs D-019 clarification.

### 5.6 Verify NaskahShell design is actually minimal enough

Read the implementation plan Task 1 Step 3 (NaskahShell implementation). Verify:

- Does it call `useNaskah` + `usePaperSession` unnecessarily? The design decision §5.3 says yes, with trade-off accepted. But the trade-off is "Convex dedupes." Verify that claim by reading any Convex subscription documentation or existing code that demonstrates dedupe behavior.
- Does it use `isSidebarCollapsed={false}` and no-op `onToggleSidebar`? The design decision §5.4 accepts this as a self-documenting shortcut. Verify that TopBar's conditional at the expand-sidebar button actually gates on `isSidebarCollapsed`. If TopBar renders the button regardless, the shortcut fails and the expand button will render on naskah route (visual bug).
- Does it hardcode `routeContext="naskah"`? This is fine because NaskahShell is route-specific. Verify.

Read `src/components/chat/shell/TopBar.tsx` L82-L104 to confirm the expand-sidebar button is gated on `isSidebarCollapsed`.

### 5.7 Verify first-visit bootstrap is preserved byte-for-byte

The implementation plan Task 2 Step 3 instructs:

> Do NOT alter the bootstrap logic. It was fixed in commit bcb34a6f to resolve Codex BLOCKER #1 and must survive the redesign intact.

Read the current `src/app/chat/[conversationId]/naskah/page.tsx` and enumerate exactly which pieces must be preserved:
- `useEffect` with `bootstrappedRef`
- `visibleSnapshot` computation
- `effectiveUpdatePending` override
- `isFirstVisit` derivation
- `emptyFallbackSnapshot` builder
- Loading gate

For each, confirm the implementation plan Task 2 Step 3 explicitly requires preservation. If any is missing from the preservation list, flag it as HIGH.

### 5.8 Verify the task boundaries and commit graph are sound

Read the implementation plan task-by-task and verify:

- **Task 1+2 bundled in one commit** — is this the right boundary? What happens if Task 1 commits alone without Task 2? (Answer: NaskahShell would exist but have no callsite, so tests would pass but production is dead code.)
- **Task 3 isolated commit** — delete old route tree. What happens to CI if Task 3 is deployed without Task 4? (Answer: Task 4's TopBar link still points to `/chat/:id/naskah` which is now a 404. Production is broken between Task 3 and Task 4 if deployed separately.)
- **Task order implication** — the expected commit graph has Task 3 before Task 4. Is that correct? Should Task 4 come before Task 3 to avoid the broken intermediate state?

This is a subtle ordering question. Flag it if the answer is unclear.

### 5.9 Verify the 8-step manual smoke test is executable

Read the implementation plan Task 5 Step 3. Each of the 8 steps must be actionable by a developer with only the running dev server. Flag any step that requires information not available in the plan (e.g., "log in as user X" without saying which user has a validated abstrak).

### 5.10 Verify non-goal discipline

Read §3 of the design doc ("Non-Goals") and confirm nothing in the implementation plan accidentally crosses a non-goal boundary. Specifically:

- Non-goal: "Touching ChatLayout.tsx." Verify the plan never mentions editing ChatLayout.
- Non-goal: "Refactoring NaskahPage, NaskahHeader, NaskahSidebar, NaskahPreview." Verify the plan never edits these.
- Non-goal: "Renaming the feature identifier naskah." Verify variable names, prop names, directory names, test ids stay as `naskah*`.
- Non-goal: "Mobile layout semantics." Verify the plan does not add mobile breakpoints.

If any task crosses a non-goal, that is a design-vs-implementation drift — flag as HIGH.

### 5.11 Verify CLAUDE.md compliance

Relevant rules:
- "Tools must be simple executors" — not applicable to this redesign (no AI tools in scope).
- "Don't overcomplicate" — is NaskahShell the minimal viable component, or does it have unnecessary surface area?
- "No unused exports" — does NaskahShell export anything that only tests reference?
- "Regex for technical format only, not natural language" — not applicable.
- "Model instruction language policy" — the new files are Indonesian design docs + English plan, same pattern as phase-1 docs.

Flag any violation.

### 5.12 Verify the design doc's rejected alternatives are genuinely rejectable

The design doc §5.1 lists three rejected routing alternatives:
- A: `/chat/:id/naskah` (current) — fails D-019 semantic
- B: `/chat/naskah/:id` (user's initial proposal) — still has `/chat/` prefix
- C: `/naskah/:paperSessionId` — scope creep on data model

Verify each rejection reason is sound:
- For B: does Next.js App Router actually resolve `app/chat/naskah/[conversationId]/page.tsx` cleanly alongside `app/chat/[conversationId]/page.tsx`? If Next.js emits a warning or errors, B is not just cosmetically wrong but technically broken.
- For C: is there any callsite that could benefit from paper-session-keyed URL? If yes, note it but do not reopen the decision — the redesign's rationale (scope discipline for phase 1) is sufficient.

---

## 6. Plan Executability Checklist

Work through each task in the implementation plan and mark whether it is fully executable as written. A task is executable iff:
- All files to create/modify are listed explicitly
- All test cases are specified with enough detail to write
- All verification commands are concrete
- Every expected output is predictable

- [ ] Pre-execution verification Check A (grep for hardcoded URLs)
- [ ] Pre-execution verification Check B (proxy.ts has no naskah refs)
- [ ] Pre-execution verification Check C (current naskah page imports ChatLayout)
- [ ] Pre-execution verification Check D (no direct imports of naskah page)
- [ ] Task 1: NaskahShell component + 5 test cases
- [ ] Task 2: new route page.tsx + 5 test cases
- [ ] Task 3: delete old route tree + 404 smoke test
- [ ] Task 4: TopBar Link href update + 2 test assertion updates
- [ ] Task 5: full regression verification

For any unchecked item, explain why in your findings.

---

## 7. Deliverable Format

Respond with a single markdown document using this structure:

```markdown
# Codex Audit — Naskah Page Redesign Docs

## Verdict
APPROVE | APPROVE WITH CHANGES | REJECT

## Summary
(2–4 sentences: overall quality of the two docs, biggest risks, whether
Claude Code can start implementation.)

## Blockers
(Must be fixed before implementation. If none, write "None.")
1. **[BLOCKER]** <title>
   - Doc reference: `design-doc.md §X.Y` or `implementation-plan.md Task N Step M`
   - Claim the doc makes: <quote>
   - Evidence against: <file:line from current codebase>
   - Why it matters: <impact on implementation>
   - Suggested fix: <concrete direction>

## High-Severity Findings
(Should be fixed before implementation if possible.)
1. **[HIGH]** ...

## Medium-Severity Findings
(Improvements that would strengthen the plan.)
1. **[MEDIUM]** ...

## Nits
(Optional, one-line bullets. Do not pad.)

## Verified Claims
(Brief list of the concrete claims you verified as correct. Keep it short.)

## Task Executability Checklist
(Paste §6 with each item marked ✅/❌ and one-line justification.)

## What Was Done Well
(Brief. If the docs are well-structured or cover something unexpectedly well, say so.)
```

Do not:
- Audit any file outside §2 scope
- Rewrite the docs for the author
- Flag stylistic preferences as findings unless they violate CLAUDE.md
- Invent findings to pad the report

---

## 8. Execution Hint

Suggested order of operations:

1. Read `docs/naskah-feature/decisions.md` D-018 and D-019.
2. Read the original phase-1 design doc (`2026-04-10-naskah-design-doc.md`).
3. Read the new design doc (`naskah-page-redesign/design-doc.md`) end-to-end.
4. Read the new implementation plan (`naskah-page-redesign/implementation-plan.md`) end-to-end.
5. Run every verification command in §5 of this prompt against the live codebase.
6. Cross-reference findings with current code at `src/proxy.ts`, `src/components/chat/layout/ChatLayout.tsx`, `src/components/chat/shell/TopBar.tsx`, and `src/app/chat/[conversationId]/naskah/page.tsx`.
7. Produce the deliverable.

---

## 9. Pre-Existing Test Debt — DO NOT CONSUME AUDIT BUDGET

18 tests are currently failing in `__tests__/chat/*` and `__tests__/reference-presentation.test.ts`. Full details in `docs/naskah-feature/pre-existing-test-debt-2026-04-11.md`. **These are NOT related to the redesign and NOT in scope for this audit.** Do not flag them.

The redesign does not touch any of the failing test files. Post-implementation, the expected test outcome is still: 18 pre-existing failures, zero new ones.

---

Begin.
