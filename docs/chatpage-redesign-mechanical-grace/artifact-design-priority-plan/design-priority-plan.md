# Artifact Design Priority Plan

## Status Eksekusi
- Last update: 2026-02-16
- Mode rencana aktif: redesign murni (struktur + UX flow)
- Progress redesign: Batch A-F selesai (`ArtifactPanel`, `ArtifactTabs`, `ArtifactToolbar`, `ArtifactViewer`, `ArtifactEditor`, `FullsizeArtifactModal`, `ArtifactIndicator`, `MessageBubble`, `SidebarPaperSessions`, `TopBar`, `VersionHistoryDialog`, `ArtifactList` fallback-audit, dan konsolidasi QA/docs)
- Post-batch correction selesai:
  - positioning preview citation anti-clipping viewport,
  - finalisasi state visual toggle artifak di TopBar (icon-only, 3 state),
  - simplifikasi close control fullscreen (hapus tombol `X` redundan),
  - penguatan `CreditMeter` (hover tier-aware + auth guard query quota).
- Referensi task aktif: `docs/chatpage-redesign-mechanical-grace/artifact-design-priority-plan/implementation-task-list.md`
- Baseline refinement sebelumnya: `docs/chatpage-redesign-mechanical-grace/artifact-design-priority-plan/visual-qa-checklist.md`

## Tujuan
Meredesain pengalaman artifact end-to-end supaya struktur, hierarchy, dan alur interaksi selaras dengan chat page saat ini tanpa mengubah logika backend.

## Outcome yang Diharapkan
- Struktur artifact jelas: entry point -> panel -> viewer/editor -> fullscreen -> history.
- Hierarki informasi artifact (status, versi, sumber, aksi) konsisten antar konteks.
- Alur kerja artifact terasa sebagai satu sistem, bukan kumpulan komponen terpisah.
- Dokumentasi tetap sinkron dengan implementasi.

## Prinsip Desain Acuan (Current Chat Page)
- Surface utama mengikuti tone chat sekarang: netral, kontras cukup, dan tidak terlalu "noisy".
- Gunakan pola radius/action yang sudah dominan di chat: `rounded-shell`, `rounded-action`, `rounded-badge` sesuai konteks.
- State penting harus jelas tapi tidak "teriak": normal, hover, active, focus, disabled, loading, success, warning, error.
- Hindari ketergantungan `global.css`; perubahan fokus di level komponen.

## Scope
### In Scope
- Redesign struktur UI/UX pada komponen artifact dan entry point terkait.
- Penyesuaian hierarchy komponen, grouping aksi, dan narasi state artifact lifecycle.

### Out of Scope
- Perubahan logic backend/Convex/AI tools.
- Perubahan arsitektur layout global chat page di luar kebutuhan artifact.
- Standardisasi global token di `global.css` (ditunda sesuai arahan).

## Prioritas Eksekusi

### P0 - Fondasi Struktur Artifact (Wajib)
Fokus: shell artifact panel, tabs, dan toolbar agar fondasi interaksi dokumen jelas.

Komponen:
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/chat/ArtifactToolbar.tsx`

Target hasil:
- Fondasi artifact punya struktur yang tegas antara navigasi dokumen, metadata, dan aksi.
- User paham konteks dokumen aktif sebelum masuk membaca konten.

### P1 - Core Viewer Experience (Impact Tertinggi)
Fokus: redesign mode baca dan edit artifact, termasuk workspace fullscreen.

Komponen:
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/ArtifactEditor.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`

Target hasil:
- Viewer/editor punya mode kerja jelas dan tidak saling tumpang tindih.
- Fullscreen berfungsi sebagai workspace artifact, bukan sekadar pembesaran panel.

### P2 - Entry Point & Context Harmonization
Fokus: titik masuk artifact dari chat dan sidebar supaya transisinya terasa satu sistem.

Komponen:
- `src/components/chat/ArtifactIndicator.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/shell/TopBar.tsx` (badge jumlah artifact)

Target hasil:
- Entry point artifact dari bubble/sidebar/topbar menyampaikan konteks yang sama.
- Perpindahan konteks antar entry point tidak membingungkan.

### P3 - Versioning Narrative + Polish
Fokus: narasi versi artifact, aksesibilitas, dan konsistensi akhir.

Komponen:
- `src/components/chat/VersionHistoryDialog.tsx`
- `src/components/chat/ArtifactList.tsx` (jika masih relevan di flow akhir)
- Semua komponen P0-P2 untuk validasi akhir

Target hasil:
- Timeline versi mudah dipahami sebagai evolusi artifact.
- Operability keyboard dan fokus lintas panel/modal/dialog tervalidasi.

## Guardrail Implementasi
- Jangan ubah behavior fungsional tanpa persetujuan terpisah.
- Satu batch perubahan maksimal 2-3 komponen inti agar review tetap gampang.
- Setelah tiap batch: update dokumentasi agar tetap compliant dengan codebase aktual.

## Definisi Selesai (Plan Level)
- Rencana prioritas ini disetujui.
- Daftar task implementasi granular redesign tersedia dan terurut per batch.
- Setiap task punya file target, fokus struktur/UX, dan checklist validasi.
