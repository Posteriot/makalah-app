# Output & Ekspor (Output and Export)

Setelah seluruh 14 stage selesai dan sesi berstatus `completed`, Makalah AI menyediakan dua output utama bagi pengguna: **Naskah Bertumbuh** sebagai tampilan visual naskah yang terakumulasi sepanjang proses, dan **Ekspor** sebagai dokumen final yang bisa diunduh.

---

## 1. Naskah Bertumbuh (Growing Manuscript)

*Naskah Bertumbuh* adalah representasi visual utuh dari paper pengguna yang dibangun secara inkremental setiap kali sebuah stage disetujui. Ini bukan dokumen statis — ia di-rebuild otomatis setiap ada perubahan signifikan.

### Cara Kerja (Audit Forensik: `naskahRebuild.ts`)

`rebuildNaskahSnapshot` (`convex/naskahRebuild.ts` L34) dipanggil secara non-blocking di tiga titik:

- **Saat stage disetujui** (`approveStage` L1454): Naskah di-rebuild setelah setiap approval untuk menambahkan konten stage yang baru disetujui.
- **Saat data stage diperbarui** (`updateStageData` L847): Naskah di-rebuild saat AI menyimpan data draf baru.
- **Saat rewind** (`rewindToStage` L2198): Naskah di-rebuild untuk menghapus konten stage yang di-invalidasi.

Kegagalan `rebuildNaskahSnapshot` dilog sebagai error tapi **tidak** me-rollback approval — ini desain eksplisit untuk menjaga atomisitas approval.

### Akses ke Naskah

Pengguna mengakses Naskah Bertumbuh melalui halaman `/naskah/[conversationId]`. `NaskahShell` (`src/components/naskah/NaskahShell.tsx`) adalah outer wrapper halaman, sedangkan `NaskahPage` (`src/components/naskah/NaskahPage.tsx`) adalah komponen konten utama yang dirender di dalam shell. Halaman ini bisa diakses kapan saja selama proses berlangsung, bukan hanya setelah `completed`.

---

## 2. Ekspor Dokumen (Export)

Ada **dua jalur ekspor** dengan endpoint berbeda, untuk konteks berbeda:

### Jalur A — Ekspor dari Naskah View (`/api/naskah/export/`)

Dipicu oleh komponen `NaskahDownloadButton` (`src/components/naskah/NaskahDownloadButton.tsx`). Mengekspor **konten naskah yang sedang ditampilkan** di layar pengguna saat itu.

- **PDF**: `POST /api/naskah/export/pdf`
- **Word (.docx)**: `POST /api/naskah/export/word`

Payload yang dikirim adalah `{ title: string, sections: NaskahSection[] }` — menggunakan snapshot yang sedang ditampilkan di layar, bukan DB lookup ulang. Ini memastikan file yang diunduh identik dengan apa yang pengguna lihat.

### Jalur B — Ekspor dari Session (`/api/export/`)

Endpoint ini menerima `sessionId` dan mengambil konten dari database. Hanya valid untuk sesi yang sudah `completed`.

- **PDF**: `POST /api/export/pdf` — body: `{ sessionId: string }`
- **Word (.docx)**: `POST /api/export/word`

Guard `NOT_COMPLETED`: validasi dilakukan oleh `getExportableContent()` yang me-throw `ExportValidationError` dengan code `NOT_COMPLETED` → di-catch route handler sebagai `400`. Bukan guard `if/else` langsung di route — melainkan exception dari validation helper.

---

## Rujukan Kode (Audit Forensik)

Berdasarkan pembacaan kode langsung (tanpa mengandalkan komentar), berikut adalah rujukan implementasi faktual:

| Komponen | File Path | Baris/Logika |
| :--- | :--- | :--- |
| **Naskah Rebuild** | [naskahRebuild.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/naskahRebuild.ts) | `rebuildNaskahSnapshot` (L34) |
| **Rebuild Triggers** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | `approveStage` (L1454), `updateStageData` (L847), `rewindToStage` (L2198) |
| **Naskah UI** | [NaskahShell.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/naskah/NaskahShell.tsx) | Shell komponen halaman `/naskah/[conversationId]` |
| **Download Button** | [NaskahDownloadButton.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/naskah/NaskahDownloadButton.tsx) | Endpoints: `/api/naskah/export/pdf` (L49) & `/api/naskah/export/word` (L55) |
| **Session Export PDF** | [route.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/api/export/pdf/route.ts) | `POST /api/export/pdf`, guard `completed` status |
| **Session Export Word** | [route.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/api/export/word/route.ts) | `POST /api/export/word`, `generateWordStream` |

---

## Referensi Dokumen Sumber
- [User Flows 14: Judul (Stage Terakhir)](./user-flows-14-judul.md)

---
> [!NOTE]
> `rebuildNaskahSnapshot` bersifat non-blocking dan idempotent — bisa dipanggil berkali-kali tanpa efek samping negatif. Naskah yang ditampilkan selalu mencerminkan state terbaru dari stage-stage yang sudah disetujui.
