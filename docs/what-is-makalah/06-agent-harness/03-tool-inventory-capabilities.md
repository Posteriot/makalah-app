# 03: Tool Inventory & Capabilities

File ini merinci seluruh katalog kemampuan (*capabilities*) yang dimiliki oleh Makalah AI Agent. Desain ini mengadopsi prinsip **[Programmatic Tool Calling](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/programatic-tools-calling/programmatic-tool-calling.md)**, di mana agen diberikan kebebasan untuk melakukan *reasoning* di atas data mentah melalui rangkaian pemanggilan tool yang otonom dan efisien.

> **Sumber kebenaran**: `src/lib/chat-harness/executor/build-tool-registry.ts` (tool `createArtifact`, `updateArtifact`, `readArtifact`, `renameConversationTitle`) + `src/lib/ai/paper-tools.ts` (semua tool paper workflow via `createPaperTools(...)`).

---

## 1. State & Lifecycle Tools

Tool untuk mengelola status sesi penulisan dan transisi antar *stage*.

- **`getCurrentPaperState()`**:
  - **Fungsi**: Mengambil status terbaru sesi penulisan (stage aktif, data draf, status validasi).
  - **Fakta Kode**: Query `api.paperSessions.getByConversation` via Convex.

- **`submitStageForValidation()`**:
  - **Fungsi**: Mengirim draf *stage* saat ini ke User untuk divalidasi. Memicu panel approval di UI.
  - **Safety Guard (dua lapis)**:
    1. Jika `stageStatus === "pending_validation"` sudah → return no-op success (tidak submit ganda).
    2. Jika `currentStageData.artifactId` tidak ada → return error `ARTIFACT_MISSING`, menolak submit.
  - **Downstream**: Convex mutation `api.paperSessions.submitForValidation` bisa return soft failure jika `missingFields` terdeteksi oleh validation gate.

- **`requestRevision(feedback)`**:
  - **Fungsi**: Mengalihkan status stage dari `pending_validation` ke `revision`.
  - **Idempotent**: Jika `stageStatus === "revision"` sudah, tool return no-op success agar model langsung lanjut ke `updateArtifact` tanpa error.
  - **Guard**: Jika `stageStatus !== "pending_validation"` dan bukan `"revision"`, tool return error `NOT_PENDING_VALIDATION`.

- **`resetToStage(targetStage)`**:
  - **Fungsi**: Melakukan *rollback* ke stage tertentu. Artifact di stage target dan setelahnya di-invalidate; data stage di-clear (search references dipertahankan).
  - **Dua jalur eksekusi**:
    - **Cross-stage** (`currentStage !== targetStage`): memanggil `api.paperSessions.rewindToStage` dengan `mode: "cancel-choice"` secara atomik.
    - **Same-stage** (`currentStage === targetStage`): memanggil `api.paperSessions.cancelChoiceDecision` saja — tidak ada rewind lintas stage.
  - **Catatan**: Artifact di-*soft-delete* (`invalidatedAt` diset di Convex), bukan dihapus permanen.

---

## 2. Artifact Management Tools

Tool untuk berinteraksi dengan panel Artifact di sisi kanan UI.

- **`createArtifact(type, title, content, format?, description?, sources?)`**:
  - **Fungsi**: Membuat dokumen baru (v1).
  - **Tipe Valid** (dari schema L120): `"code"`, `"outline"`, `"section"`, `"table"`, `"citation"`, `"formula"`, `"chart"`.
  - **Guard — Race-Free Claim**: `paperToolTracker.createArtifactClaimed` diset *synchronously* sebelum await apapun. Panggilan paralel ke-2 langsung return error `CREATE_BLOCKED_DUPLICATE_TURN`.
  - **Guard — Valid Exists**: Jika `stageStatus === "pending_validation"` atau `"revision"` dan artifact valid sudah ada → return error `CREATE_BLOCKED_VALID_EXISTS`. Model harus pakai `updateArtifact`.
  - **Guard — Source-Body Parity**: Jika `sources` disertakan, `checkSourceBodyParity()` memverifikasi konsistensi antara sumber yang diklaim dan konten artifact. Gagal → error `SOURCE_BODY_PARITY_MISMATCH`.
  - **Auto-link**: Setelah sukses, `artifactId` otomatis ditulis ke `stageData` current stage via mutation `api.paperSessions.updateStageData`.
  - **Auto-submit**: Jika model sebelumnya sudah memanggil `submitStageForValidation` sebelum artifact ada (`sawSubmitValidationArtifactMissing === true`), sistem retry submit setelah artifact berhasil dibuat.

