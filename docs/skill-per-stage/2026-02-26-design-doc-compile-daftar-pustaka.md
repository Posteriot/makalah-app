# Design Doc: compileDaftarPustaka untuk Stage Daftar Pustaka

Tanggal: 26 Februari 2026  
Status: Draft Implementable  
Scope: Jalur eksekusi tool + mutation server-side untuk kompilasi referensi lintas stage (1-10) ke stage `daftar_pustaka`

---

## 1) Latar Belakang

Saat ini stage `daftar_pustaka` masih sangat bergantung pada kompilasi manual oleh model melalui `updateStageData`. Dampaknya:
1. Jalur eksekusi khusus untuk kompilasi belum ada di `src/lib/ai/paper-tools.ts`.
2. Konsistensi referensi lintas stage belum deterministik server-side.
3. Risiko reference drift saat ada rewind/revisi masih terbuka kalau tidak ada guard kompilasi eksplisit.

Temuan codebase (baseline):
1. Tool paper yang tersedia sekarang hanya `startPaperSession`, `getCurrentPaperState`, `updateStageData`, `submitStageForValidation` di [paper-tools.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-tools.ts).
2. Auto-persist hasil search ke `webSearchReferences` sudah ada via `appendSearchReferences` di [paperSessions.ts](/Users/eriksupit/Desktop/makalahapp/convex/paperSessions.ts).
3. Struktur data `daftar_pustaka` (`entries`, `totalCount`, `incompleteCount`, `duplicatesMerged`) sudah tersedia di schema/types.
4. Rewind sudah men-clear `validatedAt` stage invalidated dan menandai digest sebagai `superseded`.

---

## 2) Tujuan

1. Menambahkan jalur eksekusi resmi `compileDaftarPustaka` di layer tool dan backend.
2. Kompilasi referensi dilakukan server-side berdasarkan stage yang sudah approved (`validatedAt`).
3. Hasil kompilasi dipersist ke `stageData.daftar_pustaka` lewat `updateStageData` (supaya tetap ikut whitelist + guard existing).
4. Menambahkan guard tambahan untuk mencegah referensi dari stage superseded/invalidated ikut terkompilasi.
5. Menambahkan testing dedup/merge dan observability jumlah referensi yang dikompilasi.

Non-goal:
1. Tidak mengubah urutan 13 stage.
2. Tidak mengganti mekanisme approve/revise existing.
3. Tidak mengubah format export Word/PDF saat ini.

---

## 3) Desain Arsitektur

## 3.1 Komponen Baru

1. Mutation baru: `api.paperSessions.compileDaftarPustaka` di [paperSessions.ts](/Users/eriksupit/Desktop/makalahapp/convex/paperSessions.ts).
2. Tool baru: `compileDaftarPustaka` di [paper-tools.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-tools.ts).
3. Helper pure function (disarankan): `src/lib/paper/daftar-pustaka-compiler.ts` untuk dedup/merge/normalisasi agar bisa unit test.

## 3.2 Eksekusi Runtime (happy path)

1. Model di stage `daftar_pustaka` memanggil tool `compileDaftarPustaka`.
2. Tool mengambil session aktif by conversation.
3. Tool memanggil mutation `paperSessions.compileDaftarPustaka` untuk build payload kompilasi server-side.
4. Tool memanggil mutation `paperSessions.updateStageData` dengan payload hasil kompilasi:
   - `entries`
   - `totalCount`
   - `incompleteCount`
   - `duplicatesMerged`
   - `ringkasan` (dan opsional `ringkasanDetail`)
5. Tool mengembalikan ringkasan hasil compile ke model (count + warning jika ada data incomplete).

Catatan: persist final tetap lewat `updateStageData` agar mengikuti guard whitelist, coercion, truncation, dan warning pipeline yang sudah ada.

---

## 4) Sumber Data dan Aturan Kompilasi

## 4.1 Sumber Referensi Lintas Stage

Scope stage sumber: `gagasan` s.d. `kesimpulan` (1-10), tidak termasuk `daftar_pustaka` sendiri.

Prioritas pengambilan referensi:
1. Field native stage:
   - `gagasan.referensiAwal[]`
   - `topik.referensiPendukung[]`
   - `pendahuluan.sitasiAPA[]`
   - `tinjauan_literatur.referensi[]`
   - `diskusi.sitasiTambahan[]`
2. `webSearchReferences[]` di tiap stage approved (sebagai fallback/suplemen metadata).

## 4.2 Kriteria Stage Eligible

Stage sumber hanya boleh dipakai jika:
1. Stage ada di urutan sebelum `daftar_pustaka`.
2. `stageData[stage].validatedAt` terisi.
3. Stage tidak termasuk invalidated/superseded oleh rewind terbaru.

Guard rewind tambahan (defensive):
1. Ambil `rewindHistory` terbaru untuk session.
2. Jika stage ada di `invalidatedStages` dari rewind tersebut, hanya boleh dipakai bila `validatedAt > rewind.createdAt` (berarti sudah re-approved setelah rewind).
3. Jika ada mismatch data anomali, stage di-skip dan ditulis ke warning log.

## 4.3 Dedup dan Merge

Kunci dedup berlapis:
1. URL normalized (`normalizeUrlForDedup` existing).
2. DOI normalized (lowercase, strip prefix `https://doi.org/`).
3. Fallback: `title + authors + year` yang dinormalisasi.

