# Readiness Evaluator Spec — Global Auto-Present Safety Gate

> Status: Draft design spec.
> Purpose: define deterministic `ready for review` checks per stage family before any global auto-present validation enforcement is enabled.

---

## Why This Exists

Contract-level auto-present is now global:

- `submitStageForValidation` means "present draft + artifact for user review"
- `approveStage` remains the only action that advances the workflow

Runtime auto-present is **not** global yet. Today, only the harness path for
`gagasan` and `topik` can force `updateStageData -> createArtifact -> submitStageForValidation`.
For all other stages, submission is still mostly instruction-driven.

This spec defines the minimum deterministic checks required before runtime
auto-present can be safely generalized.

---

## Design Goals

1. Prevent false-positive auto-present.
   Validation panel must not appear while the draft is still structurally incomplete.

2. Keep evaluation deterministic.
   Readiness must be derived from `stageData`, `stageStatus`, and artifact state,
   not inferred from free-form model text.

3. Separate contract from enforcement.
   Global wording can exist before global runtime enforcement.

4. Make go/no-go decisions measurable.
   Each stage family must have explicit implementation and test gates.

---

## Shared Runtime Contract

Any readiness evaluator, regardless of family, must enforce these base guards:

- `stageStatus === "drafting"`
- `ringkasan` exists and is non-empty
- `artifactId` exists
- current turn is not in web-search compose phase
- stage is not already `pending_validation`
- stage has no known hard blocker from family-specific rules

Shared output:

```ts
type ReadinessDecision = {
  ready: boolean
  family: "foundation" | "core_narrative" | "structured_analytical" | "collection" | "hierarchical"
  reason:
    | "ready"
    | "missing_ringkasan"
    | "missing_artifact"
    | "wrong_stage_status"
    | "search_turn"
    | "family_rule_failed"
  failedChecks: string[]
}
```

Implementation note:

- Evaluator should return structured failure reasons for observability.
- Auto-present should trigger only when `ready === true`.

---

## Stage Family Map

### Family 1 — Foundation

Stages:

- `gagasan`
- `topik`

Current state:

- Already partially enforced by `buildIncrementalSavePrepareStep()`.
- Lowest risk for deterministic enforcement.

Required readiness fields:

- `gagasan`
  - `ideKasar`
  - `analisis`
  - `angle`
- `topik`
  - `definitif`
  - `angleSpesifik`
  - `argumentasiKebaruan`
  - `researchGap`

Optional fields ignored for readiness:

- `novelty`
- `referensiAwal`
- `referensiPendukung`
- `ringkasanDetail`

Readiness rules:

- every required field is a non-empty string
- base guards pass

Blockers:

- active search turn
- unresolved save pipeline failure

Minimum implementation checklist:

- readiness evaluator can compute all required fields deterministically
- current harness path uses same evaluator output
- auto-present path logs stage, family, and failed checks

Minimum test checklist:

- all required fields present -> `ready: true`
- one missing required field -> `ready: false`
- `ringkasan` missing -> `ready: false`
- `artifactId` missing -> `ready: false`

Go/No-Go:

- `GO`

---

### Family 2 — Core Narrative

Stages:

- `abstrak`
- `pendahuluan`
- `tinjauan_literatur`
- `diskusi`

Current state:

- Wording is aligned globally.
- Runtime auto-present is not enforced.
- These stages are mostly string-driven, but some include supporting arrays.

Required readiness fields:

- `abstrak`
  - `ringkasanPenelitian`
  - `keywords`
  - `wordCount`
- `pendahuluan`
  - `latarBelakang`
  - `rumusanMasalah`
  - `researchGapAnalysis`
  - `tujuanPenelitian`
  - `sitasiAPA`
- `tinjauan_literatur`
  - `kerangkaTeoretis`
  - `reviewLiteratur`
  - `gapAnalysis`
  - `referensi`
- `diskusi`
  - `interpretasiTemuan`
  - `perbandinganLiteratur`
  - `implikasiTeoretis`
  - `keterbatasanPenelitian`

Optional fields ignored for readiness:

- `ringkasanDetail`
- stage-specific elaboration fields such as `signifikansiPenelitian`, `hipotesis`, `implikasiPraktis`, `saranPenelitianMendatang`

Readiness rules:

- required string fields: non-empty
- required array fields: non-empty
- required number fields: finite and `> 0`
- base guards pass

Blockers:

- artifact exists but required supporting array is empty
- `wordCount <= 0`
- required citations/references missing

Minimum implementation checklist:

- explicit per-stage required field map separate from `task-derivation`
- typed evaluator for `string`, `array`, and `number`
- artifact content is generated from final stage state, not stale state

Minimum test checklist:

- valid stage data -> `ready: true`
- empty supporting array -> `ready: false`
- `wordCount = 0` -> `ready: false`
- optional fields missing but required fields complete -> still `ready: true`

Go/No-Go:

- `NO-GO` until required-vs-optional field map is implemented and tested

---

### Family 3 — Structured Analytical

Stages:

- `metodologi`
- `hasil`
- `kesimpulan`
- `pembaruan_abstrak`

Current state:

- Higher structural risk than narrative stages.
- Uses enum, array, and number fields that are easy to mark "present" but still semantically weak.

Required readiness fields:

