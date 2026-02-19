# Refrasa — Dokumentasi Teknis Internal

Dokumen ini menjelaskan implementasi fitur Refrasa yang menempel di artifact pada workspace chat, dari sisi UI, API, prompt LLM, konfigurasi admin, sampai persistensi versi artifact di Convex. Target pembaca: engineer internal dan agent coding AI yang butuh konteks teknis sebelum modifikasi fitur.

## 1. Scope dan Definisi

Refrasa adalah fitur perapihan gaya bahasa akademis pada konten artifact.

- Refrasa berjalan terhadap `artifact.content`, bukan terhadap chat message biasa.
- Hasil Refrasa tidak langsung overwrite; user harus review dan konfirmasi.
- Saat user klik `Terapkan`, sistem membuat versi artifact baru lewat mutation `artifacts.update`.

Referensi:
- `src/components/chat/ArtifactViewer.tsx:216`
- `src/components/chat/ArtifactViewer.tsx:234`
- `convex/artifacts.ts:302`

## 2. Arsitektur Ringkas

### 2.1 Alur Komponen (Panel + Fullscreen)

1. User klik aksi Refrasa dari toolbar artifact.
2. Viewer/Modal memanggil `analyzeAndRefrasa(content, artifactId)` dari hook `useRefrasa`.
3. Hook call `POST /api/refrasa`.
4. API validasi + generate output terstruktur (`issues[]`, `refrasedText`) via `generateObject`.
5. UI tampilkan dialog review (`RefrasaConfirmDialog`).
6. Jika user klik `Terapkan`, UI panggil `api.artifacts.update` dengan `refrasedText`.

Referensi:
- `src/components/chat/ArtifactPanel.tsx:126`
- `src/components/chat/ArtifactViewer.tsx:117`
- `src/lib/hooks/useRefrasa.ts:47`
- `src/app/api/refrasa/route.ts:33`
- `src/components/refrasa/RefrasaConfirmDialog.tsx:102`
- `src/components/chat/ArtifactViewer.tsx:239`

### 2.2 Entry Points UI

- Panel mode: `ArtifactToolbar -> viewerRef.current?.triggerRefrasa()`
- Fullscreen mode: tombol `Refrasa` langsung di `FullsizeArtifactModal`

Referensi:
- `src/components/chat/ArtifactToolbar.tsx:237`
- `src/components/chat/ArtifactPanel.tsx:126`
- `src/components/chat/FullsizeArtifactModal.tsx:574`

## 3. Guard dan Ketersediaan Fitur

Refrasa hanya boleh jalan jika semua syarat ini terpenuhi:

1. Toggle admin aktif (`isRefrasaEnabled !== false`)
2. Artifact bukan tipe `chart`
3. Panjang konten minimal 50 karakter

Referensi:
- `src/components/chat/ArtifactViewer.tsx:147`
- `src/components/chat/FullsizeArtifactModal.tsx:210`
- `src/lib/refrasa/schemas.ts:95`

Catatan perilaku penting:

- Di fullscreen, tombol Refrasa disembunyikan saat toggle admin OFF.
- Di panel toolbar, tombol tetap ada; eksekusi dibatalkan oleh guard internal viewer.

Referensi:
- `src/components/chat/FullsizeArtifactModal.tsx:574`
- `src/components/chat/ArtifactToolbar.tsx:237`
- `src/components/chat/ArtifactViewer.tsx:217`

## 4. Hook Client: `useRefrasa`

Hook ini mengelola state request Refrasa:

- `isLoading`
- `result` (`issues[]`, `refrasedText`)
- `error`
- helper `issueCount` dan `issuesByCategory`

Kontrak call:

- Endpoint: `POST /api/refrasa`
- Body: `{ content, artifactId? }`

Referensi:
- `src/lib/hooks/useRefrasa.ts:35`
- `src/lib/hooks/useRefrasa.ts:47`
- `src/lib/refrasa/types.ts:66`
- `src/lib/refrasa/types.ts:79`

## 5. API Server: `POST /api/refrasa`

Langkah server:

1. Auth check (`isAuthenticated`).
2. Validasi body dengan `RequestBodySchema`.
3. Ambil style constitution aktif (Layer 2) dari Convex.
4. Build prompt 2-layer (`buildRefrasaPrompt`).
5. Generate structured output dengan provider primary (`getGatewayModel`).
6. Jika primary gagal, retry ke fallback (`getOpenRouterModel`).
7. Return JSON `issues` + `refrasedText`.

Referensi:
- `src/app/api/refrasa/route.ts:36`
- `src/app/api/refrasa/route.ts:46`
- `src/app/api/refrasa/route.ts:64`
- `src/app/api/refrasa/route.ts:76`
- `src/app/api/refrasa/route.ts:84`
- `src/app/api/refrasa/route.ts:102`
- `src/app/api/refrasa/route.ts:125`

## 6. Prompting: Two-Layer Architecture

Refrasa menggunakan arsitektur prompt 2 lapis:

- Layer 1 (hardcoded): Core Naturalness Criteria (wajib, tidak bisa dioverride).
- Layer 2 (dinamis): Style Constitution dari database (opsional, admin-managed).

Jika Layer 2 kosong/error, sistem tetap jalan dengan Layer 1 saja.

Referensi:
- `src/lib/refrasa/prompt-builder.ts:30`
- `src/lib/refrasa/prompt-builder.ts:165`
- `src/lib/refrasa/prompt-builder.ts:193`
- `src/lib/refrasa/prompt-builder.ts:202`
- `src/app/api/refrasa/route.ts:60`

