# Session Scope History — Worktree `normalizer-typeScript`

**Last updated:** 2026-04-10
**Purpose:** Historical record of how the session scope evolved for this branch. This file is branch-local only and is NOT agent operational instructions. Future sessions on `main` should not reference this file for runtime behavior.

**Note:** This content was previously in `SCOPE.md` at the worktree root. Codex Audit 7 correctly flagged that root-level `SCOPE.md` plus worktree-specific additions to `AGENTS.md` and `CLAUDE.md` would leak branch-scoped operational instructions into `main` on merge. The content is preserved here for audit trail; the root-level files were reverted to their merge-base state.

## Primary scope (original)

**Branch objective:** Implement the lean ingestion text cleanup layer (`cleanForIngestion()`) between extract and RAG ingest.

**Status:** Implementation complete. Commits:
- `84115514` — feat: implement cleanForIngestion() with unit tests
- `4b87414b` — fix: handle bare CR + dedup edge case test
- `71c0c750` — feat: integrate cleanForIngestion into upload extraction route
- `6f01c2be` — feat: integrate cleanForIngestion into web search RAG ingest path
- `203fe873` — fix: always log cleanup result for verifiability

**Scope documents:**
- `docs/normalizer-typeScript/context.md`
- `docs/normalizer-typeScript/design-doc.md`
- `docs/normalizer-typeScript/implementation-plan.md`

**Current state:** Test 2 confirmed cleanup layer is running. `diff=0` observed for PDF test case — pdf-parse already produces clean text per our 4 operations.

## Expanded scope (added 2026-04-10 by user decision)

### Scope expansion #2 (added 2026-04-10 same day): Widen investigation surface

**Correction:** Earlier investigation was self-restricted to read-only files excluding Convex mutation mapping. User called this out as self-restricting scope. Scope was widened to include:

- Convex mutation API verification for `stageSkills` table updates
- System prompt storage location in Convex
- Structural consistency audit of all 14 skill files in `.references/system-prompt-skills-active/updated-4/`
- Any other read-only verification needed to make the fix plan executable without assumptions

**Rule reinforcement:** Per `feedback_branch_scope.md` memory — never self-restrict scope. If a fact is needed to execute cleanly, verify it.

### Scope: Attachment awareness bug

**Problem:** Model does not respond to attached files unless the user explicitly prompts "read the document." Evidence from test 2 (`screenshots/test-2/`):

- User uploads PDF `31_Identifikasi+Pengaruh+Penggunaan+Chat-GPT.pdf`
- User prompt: "Berangkat dari ide saja, ayo kita bahas."
- Model ignores PDF entirely, enters generic brainstorming flow
- Only after user protests ("Ihs, kamu nggak membaca dokumennya?") does the model acknowledge the attachment

**User mandate:** Model MUST be aware of attachments unconditionally. Attachment awareness must not depend on prompt phrasing, search router decisions, or skill instructions.

**Evidence from terminal log 2:**
- Line 29: RAG ingest succeeded (26 chunks, 38928 chars)
- Line 46: Search router decided `NO-SEARCH` with reason "pure discussion phase"
- File chunks are in vector store but never retrieved for the model's context

**Investigation scope (pending user validation before execution):**
1. Read `src/app/api/chat/route.ts` to understand how attachment content reaches the model
2. Identify whether RAG retrieval is conditional on search router decision
3. Identify if file context is injected directly into messages or only via RAG retrieval
4. Identify if skill instructions (e.g., `gagasan-skill`) override attachment awareness
5. Identify if `pageContent`/`fileContext` is passed in system prompt or tool messages

**Out of scope for this expansion:**
- Implementing the fix (only investigation was authorized in the initial step)
- Touching web search decision logic
- Touching skill instruction files (later expanded to include when user approved the fix)
- Touching the normalization layer (already complete)

**Documentation rules:**
- Investigation notes go to `docs/normalizer-typeScript/attachment-awareness-investigation.md`
- Keep findings separate from normalization docs

**Deliverable for investigation phase:**
- A written report describing: actual attachment flow, root cause location (file:line), proposed fix approaches with tradeoffs
- NO code changes until user validated the report

## Scope boundaries (as of session start)

| In scope | Out of scope |
|---|---|
| `cleanForIngestion()` implementation (done) | Touching non-normalization code unrelated to attachment bug |
| Attachment awareness investigation (read-only) | Implementing attachment fix before user validates investigation |
| Investigation report in `docs/normalizer-typeScript/` | Modifying skill files, search router, or RAG retrieval without user approval |

## Execution rule for the session

1. Normalization work was complete — not re-touched except for the verifiability log fix in `203fe873`.
2. For attachment awareness: investigation only (until user approved the fix), then structured execution via subagent-driven development.
3. Each major milestone required Codex audit before proceeding.
4. Any finding that fell outside the agreed scope was flagged to the user, not silently fixed.

## Final outcome

- Normalizer layer: 5 commits, audited and merged into the same branch work
- Attachment awareness investigation: 1 comprehensive report documenting root cause in chat route + skill instructions
- Attachment awareness fix: 5 execution commits (Change Groups A, B, C) implementing the lean chokepoint approach
- Deployment evidence: D1.5 snapshot + D2 dev deployment + smoke tests T2-T10 + T11 observation log + Audit 6 correction commit
- Audit cycles: 7 rounds of Codex audits (3 plan audits + 4 execution/evidence audits) with documented findings and resolutions in the fix plan's Appendix C
