┌─────┬────────────┬──────────────┬─────────────────────────────────────────────────────────┐
  │  #  │   Phase    │ Status saat  │                         Output                          │
  │     │            │     ini      │                                                         │
  ├─────┼────────────┼──────────────┼─────────────────────────────────────────────────────────┤
  │     │ Load       │              │ Baca SCOPE + README + index + glossary (missing) + 3    │
  │ 0   │ Context    │ ✅ done      │ reference + 06-agent-harness/ index + 6 sub-file.       │
  │     │            │              │ Findings di awal Phase 1 doc.                           │
  ├─────┼────────────┼──────────────┼─────────────────────────────────────────────────────────┤
  │     │ Audit      │ ✅ done,     │ Per-claim verification log doc 02-06 vs src/. ~55 claim │
  │ 1   │ Current    │ committed    │  diaudit (50 ✅, 2 ⚠️  partial, 2 🆕 doc-missing, 0 ❌,  │
  │     │ State      │ 0082b85e     │ 1 deferred). File: 01-phase1-audit-result.md.           │
  ├─────┼────────────┼──────────────┼─────────────────────────────────────────────────────────┤
  │     │ Gap        │ ✅ done,     │ Matrix REST × 12-component, 48 cell. 23 SOLID / 17      │
  │ 2   │ Analysis   │ committed    │ PARTIAL / 0 ABSENT / 0 DIVERGENT / 4 N/A. Top gap       │
  │     │            │ 31ccb81a     │ cluster A-D. File: 02-phase2-gap-matrix.md.             │
  ├─────┼────────────┼──────────────┼─────────────────────────────────────────────────────────┤
  │     │            │              │ Rebuild spec untuk gap di Phase 2. Per gap: target      │
  │ 3   │ Spec       │ ⏳ pending   │ state, constraints (Six Design Principles + State       │
  │     │            │              │ Separation Principle), migration path Convex data,      │
  │     │            │              │ out-of-scope eksplisit.                                 │
  ├─────┼────────────┼──────────────┼─────────────────────────────────────────────────────────┤
  │     │ Task       │              │ Decompose spec jadi executable task. Tiap task: satu    │
  │ 4   │ Breakdown  │ ⏳ pending   │ pillar primary (jangan campur R + S), acceptance        │
  │     │            │              │ criteria tied to evidence, ordered by dependency.       │
  ├─────┼────────────┼──────────────┼─────────────────────────────────────────────────────────┤
  │     │            │              │ Eksekusi task satu per satu. Read source → make change  │
  │ 5   │ Implement  │ ⏳ pending   │ → verify → commit small (one pillar per commit          │
  │     │            │              │ minimum). Re-check matrix cell setelah tiap task.       │
  └─────┴────────────┴──────────────┴─────────────────────────────────────────────────────────┘