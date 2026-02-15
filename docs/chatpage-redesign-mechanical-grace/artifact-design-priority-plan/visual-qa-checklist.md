# Visual QA Checklist - Artifact Restyling

Tanggal verifikasi: 2026-02-15

Status legend:
- [ ] Belum dicek
- [x] Lulus cek
- [!] Perlu follow-up (di luar scope batch ini)

## Komponen
- [x] `src/components/chat/ArtifactIndicator.tsx` - state default/hover/active/focus selaras dan keyboard `Enter/Space` tetap jalan.
- [x] `src/components/chat/ArtifactEditor.tsx` - textarea focus ring, dirty state, hierarchy aksi, dan shortcut hint konsisten.
- [x] `src/components/chat/ArtifactToolbar.tsx` - action buttons desktop/mobile punya state interaksi yang konsisten.
- [x] `src/components/chat/ArtifactViewer.tsx` - badge/status warning/final, kontainer konten, overlay refrasa, dan context menu sudah harmonis.
- [x] `src/components/chat/FullsizeArtifactModal.tsx` - surface, header/footer action bar, editor style, dan render markdown selaras mode tema.
- [x] `src/components/chat/MessageBubble.tsx` - edit mode user + panel auto-action sudah satu bahasa visual dengan artifact flow.
- [x] `src/components/chat/sidebar/SidebarPaperSessions.tsx` - folder row, status dot, final badge, dan working title edit state konsisten.
- [x] `src/components/chat/shell/TopBar.tsx` - badge jumlah artifact + disabled panel toggle state sudah distabilkan.
- [x] `src/components/chat/VersionHistoryDialog.tsx` - highlight versi aktif, focus ring, timeline dot, dan badge readability konsisten.
- [x] `src/components/chat/ArtifactList.tsx` - fallback entrypoint latest-only, state selected, dan status final/revisi konsisten jika dipakai ulang.

## Konsistensi Lintas Komponen
- [x] Radius menggunakan pola `rounded-shell`, `rounded-action`, `rounded-badge` secara konsisten.
- [x] Focus-visible ditambahkan/dirapikan di elemen interaktif yang disentuh.
- [x] Focus trap fullscreen artifact + dialog history tervalidasi lewat implementasi `role="dialog"` + keyboard loop.
- [x] State success/warning/info tidak lagi outlier antar entry point artifact.

## Validasi Teknis
- [x] Lint file target komponen artifact lulus:
  - `npx eslint src/components/chat/ArtifactPanel.tsx src/components/chat/ArtifactTabs.tsx src/components/chat/ArtifactToolbar.tsx src/components/chat/ArtifactViewer.tsx src/components/chat/ArtifactEditor.tsx src/components/chat/FullsizeArtifactModal.tsx src/components/chat/ArtifactIndicator.tsx src/components/chat/MessageBubble.tsx src/components/chat/shell/TopBar.tsx src/components/chat/sidebar/SidebarPaperSessions.tsx src/components/chat/VersionHistoryDialog.tsx src/components/chat/ArtifactList.tsx`
- [!] `npm run lint` global masih gagal karena isu existing di area non-artifact (`subscription/overview`, `onboarding/get-started`, dan warning lint lain).
