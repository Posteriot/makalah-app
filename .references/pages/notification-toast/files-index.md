# Indeks File - Notifikasi & Toast

## Pondasi toast
- `src/app/layout.tsx` - pasang `<Toaster />` di root layout.
- `src/components/ui/sonner.tsx` - wrapper `Toaster` (sonner) + `toastOptions`.

## UI notifikasi (Alert)
- `src/components/ui/alert.tsx` - primitif `Alert`, `AlertTitle`, `AlertDescription`.
- `src/app/(dashboard)/dashboard/page.tsx` - `Alert` akses ditolak (judul "Akses Ditolak").
- `src/components/admin/AIProviderFormDialog.tsx` - `Alert` panel hasil verifikasi kompatibilitas tool.
- `src/components/chat/ArtifactViewer.tsx` - `Alert` banner invalidasi artifact ("Artifact perlu di-update").

## UI konfirmasi (AlertDialog)
- `src/components/ui/alert-dialog.tsx` - primitif `AlertDialog`.
- `src/components/admin/UserList.tsx` - dialog promote/demote.
- `src/components/admin/StyleConstitutionManager.tsx` - dialog aktifkan/nonaktifkan/hapus constitution.
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx` - dialog "Hapus Versi Constitution".
- `src/components/admin/AIProviderManager.tsx` - dialog aktifkan/tukar/hapus config.
- `src/components/admin/SystemPromptsManager.tsx` - dialog aktifkan/nonaktifkan/hapus prompt.
- `src/components/chat/ChatSidebar.tsx` - dialog "Hapus Percakapan?".
- `src/components/paper/PaperSessionCard.tsx` - dialog "Hapus Paper?".
- `src/components/paper/RewindConfirmationDialog.tsx` - dialog rewind tahap.

## Notifikasi sistem (admin)
- `src/components/admin/SystemHealthPanel.tsx` - ringkasan alert dan status system prompt.

## Sumber toast (sonner)
- `src/components/admin/UserList.tsx` - toast sukses/gagal promote/demote.
- `src/components/admin/StyleConstitutionManager.tsx` - toast sukses/gagal activate/deactivate/delete/create/update/seed/toggle.
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx` - toast sukses/gagal hapus versi.
- `src/components/admin/AIProviderManager.tsx` - toast sukses/gagal activate/swap/delete + reload cache.
- `src/components/admin/AIProviderFormDialog.tsx` - toast validasi field dan hasil verifikasi kompatibilitas.
- `src/components/admin/SystemPromptsManager.tsx` - toast sukses/gagal activate/deactivate/delete.
- `src/components/admin/SystemPromptFormDialog.tsx` - toast validasi konten/nama prompt + hasil simpan.
- `src/components/chat/ChatWindow.tsx` - toast error proses pesan + info feedback revisi.
- `src/components/chat/ChatSidebar.tsx` - toast validasi judul.
- `src/components/chat/ArtifactViewer.tsx` - toast sukses/gagal salin/simpan/unduh/refrasa.
- `src/components/paper/PaperSessionCard.tsx` - toast sukses/gagal archive/unarchive/delete/export.
- `src/components/paper/PaperValidationPanel.tsx` - toast approve/revisi.

## Fallback browser alert
- `src/components/chat/FileUploadButton.tsx` - `alert()` validasi upload file.
- `src/components/chat/QuickActions.tsx` - `alert()` placeholder aksi.
