# Stage Recommendation Persistence And AI Tool Mapping

Dokumen ini memetakan recommendation block per stage paper ke tiga area implementasi:

1. field recommendation yang perlu dibentuk model
2. target persistence backend yang relevan
3. perilaku AI/tool yang seharusnya terjadi setelah user memilih

Dokumen ini adalah jembatan antara:

- konteks evaluasi UI recommendation di folder ini
- kontrak stream part dan submit event
- implementasi prompt, backend translation, dan persistence stage data

Dokumen terkait:

- `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/README.md`
- `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/2026-03-16-submit-event-and-streaming-contract-design.md`

## Prinsip Dasar

### 1. Recommendation block tidak selalu langsung dipersist sebagai stage data final

Pilihan user dari recommendation block adalah `decision input`, bukan otomatis `draft final`. Pada beberapa stage, pilihan itu cukup untuk langsung dipakai menyimpan `stageData`. Pada stage lain, pilihan itu baru menjadi dasar elaborasi lanjutan sebelum `updateStageData`.

### 2. Stage data final tetap tunduk pada whitelist backend

Semua persistence final harus mengikuti whitelist yang sudah ada di `convex/paperSessions/stageDataWhitelist.ts`. Recommendation block tidak boleh menulis field di luar whitelist ini.

### 3. Ringkasan tetap wajib

Walaupun user memilih lewat UI, `updateStageData` tetap butuh `ringkasan` dan optional `ringkasanDetail`. Jadi setiap pilihan recommendation pada akhirnya harus bisa diterjemahkan menjadi keputusan yang layak diringkas.

### 4. AI tetap mengelaborasi hasil pilihan user

Recommendation block bukan pengganti AI. Setelah user memilih, AI tetap bertugas:

- menjelaskan konsekuensi pilihan
- merapikan draft
- memutuskan apakah perlu `updateStageData`
- menentukan apakah stage sudah siap `submitStageForValidation`

## Tipe Hasil Submit Yang Dipakai Di Dokumen Ini

Untuk memudahkan mapping, tiap stage dibagi menjadi dua mode hasil submit:

- `decision-only`
  - pilihan user cukup disimpan sebagai konteks dan AI lanjut berdialog
- `decision-to-draft`
  - pilihan user cukup matang untuk langsung diterjemahkan AI menjadi draft stage dan disimpan via `updateStageData`

## Stage By Stage Mapping

### 1. `gagasan`

#### Bentuk recommendation

- tipe utama: `single-select`
- isi: 2-3 angle gagasan
- expected options:
  - angle utama
  - novelty singkat
  - feasibility singkat
  - rekomendasi model

#### Persistence target

Belum perlu menyimpan recommendation mentah ke `stageData`.

Field final yang relevan saat sudah matang:

- `ideKasar`
- `analisis`
- `angle`
- `novelty`
- `referensiAwal`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-only`

#### Perilaku AI setelah user memilih

- akui pilihan user
- elaborasi angle yang dipilih
- jika perlu, tanya refinement singkat
- jika diskusi sudah cukup matang:
  - panggil `updateStageData`
  - panggil `createArtifact`
  - tunggu konfirmasi eksplisit sebelum `submitStageForValidation`

#### Catatan

Stage ini recommendation-heavy, tapi belum selalu save-ready. Jangan memaksa direct save hanya karena user klik satu angle.

### 2. `topik`

#### Bentuk recommendation

- tipe utama: `single-select`
- isi: 2-3 topik definitif / working topic
- expected options:
  - judul/topik singkat
  - research gap
  - alasan spesifikasi

#### Persistence target

Field final:

- `definitif`
- `angleSpesifik`
- `argumentasiKebaruan`
- `researchGap`
- `referensiPendukung`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-only`

#### Perilaku AI setelah user memilih

- tegaskan topik terpilih
- pertajam gap dan argumentasi kebaruan
- bila konteks sudah cukup:
  - `updateStageData`
  - `createArtifact`
  - lalu tunggu validasi user

#### Catatan

Pilihan topik umumnya dekat ke keputusan final, tapi tetap butuh elaborasi akademik sebelum save.

### 3. `outline`

