# Mobile Auth Short Viewport Design

**Date:** 2026-03-08
**Scope:** `/sign-in`, `/sign-up`, `/verify-2fa`, dan state auth turunan yang memakai `AuthWideCard`

## Problem Statement

Pada mobile viewport dengan tinggi pendek seperti iPhone SE class, header auth terlalu padat. Tombol `< Kembali>` di area kiri atas dan blok logo + headline berada terlalu dekat, sehingga ritme visual terasa sesak dan form terdorong terlalu jauh ke bawah.

Temuan dari audit komponen:

- `src/components/auth/AuthWideCard.tsx` menempatkan tombol kembali secara `absolute` di atas, sementara blok logo + heading juga diposisikan `absolute` dan di-center secara vertikal.
- `src/app/globals-new.css` memakai ukuran hero, panel height, dan spacing yang masih terlalu besar untuk layar pendek.
- Di viewport pendek, jarak visual tombol kembali ke logo praktis habis, sementara tinggi hero menghabiskan terlalu banyak ruang sebelum user mencapai form.

## Device Matrix

Dokumen ini menargetkan tiga kelas viewport yang relevan dengan tujuan awal:

- `320x568` untuk iPhone SE class
- `375x667` untuk mobile height normal yang masih rapat
- `375x812` untuk iPhone X class agar safe-area/notch behavior ikut terverifikasi

Catatan: iPhone X bukan layar pendek dalam tinggi absolut, tetapi tetap penting karena area atasnya punya safe-area yang bisa memperburuk ritme visual tombol kembali dan hero.

## Goals

- Memperbaiki jarak antara tombol kembali dan logo pada mobile viewport pendek.
- Menjaga form tetap lebih cepat terlihat tanpa mengorbankan brand presence.
- Menerapkan solusi di semua halaman auth yang memakai shell yang sama, bukan fix parsial per page.
- Menjaga touch target, focus ring, dan readability tetap aman.

## Non-Goals

- Tidak mengubah copy, alur auth, atau behavior server/client auth.
- Tidak melakukan redesign total auth page desktop.
- Tidak menambah animasi baru yang ornamental.

## Constraints

- Perubahan harus aman untuk `sign-in`, `sign-up`, `verify-2fa`, `magic-link`, `forgot-password`, `reset-password`, dan success states.
- Layout tetap harus terasa konsisten dengan visual language auth yang sudah ada.
- Motion harus tetap ringan dan menghormati `prefers-reduced-motion`.

## Design Principles

### 1. Solve the root cause, not the symptom

Masalah bukan sekadar margin logo. Penyebab utamanya adalah kombinasi dua area besar di hero mobile: tombol kembali di atas dan blok hero yang terlalu tinggi. Solusi harus mengompresi keseluruhan hero stack untuk viewport pendek.

### 2. Short-height mode should be targeted

Fix hanya aktif untuk mobile dengan tinggi pendek, bukan seluruh mobile. Ini mencegah tampilan mobile normal ikut terasa terlalu kecil.

### 3. Preserve hierarchy while compressing

Urutan visual tetap:

1. Tombol kembali
2. Logo
3. Title + subtitle
4. Form

Yang berubah adalah ukuran, spacing, dan distribusi ruang vertikal.

## Proposed Solution

Tambahkan mode layout baru: `short-height mobile auth`.

Mode ini aktif untuk viewport mobile dengan tinggi pendek, misalnya kombinasi `max-width` mobile dan `max-height` yang relevan dengan iPhone SE class, lalu divalidasi juga pada iPhone X class. Dalam mode ini:

- panel hero kiri memakai flow layout yang lebih natural di mobile pendek, bukan posisi yang terasa bertumpuk,
- spacing antara tombol kembali, logo, judul, dan subtitle diperkecil secara sistematis,
- ukuran logo dan tipografi hero diturunkan sedikit,
- tinggi minimum panel kiri diturunkan agar form muncul lebih cepat,
- padding panel kanan dan jarak antar elemen form dikompresi secara terukur,
- top inset mempertimbangkan `env(safe-area-inset-top)` agar perangkat notch tidak punya header yang terasa menempel atau terpotong.