Aturan merge duplikat:
1. Record dengan metadata lebih kaya menang (`authors`, `year`, `doi`, `fullReference`, `inTextCitation`).
2. `sourceStage` jadi gabungan unik (opsional disimpan sebagai string CSV atau dipilih sumber prioritas pertama).
3. `duplicatesMerged = totalRaw - totalUnique`.

## 4.4 Format Entri

Output `entries[]` mengikuti schema `DaftarPustakaData`:
1. `title` wajib.
2. `authors`, `year`, `url`, `doi`, `sourceStage` opsional.
3. `inTextCitation` dan `fullReference` diisi deterministic formatter server-side:
   - jika sudah ada dari source, pertahankan.
   - jika tidak ada, generate format dasar (APA-like minimal) dari metadata tersedia.
4. `isComplete = false` jika metadata minimum tidak memadai (mis. tanpa author+year dan tanpa URL/DOI).

---

## 5) Kontrak Mutation compileDaftarPustaka

Lokasi: [paperSessions.ts](/Users/eriksupit/Desktop/makalahapp/convex/paperSessions.ts)

## 5.1 Input

```ts
{
  sessionId: Id<"paperSessions">,
  includeWebSearchReferences?: boolean // default true
}
```

Validasi input:
1. Session harus ada dan user harus owner.
2. `currentStage` wajib `daftar_pustaka`.
3. `stageStatus` tidak boleh `pending_validation`.

## 5.2 Output

```ts
{
  success: true,
  stage: "daftar_pustaka",
  compiled: {
    entries: Array<{
      title: string,
      authors?: string,
      year?: number,
      url?: string,
      doi?: string,
      inTextCitation?: string,
      fullReference?: string,
      sourceStage?: string,
      isComplete?: boolean,
    }>,
    totalCount: number,
    incompleteCount: number,
    duplicatesMerged: number,
  },
  stats: {
    rawCount: number,
    approvedStageCount: number,
    skippedStageCount: number,
  },
  warnings?: string[]
}
```

Error contract:
1. `success: false` + `error` jika stage bukan `daftar_pustaka`.
2. `success: false` + `error` jika session tidak valid / unauthorized.
3. `success: false` + `error` jika tidak ada referensi sama sekali dari stage approved.

---

## 6) Kontrak Tool compileDaftarPustaka (AI Layer)

Lokasi: [paper-tools.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/ai/paper-tools.ts)

Input schema tool:
```ts
{
  ringkasan: string,            // wajib, <= 280
  ringkasanDetail?: string      // opsional, <= 1000
}
```

Output tool:
```ts
{
  success: boolean,
  stage?: "daftar_pustaka",
  message?: string,
  totalCount?: number,
  incompleteCount?: number,
  duplicatesMerged?: number,
  warning?: string,
  error?: string
}
```

Perilaku tool:
1. Call `paperSessions.compileDaftarPustaka`.
2. Call `paperSessions.updateStageData` untuk persist hasil compile + ringkasan.
3. Return status final ke model.

---

## 7) Observability

Minimum observability yang ditambahkan:
1. `console.log` pada mutation compile:
   - sessionId
   - jumlah raw refs
   - jumlah unique entries
   - duplicates merged
   - incomplete count
2. Jika ada stage di-skip karena rewind/superseded anomaly, emit warning log.
3. Opsional V2: insert `systemAlerts` severity `info` untuk event `daftar_pustaka_compiled`.

Contoh log:
```text
[compileDaftarPustaka] session=<id> raw=64 unique=42 duplicatesMerged=22 incomplete=5 approvedStages=6 skippedStages=1
```

---

## 8) Testing Strategy

## 8.1 Unit Test (wajib)

Target: helper pure function dedup/merge/format.

File test disarankan:
1. `src/lib/paper/daftar-pustaka-compiler.test.ts`

Skenario minimum:
1. Dedup by normalized URL (UTM/hash/trailing slash).
2. Dedup by DOI.
3. Dedup fallback by `title+authors+year`.
4. Merge memilih metadata lebih kaya.
5. Incomplete flag benar saat metadata kurang.
6. Guard rewind: stage invalidated tidak ikut terkompilasi.

## 8.2 Integration Test (disarankan)

1. Flow tool `compileDaftarPustaka` -> mutation compile -> `updateStageData` sukses.
2. Verifikasi `stageData.daftar_pustaka.entries/totalCount/incompleteCount/duplicatesMerged` terisi.
3. Verifikasi gagal saat stage aktif bukan `daftar_pustaka`.

---

## 9) Rencana Implementasi Bertahap

1. Tambah helper compiler + unit test.
2. Tambah mutation `compileDaftarPustaka`.
3. Tambah tool `compileDaftarPustaka` di `paper-tools.ts`.
4. Update instruksi stage `daftar_pustaka` agar pakai tool baru (bukan kompilasi manual murni).
5. Jalankan test (`npm test`) dan verifikasi typecheck/build.

---

## 10) Acceptance Criteria

1. `paper-tools.ts` memiliki tool `compileDaftarPustaka` yang callable oleh model.
2. Kompilasi referensi lintas stage dilakukan server-side dari stage approved (`validatedAt`).
3. Hasil compile dipersist ke `stageData.daftar_pustaka` lewat `updateStageData` dengan field:
   - `entries`
   - `totalCount`
   - `incompleteCount`
   - `duplicatesMerged`
4. Stage superseded/invalidated karena rewind tidak ikut dihitung.
5. Ada unit test dedup/merge + logging observability jumlah entry terkompilasi.
6. Mutation `compileDaftarPustaka` punya kontrak input/output jelas dan terdokumentasi.

