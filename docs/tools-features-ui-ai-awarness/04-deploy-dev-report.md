# Deploy Report: Dev DB (wary-ferret-59)

Date: 2026-04-09
Branch: `tools-features-ui-ai-awarness`
Target: dev DB `wary-ferret-59`

---

## Deploy Results

| Item | Version | Status |
|------|---------|--------|
| System prompt | v11 | active ✅ |
| gagasan-skill | v10 | active ✅ |
| topik-skill | v10 | active ✅ |
| outline-skill | v11 | active ✅ |
| abstrak-skill | v10 | active ✅ |
| pendahuluan-skill | v10 | active ✅ |
| tinjauan-literatur-skill | v9 | active ✅ |
| metodologi-skill | v9 | active ✅ |
| hasil-skill | v10 | active ✅ |
| diskusi-skill | v11 | active ✅ |
| kesimpulan-skill | v11 | active ✅ |
| pembaruan-abstrak-skill | v11 | active ✅ |
| daftar-pustaka-skill | v10 | active ✅ |
| lampiran-skill | v9 | active ✅ |
| judul-skill | v10 | active ✅ |

**Dry-run verification: 14/14 passed ✅**

---

## Judul-Skill Dry-Run Failure — Root Cause & Fix

### Initial symptom

First dry-run after deploy showed 13/14 passed, with judul-skill failing on:
- Output Contract key mismatch: `ideKasar, analisis, angle, novelty, referensiAwal` (gagasan keys)
- searchPolicy "active" expected "passive"
- Missing living outline checklist mention

### Investigation

Queried `stageSkills:getVersionHistory` for judul-skill. Found 10 versions:

| Version | Status | Content |
|---------|--------|---------|
| v10 | active | Correct judul content (our deploy) |
| v9 | published | Correct judul content |
| v8 | published | Correct judul content |
| v7 | published | Correct judul content |
| v6 | published | Correct judul content |
| **v5** | **draft** | **WRONG — contains gagasan-skill content** |
| v4 | published | Correct judul content |
| v3 | published | Correct judul content |
| v2 | published | Correct judul content |
| v1 | published | Correct judul content |

### Root cause

**Version 5** (status: `draft`) contained gagasan-skill content, not judul-skill content. The changeNote `"copy-fix: Artifact→Artefak, Approve→Setujui"` suggests a copy-paste error during a previous deployment cycle — gagasan content was accidentally saved as a draft under judul-skill.

The dry-run validator in `convex/stageSkills.ts:988` selects candidates in order: `latestDraft ?? latestPublished ?? active`. Since v5 was the only draft, the validator picked v5 (wrong gagasan content) instead of v10 (correct active judul content).

### Fix applied

Archived v5 via:
```
npx convex run stageSkills:archiveVersion '{"requestorUserId": "jn755zs64zgafr0mn4qhrghzwn7x6y48", "skillId": "judul-skill", "version": 5}'
```

After archiving, dry-run now picks `latestPublished` (v9, correct judul content) as candidate → **14/14 passed**.

### Why our changes did not cause this

Our deploy (Phase 2A) added readArtifact to judul-skill v10. This was correctly deployed and activated. The stale draft v5 predates our work — its changeNote references a previous copy-fix deployment cycle. Our readArtifact addition to v10 did not create or modify v5.

---

## Deploy Script Safety Guard

Added `assert_dev_deployment()` function to `scripts/deploy-skills-dev.py`:
- Reads `NEXT_PUBLIC_CONVEX_URL` from `.env.local`
- Aborts with error if URL does not match `https://wary-ferret-59.convex.cloud`
- Prevents accidental deployment to production

---

## Files Changed (post-implementation)

| File | Change |
|------|--------|
| `scripts/deploy-skills-dev.py` | Updated SRC_DIR, CHANGE_NOTE, added assert_dev_deployment() safety guard |

---

## Next Steps

1. Test MOKA behavior in dev environment to verify awareness patches work as expected
2. After dev validation: deploy to prod DB (basic-oriole-337) using `scripts/deploy-skills-prod.py`
