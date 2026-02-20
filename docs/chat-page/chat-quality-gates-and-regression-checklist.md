# Chat Quality Gates and Regression Checklist

Dokumen ini adalah gerbang kualitas wajib sebelum merge untuk halaman chat. Fokusnya menjaga stabilitas fitur, konsistensi dark/light + desktop/mobile, dan mencegah regresi pada alur data UI -> API -> Convex -> UI.

## 1. Scope

- Route: `/chat` dan `/chat/[conversationId]`.
- UI shell: layout grid, sidebar desktop/mobile, top bar, panel artifact.
- Chat runtime: send, stream, stop, regenerate, edit+truncate, error handling.
- Workspace artifact: tab, viewer, fullscreen, refrasa, versioning.
- Paper mode: validation panel, edit permission, rewind, invalidation.
- API contracts: `POST /api/chat`, `POST /api/extract-file`, fallback provider dan citations.

## 2. Severity Gate

- `P0 (BLOCKER)`: gagal satu item saja -> dilarang merge.
- `P1 (MAJOR)`: boleh merge hanya jika ada approval eksplisit + ticket fix terjadwal.
- `P2 (MINOR)`: tidak memblok merge, tapi wajib tercatat di backlog.

## 3. Test Matrix Wajib

Gunakan 4 kombinasi ini untuk semua gate UI:

| Matrix ID | Device | Theme | Status |
|---|---|---|---|
| M1 | Desktop (>=1280px) | Dark | Wajib |
| M2 | Desktop (>=1280px) | Light | Wajib |
| M3 | Mobile (<=430px) | Dark | Wajib |
| M4 | Mobile (<=430px) | Light | Wajib |

Catatan autentikasi tema:

- `unauthenticated`: dark mode dipaksa oleh `ThemeEnforcer`.
- `authenticated`: dark/light harus bisa switch normal via `ThemeProvider`.

## 4. Quality Gates Detail

| Gate ID | Severity | Skenario | Ekspektasi Lolos | Referensi Kode |
|---|---|---|---|---|
| G-UI-01 | P0 | Buka `/chat` tanpa conversation | Template empty state tampil, `ChatInput` tetap terlihat, tidak crash | `src/components/chat/ChatWindow.tsx`, `src/components/chat/ChatInput.tsx` |
| G-UI-02 | P0 | Buka `/chat/[conversationId]` valid | History muncul, input aktif, scroll ke bawah stabil saat stream | `src/components/chat/ChatWindow.tsx`, `src/lib/hooks/useMessages.ts` |
| G-UI-03 | P0 | Buka `/chat/[conversationId]` invalid | UI "Percakapan tidak ditemukan" tampil, tidak blank screen | `src/components/chat/ChatWindow.tsx` |
| G-UI-04 | P0 | Desktop sidebar collapse/expand + resize | Grid berubah konsisten, tidak overlap main area/panel | `src/components/chat/layout/ChatLayout.tsx` |
| G-UI-05 | P0 | Mobile buka sidebar via sheet | Sheet bisa buka/tutup, navigasi conversation tetap jalan | `src/components/chat/layout/ChatLayout.tsx`, `src/components/chat/ChatSidebar.tsx` |
| G-UI-06 | P1 | Konsistensi warna dark/light | Kontras teks/border aman, tidak ada elemen hilang di light mode | `src/components/chat/layout/ChatLayout.tsx`, `src/components/chat/ChatInput.tsx`, `src/components/chat/MessageBubble.tsx` |
| G-CHAT-01 | P0 | Kirim pesan biasa | User message tersimpan, assistant stream muncul, finish tersimpan ke Convex | `src/components/chat/ChatWindow.tsx`, `src/app/api/chat/route.ts`, `convex/messages.ts` |
| G-CHAT-02 | P0 | Stop saat streaming | Status bar berubah ke stopped, stream berhenti tanpa error UI | `src/components/chat/ChatWindow.tsx`, `src/components/chat/ChatProcessStatusBar.tsx` |
| G-CHAT-03 | P0 | Regenerate response | Response baru muncul, stage dirty ditandai saat paper mode | `src/components/chat/ChatWindow.tsx`, `src/lib/hooks/usePaperSession.ts` |
| G-CHAT-04 | P0 | Edit user message + truncate | Pesan setelah titik edit terpotong, resend jalan, tidak duplikasi liar | `src/components/chat/ChatWindow.tsx`, `convex/messages.ts` |
| G-CHAT-05 | P0 | Error stream/API | Banner error muncul, aksi "Coba Lagi" berfungsi | `src/components/chat/ChatWindow.tsx` |
| G-CHAT-06 | P1 | Loading state awal conversation | Skeleton muncul saat loading, tidak flicker ke not-found | `src/components/chat/ChatWindow.tsx` |
| G-CITE-01 | P0 | Websearch mode primary (gateway) | `data-search`, `data-cited-text`, `data-cited-sources` terkirim dan tampil | `src/app/api/chat/route.ts`, `src/components/chat/MessageBubble.tsx` |
| G-CITE-02 | P0 | Fallback `:online` aktif | Jika gateway gagal, stream fallback tetap berjalan + citations tetap terbaca | `src/app/api/chat/route.ts`, `src/lib/ai/streaming.ts`, `src/lib/citations/normalizer.ts` |
| G-CITE-03 | P1 | Search OFF path | Saat tidak butuh websearch, tools function tetap jalan (artifact/paper) | `src/app/api/chat/route.ts` |
| G-ART-01 | P0 | AI create/update artifact | Indicator hasil kerja muncul, klik membuka panel artifact benar | `src/components/chat/ChatWindow.tsx`, `src/components/chat/MessageBubble.tsx`, `src/components/chat/ArtifactPanel.tsx` |
| G-ART-02 | P0 | Artifact tab lifecycle | Open tab, switch tab, close tab, close all stabil tanpa state bocor | `src/components/chat/ArtifactPanel.tsx`, `src/lib/hooks/useArtifactTabs.ts` |
| G-ART-03 | P0 | Artifact fullscreen modal | Fokus keyboard aman, ESC close, close guard unsaved changes bekerja | `src/components/chat/FullsizeArtifactModal.tsx` |
| G-ART-04 | P1 | Refrasa flow | Tombol enable/disable sesuai rule, hasil refrasa bisa jadi tab baru | `src/components/chat/ArtifactViewer.tsx`, `src/components/refrasa/RefrasaTabContent.tsx` |
| G-ART-05 | P1 | Artifact invalidated state | Banner/indikasi invalidation tampil setelah rewind dan clear setelah update | `src/components/chat/ArtifactViewer.tsx`, `convex/artifacts.ts` |
| G-PAPER-01 | P0 | Paper validation flow | `pending_validation` menampilkan panel approve/revisi dan aksi sukses | `src/components/chat/ChatWindow.tsx`, `src/components/paper/PaperValidationPanel.tsx`, `convex/paperSessions.ts` |
| G-PAPER-02 | P0 | Edit permission di paper mode | Hanya user message valid yang bisa edit; reason tooltip sesuai rule | `src/components/chat/MessageBubble.tsx`, `src/lib/utils/paperPermissions.ts` |
| G-PAPER-03 | P0 | Rewind stage | Max rewind 2 tahap, stage/artifact terdampak ter-invalidasi, history tercatat | `convex/paperSessions.ts`, `src/lib/hooks/usePaperSession.ts` |
| G-PAPER-04 | P1 | Auto-submit force path | Saat kondisi save eksplisit, tool submit validation bisa dipaksa sesuai policy | `src/app/api/chat/route.ts` |
| G-FILE-01 | P0 | Upload file + extraction success | Status extraction sukses tersimpan dan konteks file masuk ke chat | `src/components/chat/FileUploadButton.tsx`, `src/app/api/extract-file/route.ts`, `src/app/api/chat/route.ts` |
| G-FILE-02 | P1 | Extraction failed/pending | Error/pending tidak bikin crash dan tetap graceful di chat context | `src/app/api/extract-file/route.ts`, `src/app/api/chat/route.ts` |
| G-THEME-01 | P0 | Auth user switch dark/light | Semua elemen chat terbaca dan interaksi tidak rusak di kedua mode | `src/app/providers.tsx`, `src/components/theme/ThemeEnforcer.tsx` |
| G-THEME-02 | P0 | Logout state | Theme dipaksa kembali ke dark untuk unauth user | `src/components/theme/ThemeEnforcer.tsx` |

