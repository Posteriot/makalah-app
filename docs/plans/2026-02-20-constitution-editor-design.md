# Full-Page Constitution Editor — Design

**Goal**: Ganti dialog "Buat Constitution Baru" / "Edit Constitution" yang terpotong dan tidak adaptif, dengan full-page editor via dedicated route.

**Motivation**: Dialog `max-w-4xl max-h-[90vh]` tidak cukup untuk konten constitution yang panjang (188+ baris). Textarea 20 rows terpotong di viewport kecil. Full-page editor memberikan ruang editing maksimal.

---

## Routes

| Route | Fungsi |
|-------|--------|
| `/dashboard/constitution/new` | Buat constitution baru |
| `/dashboard/constitution/[id]/edit` | Edit constitution (buat versi baru) |

Kedua route tanpa sidebar admin — full-width, fokus editing.

## Layout

### Desktop (>=768px)

- Top bar sticky: tombol Kembali (kiri), tombol Batal + Simpan (kanan)
- Metadata fields side-by-side: Nama (40%) + Deskripsi (60%)
- Textarea fills remaining viewport height via `h-[calc(100vh-...)]`
- Scroll di textarea, bukan di page

### Mobile (<768px)

- Fields stack vertikal
- Textarea min-h-[50vh]
- Tombol aksi di bawah

### Edit Mode

- Nama read-only (locked)
- Judul: "Edit: {name} v{version}"
- Submit creates new version (existing behavior)

## Files

| File | Change |
|------|--------|
| `src/app/(dashboard)/dashboard/constitution/new/page.tsx` | Create — route page, auth check |
| `src/app/(dashboard)/dashboard/constitution/[id]/edit/page.tsx` | Create — route page, fetch existing data |
| `src/components/admin/ConstitutionEditor.tsx` | Create — shared editor component (used by both routes) |
| `src/components/admin/StyleConstitutionManager.tsx` | Modify — replace Dialog open with router.push() |

## Flow

1. Klik "Buat Constitution Baru" → `router.push('/dashboard/constitution/new')`
2. Klik Edit icon → `router.push('/dashboard/constitution/${id}/edit')`
3. Page: auth check → render `ConstitutionEditor`
4. Submit → mutation → toast → `router.push('/dashboard')` (tab refrasa)
5. Batal → `router.back()`

## Unchanged

- Tabel daftar constitution
- AlertDialog (activate, deactivate, delete)
- Version history dialog
- Refrasa tool toggle
- Convex mutations (create, update) — same API, different UI
