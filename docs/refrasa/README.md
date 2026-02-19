# Refrasa — Dokumentasi Teknis Internal (Kondisi Terkini)

Dokumen ini merangkum kondisi aktual fitur Refrasa berdasarkan kode terbaru di folder `src`. Fokus utamanya: alur UI, hook, API, tab workspace Refrasa, guard, dan integrasi ke data layer.

## 1. Scope Fitur

Refrasa adalah fitur perapihan gaya tulis akademis untuk **artifact content**.

- Refrasa tidak bekerja di chat bubble langsung.
- Hasil Refrasa disimpan sebagai artifact bertipe `refrasa` (versi terpisah), bukan langsung overwrite source artifact.
- User bisa melihat hasil, membandingkan dengan teks asli, lalu menekan `Terapkan` untuk menyalin hasil ke source artifact.

## 2. Arsitektur Terkini (Tab-Based)

Arsitektur saat ini **bukan** lagi model dialog konfirmasi apply di viewer.

Alur aktual:

1. Trigger Refrasa dari panel atau fullscreen.
2. `useRefrasa` memanggil `POST /api/refrasa`.
3. Hasil AI (`issues`, `refrasedText`) langsung dipersist sebagai artifact `refrasa`.
4. UI membuka tab Refrasa baru (atau replace tab Refrasa lama untuk source yang sama).
5. User review di tab Refrasa (`RefrasaTabContent`), lalu `Terapkan` jika setuju.

## 3. Entry Point UI

### 3.1 Panel Artifact

- Toolbar panel memicu `viewerRef.current?.triggerRefrasa()`.
- Jika tab aktif bertipe `refrasa`, toolbar umum disembunyikan dan diganti konten khusus Refrasa.

Referensi:

- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/refrasa/RefrasaTabContent.tsx`

### 3.2 Fullscreen Artifact Modal

- Tombol `Refrasa` tersedia untuk artifact non-refrasa (tergantung guard).
- Tombol `Lihat Refrasa` muncul jika sudah ada hasil Refrasa sebelumnya (`getBySourceArtifact`).
- Jika tab modal aktif adalah tab `refrasa`, konten utama memakai `RefrasaTabContent`.

Referensi:

- `src/components/chat/FullsizeArtifactModal.tsx`

## 4. Guard Ketersediaan Refrasa

Syarat utama:

1. Toggle admin aktif (`isRefrasaEnabled !== false`)
2. Artifact bukan `chart`
3. `content.length >= 50`

Catatan perilaku:

- Di fullscreen, tombol Refrasa disembunyikan jika toggle OFF.
- Di panel toolbar, tombol Refrasa tetap terlihat; eksekusi dihentikan oleh guard di handler viewer (`canRefrasa`).

Referensi:

- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/lib/refrasa/schemas.ts`

## 5. Hook Client: `useRefrasa`

Hook ini sekarang mengelola 2 hal sekaligus:

1. Analisis Refrasa via API.
2. Persist hasil ke artifact `refrasa` lewat mutation `createRefrasa`.

Kontrak terbaru:

- `analyzeAndRefrasa(content, sourceArtifactId, sourceTitle)`
- Hook menerima `conversationId`, `userId`, dan callback `onArtifactCreated`.
- Setelah persist sukses, callback dipakai untuk membuka tab Refrasa.

State yang disediakan:

- `isLoading`
- `result`
- `error`
- `issueCount`
- `issuesByCategory`
- `reset()`

Referensi:

- `src/lib/hooks/useRefrasa.ts`

## 6. API Server: `POST /api/refrasa`

Flow server:

1. Auth check (`isAuthenticated`)
2. Validasi body (`RequestBodySchema`)
3. Ambil Layer 2 constitution aktif dari Convex (`styleConstitutions.getActive`)
4. Build prompt dua lapis
5. `generateObject` ke provider utama (`getGatewayModel`)
6. Fallback ke `getOpenRouterModel` jika primary gagal
7. Return JSON `{ issues, refrasedText }`

Referensi:

- `src/app/api/refrasa/route.ts`

## 7. Prompting: Two-Layer Architecture

Refrasa pakai arsitektur prompt:

- **Layer 1 (hardcoded):** Core naturalness criteria (non-override)
- **Layer 2 (dynamic):** Style Constitution dari admin
- **Academic Escape Clause:** menjaga istilah teknis, sitasi, struktur markdown, proper nouns

Referensi:

- `src/lib/refrasa/prompt-builder.ts`
- `src/lib/refrasa/schemas.ts`
- `src/lib/refrasa/types.ts`

## 8. Tab Workspace Refrasa (`RefrasaTabContent`)

`RefrasaTabContent` adalah pusat review hasil Refrasa.

Kemampuan utama:

- Menampilkan isi artifact Refrasa aktif
- Menampilkan daftar issue dari `artifact.refrasaIssues`
- Version switching untuk versi Refrasa per source artifact
- Compare mode (desktop split, mobile toggle)
- Action: apply, delete, copy, download

Referensi:

- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaToolbar.tsx`
- `src/components/refrasa/RefrasaIssueItem.tsx`

## 9. Apply Flow (Aktual)

Saat klik `Terapkan` di toolbar Refrasa:

1. Source artifact di-update dengan isi `artifact.refrasa` saat ini.
2. Artifact Refrasa ditandai `appliedAt` via `markRefrasaApplied`.
3. Setelah delay 1.5 detik, UI pindah ke tab source artifact.

Referensi:

- `src/components/refrasa/RefrasaTabContent.tsx`

## 10. Versioning dan Tab Reuse

### 10.1 Versioning Refrasa

- Refrasa disimpan sebagai chain versi per `sourceArtifactId`.
- Daftar versi ditarik via `getBySourceArtifact`.

### 10.2 Refrasa Tab Reuse

- Jika source artifact sama, tab Refrasa lama di-replace (bukan buka tab baru terus-menerus).

Referensi:

- `src/lib/hooks/useArtifactTabs.ts`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/refrasa/RefrasaTabContent.tsx`

## 11. Loading States

Loading indikator dipakai di tiga konteks:

1. Overlay di `ArtifactViewer`
2. Overlay di `FullsizeArtifactModal`
3. Fallback loading di `RefrasaTabContent`

Referensi:

- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx`
- `src/lib/refrasa/loading-messages.ts`

## 12. Kontrol Admin

Kontrol admin yang relevan:

1. Toggle global visibilitas tool Refrasa (`isRefrasaEnabled`)
2. CRUD dan aktivasi Style Constitution (Layer 2)

Referensi:

- `src/components/admin/StyleConstitutionManager.tsx`

## 13. Ketergantungan Data Layer yang Dipakai dari `src`

Dari sisi `src`, fitur ini memanggil mutation/query berikut:

- `api.artifacts.createRefrasa`
- `api.artifacts.getBySourceArtifact`
- `api.artifacts.markRefrasaApplied`
- `api.artifacts.update`
- `api.artifacts.remove`
- `api.aiProviderConfigs.getRefrasaEnabled`
- `api.styleConstitutions.getActive`

## 14. Known Gaps (Sesuai Kode Saat Ini)

1. `artifactId` dikirim ke `/api/refrasa`, tapi belum dipakai di handler server.
2. Download `DOCX` dan `PDF` di tab Refrasa masih TODO; saat ini baru `TXT` yang implement.
3. Sebagian test Refrasa lama masih merefleksikan flow lama berbasis context menu/dialog apply, sehingga tidak sepenuhnya merepresentasikan arsitektur tab-based terbaru.

## 15. Peta File Utama (`src`)

- `src/app/api/refrasa/route.ts`
- `src/lib/hooks/useRefrasa.ts`
- `src/lib/refrasa/prompt-builder.ts`
- `src/lib/refrasa/schemas.ts`
- `src/lib/refrasa/types.ts`
- `src/lib/refrasa/loading-messages.ts`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaToolbar.tsx`
- `src/components/refrasa/RefrasaIssueItem.tsx`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx`
- `src/components/refrasa/RefrasaButton.tsx` (komponen legacy, masih ada dan dites, tapi bukan jalur utama UI aktif)
- `src/components/admin/StyleConstitutionManager.tsx`

