# UI Test Checklist — F1-F6 Paper Workflow

> Branch: `feature/paper-sessions-enforcement`
> Date: 2026-04-05
> Scope basis:
> - `plan-f1-remove-ringkasan-redundancy.md`
> - `plan-f2-stage-search-modes.md`
> - `plan-f3f4-agentic-artifact-workflow.md`
> - `plan-f5f6-progress-and-choice-card.md`

---

## Purpose

Checklist ini dipakai untuk UI testing terpadu seluruh implementasi F1-F6 pada workflow paper session. Fokusnya adalah:

- memverifikasi behavior end-to-end, bukan hanya unit logic
- mengecek konsistensi antar fase yang saling bergantung
- memisahkan hasil yang **harus lolos** dari risiko yang **diterima sementara**

---

## Test Setup

Gunakan satu paper session baru dan jalankan alur nyata berikut:

1. mulai dari `gagasan`
2. lanjut ke `topik`
3. lanjut ke `tinjauan_literatur`
4. lanjut minimal ke satu review-mode stage, disarankan `abstrak` atau `pendahuluan`
5. jika waktu cukup, cek satu special interactive stage: `judul`, `outline`, `hasil`, atau `lampiran`

Gunakan skenario yang memang memerlukan search, misalnya topik paper yang butuh referensi akademik dan konteks lapangan.

---

## Must Pass

### 1. Session Integrity dan F1 SSOT

- [ ] Session baru dapat dibuat dan berjalan tanpa error schema, crash, atau fallback aneh di UI.
  Expected result: tidak ada error terkait `ringkasan` atau `ringkasanDetail`; chat, task card, artifact panel, dan validation panel tetap render normal.

- [ ] Session lama yang masih mengandung data legacy tetap bisa dibuka.
  Expected result: tidak ada schema validation failure; data lama tetap terbaca, tetapi workflow baru tetap berjalan dengan artifact sebagai output utama.

- [ ] Output stage tidak lagi bergantung pada field `ringkasan` di UI.
  Expected result: ringkasan stage ditampilkan dari artifact summary / artifact workspace yang ada, bukan dari field legacy.

### 2. Gagasan sebagai Search Hub (F2)

- [ ] Pada `gagasan`, saat riset belum cukup, agent proaktif melakukan search.
  Expected result: agent mencari referensi akademik dan konteks non-akademik tanpa harus disuruh ulang.

- [ ] Turn search di `gagasan` menampilkan hasil aktual pada turn yang sama.
  Expected result: respons akhir berisi temuan nyata, ringkasan hasil, atau rekomendasi berbasis sources; tidak berakhir dengan kalimat transisi seperti “akan mencari”, “sedang mencari”, atau “mohon tunggu”.

- [ ] Setelah search selesai, choice card yang muncul relevan dengan findings.
  Expected result: opsi yang ditawarkan benar-benar menurunkan angle/arah dari hasil search, bukan pilihan generik.

- [ ] Progress/task card ikut bergerak selama diskusi `gagasan` berkembang.
  Expected result: setelah milestone penting tercapai di turn berikutnya, task/progress berubah tanpa harus menunggu artifact final.

### 3. Topik sebagai Derivation Stage (F2 + F3/F4)

- [ ] Pada `topik`, agent tidak memicu search baru.
  Expected result: agent menurunkan opsi topik dari material `gagasan`, referensi awal, dan memory yang sudah ada.

- [ ] `topik` tetap agent-led.
  Expected result: agent menawarkan 2-3 opsi topik dengan rekomendasi default melalui YAML choice card; user hanya memilih/mengarahkan, bukan menulis dari nol.

- [ ] Artifact `topik` dibuat hanya setelah user mengonfirmasi pilihan.
  Expected result: tidak ada artifact final terlalu dini sebelum konfirmasi choice card.

### 4. Tinjauan Literatur sebagai Deep Academic Search Stage (F2 + F5)

- [ ] `tinjauan_literatur` memicu deep academic search saat literatur belum cukup.
  Expected result: search berfokus pada teori, framework, studi empiris, dan gap.

- [ ] Turn search di `tinjauan_literatur` juga menampilkan hasil aktual pada turn yang sama.
  Expected result: agent menyajikan literature findings, bukan janji akan mencari.

- [ ] Setelah findings dipresentasikan, progress parsial muncul pada turn berikutnya.
  Expected result: task/progress card memperlihatkan kemajuan referensi/literature review sebelum artifact final divalidasi.

- [ ] Agent menawarkan choice card framework/synthesis yang jelas.
  Expected result: ada 2-3 pendekatan dengan rekomendasi, bukan diskusi bebas yang melebar.

### 5. Review-Mode Artifact Workflow (F3/F4)

- [ ] Pada review-mode stage seperti `abstrak`, `pendahuluan`, atau `metodologi`, agent membuat artifact v1 lebih awal.
  Expected result: chat hanya berisi ringkasan singkat + pointer ke artifact; draft penuh berada di artifact panel/workspace.

- [ ] Review-mode stage tidak meminta explicit chat confirmation berupa diskusi panjang sebelum submit.
  Expected result: intelligent-choice stages (`abstrak`, `pendahuluan`, `tinjauan_literatur`, `metodologi`) menawarkan pilihan pendekatan via choice card, lalu langsung generate ke artifact setelah user memilih. Direct-generate stages langsung generate tanpa choice card. Tidak ada loop "What do you think?" di chat.

