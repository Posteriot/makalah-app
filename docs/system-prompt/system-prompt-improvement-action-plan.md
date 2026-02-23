# System Prompt Improvement Action Plan

## 1. Tujuan Eksekusi

Action plan ini menjadi acuan implementasi untuk:

1. Menyelaraskan prompt aktif dengan tool contract terbaru.
2. Menambahkan server-side enforcement untuk artifact sources.
3. Menambahkan drift monitoring.
4. Menjalankan strict cleanliness setelah verifikasi prompt baru lolos.

## 2. Scope Perubahan

In-scope:

1. Prompt operational update (active prompt content).
2. Code changes pada Chat API dan monitoring admin.
3. Testing untuk memastikan guard berjalan benar.

Out-of-scope:

1. Refactor besar paper workflow.
2. Perubahan skema billing.
3. Perubahan model provider strategy.

## 3. Rencana Implementasi Per File

| File | Perubahan Teknis | Output yang Diharapkan |
|---|---|---|
| `src/app/api/chat/route.ts` | Tambah guard di jalur `createArtifact` dan `updateArtifact` untuk validasi `sources` saat web sources tersedia | Artifact berbasis web sources tidak bisa lolos tanpa `sources` |
| `src/components/admin/SystemHealthPanel.tsx` | Tambah status visual drift prompt (signature/tool policy mismatch) | Admin bisa lihat drift prompt secara cepat |
| `convex/systemAlerts.ts` | Tambah query/mutation pendukung alert drift prompt | Drift alert tercatat sebagai warning dan bisa ditindak |
| `docs/system-prompt/README.md` | Update referensi operasional sesuai behavior baru (tanpa sejarah) | Dokumentasi utama sinkron dengan runtime behavior |
| `docs/system-prompt/system-prompt-improvement-design.md` | Menjadi design baseline | Keputusan teknis terdokumentasi |
| `docs/system-prompt/system-prompt-improvement-action-plan.md` | Menjadi execution baseline | Urutan implementasi dan kriteria lulus jelas |
| `src/lib/ai/artifact-sources-policy.test.ts` | Tambah test cases enforcement artifact sources | Guard tervalidasi otomatis |

Catatan operasional prompt content:

1. Active prompt update dilakukan via Admin Panel System Prompts.
2. Verifikasi prompt runtime dilakukan via command Convex.

## 4. Urutan Eksekusi

## Phase 1 - Prompt Alignment

1. Tarik prompt aktif runtime.
2. Edit konten prompt:
   - ganti signature lama `updateStageData({ stage, data })`,
   - tambah section `SOURCES DAN SITASI ARTIFACT`.
3. Simpan sebagai versi baru.
4. Activate versi baru.
5. Verifikasi runtime prompt.

Deliverable:

1. Prompt aktif sudah sinkron contract.

## Phase 2 - Runtime Enforcement

1. Implement guard `sources` pada artifact tools di `src/app/api/chat/route.ts`.
2. Return error terstruktur saat kondisi wajib sources tidak terpenuhi.
3. Pastikan kondisi non-web tetap lolos.

Deliverable:

1. Enforcement deterministic di server layer.

## Phase 3 - Drift Monitoring

1. Tambah drift check logic.
2. Emit alert warning jika signature lama/policy sources tidak sesuai.
3. Tampilkan status di `SystemHealthPanel`.

Deliverable:

1. Drift terlihat di observability panel.

## Phase 4 - Verification dan Hardening

1. Jalankan test cases.
2. Jalankan lint.
3. Jalankan uji manual end-to-end flow.

Deliverable:

1. Semua acceptance criteria lolos.

## Phase 5 - Strict Cleanliness (Post-Verification)

1. Konfirmasi prompt baru sudah lolos semua gate.
2. Hapus prompt chain lama yang tidak lagi dibutuhkan.
3. Simpan bukti verifikasi dan bukti pembersihan.

Deliverable:

1. Environment prompt bersih dan konsisten.

## 5. Acceptance Criteria

## 5.1 Functional

1. Active prompt tidak lagi memuat `updateStageData({ stage, data })`.
2. Active prompt memuat section `SOURCES DAN SITASI ARTIFACT`.
3. Pada kondisi web sources tersedia, artifact call tanpa `sources` ditolak.
4. Pada kondisi web sources tidak tersedia, artifact call tanpa `sources` tetap diizinkan.
5. Drift alert muncul jika active prompt kembali tidak sinkron.

## 5.2 Non-Functional

1. Tidak ada regression pada flow paper drafting normal.
2. Tidak ada perubahan perilaku auth dan billing.
3. Alert severity drift menggunakan level `warning`, bukan `critical`.

## 6. Test Cases

## 6.1 Automated Test Cases

1. `TC-A1`: web sources tersedia + `createArtifact` tanpa `sources` -> expect fail.
2. `TC-A2`: web sources tersedia + `createArtifact` dengan `sources` -> expect success.
3. `TC-A3`: web sources tidak tersedia + `createArtifact` tanpa `sources` -> expect success.
4. `TC-A4`: web sources tersedia + `updateArtifact` tanpa `sources` -> expect fail.
5. `TC-A5`: prompt drift detector mendeteksi signature lama -> expect warning alert dibuat.

## 6.2 Manual E2E Test Cases

1. `TC-M1`: User minta web search lalu minta artifact, cek citation sources ikut tersimpan.
2. `TC-M2`: User workflow paper tanpa web search tetap berjalan.
3. `TC-M3`: Admin Panel menampilkan status drift/no-drift sesuai kondisi prompt aktif.
4. `TC-M4`: Ganti prompt aktif ke versi yang sengaja drift, cek alert muncul.

## 6.3 Verification Commands

```bash
npm run convex -- run systemPrompts:getActiveSystemPrompt
npm run lint
npm run test
```

## 7. Evidence Checklist

Sebelum strict cleanliness, bukti wajib:

1. Output prompt aktif terbaru.
2. Hasil test pass.
3. Bukti guard artifact bekerja.
4. Bukti drift monitoring aktif.

Sesudah strict cleanliness, bukti wajib:

1. Daftar prompt chain tersisa.
2. Konfirmasi prompt aktif tetap benar.
3. Konfirmasi tidak ada regression pada smoke test chat.

## 8. Risiko Eksekusi dan Kontrol

Risiko:

1. Enforcement terlalu ketat dan memblokir kasus valid.
2. Drift detector menghasilkan alert noise.
3. Penghapusan prompt chain terlalu dini.

Kontrol:

1. Gunakan condition enforcement berbasis availability web sources.
2. Gunakan rule drift yang minimal dan jelas.
3. Strict cleanliness hanya setelah gate verifikasi lulus penuh.

## 9. Definition of Done

Task dianggap selesai jika:

1. Semua acceptance criteria terpenuhi.
2. Semua test cases penting lulus.
3. Prompt runtime sinkron dengan contract tool.
4. Strict cleanliness selesai dan terdokumentasi.