## 5. Regression Checklist Eksekusi

Checklist ini dipakai per PR yang menyentuh chat page.

- [ ] Jalankan lint: `npm run lint`
- [ ] Jalankan test chat utama: `npx vitest run __tests__/chat-layout/chat-layout.test.tsx __tests__/chat-ui/chat-ui.test.tsx`
- [ ] Jalankan test artifact/refrasa: `npx vitest run __tests__/artifact-viewer-refrasa.test.tsx __tests__/refrasa-button.test.tsx __tests__/refrasa-issue-item.test.tsx`
- [ ] Smoke test manual matrix M1-M4 untuk gate `G-UI-*` dan `G-CHAT-*`
- [ ] Smoke test manual paper mode untuk gate `G-PAPER-*`
- [ ] Smoke test manual artifact workspace untuk gate `G-ART-*`
- [ ] Verifikasi fallback path (simulasi gateway error) untuk gate `G-CITE-02`
- [ ] Verifikasi upload extraction sukses + gagal untuk gate `G-FILE-*`

## 6. Evidence yang Wajib Dilampirkan

- Daftar gate yang dites + status `PASS/FAIL`.
- Screenshot/video singkat untuk bug visual (desktop + mobile).
- Potongan log penting untuk stream/fallback (`/api/chat`) saat ada anomali.
- Jika ada gate gagal: issue link + severity + target fix date.

Template ringkas:

```md
## Regression Result - Chat PR <id>

- Matrix: M1, M2, M3, M4
- Summary: 26 PASS / 1 FAIL

| Gate ID | Status | Bukti | Catatan |
|---|---|---|---|
| G-CHAT-01 | PASS | screenshot/log | - |
| G-ART-03 | FAIL | video | Close guard tidak muncul saat ESC |

- Blocking issue:
- <link issue>
```

## 7. Exit Criteria (Definition of Done)

PR chat dianggap lolos jika:

- Semua gate `P0` PASS.
- Tidak ada regresi baru pada dark/light dan desktop/mobile.
- Jika ada `P1` fail, ada approval eksplisit + issue remediation yang terjadwal.
- Evidence checklist terisi lengkap.

## 8. Referensi Utama

- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/lib/hooks/usePaperSession.ts`
- `src/lib/utils/paperPermissions.ts`
- `src/app/api/chat/route.ts`
- `src/lib/ai/streaming.ts`
- `src/app/api/extract-file/route.ts`
- `src/app/providers.tsx`
- `src/components/theme/ThemeEnforcer.tsx`
- `__tests__/chat-layout/chat-layout.test.tsx`
- `__tests__/chat-ui/chat-ui.test.tsx`
- `__tests__/artifact-viewer-refrasa.test.tsx`
- `__tests__/refrasa-button.test.tsx`