- **`updateArtifact(artifactId, content, title?, sources?)`**:
  - **Fungsi**: Memperbarui artifact (v2, v3, dst) menggunakan model *immutable versioning*.
  - **Auto-resolve artifactId**: Jika model memberikan ID yang tidak cocok dengan `stageData.artifactId`, sistem otomatis memakai ID dari stage data.
  - **Guard — Source-Body Parity**: Sama seperti `createArtifact`.
  - **Auto-rescue**: Jika `stageStatus === "pending_validation"`, sistem otomatis memanggil `executeAutoRescue()` untuk transisi ke `revision` sebelum update dilakukan.

- **`readArtifact(artifactId)`**:
  - **Fungsi**: Membaca isi lengkap artifact sebelumnya (title, type, version, content, sources) untuk referensi lintas stage. Gunakan saat konten di system prompt terpotong.

---

## 3. Drafting & Content Tools

Tool untuk menyimpan data terstruktur ke database `paperSessions`.

- **`updateStageData(data)`**:
  - **Auto-Stage**: Parameter `stage` **tidak ada** di `inputSchema` — stage selalu di-auto-fetch dari `session.currentStage` (Option B fix). Model tidak bisa menulis ke stage yang salah.
  - **Validation Kondisional**: Referensi divalidasi via `getSearchSkill().checkReferences()` hanya jika `context.hasRecentSources === true`. Fields yang dicek: `referensiAwal`, `referensiPendukung`, `referensi`, `sitasiAPA`, `sitasiTambahan`.
  - **Guard Internal**: Field dengan prefix `_` (contoh: `_plan`) otomatis di-strip — model tidak bisa menulis field internal harness secara langsung.
  - **Guard Kosong**: Data kosong (semua key null/undefined) di-reject.
  - **Guard Submit**: Jika `toolTracker.sawSubmitValidationSuccess === true`, tool di-skip (mencegah cascade duplicate artifact).

- **`compileDaftarPustaka(mode)`**:
  - **Fungsi**: Mengagregasi referensi dari seluruh stage yang telah disetujui untuk stage `daftar_pustaka`.

---

## 4. Source & Evidence Tools

Tool untuk verifikasi bukti dari dokumen sumber secara eksak.

- **`inspectSourceDocument(sourceId, paragraphIndex?)`**: Melihat metadata dokumen atau paragraf spesifik secara eksak.
- **`quoteFromSource(sourceId, query)`**: Mencari kutipan relevan di dalam satu sumber.
- **`searchAcrossSources(query)`**: Pencarian semantik di seluruh sumber yang terkumpul.

---

## 5. Utility Tools

Tool yang berfungsi di luar workflow penulisan makalah.

- **`renameConversationTitle(title)`**:
  - **Fungsi**: Mengubah judul conversation secara final ketika model yakin tujuan user sudah jelas.
  - **Guard**: Maksimal 2x update AI per conversation. Tidak bisa dipanggil jika `conversation.titleLocked === true` (user sudah ganti judul sendiri) atau `titleUpdateCount >= 2`.
  - **Guard Minimum Turns**: Memerlukan minimal `CHAT_TITLE_FINAL_MIN_PAIRS` (default `3`) pasang pesan sebelum judul final bisa diset.
  - **Panjang Judul**: Max 50 karakter.

---

## 6. Aturan Rantai Eksekusi (Mandatory Chaining)

Untuk menjamin integritas UI/UX, *Safety Enforcer* di backend memaksa urutan berikut:

1. `updateStageData(...)`
2. `createArtifact(...)` / `updateArtifact(...)`
3. `submitStageForValidation()`

Pelanggaran urutan (misalnya `submitStageForValidation` sebelum `createArtifact`) akan di-block oleh guard di tool `submitStageForValidation` (`ARTIFACT_MISSING`), dan dalam kasus tertentu di-auto-rescue oleh `createArtifact` setelah artifact tersedia.

---

**File Source Code Utama:**
- `src/lib/chat-harness/executor/build-tool-registry.ts`: Registrasi tool `createArtifact`, `updateArtifact`, `readArtifact`, `renameConversationTitle`.
- `src/lib/ai/paper-tools.ts`: Implementasi seluruh tool paper workflow (`getCurrentPaperState`, `updateStageData`, `compileDaftarPustaka`, `submitStageForValidation`, `requestRevision`, `resetToStage`, `inspectSourceDocument`, `quoteFromSource`, `searchAcrossSources`).
- `src/lib/chat-harness/policy/enforcers.ts`: Logika pemaksaan rantai eksekusi (*Mandatory Chaining*).
- `src/lib/chat-harness/shared/auto-rescue-policy.ts`: Auto-rescue untuk transisi state otomatis pada `createArtifact` dan `updateArtifact`.
