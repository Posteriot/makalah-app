# Active Scope — Worktree `normalizer-typeScript`

**Last updated:** 2026-04-10

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
- Implementing the fix (only investigation is authorized in this step)
- Touching web search decision logic
- Touching skill instruction files
- Touching the normalization layer (already complete)

**Documentation rules:**
- Investigation notes go to `docs/normalizer-typeScript/attachment-awareness-investigation.md`
- Keep findings separate from normalization docs

**Deliverable for investigation phase:**
- A written report describing: actual attachment flow, root cause location (file:line), proposed fix approaches with tradeoffs
- NO code changes until user validates the report

## Scope boundaries

| In scope | Out of scope |
|---|---|
| `cleanForIngestion()` implementation (done) | Touching non-normalization code unrelated to attachment bug |
| Attachment awareness investigation (read-only) | Implementing attachment fix before user validates investigation |
| Investigation report in `docs/normalizer-typeScript/` | Modifying skill files, search router, or RAG retrieval without user approval |

## Execution rule for this session

1. Normalization work is complete — do not re-touch unless bug found.
2. For attachment awareness: investigate only, do not write code.
3. Stop after investigation report and wait for user validation before any fix.
4. Any finding that falls outside these two scopes must be flagged to the user, not silently fixed.