#### Bentuk recommendation

- tipe utama: `single-select`
- isi: 2-3 struktur outline
- expected options:
  - susunan bab/sub-bab
  - fokus struktur
  - total estimasi kata

#### Persistence target

Field final:

- `sections`
- `totalWordCount`
- `completenessScore`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-to-draft`

#### Perilaku AI setelah user memilih

- gunakan outline terpilih sebagai basis draft struktural
- langsung bentuk `sections[]` yang valid menurut schema backend
- panggil `updateStageData`
- panggil `createArtifact`
- lanjut minta user review sebelum validasi

#### Catatan

Ini salah satu stage paling cocok untuk direct persistence karena struktur pilihannya sudah sangat dekat dengan field backend.

### 4. `abstrak`

#### Bentuk recommendation

- tipe utama: `multi-select`
- isi: 3-5 keyword
- optional tambahan:
  - rekomendasi abstrak tone

#### Persistence target

Field final:

- `ringkasanPenelitian`
- `keywords`
- `wordCount`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-only`

#### Perilaku AI setelah user memilih

- gunakan keyword yang dipilih user
- revisi atau finalkan abstrak
- jika abstrak sudah sesuai:
  - `updateStageData`
  - `createArtifact`
- belum perlu `submitStageForValidation` tanpa konfirmasi eksplisit user

#### Catatan

Keyword selection membantu, tapi abstrak final tetap perlu dibaca ulang user.

### 5. `pendahuluan`

#### Bentuk recommendation

- tipe utama: `multi-select`
- isi: fokus rumusan masalah atau struktur background
- expected options:
  - pertanyaan riset
  - prioritas alur narasi
  - objective grouping

#### Persistence target

Field final:

- `latarBelakang`
- `rumusanMasalah`
- `researchGapAnalysis`
- `tujuanPenelitian`
- `signifikansiPenelitian`
- `hipotesis`
- `sitasiAPA`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-only`

#### Perilaku AI setelah user memilih

- susun pendahuluan berdasarkan fokus yang dipilih
- jaga citation integrity
- setelah narasi cukup matang:
  - `updateStageData`
  - `createArtifact`

#### Catatan

Stage ini terlalu naratif untuk auto-save langsung dari klik saja.

### 6. `tinjauan_literatur`

#### Bentuk recommendation

- tipe utama: `single-select`
- isi: teori/framework yang paling cocok
- expected options:
  - framework
  - alasan kecocokan
  - hubungan dengan research gap

#### Persistence target

Field final:

- `kerangkaTeoretis`
- `reviewLiteratur`
- `gapAnalysis`
- `justifikasiPenelitian`
- `referensi`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-only`

#### Perilaku AI setelah user memilih

- jadikan framework terpilih sebagai anchor
- susun review literatur dan gap analysis
- kemudian:
  - `updateStageData`
  - `createArtifact`

### 7. `metodologi`

#### Bentuk recommendation

- tipe utama: `single-select`
- isi: metode atau pendekatan penelitian
- expected options:
  - pendekatan
  - metode perolehan data
  - justifikasi

#### Persistence target

Field final:

- `desainPenelitian`
- `metodePerolehanData`
- `teknikAnalisis`
- `etikaPenelitian`
- `alatInstrumen`
- `pendekatanPenelitian`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-to-draft`

#### Perilaku AI setelah user memilih

- bentuk draft metodologi berdasarkan opsi terpilih
- bila tidak ada gap besar:
  - `updateStageData`
  - `createArtifact`
- jika user memberi catatan tambahan, AI elaborasi dulu sebelum save

#### Catatan

Stage ini cukup struktural, jadi sangat cocok untuk jalur semi-direct persistence.

### 8. `hasil`

#### Bentuk recommendation

- tipe utama: `single-select`
- isi: format penyajian hasil
- expected options:
  - `narrative`
  - `tabular`
  - `mixed`

#### Persistence target

Field final:

- `temuanUtama`
- `metodePenyajian`
- `dataPoints`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-only`

#### Perilaku AI setelah user memilih

- gunakan format terpilih untuk menyusun hasil dari data user
- jangan membuat temuan fiktif
- jika data dan struktur sudah jelas:
  - `updateStageData`
  - `createArtifact`

