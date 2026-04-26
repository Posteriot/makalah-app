# HANDOFF — Durable Agent Harness Audit & Rebuild

> **Untuk session berikutnya yang melanjutkan kerjaan ini.** Baca file ini PERTAMA sebelum apa-apa.

**Branch:** `durable-agent-harness`
**Worktree:** `/Users/eriksupit/Desktop/makalahapp/.worktrees/durable-agent-harness`
**Last touched:** 2026-04-26
**Last commit di trail audit:** `64797ba1` (Phase 3 spec)

---

## 1. Apa Yang Lagi Dikerjakan

Audit + rebuild harness Makalah AI untuk durabilitas, mengikuti skill `makalah-durable-harness` (6-phase forced sequence).

**Definisi durabilitas** = framework R.E.S.T (Reliability, Efficiency, Security, Traceability) dari `harness-engineering-guid.md` × 12-component anatomy dari `anatomy-agent-harness.md`.

**Output sejauh ini:** semua dokumen audit di folder ini (`docs/makalah-agent-harness/`). Belum sentuh `src/` atau `convex/` — semua masih di tahap planning.

---

## 2. Status Phase

| # | Phase | Status | File output | Commit |
|---|---|---|---|---|
| 0 | Load Context | ✅ done (re-load wajib di session baru) | (no file, baca live source) | — |
| 1 | Audit Current State | ✅ done | `01-phase1-audit-result.md` | `0082b85e` |
| 2 | Gap Analysis | ✅ done | `02-phase2-gap-matrix.md` | `31ccb81a` |
| 3 | Spec | ✅ done (Cluster A full, B/C/D sketch) | `03-phase3-rebuild-spec.md` | `64797ba1` |
| 4 | Task Breakdown | ⏳ pending | `04-phase4-tasks.md` (belum dibikin) | — |
| 5 | Implement | ⏳ pending | (touch `src/` + `convex/`) | — |

---

## 3. File Inventory di Folder Ini

| File | Isi | Kapan Dibaca |
|---|---|---|
| `00-handoff.md` | (file ini) Pointer + state untuk handoff | Pertama, di setiap session baru |
| `01-phase1-audit-result.md` | Per-claim verification log doc 02-06 vs `src/`. ~55 claim diaudit. 50 ✅ / 2 ⚠️ / 2 🆕 / 0 ❌. | Saat butuh evidence per-claim atau verifikasi divergensi tertentu |
| `02-phase2-gap-matrix.md` | Matrix REST × 12-component, 48 cell. 23 SOLID / 17 PARTIAL / 0 ABSENT / 4 N/A. Top gap cluster A-D. | Saat butuh peta gap atau prioritization |
| `03-phase3-rebuild-spec.md` | Spec 6 item Cluster A (Reliability) + sketch Cluster B/C/D. Per item: target, approach, constraints, migration, acceptance. | Saat lanjut Phase 4 atau Phase 5 |

**File yang BELUM ada (untuk dibikin di phase berikutnya):**
- `04-phase4-tasks.md` — task breakdown executable dari spec Cluster A.
- `05-phase5-implementation-log.md` — kalau mau, log eksekusi per task.

---

## 4. Mandatory Re-Load Checklist (Phase 0 untuk Session Baru)

Sebelum ngapa-ngapain, session baru WAJIB re-baca:

1. ✅ `branch-scope` skill (auto-fired oleh hook saat session start) — lihat SCOPE.md.
2. ✅ `makalah-whitebook` skill (auto-fired oleh hook saat prompt mention Makalah).
3. ✅ `makalah-durable-harness` skill (invoke manual via Skill tool — "study skill makalah-durable-harness").
4. ✅ Baca `docs/what-is-makalah/README.md` + `index.md`.
5. ✅ Baca tiga reference file di `docs/what-is-makalah/references/agent-harness/`:
   - `anatomy/anatomy-agent-harness.md`
   - `harness-engineering-guid.md`
   - `control-plane-domain-action.md`
6. ✅ Baca `docs/what-is-makalah/06-agent-harness/index.md` + 6 sub-file `01-06.md`.
7. ✅ Baca file di folder ini sesuai status phase saat session baru — minimal `00-handoff.md` (file ini), lalu `03-phase3-rebuild-spec.md` kalau lanjut Phase 4/5.

**Total ~13 file = ~5-10 menit re-read.** Kompresi tidak disarankan — skill mensyaratkan, dan doc evolves antar session.

---

## 5. Known Doc-Bug (Skip, Jangan Buang Waktu Investigate)

Sudah dicatat di Phase 1 audit, tidak perlu re-investigate:

