# Dokumentasi Notifikasi & Toast

## Cakupan
- Gue scan notifikasi dan toast dari seluruh `src`, termasuk toast `sonner`, `Alert`, `AlertDialog`, dan fallback `window.alert()`.
- Fokusnya ke UI dan komponen yang tampil ke user (pesan, banner, dialog, dan indikator status).

## Pondasi toast (Sonner)
- `src/app/layout.tsx` - pasang `<Toaster />` di root layout supaya toast global muncul di semua halaman.
- `src/components/ui/sonner.tsx` - wrapper `Toaster` yang ngikut `next-themes` dan ngatur class `toastOptions`.

## Sumber toast (sonner)
- `src/components/chat/ChatWindow.tsx` - toast error untuk kegagalan proses pesan dan edit; toast info untuk feedback revisi.
- `src/components/chat/ChatSidebar.tsx` - validasi judul ("Judul maksimal 50 karakter") dan error simpan judul ("Gagal menyimpan judul").
- `src/components/chat/ArtifactViewer.tsx` - toast sukses/gagal untuk salin, simpan, unduh, serta refrasa.
- `src/components/paper/PaperSessionCard.tsx` - toast sukses/gagal untuk archive, unarchive, delete, dan export.
- `src/components/paper/PaperValidationPanel.tsx` - toast validasi tahap (approve/revisi) termasuk validasi feedback.
- `src/components/admin/UserList.tsx` - `toast.success(result.message)` untuk promote/demote; error fallback "Terjadi kesalahan".
- `src/components/admin/StyleConstitutionManager.tsx` - `toast.success(result.message)` untuk activate/deactivate/delete/create/update/seed/toggle; error fallback "Terjadi kesalahan"; validasi "Konten constitution tidak boleh kosong" dan "Nama constitution tidak boleh kosong".
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx` - `toast.success(result.message)`; error fallback "Terjadi kesalahan".
- `src/components/admin/AIProviderManager.tsx` - `toast.success(result.message)` untuk activate/swap/delete; info "Config cache akan di-refresh otomatis dalam 5 menit, atau segera di request chat berikutnya"; error "Gagal reload config cache" + fallback "Terjadi kesalahan".
- `src/components/admin/AIProviderFormDialog.tsx` - toast validasi field ("Nama config tidak boleh kosong", "Temperature harus antara 0 dan 2", "Top P harus antara 0 dan 1", "Max Tokens harus lebih dari 0", "Max Search Results harus antara 1 dan 10"), validasi provider ("Lengkapi semua field primary provider terlebih dahulu", "Lengkapi semua field fallback provider terlebih dahulu"), validasi model ("Lengkapi fallback model terlebih dahulu"), info kompatibilitas ("Compatibility verification hanya diperlukan untuk OpenRouter fallback"), dan hasil verifikasi ("Model fully compatible! Semua fitur didukung.", "Model partially compatible. Beberapa fitur mungkin tidak berfungsi.", "Model NOT compatible. Tidak disarankan untuk fallback.").
- `src/components/admin/SystemPromptsManager.tsx` - `toast.success(result.message)`; error fallback "Terjadi kesalahan".
- `src/components/admin/SystemPromptFormDialog.tsx` - validasi konten/nama ("Konten prompt tidak boleh kosong", "Nama prompt tidak boleh kosong"), `toast.success(result.message)`, error fallback "Terjadi kesalahan".

## Notifikasi inline (Alert)
- `src/app/(dashboard)/dashboard/page.tsx` - `Alert` variant `destructive` untuk akses ditolak (judul "Akses Ditolak").
- `src/components/admin/AIProviderFormDialog.tsx` - `Alert` panel hasil verifikasi kompatibilitas tool (judul "Fully Compatible", "Partially Compatible", "Not Compatible").
- `src/components/chat/ArtifactViewer.tsx` - `Alert` variant `warning` untuk banner invalidasi artifact ("Artifact perlu di-update").

## Notifikasi sistem (Admin)
- `src/components/admin/SystemHealthPanel.tsx` - ringkasan status system prompt dan alert (judul "System Health", status "FALLBACK MODE AKTIF" / "NORMAL - Database Prompt Aktif", tombol "Mark as Resolved", label "Alert Summary" dan "Recent Alerts", serta badge "Resolved").

## Dialog konfirmasi (AlertDialog)
- `src/components/admin/UserList.tsx` - dialog "Promote ke Admin" / "Demote ke User" dengan aksi "Batal" dan "Konfirmasi".
- `src/components/admin/StyleConstitutionManager.tsx` - dialog "Aktifkan Constitution", "Nonaktifkan Constitution", "Hapus Constitution" dengan aksi "Batal", "Aktifkan", "Nonaktifkan", "Hapus".
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx` - dialog "Hapus Versi Constitution" dengan aksi "Batal" dan "Hapus Versi".
- `src/components/admin/AIProviderManager.tsx` - dialog "Aktifkan Config", "Tukar Provider", "Hapus Config" dengan aksi "Batal", "Aktifkan", "Tukar", "Hapus".
- `src/components/admin/SystemPromptsManager.tsx` - dialog "Aktifkan Prompt", "Nonaktifkan Prompt", "Hapus Prompt" dengan aksi "Batal", "Aktifkan", "Nonaktifkan", "Hapus".
- `src/components/chat/ChatSidebar.tsx` - dialog "Hapus Percakapan?" dengan aksi "Batal" dan "Hapus".
- `src/components/paper/PaperSessionCard.tsx` - dialog "Hapus Paper?" dengan aksi "Batal" dan "Hapus".
- `src/components/paper/RewindConfirmationDialog.tsx` - dialog "Kembali ke tahap {targetLabel}?" dengan aksi "Batal" dan "Ya, Kembali ke {targetLabel}".

## Fallback browser alert
- `src/components/chat/FileUploadButton.tsx` - `alert()` untuk validasi upload file ("Invalid file type...", "File too large...", "File uploaded successfully!", "Upload failed. Please try again.").
- `src/components/chat/QuickActions.tsx` - `alert()` untuk placeholder aksi ("Failed to copy to clipboard", "This will be implemented in paper integration phase (Insert to Paper)", "Content saved to your snippets").

## File indeks
- Detail file per komponen ada di `./files-index.md`.