## Layout Changes

### Shared Auth Shell

Perubahan fokus di layer shared:

- `src/components/auth/AuthWideCard.tsx`
- `src/app/globals-new.css`

Perilaku yang diinginkan:

- Pada short-height mobile, tombol kembali tetap berada di atas tetapi tidak lagi “menggantung” di atas blok hero.
- Blok logo + heading mengikuti alur vertikal biasa dengan gap yang eksplisit.
- Hero section tidak mengambil terlalu banyak tinggi viewport.

### Hero Compression Rules

Aturan kompresi yang direncanakan:

- kurangi top padding hero,
- kurangi gap antara back button dan logo,
- kurangi gap antara logo dan heading,
- kecilkan logo beberapa pixel,
- turunkan font-size hero title dan subtitle sedikit,
- turunkan `min-height` panel kiri,
- pertimbangkan mengganti centering absolut menjadi flow/flex khusus short-height mobile.

### Form Compression Rules

Di viewport pendek, kompresi form harus ringan:

- kurangi `padding` panel kanan,
- kurangi `padding-block` form wrap,
- evaluasi `space-y-5` wrapper utama auth mode agar lebih rapat di mobile pendek,
- pertahankan tinggi input dan CTA minimal `44px`.

## Interaction Design Notes

Berdasarkan guideline `interaction-design`, motion tetap fungsional:

- hover/focus transition yang sudah ada dipertahankan,
- jangan menambah animasi posisi yang bisa membuat layout terasa bergerak berlebihan saat page load,
- bila ada transisi layout kecil, gunakan durasi sekitar `150-200ms`,
- hormati `prefers-reduced-motion`.

## Accessibility Notes

- Touch target tombol kembali, input, dan CTA tetap minimal `44x44px`.
- Focus ring existing tidak boleh hilang.
- Contrast existing tetap dipertahankan.
- Perubahan spacing tidak boleh membuat elemen interaktif terlalu berdekatan.

## Acceptance Criteria

Perubahan dianggap berhasil bila:

- pada `320x568`, tombol kembali tidak lagi menempel ke logo dan punya jarak visual yang jelas,
- pada `320x568`, hero tidak lagi memakan ruang berlebihan sehingga user melihat bagian awal form lebih cepat,
- pada `375x812`, tombol kembali dan hero tetap rapi terhadap safe-area/notch,
- `sign-in`, `sign-up`, `verify-2fa`, `magic-link`, dan `forgot-password` tetap memakai ritme shell yang konsisten,
- tidak ada touch target yang turun di bawah `44px`,
- tidak ada overlap, horizontal scroll, atau focus ring yang terpotong.

## Risks

- Jika breakpoint terlalu agresif, iPhone ukuran normal bisa ikut terkena kompresi berlebihan.
- Jika hanya hero yang dikompresi tanpa menyesuaikan form wrap, perbaikan jarak atas bisa terasa tapi fold form tetap buruk.
- Jika struktur `AuthWideCard` diubah terlalu besar, ada risiko regressi di desktop.

## Validation Plan

Hal yang harus diverifikasi setelah implementasi:

- `/sign-in` pada viewport pendek menampilkan jarak jelas antara tombol kembali dan logo.
- `/sign-up` dan `/verify-2fa` mewarisi perbaikan yang sama.
- State `magic-link`, `forgot-password`, `reset-password`, dan success states tetap stabil.
- Perangkat dengan notch tetap aman terhadap safe-area atas.
- Tidak ada horizontal scroll.
- Tidak ada focus ring yang terpotong.
- Motion dan hover tetap halus, tanpa layout jank.

## Recommendation

Implementasi terbaik adalah pendekatan shared-shell dengan breakpoint `short-height mobile` yang menyesuaikan hero dan form secara bersamaan. Ini paling kecil cakupan kodenya, paling konsisten lintas auth states, dan paling aman dibanding redesign total.
