# Indeks File - Admin Panel

## File utama (rute/layout)
- `src/app/(dashboard)/layout.tsx` - layout dashboard (wrapper halaman).
- `src/app/(dashboard)/dashboard/page.tsx` - cek akses admin + render admin panel.
- `src/app/(dashboard)/dashboard/papers/page.tsx` - halaman dengan label "Paper Sessions" (dashboard bukan admin).

## Kontainer admin
- `src/components/admin/AdminPanelContainer.tsx` - header admin + tab navigasi + konten tab.

## Tab: User Management
- `src/components/admin/UserList.tsx` - tabel pengguna + aksi "Promote"/"Demote" + dialog konfirmasi.
- `src/components/admin/RoleBadge.tsx` - badge role user (Superadmin/Admin/User).

## Tab: System Prompts
- `src/components/admin/SystemHealthPanel.tsx` - panel "System Health" + ringkasan alert.
- `src/components/admin/SystemPromptsManager.tsx` - panel "System Prompts" + tabel prompt.
- `src/components/admin/SystemPromptFormDialog.tsx` - dialog "Buat Prompt Baru" / edit prompt.
- `src/components/admin/VersionHistoryDialog.tsx` - dialog riwayat versi prompt.

## Tab: AI Providers
- `src/components/admin/AIProviderManager.tsx` - panel "AI Provider Configuration" + tabel config.
- `src/components/admin/AIProviderFormDialog.tsx` - dialog "Buat Config Baru" / edit config.

## Tab: Refrasa
- `src/components/admin/StyleConstitutionManager.tsx` - panel "Status Tool Refrasa" + panel "Refrasa - Style Constitution".
- `src/components/admin/StyleConstitutionVersionHistoryDialog.tsx` - dialog riwayat versi constitution.

## Label aksi yang tampak (ringkas)
- `UserList`: "Promote", "Demote", "Cannot modify", "View only".
- `SystemPromptsManager`: "Buat Prompt Baru", "Edit", "Riwayat Versi", "Aktifkan", "Nonaktifkan", "Hapus".
- `AIProviderManager`: "Reload Cache", "Buat Config Baru", "Tukar Primary ↔ Fallback", "Aktifkan", "Hapus", "Config sedang aktif".
- `StyleConstitutionManager`: "Aktifkan Refrasa Tool", "Buat Constitution Baru", "Gunakan Default Constitution", "Buat Sendiri".

## Tab: Statistik
- `src/components/admin/AdminPanelContainer.tsx` - `Card` penanda sementara statistik.

## Komponen UI internal (components/ui)
- `src/components/ui/alert.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/textarea.tsx`

## Komponen eksternal
- `lucide-react` (ikon UI).
- `sonner` (toast).
