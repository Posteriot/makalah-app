# Chat Feature Spec: Artifact Workspace

Dokumen ini mendefinisikan spesifikasi runtime artifact workspace pada halaman chat untuk kebutuhan maintenance, optimasi, dan source of truth perubahan fitur.

## 1. Scope

- Runtime panel artifact di halaman `/chat` dan `/chat/[conversationId]`.
- Fokus:
- tab lifecycle (open, activate, close, reuse)
- toolbar actions (edit, copy, download, refrasa, expand)
- viewer/editor/fullsize behavior
- integrasi tab Refrasa
- invalid state handling (artifact hilang, invalidated, unauthorized, loading)

## 2. Boundary dan Komponen Utama

- Orchestrator:
- `src/components/chat/ChatContainer.tsx`
- `src/lib/hooks/useArtifactTabs.ts`
- Panel shell:
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- Viewer:
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/ArtifactEditor.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- Refrasa:
- `src/lib/hooks/useRefrasa.ts`
- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaToolbar.tsx`
- Convex contracts:
- `convex/artifacts.ts`

## 3. State Ownership

## 3.1 Tab State (Single Source)

Owner: `useArtifactTabs` (dipakai di `ChatContainer`)

- `openTabs: ArtifactTab[]`
- `activeTabId: Id<"artifacts"> | null`
- aksi:
- `openTab`
- `closeTab`
- `setActiveTab`
- `closeAllTabs`
- `updateTabTitle`

Aturan inti:

- state bersifat session-local (tanpa localStorage/URL sync).
- maksimum tab terbuka: 8 (`MAX_ARTIFACT_TABS`).
- saat melebihi batas, tab tertua di-drop (FIFO).
- khusus tab type `refrasa` dengan `sourceArtifactId` yang sama:
- tab lama di-replace (reuse), bukan menambah tab duplikat.

## 3.2 Panel Open/Close State

Owner: `ChatContainer`

- panel dianggap open jika `openTabs.length > 0`.
- toggle panel:
- jika open -> `closeAllTabs()`
- jika close dan ada artifacts -> buka artifact terbaru.

## 3.3 Viewer-local State

Owner: `ArtifactViewer`

- `isEditing`, `isSaving`, `copied`
- `viewingVersionId`
- `downloadFormat`
- `isRefrasaLoading`

Owner: `FullsizeArtifactModal`

- `activeArtifactId`, `viewingVersionId`
- `isEditing`, `editContent`, `isSaving`
- `closeGuardOpen` (unsaved-change guard)

## 4. Tab Lifecycle

## 4.1 Open Tab

Sumber open tab:

- auto dari tool output create/update artifact via `ChatWindow -> onArtifactSelect`.
- klik artifact dari sidebar paper sessions.
- hasil Refrasa (`useRefrasa` callback membuka tab type `refrasa`).

Flow:

1. `openTab(artifact)` dipanggil.
2. Jika tab sudah ada -> title di-refresh + tab diaktivasi.
3. Jika tab refrasa untuk source yang sama -> replace tab refrasa lama.
4. Jika sudah 8 tab -> remove tab paling tua, lalu append tab baru.
5. `activeTabId` diset ke tab yang dibuka.

## 4.2 Change Tab

- `ArtifactTabs` kirim `onTabChange(tabId)`.
- keyboard support:
- `ArrowLeft`, `ArrowRight`, `Home`, `End`
- `Enter`/`Space` untuk activate
- auto-scroll tab aktif ke viewport.

## 4.3 Close Tab

- close via tombol `X` per tab atau shortcut (`Delete`, `Backspace`, `Cmd/Ctrl+W`).
- fallback active tab:
- prioritas ke tab kanan, jika tidak ada pakai tab kiri.
- jika semua tab tertutup:
- `activeTabId = null`
- panel otomatis tertutup di level `ChatContainer`.

## 5. Artifact Panel Lifecycle

## 5.1 Render Gate

- `ArtifactPanel` return `null` saat `isOpen === false`.
- ini berarti workspace benar-benar tidak dirender saat panel ditutup.

## 5.2 Active Content Routing

Di dalam panel:

- jika active tab type `refrasa` -> render `RefrasaTabContent`.
- jika active tab normal + artifact ketemu -> render `ArtifactViewer`.
- jika active tab ada tapi artifact tidak ditemukan -> tampilkan fallback + tombol tutup tab aktif.
- jika belum ada tab aktif tapi ada open tabs -> prompt pilih tab.
- jika belum ada tab sama sekali -> empty workspace message.

## 5.3 Toolbar Visibility Rule

- `ArtifactToolbar` hanya muncul untuk tab non-refrasa.
- tab refrasa memakai toolbar sendiri (`RefrasaToolbar`) di kontennya.

## 6. Toolbar Actions Contract

## 6.1 Panel Toolbar (`ArtifactToolbar`)

Aksi yang tersedia:

- `Edit` -> `viewerRef.startEdit()`
- `Copy` -> `viewerRef.copy()`
- `Refrasa` -> `viewerRef.triggerRefrasa()`
- `Download` -> set format lalu `viewerRef.download()`
- `Expand` -> buka `FullsizeArtifactModal`
- `Close panel` (compact mode only) -> `onClosePanel`

Rule Refrasa button:

- UI memberi indikasi minimal konten 50 karakter.
- eksekusi final tetap divalidasi di `ArtifactViewer` via `canRefrasa`.

## 6.2 Fullsize Toolbar

Aksi serupa tapi berjalan dalam modal:

- edit inline
- save/cancel
- copy
- refrasa
- download dropdown
- lihat refrasa existing
- close fullscreen (dengan close guard jika ada unsaved changes)

## 7. Viewer dan Editor Lifecycle

## 7.1 Render Mode

`ArtifactViewer` memilih renderer berdasarkan konten:

- Mermaid -> `MermaidRenderer`
- chart JSON -> `ChartRenderer`
- code/latex -> `react-syntax-highlighter`
- default -> `MarkdownRenderer`
- fallback -> `<pre>`

## 7.2 Edit -> Save (Versioned Update)

Flow save:

1. user masuk edit mode (`ArtifactEditor` atau textarea fullscreen).
2. submit save memanggil `api.artifacts.update`.
3. backend membuat versi baru (immutable), `version + 1`.
4. toast sukses menampilkan versi baru.
5. viewer keluar dari edit mode.

Kontrak penting:

- update tidak patch dokumen lama.
- update membuat record artifact baru dengan `parentId` ke versi sebelumnya.

## 7.3 Download Contract

Viewer/modal download menggunakan client-side Blob:

- `txt` -> file `.txt`
- `docx`/`pdf` saat ini diekspor sebagai konten markdown (`.md`) dari client.

Catatan:

- format ini adalah temporary behavior, belum ekspor DOCX/PDF binary via pipeline export dedicated.

## 8. Fullsize Workspace Lifecycle

- modal share state tab yang sama dari parent panel (`openTabs`, `activeTabId`, `onTabChange`, `onTabClose`, `onOpenTab`).
- artinya perpindahan tab di modal sinkron dengan panel.
- modal support:
- focus trap
- `Escape` close
- body scroll lock
- close guard jika ada perubahan edit belum disimpan.

Additional workspace behavior:

- selector “Artifak lainnya” untuk ganti artifact aktif dalam session.
- daftar artifact disusun dari versi terbaru per pasangan `type-title`, lalu refrasa dikelompokkan berdasarkan parent source.
- badge `FINAL` ditarik dari `api.artifacts.checkFinalStatus`.

## 9. Refrasa Integration Lifecycle

## 9.1 Trigger Refrasa

Flow:

1. user trigger Refrasa dari panel atau fullscreen.
2. `useRefrasa.analyzeAndRefrasa` call `POST /api/refrasa`.
3. hasil `refrasedText + issues` dipersist via `api.artifacts.createRefrasa`.
4. callback `onArtifactCreated` membuka tab type `refrasa`.

## 9.2 Refrasa Tab Behavior

`RefrasaTabContent` menyediakan:

- pilih versi refrasa per source artifact.
- compare mode (desktop side-by-side, mobile toggle tab).
- apply hasil refrasa ke source artifact:
- call `api.artifacts.update` ke source artifact.
- mark versi refrasa sebagai applied (`api.artifacts.markRefrasaApplied`).
- auto activate tab source artifact setelah apply.
- delete versi refrasa (`api.artifacts.remove`).

## 9.3 Existing Refrasa Shortcut

- di fullscreen non-refrasa, tombol `Lihat Refrasa` muncul jika ada hasil dari `api.artifacts.getBySourceArtifact`.
- tombol membuka tab refrasa terbaru.

## 10. Invalid State Handling

## 10.1 Artifact Not Found / Unauthorized

- query `api.artifacts.get` return `null` pada unauthorized/not found.
- `ArtifactViewer` dan `RefrasaTabContent` render fallback “Artifact tidak ditemukan”.
- `ArtifactPanel` juga punya fallback khusus jika active tab ID ada tapi artifact di list conversation tidak ditemukan.

## 10.2 Invalidation by Rewind

Sumber data:

- field artifact `invalidatedAt`
- field `invalidatedByRewindToStage`

UI behavior:

- `ArtifactViewer` menampilkan:
- badge `Perlu revisi`
- warning alert dengan alasan stage rewind.

Recovery behavior:

- update artifact (`api.artifacts.update`) otomatis membuat versi baru yang bersih dari flag invalidation.
- untuk flow workspace saat ini, invalidation dibersihkan melalui versioning, bukan patch `clearInvalidation`.

## 10.3 Loading/Error States

- artifact undefined -> loading spinner.
- Refrasa processing -> overlay `RefrasaLoadingIndicator`.
- save/update failure -> toast error.
- refrasa API/mutation failure -> toast error.

## 11. Invariant yang Harus Dijaga

- tab state tunggal tetap di `useArtifactTabs`.
- panel visibility tetap turunan dari jumlah open tabs.
- update artifact wajib immutable (new version + parent chain).
- tab refrasa harus reuse per `sourceArtifactId` agar tidak flooding.
- warning invalidation harus tetap terlihat sampai artifact diperbarui.

## 12. Known Constraints Saat Ini

- export `docx`/`pdf` di viewer/modal masih behavior download markdown client-side.
- `RefrasaTabContent` download `docx`/`pdf` belum diimplementasi (baru `txt`).
- invalidation cleanup explicit (`api.artifacts.clearInvalidation`) belum dipakai di flow panel utama, karena saat ini mengandalkan update-version.

## 13. File Referensi

- `src/components/chat/ChatContainer.tsx`
- `src/lib/hooks/useArtifactTabs.ts`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/ArtifactEditor.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/lib/hooks/useRefrasa.ts`
- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaToolbar.tsx`
- `convex/artifacts.ts`