- `metodologi`
  - `desainPenelitian`
  - `metodePerolehanData`
  - `teknikAnalisis`
  - `pendekatanPenelitian`
- `hasil`
  - `temuanUtama`
  - `metodePenyajian`
- `kesimpulan`
  - `ringkasanHasil`
  - `jawabanRumusanMasalah`
  - `saranPeneliti`
- `pembaruan_abstrak`
  - `ringkasanPenelitianBaru`
  - `perubahanUtama`

Conditionally required fields:

- `hasil.dataPoints`
  - required if artifact format/presentation implies tabular or mixed evidence
- `pembaruan_abstrak.keywordsBaru`
  - not required by default

Readiness rules:

- required string fields: non-empty
- required enum fields: one of allowed enum members
- required arrays: non-empty
- base guards pass

Blockers:

- enum field contains arbitrary string not in schema
- array contains zero items
- artifact content does not reflect the selected enum path

Minimum implementation checklist:

- schema-aware enum validation
- support for conditional requirements
- explicit artifact consistency rule for enum-driven stages

Minimum test checklist:

- invalid enum value -> `ready: false`
- empty required array -> `ready: false`
- valid enum + valid arrays -> `ready: true`
- conditional `dataPoints` behavior covered

Go/No-Go:

- `NO-GO` until evaluator supports enum + conditional field logic

---

### Family 4 — Collection / Compilation

Stages:

- `daftar_pustaka`
- `lampiran`
- `judul`

Current state:

- Highest business-rule dependence.
- Simple presence checks are not enough.

Required readiness fields:

- `daftar_pustaka`
  - `entries`
- `lampiran`
  - either `items` non-empty
  - or `tidakAdaLampiran === true`
- `judul`
  - `opsiJudul`
  - `judulTerpilih`

Conditionally required fields:

- `lampiran.alasanTidakAda`
  - required if `tidakAdaLampiran === true`
- `judul.alasanPemilihan`
  - strongly recommended for review, optional for first pass unless product decides otherwise

Readiness rules:

- `daftar_pustaka.entries.length > 0`
- `lampiran`: valid by either branch
- `judul.opsiJudul.length >= 3` minimum for review safety
- `judulTerpilih` must match one of the generated title options
- base guards pass

Blockers:

- bibliography entries exist but are malformed objects
- appendix marked empty without rationale
- selected title not found in options

Minimum implementation checklist:

- cardinality validation for array-of-objects stages
- branch-aware validation for `lampiran`
- cross-field consistency check for `judul`

Minimum test checklist:

- `lampiran` with no items and no `tidakAdaLampiran` -> `ready: false`
- `lampiran.tidakAdaLampiran === true` without rationale -> `ready: false`
- `judulTerpilih` not in options -> `ready: false`
- malformed bibliography entry -> `ready: false`

Go/No-Go:

- `NO-GO` until business rules are encoded explicitly

---

### Family 5 — Hierarchical Structure

Stages:

- `outline`

Current state:

- Highest structural complexity.
- Array presence is insufficient for readiness.

Required readiness fields:

- `sections`
- `totalWordCount`

Recommended readiness fields:

- `completenessScore`

Readiness rules:

- `sections.length > 0`
- every section object has:
  - `id`
  - `level`
- `totalWordCount > 0`
- at least one root section exists
- no orphan child references
- if `completenessScore` exists, value must be between `0` and `100`
- base guards pass

Blockers:

- empty hierarchy
- invalid parent-child references
- word budget missing or zero
- structurally malformed section items

Minimum implementation checklist:

- dedicated outline structure validator
- hierarchy consistency checks
- no reliance on array presence alone

Minimum test checklist:

- empty sections -> `ready: false`
- orphan `parentId` -> `ready: false`
- `totalWordCount = 0` -> `ready: false`
- valid tree + positive budget -> `ready: true`

Go/No-Go:

- `NO-GO` until dedicated structural validator exists

---

## Cross-Family Checklist Before Enabling Runtime Auto-Present

For any family to move from `NO-GO` to `GO`, all items below must be true:

- family has explicit required-vs-optional field map
- evaluator logic is deterministic and typed
- evaluator returns structured failure reasons
- artifact consistency rule exists
- regression tests cover at least one false-positive scenario
- observability logs show why a stage was considered ready

Recommended runtime log shape:

```ts
console.log("[AutoPresent][Readiness]", {
  stage,
  family,
  ready,
  failedChecks,
})
```

---

## Implementation Order Recommendation

1. Keep `Foundation` as enforced baseline.
2. Add evaluator framework and contract tests.
3. Enable `Core Narrative`.
4. Add enum + conditional logic.
5. Re-evaluate `Structured Analytical`.
6. Add business-rule validators.
7. Re-evaluate `Collection / Compilation`.
8. Add outline structural validator last.
9. Re-evaluate `Hierarchical Structure`.

---

## Current Recommendation

Current go/no-go decision:

- `Foundation`: `GO`
- `Core Narrative`: `NO-GO`
- `Structured Analytical`: `NO-GO`
- `Collection / Compilation`: `NO-GO`
- `Hierarchical Structure`: `NO-GO`

Reason:

- Only `Foundation` currently has low enough structural ambiguity for safe runtime enforcement.
- All other families still need family-specific readiness evaluators before global auto-present can be considered safe.

