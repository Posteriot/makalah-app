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
3. Fetch **kedua** constitution aktif secara parallel:
   - `styleConstitutions.getActiveNaturalness` — Layer 1 (naturalness)
   - `styleConstitutions.getActive` — Layer 2 (style, filtered: exclude naturalness type)
4. Build prompt dua lapis via `buildRefrasaPrompt(content, styleContent, naturalnessContent)`
5. `generateObject` ke provider utama (`getGatewayModel`)
6. Fallback ke `getOpenRouterModel` jika primary gagal
7. Return JSON `{ issues, refrasedText }`

Referensi:

- `src/app/api/refrasa/route.ts`

## 7. Prompting: Two-Layer Architecture

Refrasa pakai arsitektur prompt dua lapis. Kedua layer sekarang editable via admin panel.

### Layer 1: Core Naturalness Criteria

- **Primary source:** Database (`styleConstitutions` dengan `type: "naturalness"`)
- **Fallback:** Hardcoded constant `LAYER_1_CORE_NATURALNESS` di `prompt-builder.ts`
- Jika tidak ada naturalness constitution aktif di DB, atau fetch gagal, fallback hardcoded dipakai
- Berisi: vocabulary diversity, sentence pattern variance, paragraph rhythm, hedging balance, burstiness

### Layer 2: Style Constitution

- **Source:** Database (`styleConstitutions` dengan `type: "style"` atau `undefined` untuk legacy)
- Opsional — jika tidak ada yang aktif, Layer 2 dilewati
- Berisi: panduan gaya penulisan spesifik (diksi, struktur kalimat, frasa, dll)

### Academic Escape Clause

- Selalu hardcoded, tidak editable
- Menjaga istilah teknis, sitasi, struktur markdown, proper nouns
- Safety rule: tidak boleh dimodifikasi oleh constitution manapun

### Fallback Flow

```
Naturalness (Layer 1):
  DB ada active naturalness constitution? → pakai dari DB
  DB kosong/error?                        → pakai LAYER_1_CORE_NATURALNESS hardcoded

Style (Layer 2):
  DB ada active style constitution? → pakai dari DB
  DB kosong/error?                  → skip (Layer 2 opsional)
```

Referensi:

- `src/lib/refrasa/prompt-builder.ts`
- `src/lib/refrasa/schemas.ts`
- `src/lib/refrasa/types.ts`

## 8. Constitution Data Model

Kedua tipe constitution (naturalness dan style) disimpan di tabel `styleConstitutions` yang sama.

### Schema

Field `type` pada tabel `styleConstitutions`:

- `"naturalness"` — Layer 1 constitution
- `"style"` — Layer 2 constitution
- `undefined` — Legacy record, diperlakukan sebagai `"style"`

Field `type` adalah `v.optional(...)` untuk backward-compatibility dengan record lama.

### Single-Active Constraint Per Type

- Aktivasi constitution hanya menonaktifkan constitution **sesama type**.
- Boleh ada 1 naturalness aktif DAN 1 style aktif bersamaan.
- Mutation `activate` filter per-type via `(c.type ?? "style") === targetType`.

### Queries

- `getActiveNaturalness` — Fetch active `by_active` index, filter `type === "naturalness"` di application code
- `getActive` — Fetch active `by_active` index, filter `type !== "naturalness"` (style + legacy)

Index `by_active_type` tidak dipakai karena Convex tidak support chained `.eq()` pada optional field di compound index. Filtering dilakukan di application code.

### Migration Seed

- `convex/migrations/seedNaturalnessConstitution.ts` — Seed hardcoded Layer 1 ke DB sebagai naturalness constitution v1
- Jalankan via: `npx convex run migrations:seedNaturalnessConstitution`
- Guard: skip jika naturalness constitution aktif sudah ada

Referensi:

- `convex/schema.ts` (field `type` + index `by_active`)
- `convex/styleConstitutions.ts`
- `convex/migrations/seedNaturalnessConstitution.ts`

## 9. Tab Workspace Refrasa (`RefrasaTabContent`)

`RefrasaTabContent` adalah pusat review hasil Refrasa.

Kemampuan utama:

- Menampilkan isi artifact Refrasa aktif (rendered markdown, bukan raw)
- Menampilkan daftar issue dari `artifact.refrasaIssues`
- Version switching untuk versi Refrasa per source artifact
- Compare mode: side-by-side di desktop, toggle tab di mobile
- Action: apply, delete, copy, download

### Compare View

- Toggle via tombol `ViewColumns2` di toolbar
- **Desktop (>=md):** Grid 2 kolom — kiri "Asli" (slate badge), kanan "Refrasa" (amber badge)
- **Mobile (<md):** Pill tab toggle antara "Asli" dan "Refrasa"
- Source artifact content diambil via query `artifacts.get` pada `sourceArtifactId`

Referensi:

- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaToolbar.tsx`
- `src/components/refrasa/RefrasaIssueItem.tsx`

## 10. Apply Flow (Aktual)

Saat klik `Terapkan` di toolbar Refrasa:

1. Source artifact di-update dengan isi `artifact.refrasa` saat ini.
2. Artifact Refrasa ditandai `appliedAt` via `markRefrasaApplied`.
3. Setelah delay 1.5 detik, UI pindah ke tab source artifact.

Referensi:

- `src/components/refrasa/RefrasaTabContent.tsx`

## 11. Versioning dan Tab Reuse

### 11.1 Versioning Refrasa

- Refrasa disimpan sebagai chain versi per `sourceArtifactId`.
- Daftar versi ditarik via `getBySourceArtifact`.

### 11.2 Refrasa Tab Reuse

- Jika source artifact sama, tab Refrasa lama di-replace (bukan buka tab baru terus-menerus).

Referensi:

- `src/lib/hooks/useArtifactTabs.ts`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/refrasa/RefrasaTabContent.tsx`

## 12. Sorting: Parent-Child Grouping

Artifact refrasa dikelompokkan tepat di bawah parent-nya di sidebar dan fullscreen dropdown.

- Parent (non-refrasa) sorted by `createdAt` ASC (urutan stage)
- Refrasa children langsung di bawah parent-nya, sorted by `createdAt` ASC
- Orphan refrasa (source tidak ditemukan) ditampilkan di akhir

Logika grouping ada di fungsi `getLatestArtifactVersions()` di 3 file:

- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ArtifactList.tsx`

## 13. Loading States

Loading overlay saat Refrasa memproses:

- **Panel** (`ArtifactViewer`): `absolute inset-0`, `bg-slate-100/95 backdrop-blur-md`
- **Fullscreen** (`FullsizeArtifactModal`): `absolute inset-0`, `bg-slate-100/95 backdrop-blur-md`
- **Tab Refrasa** (`RefrasaTabContent`): Fallback loading via `RefrasaLoadingIndicator`

Overlay menggunakan `inset-0` (full coverage) dan opacity 95% + blur 12px untuk memastikan teks di bawah sepenuhnya tertutup.

Referensi:

- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx`
- `src/lib/refrasa/loading-messages.ts`

## 14. Kontrol Admin

Kontrol admin yang relevan:

1. **Toggle global** visibilitas tool Refrasa (`isRefrasaEnabled`)
2. **Naturalness Constitution (Layer 1):** Section terpisah di admin panel. CRUD, versioning, single-active per type. Jika tidak ada yang aktif, fallback ke hardcoded.
3. **Style Constitution (Layer 2):** Section terpisah di admin panel. CRUD, versioning, single-active per type. Opsional.

Admin panel menampilkan dua section card terpisah:
- "Refrasa - Naturalness Constitution" (Layer 1)
- "Refrasa - Style Constitution" (Layer 2)

Create dialog context-aware: description dan helper text menyesuaikan tipe constitution yang sedang dibuat.

Referensi:

- `src/components/admin/StyleConstitutionManager.tsx`
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx`

## 15. Ketergantungan Data Layer yang Dipakai dari `src`

Dari sisi `src`, fitur ini memanggil mutation/query berikut:

- `api.artifacts.createRefrasa`
- `api.artifacts.getBySourceArtifact`
- `api.artifacts.markRefrasaApplied`
- `api.artifacts.update`
- `api.artifacts.remove`
- `api.aiProviderConfigs.getRefrasaEnabled`
- `api.styleConstitutions.getActive` (Layer 2 style, filtered exclude naturalness)
- `api.styleConstitutions.getActiveNaturalness` (Layer 1 naturalness)
- `api.styleConstitutions.list` (admin panel — returns both types)
- `api.styleConstitutions.create` (with `type` param)
- `api.styleConstitutions.activate` (per-type single-active)

## 16. Known Gaps (Sesuai Kode Saat Ini)

1. `artifactId` dikirim ke `/api/refrasa`, tapi belum dipakai di handler server.
2. Download `DOCX` dan `PDF` di tab Refrasa masih TODO; saat ini baru `TXT` yang implement.
3. Sebagian test Refrasa lama masih merefleksikan flow lama berbasis context menu/dialog apply, sehingga tidak sepenuhnya merepresentasikan arsitektur tab-based terbaru.

## 17. Peta File Utama (`src`)

- `src/app/api/refrasa/route.ts`
- `src/lib/hooks/useRefrasa.ts`
- `src/lib/refrasa/prompt-builder.ts`
- `src/lib/refrasa/schemas.ts`
- `src/lib/refrasa/types.ts`
- `src/lib/refrasa/loading-messages.ts`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/ArtifactList.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaToolbar.tsx`
- `src/components/refrasa/RefrasaIssueItem.tsx`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx`
- `src/components/refrasa/RefrasaButton.tsx` (komponen legacy, masih ada dan dites, tapi bukan jalur utama UI aktif)
- `src/components/admin/StyleConstitutionManager.tsx`
- `convex/schema.ts` (tabel `styleConstitutions` — field `type`)
- `convex/styleConstitutions.ts` (queries + mutations)
- `convex/migrations/seedNaturalnessConstitution.ts`
