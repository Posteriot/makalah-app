# Dokumentasi Admin Panel (Dashboard)

## Cakupan
- Lokasi utama: `src/app/(dashboard)/dashboard/page.tsx`.
- Kontainer admin: `src/components/admin/AdminPanelContainer.tsx`.
- Komponen admin lain yang terkait: `src/components/admin/*`.
- Screenshot referensi: tampilan "Admin Panel" dengan tab "User Management".

## Struktur UI utama (alur render)
- `DashboardPage` (server):
  - Cek autentikasi + cek role admin.
  - Jika bukan admin: `Alert` dengan judul "Akses Ditolak".
  - Jika admin: render `AdminPanelContainer`.
- `AdminPanelContainer` (klien):
  - Heading: judul + deskripsi admin panel.
  - `Tabs`:
    - "User Management" -> `UserList`.
    - "System Prompts" -> `SystemHealthPanel` + `SystemPromptsManager`.
    - "AI Providers" -> `AIProviderManager`.
    - "Refrasa" -> `StyleConstitutionManager`.
    - "Statistik" -> `Card` penanda sementara.
  - Halaman dashboard lain: `src/app/(dashboard)/dashboard/papers/page.tsx` (label "Paper Sessions", bukan admin).

## Detail tab User Management (sesuai screenshot)
- Tabel pengguna dengan kolom: "Email", "Nama", "Role", "Subscription", "Status Email", "Actions".
- Role badge: `RoleBadge` (Superadmin/Admin/User).
- Badge langganan: `Badge` varian outline.
- Status email: `Badge` (Verified / Belum Verified).
- Aksi:
  - Tombol "Promote"/"Demote" (ikon panah).
  - Jika superadmin: label "Cannot modify".
  - Jika non-superadmin: label "View only".
- Dialog konfirmasi aksi: `AlertDialog`.

## Detail tab System Prompts
- `SystemHealthPanel`:
  - Judul panel: "System Health".
  - Label section: "System Prompt Status".
  - Status: "FALLBACK MODE AKTIF" / "NORMAL - Database Prompt Aktif".
  - Ringkasan alert: "Critical", "Warning", "Info".
  - Daftar alert terbaru: "Recent Alerts" + badge "Resolved".
  - Tombol aksi: "Mark as Resolved".
- `SystemPromptsManager`:
  - Judul panel: "System Prompts".
  - Tombol utama: "Buat Prompt Baru".
  - Tabel daftar prompt + status aktif.
  - Aksi: "Edit", "Riwayat Versi", "Aktifkan", "Nonaktifkan", "Hapus".
  - Dialog buat/edit: `SystemPromptFormDialog`.
  - Dialog riwayat versi: `VersionHistoryDialog`.
  - Dialog konfirmasi aktif/nonaktif/hapus: `AlertDialog`.

## Detail tab AI Providers
- `AIProviderManager`:
  - Judul panel: "AI Provider Configuration".
  - Tabel config provider + status aktif.
  - Aksi: "Edit", "Tukar Primary ↔ Fallback", "Aktifkan", "Hapus".
  - Tombol nonaktif untuk config aktif: title "Config sedang aktif".
  - Tombol "Reload Cache" + "Buat Config Baru".
  - Dialog buat/edit: `AIProviderFormDialog`.
  - Dialog konfirmasi aktif/swap/hapus: `AlertDialog` (judul swap: "Tukar Provider").
- `AIProviderFormDialog`:
  - Isian form: nama, deskripsi, provider, model, API key, pengaturan AI, pencarian web.
  - Komponen form: `Input`, `Label`, `Textarea`, `Select`, `Switch`, `Separator`.
  - Feedback: `Alert` status verifikasi.

## Detail tab Refrasa
- `StyleConstitutionManager`:
  - Judul panel: "Status Tool Refrasa".
  - Label toggle: "Aktifkan Refrasa Tool".
  - Judul panel: "Refrasa - Style Constitution".
  - Catatan info dengan label "Catatan:".
  - Tabel constitution + status aktif.
  - Kondisi kosong: "Belum Ada Style Constitution".
  - Aksi: "Gunakan Default Constitution" / "Buat Sendiri" / "Buat Constitution Baru".
  - Dialog buat/edit: `Dialog`.
  - Dialog riwayat: `StyleConstitutionVersionHistoryDialog`.
  - Dialog konfirmasi aktif/nonaktif/hapus: `AlertDialog`.

## Detail tab Statistik
- `Card` penanda sementara dengan pesan "Fitur statistik akan segera hadir."

## Komponen UI internal (components/ui) yang dipakai
- `Alert`, `AlertTitle`, `AlertDescription`
- `AlertDialog` + sub-komponen
- `Badge`
- `Button`
- `Card` + sub-komponen
- `Dialog` + sub-komponen
- `Input`
- `Label`
- `Select` + sub-komponen
- `Separator`
- `Switch`
- `Table` + sub-komponen
- `Tabs` + sub-komponen
- `Textarea`

## Komponen eksternal yang tampak
- Ikon `lucide-react` (mis. ArrowUp, ArrowDown, Settings2, Power, dll).
- Toast dari `sonner`.

## File indeks
- Detail mapping file dan komponen ada di `./files-index.md`.
