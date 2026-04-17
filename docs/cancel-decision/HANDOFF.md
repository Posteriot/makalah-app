# Cancel Decision — Session Handoff

> **Dokumen ini adalah jembatan ingatan antar sesi.**
> Sesi sebelumnya sudah selesai. Dokumen ini memungkinkan sesi baru untuk mempelajari konteks penuh tanpa kehilangan informasi kritis dari sesi sebelumnya.
>
> **EKSEKUSI PHASE 2 DAN SETERUSNYA HARUS MENUNGGU VALIDASI USER.**
> Phase 1 sudah di-implement tapi belum di-validasi user. Jangan mulai Phase 2 sebelum user secara eksplisit mengkonfirmasi Phase 1 sudah OK.

---

## Status

| Phase | Status | Commits |
|-------|--------|---------|
| **Phase 1** — Cancel Choice Card + Client State Fixes | IMPLEMENTED, AWAITING USER VALIDATION | `ff808cce`..`74daedc3` (7 commits) |
| **Phase 2** — Cancel Approval + Harness Run Guard | NOT STARTED | — |
| **Phase 3** — Remove Edit+Resend from Synthetic Messages | NOT STARTED | — |

**Rollback checkpoint:** `0a4c2a0f` (design doc + plan committed, before any implementation)

---

## Dokumen yang Harus Dibaca (urutan penting)

1. **`docs/cancel-decision/design.md`** — Design document (single source of truth). 7 Codex review rounds. Semua keputusan arsitektur ada di sini.

2. **`docs/cancel-decision/plan.md`** — Implementation plan. 3 phases, 10 tasks. Phase 2 mulai dari Task 2.1. Plan ini sudah melalui 3 ronde koreksi user:
   - Fix 1: Epoch stamping dipindah dari `accept-chat-request.ts` ke `orchestrate-sync-run.ts` (paperSessionId belum ada di accept)
   - Fix 2: UIMessage shape — `message.id` bukan `message._id`, `jsonRendererChoice` ada di historyMessages bukan UIMessage
   - Fix 3: `submittedChoiceKeys` dipass sebagai boolean `isChoiceSubmitted={...}`, bukan Set

3. **`docs/cancel-decision/report/phase-1/REVIEW-PROMPT.md`** — Phase 1 review prompt untuk Codex audit. Berisi checklist + full diff.

---

## Apa yang Sudah Di-implement (Phase 1)

### Files Modified

| File | Lines | Summary |
|------|-------|---------|
| `convex/schema.ts` | +3 | `decisionEpoch: v.optional(v.number())` |
| `convex/paperSessions.ts` | +82 | `stampDecisionEpoch` + `cancelChoiceDecision` mutations |
| `src/lib/chat-harness/executor/types.ts` | +1 | `myEpoch` in OnFinishConfig |
| `src/lib/chat-harness/runtime/orchestrate-sync-run.ts` | +20 | Epoch stamp + pass (primary + fallback) |
| `src/lib/chat-harness/executor/build-on-finish-handler.ts` | +30 | `isEpochCurrent()` + 3 guards |
| `src/components/chat/ChatWindow.tsx` | +84/-8 | Two-set submittedChoiceKeys + handleCancelChoice |
| `src/components/chat/MessageBubble.tsx` | +46/-1 | Batalkan button for choice messages |

### Internal Review Result

10/10 PASS. 0 blockers. 1 minor observation: design doc section 4.1 "last choice submission" filter belum di-implement (low risk, biasanya 1 choice per stage).

---

## Apa yang Harus Di-implement (Phase 2)

Ref: `docs/cancel-decision/plan.md` — section "Phase 2: Cancel Approval + Harness Run Guard"

### Task 2.1: `titleStrippedOnApproval` flag in `approveStage`
- Modify: `convex/paperSessions.ts:1261-1268`
- Simpan flag di stageData saat title "Draf" di-strip

### Task 2.2: `unapproveStage` mutation (PALING KOMPLEKS)
- Modify: `convex/paperSessions.ts`
- Reverse-engineering `approveStage` — revert currentStage, stageStatus, stageData, digest, boundaries, artifact title, naskahSnapshot
- Special case: `completed` → `judul` (final approval revert)

### Task 2.3: `handleCancelApproval` handler + UI
- Modify: `ChatWindow.tsx` + `MessageBubble.tsx`
- Sama pattern dengan handleCancelChoice tapi untuk `kind: "approved"`
- 30-second throttle via `message.createdAt`

### Task 2.4: Phase 2 review

---

## Pelajaran dari Phase 1 (Jangan Ulangi)

1. **UIMessage.id vs Convex._id** — Handler cancel menerima `message.id` (string dari AI SDK). Harus di-map ke Convex `_id` via `historyMessages.find(m => m.uiMessageId === ...)` sebelum dipasang ke `editAndTruncateConversation`.

2. **`jsonRendererChoice` ada di raw Convex messages, BUKAN UIMessage** — Saat rehydrate, spec di-parse dari Convex message dan dijadikan `parts` di UIMessage. Key cleanup harus pakai `historyMessages`.

3. **Epoch stamp di orchestrate, BUKAN accept** — `acceptChatRequest` tidak punya `paperSessionId`. `paperSession` baru di-query di `orchestrate-sync-run.ts:509`.

4. **Icon library: `iconoir-react`** — Project pakai `iconoir-react`, bukan `lucide-react`. Phase 1 pakai `Undo` dari `iconoir-react`.

---

## Execution Model

Subagent-driven development:
- Backend tasks → `backend-developer` agent
- Frontend tasks → `frontend-developer` agent
- Review → `code-reviewer` agent
- Setiap phase ends with review + user validation

Tunggu user bilang "lanjut Phase 2" sebelum dispatch agents.
