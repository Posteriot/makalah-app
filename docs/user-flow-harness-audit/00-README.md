# User-Flow Harness Audit

Audit harness Makalah AI **dari sudut pandang user-flow** (behavior-first), bukan dari rubrik engineering.

**Pembeda dari audit phase 1-3 yang sudah ada (`docs/makalah-agent-harness/`):**
- Phase 1-3: rubrik REST × 12-component anatomy. Engineering-rubric.
- Audit ini: lensa user-flow doc (`docs/what-is-makalah/references/user-flow/`). Tiap stage dicek perilakunya: yang harusnya terjadi, yang aktual terjadi, dan di mana divergensinya.

**Cakupan saat ini:** Stage 1 (Gagasan) only. Stage 2-14 belum.

## File di folder ini

| File | Isi |
|---|---|
| `00-README.md` | (file ini) |
| `01-stage-gagasan-audit.md` | Audit lengkap stage 1: 15 anomaly (12 stage-spesifik + 3 supporting) + rekomendasi + cakupan + reviewer pass |
| `02-jalur-a-implementation-spec.md` | Spec implementasi Jalur A (3 tool + cleanup pipa). Resolves 11 dari 15 anomaly. 6 sprint, 3-4 hari. |

## Source-of-truth yang dipakai

- **Spec / expected behavior:** `docs/what-is-makalah/references/user-flow/user-flows-01-gagasan.md` + `user-flows-00.md` (cross-stage mechanisms).
- **Stage skill aktif (DB dev `wary-ferret-59`):** mirror offline di `docs/what-is-makalah/references/agent-harness/system-prompt-skills-active/updated-9/01-gagasan-skill.md` + `system-prompt.md`.
- **Implementation:** `src/lib/ai/`, `src/lib/chat-harness/`, `src/lib/chat/`, `convex/`.
- **Deploy mechanism:** `scripts/deploy-skills-dev.py` (deploy mirror → DB).

## Hubungan dengan audit existing

- **Tidak menggantikan** Phase 1-3. Komplementer.
- Phase 2 gap matrix (`docs/makalah-agent-harness/02-phase2-gap-matrix.md`) covers reliability/security/efficiency/traceability gap. Audit ini covers **kontrak skill ↔ kontrak code** alignment per stage.
- Phase 3 spec (`03-phase3-rebuild-spec.md`) berisi rebuild Cluster A (Reliability). Audit ini menemukan **anomaly perilaku** yang tidak masuk di Cluster A — seperti tool yang dijanjikan skill tapi tidak ada.
