# Refrasa Tool - Referensi Teknis

Dokumentasi teknis untuk fitur Refrasa (perbaikan gaya penulisan akademis Bahasa Indonesia) berbasis LLM, terintegrasi dengan Artifact.

## Daftar Isi

1. Gambaran Umum
2. Arsitektur Ringkas
3. Struktur Data dan Schema
4. Prompt Builder (Dua Layer)
5. API: POST /api/refrasa
   5.1 Log dan Console Behavior
6. Style Constitution (Layer 2)
7. UI dan UX Refrasa
8. Integrasi dengan ArtifactViewer
9. Hook useRefrasa
10. Pengujian
11. Dokumen Terkait

---

## 1. Gambaran Umum

Refrasa adalah tool untuk memperbaiki gaya penulisan akademis Bahasa Indonesia. Refrasa bekerja dengan arsitektur dua layer:

- Layer 1: Core Naturalness Criteria (hardcoded)
- Layer 2: Style Constitution (opsional, dikelola admin dan disimpan di database)

Output Refrasa selalu terstruktur: daftar issue (temuan + saran opsional) dan teks hasil perbaikan (`refrasedText`).

Karakteristik utama:
- Wajib menjaga istilah teknis, format markdown, dan format sitasi (Academic Escape Clause).
- Fokus pada naturalness, variasi struktur kalimat, dan gaya akademis yang konsisten.
- Integrasi di UI hanya melalui ArtifactViewer, bukan di chat langsung.

---

## 2. Arsitektur Ringkas

Alur utama Refrasa:

```
User klik Refrasa (toolbar/context menu)
  -> useRefrasa.analyzeAndRefrasa(content, artifactId)
    -> POST /api/refrasa
      -> Ambil Style Constitution aktif (jika ada)
      -> Build prompt dua layer
      -> generateObject (Gateway -> fallback OpenRouter)
      -> Return issues + refrasedText
  -> Dialog perbandingan (original vs refrased)
  -> User klik "Terapkan"
    -> api.artifacts.update (buat versi baru)
```

---

## 3. Struktur Data dan Schema

### 3.1 Tipe dan Interface

Lokasi: `src/lib/refrasa/types.ts`

- `RefrasaIssueType`: 
  - vocabulary_repetition
  - sentence_pattern
  - paragraph_rhythm
  - hedging_balance
  - burstiness
  - style_violation
- `RefrasaIssueCategory`: naturalness | style
- `RefrasaIssueSeverity`: info | warning | critical
- `RefrasaIssue`: type, category, message, severity, suggestion?
- `RefrasaRequest`: content, artifactId?
- `RefrasaResponse`: issues[], refrasedText

### 3.2 Zod Schema

Lokasi: `src/lib/refrasa/schemas.ts`

- `RefrasaIssueTypeSchema`
- `RefrasaIssueCategorySchema`
- `RefrasaIssueSeveritySchema`
- `RefrasaIssueSchema`
- `RefrasaOutputSchema`
- `RequestBodySchema`

Catatan validasi:
- `content` minimal 50 karakter
- `refrasedText` minimal 10 karakter
- `issues` boleh kosong

---

## 4. Prompt Builder (Dua Layer)

Lokasi: `src/lib/refrasa/prompt-builder.ts`

Fungsi utama:

```ts
buildRefrasaPrompt(content: string, constitution?: string | null): string
```

Isi prompt:
1. Identitas Refrasa dan tugasnya
2. Layer 1: Core Naturalness Criteria (hardcoded)
3. Academic Escape Clause (wajib dipertahankan)
4. Layer 2: Style Constitution (opsional, dari database)
5. Spesifikasi output JSON
6. Teks input

Catatan:
- Layer 1 tidak bisa di-override oleh Layer 2.
- Jika tidak ada constitution aktif, Layer 2 hanya berisi pesan fallback.

---

## 5. API: POST /api/refrasa

Lokasi: `src/app/api/refrasa/route.ts`

Ringkasan:
- Wajib autentikasi Clerk (401 jika tidak ada user).
- Request divalidasi dengan `RequestBodySchema` (400 jika invalid).
- Mengambil Style Constitution aktif via `api.styleConstitutions.getActive`.
- Membangun prompt dua layer.
- Memanggil LLM dengan `generateObject` dan `RefrasaOutputSchema`.
- Primary model: `getGatewayModel()` (dari konfigurasi database)
- Fallback model: `getOpenRouterModel()` (dari konfigurasi database)
- `temperature: 0.7`
- `maxDuration: 300` (Vercel)

Request body:
```json
{
  "content": "Teks input minimal 50 karakter",
  "artifactId": "optional"
}
```

Response sukses:
```json
{
  "issues": [
    {
      "type": "sentence_pattern",
      "category": "naturalness",
      "message": "...",
      "severity": "warning",
      "suggestion": "..."
    }
  ],
  "refrasedText": "Teks hasil perbaikan..."
}
```

Error utama:
- 401 Unauthorized (`Unauthorized`)
- 400 Validation error (`Validation error: ...`)
- 500 Provider gagal (`Failed to process text. Please try again later.`)
- 500 Error tak terduga (`Internal server error`)