- [ ] Revisi berjalan lewat artifact update, bukan mengulang drafting panjang di chat.
  Expected result: saat user minta revisi, agent memperbarui artifact dan stage data, lalu mempresentasikan hasil revisi secara singkat.

- [ ] Stage direct-generate tidak memaksa choice card artifisial.
  Expected result: `diskusi`, `kesimpulan`, `pembaruan_abstrak`, dan `daftar_pustaka` langsung generate ke artifact lalu masuk validation flow.

### 6. Agent-Led Interactive Stages (F3/F4)

- [ ] Pada `hasil`, agent memimpin input capture.
  Expected result: agent lebih dulu menawarkan struktur input / format hasil via choice card atau framing terarah; user mengisi ke struktur yang diusulkan agent.

- [ ] Pada `judul`, agent menawarkan opsi judul yang siap dipilih.
  Expected result: user tidak diminta brainstorming dari nol; ada opsi judul dengan rekomendasi.

- [ ] Pada `outline`, agent menyusun struktur dulu.
  Expected result: user mengoreksi struktur yang sudah dipikirkan agent, bukan memulai outline kosong.

- [ ] Pada `lampiran`, agent mengusulkan item lampiran terlebih dahulu.
  Expected result: user memvalidasi atau menambah item dari usulan agent.

### 7. Choice Card Behavior (F6)

- [ ] Setelah satu opsi dipilih, choice card langsung menjadi read-only/disabled di session aktif.
  Expected result: user tidak bisa klik ulang tombol pilihan yang sama pada state normal.

- [ ] Setelah reload halaman normal, choice card yang sudah dipilih tetap disabled.
  Expected result: state submit tetap ter-rehydrate dari history message; card lama tidak kembali clickable.

### 8. Cross-Phase Consistency

- [ ] Referensi yang dipakai di stage lanjut konsisten dengan hasil stage sebelumnya.
  Expected result: `topik`, `tinjauan_literatur`, dan review-mode stages memakai material approved sebelumnya, bukan memulai ulang dari nol.

- [ ] Chat tetap berfungsi sebagai orchestration layer.
  Expected result: chat berisi arahan, rekomendasi, choice/validation, dan ringkasan; artifact panel tetap menjadi workspace utama penulisan.

- [ ] Validation gating tetap sesuai stage mode.
  Expected result: `gagasan` dan `topik` menunggu validasi user eksplisit; review-mode stage masuk validation panel setelah v1 artifact dibuat.

---

## Accepted Risk

### A. F5 Incremental Progress Compliance

- [ ] Perhatikan apakah semua milestone penting selalu memicu progress update.
  Expected result: umumnya progress terlihat lebih hidup daripada sebelum F5.
  Accepted risk: karena F5 bersifat instruction-driven, beberapa turn mungkin masih tidak menyimpan progress parsial walau seharusnya bisa.

### B. F6 Rare Race Condition

- [ ] Lakukan stress check: submit choice lalu reload/close tab secepat mungkin.
  Expected result: pada reload normal state tetap disabled.
  Accepted risk: bila tab crash/close sebelum synthetic user message sempat persisten, choice card bisa tetap interactive sampai ada message berikutnya. Ini bukan blocker default.

### C. F2 Compose Guard (Layer 4)

- [ ] Monitor server logs untuk `[COMPOSE-GUARD]` selama testing search turns.
  Expected result: guard jarang atau tidak pernah fire (model biasanya compliant dengan COMPOSE_PHASE_DIRECTIVE). Jika fire, verifikasi bahwa `data-corrective-findings` event tampil di UI sebagai source card.
  Accepted risk: guard ini safety net untuk edge case — sulit di-trigger intentionally.

### D. Admin Skill Editor Sync (F2)

- [ ] Buka admin panel → skill editor → pilih stage `topik` → cek default search policy.
  Expected result: default search policy = `passive` (bukan `active`).
  Accepted risk: ini admin-facing, bukan user workflow. Tidak mempengaruhi runtime behavior yang sudah benar.

---

## Recommended Test Route

### Route A — Core E2E

- [ ] `gagasan`: trigger proactive search, cek findings nyata, pilih arah
- [ ] `topik`: pilih salah satu opsi topik
- [ ] `tinjauan_literatur`: trigger deep academic search, pilih framework
- [ ] `abstrak` atau `pendahuluan`: cek choice card pendekatan, lalu generate artifact v1 dan revise sekali (intelligent-choice tier)
- [ ] `diskusi` atau `kesimpulan`: cek direct generate tanpa choice card ke artifact (direct-generate tier, jika waktu cukup)

### Route B — Interactive Stage Sampling

- [ ] `judul`: pilih salah satu opsi judul
- [ ] `outline`: ubah satu arah struktur
- [ ] `hasil` atau `lampiran`: cek agent-led interactive input

---

## Failure Recording Template

Gunakan format ini saat menemukan bug:

```md
### Bug
- Stage:
- Step:
- Expected:
- Actual:
- Severity:
- Repro steps:
- Screenshot / log:
- Related phase: F1 / F2 / F3-F4 / F5 / F6
```

---

## Exit Criteria

Checklist dianggap lulus bila:

- semua item `Must Pass` lolos
- tidak ada regression fatal pada search turn, artifact workflow, validation flow, atau choice card state
- item `Accepted Risk` hanya muncul dalam bentuk edge case yang memang sudah diterima design, bukan bug umum yang mudah terulang