1. **`docs/what-is-makalah/glossary.md` TIDAK EKSIS.** Disebut wajib oleh `index.md:165` dan oleh whitebook hook. File memang tidak ada di filesystem. Bukan bug audit, bug White Book sendiri. Skip.
2. **Hardcoded path `file:///.../worktrees/what-is-makalah/...` di seluruh `06-agent-harness/*.md`.** Link broken di branch `durable-agent-harness`. Path absolut salah worktree. Skip — path relatif benar (`../references/agent-harness/...`).
3. **SCOPE.md cuma sebut 2 reference file** (anatomy + engineering-guid). `control-plane-domain-action.md` tetap wajib dibaca per skill — sudah dijustifikasi di Phase 0 audit doc.

**Doc-bug fix candidate (kalau ada bandwidth, di luar scope audit):**
- Bikin `glossary.md` atau hapus referensi wajibnya.
- Replace hardcoded `file:///` paths jadi relatif.
- Update SCOPE.md include `control-plane-domain-action.md`.

---

## 6. Where to Resume

### Kalau lanjut ke Phase 4 (task breakdown):

1. Baca `00-handoff.md` (file ini), `03-phase3-rebuild-spec.md`.
2. Re-load checklist Phase 0 (Sec 4 di atas).
3. Decompose 6 item Cluster A jadi executable task:
   - Tiap task: satu pillar primary (jangan bundle Reliability + Security di satu PR).
   - Acceptance criteria tied to evidence (test command, observable behavior).
   - Ordered by dependency. Saran sequencing yang udah keidentifikasi:
     - **A4 dulu** (error classification) — dependency untuk A1 mapping `lease_expired` → tier "unexpected".
     - **A2 paralel dengan A4** — atomic pause/resume, independent.
     - **A1 setelah A4** — depend pada error classification.
     - **A3 setelah A2** — outbox bisa reuse atomic mutation pattern.
     - **A6 paralel** — memory pattern, independent.
     - **A5 terakhir** — LLM judge, paling expensive, opt-in per stage.
4. Tulis output ke `04-phase4-tasks.md`.
5. Commit dengan format `docs(harness-audit): add phase 4 task breakdown`.

### Kalau lanjut ke Phase 5 (implementation):

Per skill: tiap task ke commit kecil, satu pillar per commit minimum, re-check matrix cell setelah tiap task. JANGAN bundle multi-pillar dalam satu commit.

### Kalau user minta scope baru (di luar Cluster A):

Push back — Cluster B/C/D sudah dijelaskan deferred-with-reason di `03-phase3-rebuild-spec.md`. Spec round berikut hanya kalau Cluster A landed dulu. Jangan analysis paralysis.

### Kalau user minta perubahan ke Phase 1 / 2 / 3 doc:

Boleh, tapi update commit harus eksplisit revisi ("revise phase X to ..."). Doc audit forensic snapshot — perubahan harus ditrace.

---

## 7. Update Instructions untuk File Ini

**WAJIB update file ini setiap kali:**
- Phase advance (Phase 4 done → update tabel Sec 2).
- File baru ditambah ke folder (update Sec 3).
- Doc-bug baru ditemukan (update Sec 5).
- "Where to resume" berubah karena progress (update Sec 6).

**Format commit untuk update handoff:**
```
docs(harness-audit): update handoff — phase X advanced
```

---

## 8. Tone / Style Guidance untuk Next Session

User punya feedback memory yang relevan — baca dulu sebelum respond:
- `feedback_analysis_paralysis.md` — JANGAN identify 22 issues 3 docs zero fix.
- `feedback_no_questions_act.md` — kalau jawaban obvious, jangan tanya, langsung act.
- `feedback_dont_run_ahead.md` — deliver yang diminta, stop, jangan auto-advance ke phase berikutnya.
- `feedback_no_flip_flop.md` — pegang posisi dari evidence; flip cuma kalau ada new evidence.
- `feedback_solution_not_reaction.md` — clean solutions dengan argumen, bukan reactive patch.

Default mode: konkret, ringkas, evidence-first, anti-sycophant. Pakai gue-lo Jakarta-style Indonesia. Hindari "you might be right but..." — kalau evidence ada, langsung statement.

---

## Appendix A — Commit Trail Audit

```
64797ba1 docs(harness-audit): add phase 3 rebuild spec
31ccb81a docs(harness-audit): add phase 2 REST × 12-component gap matrix
0082b85e docs(harness-audit): add phase 1 per-claim verification result
```

Semua di branch `durable-agent-harness`. Tidak di-push ke remote (sesuai pattern user — push hanya saat eksplisit diminta).