## 7. Output Schema Refrasa

Output model harus structured sesuai schema:

- `issues[]`:
  - `type`: `vocabulary_repetition | sentence_pattern | paragraph_rhythm | hedging_balance | burstiness | style_violation`
  - `category`: `naturalness | style`
  - `severity`: `info | warning | critical`
  - `message`, `suggestion?`
- `refrasedText`: teks hasil perbaikan

Referensi:
- `src/lib/refrasa/schemas.ts:24`
- `src/lib/refrasa/schemas.ts:50`
- `src/lib/refrasa/schemas.ts:77`
- `src/lib/refrasa/types.ts:24`

## 8. UX Review dan Apply

### 8.1 Loading

Saat analisis berjalan, UI menampilkan overlay loading dengan rotating educational messages.

Referensi:
- `src/components/chat/ArtifactViewer.tsx:412`
- `src/components/chat/FullsizeArtifactModal.tsx:614`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx:20`
- `src/lib/refrasa/loading-messages.ts:12`

### 8.2 Dialog Konfirmasi

Dialog menampilkan:

- hasil perbaikan,
- opsi bandingkan teks asli,
- daftar issue (naturalness/style),
- aksi `Batal` dan `Terapkan`.

Referensi:
- `src/components/refrasa/RefrasaConfirmDialog.tsx:102`
- `src/components/refrasa/RefrasaConfirmDialog.tsx:171`
- `src/components/refrasa/RefrasaConfirmDialog.tsx:187`
- `src/components/refrasa/RefrasaConfirmDialog.tsx:235`

## 9. Persistensi Artifact Versioning

Saat apply Refrasa:

- UI memanggil `api.artifacts.update({ artifactId, userId, content: refrasedText })`.
- Mutation `update` membuat record artifact baru dengan:
  - `version = old.version + 1`
  - `parentId = artifactId lama`
- Jadi versi lama tetap ada dan bisa ditelusuri via chain.

Referensi:
- `src/components/chat/ArtifactViewer.tsx:239`
- `src/components/chat/FullsizeArtifactModal.tsx:357`
- `convex/artifacts.ts:334`
- `convex/artifacts.ts:352`
- `convex/artifacts.ts:353`
- `convex/artifacts.ts:173`

## 10. Kontrol Admin Refrasa

Kontrol admin terdiri dari dua area:

1. Global visibility toggle Refrasa (`isRefrasaEnabled`).
2. Style Constitution management (buat/edit/aktif/nonaktif versi constitution).

Referensi:
- `convex/aiProviderConfigs.ts:559`
- `convex/aiProviderConfigs.ts:577`
- `src/components/admin/StyleConstitutionManager.tsx:111`
- `src/components/admin/StyleConstitutionManager.tsx:430`
- `convex/styleConstitutions.ts:110`
- `convex/styleConstitutions.ts:404`

## 11. Data Model Terkait

Tabel utama:

- `artifacts` (konten + version chain)
- `styleConstitutions` (Layer 2 rules)
- `aiProviderConfigs.isRefrasaEnabled` (maintenance toggle)

Referensi:
- `convex/schema.ts:153`
- `convex/schema.ts:187`
- `convex/schema.ts:300`

## 12. Test Coverage yang Ada

Test yang tersedia:

- Integrasi Refrasa pada `ArtifactViewer`
- UI `RefrasaConfirmDialog`
- logic disable/enable `RefrasaButton`

Referensi:
- `__tests__/artifact-viewer-refrasa.test.tsx:32`
- `__tests__/refrasa-confirm-dialog.test.tsx:7`
- `__tests__/refrasa-button.test.tsx:4`

Status verifikasi di environment saat dokumen ini disusun:

- Menjalankan Vitest gagal startup karena error ESM loader (`ERR_REQUIRE_ESM`) saat load config.
- Artinya, validasi perilaku pada dokumen ini berbasis pembacaan kode + test file, bukan hasil run test hijau pada mesin ini.

## 13. Known Gaps / Hal yang Perlu Diperhatikan

1. `artifactId` dikirim dari client ke `/api/refrasa`, tapi belum digunakan dalam handler server saat ini.
2. Komponen `RefrasaButton` ada dan punya test, tetapi pada alur artifact aktif sekarang tombol yang dipakai berasal dari `ArtifactToolbar`/`FullsizeArtifactModal`.
3. Konsistensi UX toggle OFF berbeda antara panel vs fullscreen (lihat bagian guard).

Referensi:
- `src/lib/hooks/useRefrasa.ts:52`
- `src/app/api/refrasa/route.ts:58`
- `src/components/refrasa/RefrasaButton.tsx:42`
- `src/components/chat/ArtifactToolbar.tsx:237`
- `src/components/chat/FullsizeArtifactModal.tsx:574`

## 14. Peta File Utama

- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/refrasa/RefrasaConfirmDialog.tsx`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx`
- `src/lib/hooks/useRefrasa.ts`
- `src/app/api/refrasa/route.ts`
- `src/lib/refrasa/prompt-builder.ts`
- `src/lib/refrasa/schemas.ts`
- `src/lib/refrasa/types.ts`
- `convex/artifacts.ts`
- `convex/styleConstitutions.ts`
- `convex/aiProviderConfigs.ts`
- `src/components/admin/StyleConstitutionManager.tsx`