Catatan:
- `artifactId` ada di schema request, tapi saat ini tidak digunakan di handler.

### 5.1 Log dan Console Behavior

Lokasi log: `src/app/api/refrasa/route.ts`

Log yang muncul:
- `[Refrasa API] Failed to fetch Style Constitution:` saat query constitution gagal.
- `[Refrasa API] Primary provider failed:` saat provider utama error.
- `[Refrasa API] Fallback provider also failed:` saat fallback error.
- `[Refrasa API] Unexpected error:` saat error tak terduga di handler.

---

## 6. Style Constitution (Layer 2)

### 6.1 Tabel Database

Lokasi: `convex/schema.ts` (table: `styleConstitutions`)

Fields utama:
- name, content, description
- version, isActive
- parentId, rootId
- createdBy, createdAt, updatedAt

Index:
- `by_active` untuk constitution aktif
- `by_root` untuk riwayat versi
- `by_createdAt` untuk urutan waktu

### 6.2 CRUD dan Versioning

Lokasi: `convex/styleConstitutions.ts`

Query:
- `getActive`: tanpa auth, dipakai oleh Refrasa API
- `list`, `getById`, `getVersionHistory`: admin/superadmin

Mutation:
- `create`: buat versi 1 (default tidak aktif)
- `update`: buat versi baru, versi lama nonaktif jika sebelumnya aktif
- `activate`: mengaktifkan satu versi, menonaktifkan versi lain
- `deactivate`: menonaktifkan versi aktif
- `deleteConstitution`: hapus 1 versi (tidak boleh aktif)
- `deleteChain`: hapus semua versi dalam chain (tidak boleh ada yang aktif)

### 6.3 Seed Default Constitution

Lokasi: `convex/migrations/seedDefaultStyleConstitution.ts`

- Hanya untuk bootstrap awal.
- Membutuhkan user role `superadmin`.
- Menambahkan constitution default dan langsung aktif.
- Perintah: `npx convex run migrations:seedDefaultStyleConstitution`

### 6.4 Admin Panel

Lokasi UI:
- `src/components/admin/AdminPanelContainer.tsx`
- `src/components/admin/StyleConstitutionManager.tsx`
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx`

Fitur:
- Create, edit (buat versi baru), aktivasi, deaktivasi.
- Hapus versi tunggal atau chain.
- Lihat riwayat versi lengkap.

---

## 7. UI dan UX Refrasa

### 7.1 RefrasaButton

Lokasi: `src/components/refrasa/RefrasaButton.tsx`

Perilaku:
- Disabled jika:
  - Sedang loading
  - Sedang edit artifact
  - Tidak ada artifact
  - Panjang konten < 50 karakter
- Tooltip berisi alasan disable atau deskripsi fungsi.
- Peringatan (tanpa blok) jika word count > 2000.

### 7.2 RefrasaIssueItem

Lokasi: `src/components/refrasa/RefrasaIssueItem.tsx`

Menampilkan:
- Badge kategori (naturalness atau style)
- Badge severity (info, warning, critical)
- Label tipe issue
- Pesan masalah + saran jika ada

### 7.3 RefrasaConfirmDialog

Lokasi: `src/components/refrasa/RefrasaConfirmDialog.tsx`

Fitur:
- Perbandingan kiri (teks asli) vs kanan (hasil refrasa).
- Issue dikelompokkan per kategori dengan collapsible.
- Tombol Terapkan untuk mengubah artifact.

### 7.4 RefrasaLoadingIndicator

Lokasi: `src/components/refrasa/RefrasaLoadingIndicator.tsx`

Fitur:
- Menampilkan loading + pesan edukatif.
- Pesan berputar setiap 2.5 detik.

---

## 8. Integrasi dengan ArtifactViewer

Lokasi: `src/components/chat/ArtifactViewer.tsx`

Integrasi utama:
- Context menu di area konten dengan opsi "Refrasa".
- Tombol Refrasa di toolbar (gunakan `RefrasaButton`).
- Overlay loading saat API sedang berjalan.
- Dialog konfirmasi muncul setelah hasil siap.
- Saat user klik "Terapkan":
  - Memanggil `api.artifacts.update`
  - Membuat versi baru artifact
  - Menampilkan toast sukses

Catatan:
- Refrasa hanya tersedia jika artifact dipilih.
- Minimum konten 50 karakter berlaku di context menu dan tombol.

---

## 9. Hook useRefrasa

Lokasi: `src/lib/hooks/useRefrasa.ts`

API hook:
- `analyzeAndRefrasa(content, artifactId?)`
- `reset()`
- State: `isLoading`, `result`, `error`
- Derived: `issueCount`, `issuesByCategory`

---

## 10. Pengujian

Lokasi: `__tests__/`

Tes UI Refrasa:
- `refrasa-button.test.tsx`
- `refrasa-issue-item.test.tsx`
- `refrasa-confirm-dialog.test.tsx`
- `artifact-viewer-refrasa.test.tsx`

---

## 11. Dokumen Terkait

- `.references/tools-calling-api/README.md`
- `.references/tools-calling-api/files-index.md`
- `.references/refrasa-tool/nlp-library.md`

---

Last updated: 2026-01-14