### 9. `diskusi`

#### Bentuk recommendation

- tipe utama: `single-select`
- isi: fokus implikasi atau angle pembahasan
- expected options:
  - prioritas teoretis
  - prioritas praktis
  - balanced discussion

#### Persistence target

Field final:

- `interpretasiTemuan`
- `perbandinganLiteratur`
- `implikasiTeoretis`
- `implikasiPraktis`
- `keterbatasanPenelitian`
- `saranPenelitianMendatang`
- `sitasiTambahan`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-only`

#### Perilaku AI setelah user memilih

- bangun diskusi berdasarkan prioritas yang dipilih
- jaga referensi dan perbandingan literatur
- setelah diskusi matang:
  - `updateStageData`
  - `createArtifact`

### 10. `kesimpulan`

#### Bentuk recommendation

- tipe utama: `ranked-select`
- isi: prioritas saran atau implikasi
- expected options:
  - saran praktisi
  - saran peneliti
  - saran kebijakan

#### Persistence target

Field final:

- `ringkasanHasil`
- `jawabanRumusanMasalah`
- `implikasiPraktis`
- `saranPraktisi`
- `saranPeneliti`
- `saranKebijakan`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-only`

#### Perilaku AI setelah user memilih

- gunakan ranking user untuk urutan prioritas saran
- susun narasi kesimpulan sesuai ranking itu
- setelah final:
  - `updateStageData`
  - `createArtifact`

### 11. `pembaruan_abstrak`

#### Bentuk recommendation

- tipe utama: `multi-select`
- isi: perubahan abstrak yang disarankan
- expected options:
  - mismatch metodologi
  - mismatch temuan
  - mismatch keywords

#### Persistence target

Field final:

- `ringkasanPenelitianBaru`
- `perubahanUtama`
- `keywordsBaru`
- `wordCount`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-to-draft`

#### Perilaku AI setelah user memilih

- terapkan perubahan yang dipilih user
- bentuk abstrak baru
- langsung:
  - `updateStageData`
  - `createArtifact`

#### Catatan

Stage ini cukup cocok untuk direct persistence karena input pilihan user langsung memetakan perubahan yang akan diterapkan.

### 12. `daftar_pustaka`

#### Bentuk recommendation

- tipe utama: `action-list`
- isi: tindakan untuk referensi tidak lengkap
- expected options:
  - pertahankan sementara
  - lengkapi via search
  - hapus dari kompilasi

#### Persistence target

Field final:

- `entries`
- `totalCount`
- `incompleteCount`
- `duplicatesMerged`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-to-draft`

#### Perilaku AI setelah user memilih

- jika user memilih kompilasi final:
  - gunakan `compileDaftarPustaka`
- jika user memilih perapihan dulu:
  - AI tindak lanjuti incomplete entries
- pada mode persist:
  - `compileDaftarPustaka({ mode: "persist" })`
- pada mode audit:
  - `compileDaftarPustaka({ mode: "preview" })`

#### Catatan

Ini stage khusus karena sudah punya tool dedicated yang lebih tepat daripada memaksa semua lewat `updateStageData` manual.

### 13. `lampiran`

#### Bentuk recommendation

- tipe utama: `multi-select`
- isi: lampiran yang disarankan
- expected options:
  - tabel mentah
  - instrumen
  - gambar
  - dokumen pendukung lain

#### Persistence target

Field final:

- `items`
- `tidakAdaLampiran`
- `alasanTidakAda`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-to-draft`

#### Perilaku AI setelah user memilih

- jika ada item terpilih:
  - bentuk `items[]`
  - `updateStageData`
  - `createArtifact`
- jika user pilih tidak perlu lampiran:
  - simpan `tidakAdaLampiran = true`
  - isi `alasanTidakAda`

### 14. `judul`

#### Bentuk recommendation

- tipe utama: `single-select`
- isi: tepat 5 opsi judul
- expected options:
  - judul
  - coverage keywords
  - style

#### Persistence target

Field final:

- `opsiJudul`
- `judulTerpilih`
- `alasanPemilihan`
- `ringkasan`
- `ringkasanDetail`

#### Submit mode

- `decision-to-draft`

#### Perilaku AI setelah user memilih

- simpan opsi judul dan pilihan final user
- bentuk alasan pemilihan
- langsung:
  - `updateStageData`
  - `createArtifact`
- setelah user benar-benar puas:
  - `submitStageForValidation`

#### Catatan

Ini stage paling lurus mapping-nya karena backend schema sudah eksplisit mendukung `opsiJudul` dan `judulTerpilih`.

## Ringkasan Mode Per Stage

### `decision-only`

Stage:

- `gagasan`
- `topik`
- `abstrak`
- `pendahuluan`
- `tinjauan_literatur`
- `hasil`
- `diskusi`
- `kesimpulan`

Makna:

- klik user menjadi keputusan arah
- AI elaborasi dulu
- save terjadi setelah konten cukup matang

### `decision-to-draft`

Stage:

- `outline`
- `metodologi`
- `pembaruan_abstrak`
- `daftar_pustaka`
- `lampiran`
- `judul`

Makna:

- klik user cukup dekat dengan struktur final
- AI bisa langsung menyusun payload save dan artifact

## Mapping Tool Yang Direkomendasikan

### Tool yang tetap dipakai

- `getCurrentPaperState`
  - untuk sinkronisasi konteks session sebelum atau sesudah submit
- `updateStageData`
  - untuk semua stage yang save finalnya berbasis stage data umum
- `compileDaftarPustaka`
  - khusus `daftar_pustaka`
- `submitStageForValidation`
  - hanya setelah user menegaskan kepuasan akhir stage

### Tool yang tidak boleh dipakai terlalu cepat

- `submitStageForValidation`

Larangan:

- jangan panggil hanya karena user klik recommendation
- klik recommendation bukan approval final

## Rekomendasi Persistence Recommendation Raw

Recommendation raw tidak perlu langsung masuk ke `paperSessions.stageData`.

Rekomendasi terbaik:

- simpan raw submit user di metadata message
- gunakan raw itu sebagai audit trail dan context rehydration
- stage data final hanya menyimpan field akademik yang memang sudah masuk whitelist

Alasan:

- menjaga `stageData` tetap bersih
- menghindari mencampur state UI dengan state akademik paper
- memudahkan evolusi renderer tanpa migrasi schema paper session

## Konsekuensi Untuk Prompt Dan Backend Translation

### Untuk prompt

Prompt per stage perlu memahami perbedaan:

- `user clicked recommendation`
- `user approved stage`

Model harus tahu bahwa klik recommendation berarti:

- ada preferensi/keputusan baru
- belum tentu boleh submit validasi

### Untuk backend translation

Backend translation layer harus memetakan event submit ke:

- stage aktif
- jenis keputusan
- apakah event itu `decision-only` atau `decision-to-draft`
- apakah tool tertentu perlu dipaksa, dilarang, atau hanya direkomendasikan

## Keputusan Desain Yang Dikunci

### 1. Recommendation result bukan field stageData baru

Tidak ada penambahan field `recommendation` atau sejenisnya ke schema `paperSessions`.

### 2. Recommendation raw hidup di message metadata

Audit UI interaction tetap ada, tapi tidak mencemari data akademik final.

### 3. Save final tetap mengikuti whitelist stage

Semua persistence final harus mengalir ke field yang memang diizinkan backend.

### 4. `judul` terakhir tetap benar

Walau secara teknis paling mudah, stage `judul` tetap dipetakan terakhir sesuai disiplin workflow.

## File Terkait

- `convex/paperSessions/stageDataWhitelist.ts`
- `convex/paperSessions/constants.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/ai/paper-stages/foundation.ts`
- `src/lib/ai/paper-stages/core.ts`
- `src/lib/ai/paper-stages/results.ts`
- `src/lib/ai/paper-stages/finalization.ts`
- `convex/paperSessions/types.ts`

## Status Dokumen

- Status: stage-level mapping baseline
- Fungsi: acuan prompt, translation layer, dan persistence strategy
- Belum mencakup: detail format metadata message untuk semua mode submit, task breakdown implementasi, dan test matrix per stage
