# Handoff: Validation Panel Artifact Consistency — Lanjutan Tes UI

Kamu melanjutkan pekerjaan di branch `validation-panel-artifact-consistency`.
Pahami handsoff ini, setelah itu jangan melakukan apapun, dan bersiap menerima instruksi user.

## Konteks Singkat

Sesi sebelumnya melakukan audit sistematis dan memperbaiki 7 bug/gap yang
menyebabkan validation panel dan artifact lifecycle tidak konsisten di 14 stage
paper. Perbaikan sudah diverifikasi (build pass, 28/28 tests pass, tsc tidak
menambah error baru).

## Scope:
Kamu harus menyelesaikan masalah apapun yang terjadi di uji coba ini yang disebutkan user, JANGAN PERNAH TOLAK MASALAH, SEBAB LOGIKANYA MASALAH APAPUN YANG MUNCUL ADALAH MASALAH BRANCH WORKTREE.

**Baca dulu:**
1. `docs/validation-panel-artifact-consistency/HANDOFF-REPORT.md` — laporan
   lengkap investigasi, root causes, dan semua fix yang sudah diterapkan
2. `git log --oneline -5` — lihat state terkini branch

## Apa yang Sudah Diperbaiki (7 fixes)

| Fix | File | Apa yang diperbaiki |
|-----|------|---------------------|
| 1 | `route.ts:1702` | updateArtifact nextAction sekarang mandates submitStageForValidation |
| 2 | `stage-skill-resolver.ts:6-13` | ARTIFACT_CREATION_FOOTER cover create + update path |
| 3 | `route.ts` (2 lokasi) | Universal observability untuk SEMUA 14 stage |
| 4 | `paper-mode-prompt.ts:261` | Revision note MANDATORY SEQUENCE |
| 5 | `route.ts` (4 lokasi) | Ordering-bug detection cover sawUpdateArtifactSuccess |
| 6 | `choice-request.ts:5-15` | POST_CHOICE_FINALIZE_STAGES expanded 9→12 stage |
| 7 | `route.ts` (2 lokasi) | Outcome-gated error leakage replacement diperluas ke SEMUA stage (sebelumnya hanya 7) |

Juga fix prose-leakage false positive (2 lokasi) dan tambah 4 test baru untuk
diskusi/kesimpulan/pembaruan_abstrak/gagasan.

## Apa yang Sudah Dites UI (hasil)

| Stage | Status | Catatan |
|-------|--------|---------|
| gagasan | PASS | Artifact + validation panel muncul |
| topik | PASS | Artifact + validation panel muncul |
| outline | PASS (pipeline) | updateStageData → createArtifact → submitStageForValidation → panel muncul. TAPI: (1) error leakage text muncul di chat — sudah difix oleh Fix 7, (2) model skip choice card langsung generate — ini masalah model compliance, bukan code bug. Skill di DB sudah benar. |
| abstrak–judul | BELUM DITES | 11 stage sisanya belum di-smoke-test |

## Tugas Kamu Sekarang

### 1. Smoke Test UI Sisa 11 Stage

Lanjutkan dari outline yang sudah approved. Test stage berikut secara berurutan:

**Prioritas 1 (rawan gagal berdasarkan sejarah):**
- abstrak
- metodologi
- hasil
- kesimpulan

**Prioritas 2:**
- pendahuluan
- tinjauan_literatur
- diskusi
- pembaruan_abstrak
- daftar_pustaka
- lampiran
- judul

Untuk setiap stage, verifikasi:
1. Choice card muncul (kecuali gagasan yang exploration)
2. Setelah user pilih choice card → artifact terbuat
3. Validation panel muncul
4. Approve berhasil → lanjut ke stage berikutnya
5. Masaalah lain yang terkait dan muncul dalam ujicoba ini. 

Catat failure dalam format:
```
Stage: <nama>
Status: PASS / FAIL
Terminal log: <paste relevant lines>
Screenshot: <path>
Failure class: partial-save-stall / artifact-without-submit / false-validation-claim / error-leakage / lainnya
```

### 2. Kalau Ada Stage yang Gagal

Jangan langsung fix. Investigasi dulu:
1. Baca terminal log — cari `[F1-F6-TEST]` dan `[PAPER]` warnings
2. Cek apakah `stageInstructionSource` adalah `skill` atau `fallback`
3. Kalau skill → masalahnya di skill content di database, bukan di code
4. Kalau fallback → masalahnya di instruction code
5. Kalau tool chain incomplete → cek apakah nextAction directive sampai ke model
6. Report temuan dengan evidence sebelum propose fix

### 3. Setelah Semua Stage Dites

Update `HANDOFF-REPORT.md`:
- Isi tabel smoke test results
- Update "What This Does NOT Fix" section
- Kalau semua pass → siap untuk merge/PR review

## Environment

Ini dilakukan user, bukan kamu:

```bash
# Terminal 1
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/validation-panel-artifact-consistency
npm run dev

# Terminal 2
npm run convex:dev
```

## Batasan

1. JANGAN fix code tanpa evidence dari log/screenshot
2. JANGAN claim stage PASS tanpa melihat validation panel muncul di UI
3. JANGAN blame frontend kalau belum cek backend state di terminal log
4. JANGAN modify skill di database — itu bukan scope branch ini
5. Kalau model skip choice card tapi pipeline tetap berhasil (artifact + panel muncul), itu PASS dengan catatan, bukan FAIL
