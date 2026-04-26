# UI Ecosystem: Modern Web Architecture

Makalah AI dibangun di atas tumpukan teknologi frontend yang mengutamakan performa, aksesibilitas, dan pengalaman pengguna yang premium. Ekosistem ini dirancang untuk mendukung interaksi real-time yang kompleks dengan estetika yang bersih.

## 1. Core Framework & Runtime

- **Next.js 16 (App Router)**: Menggunakan fitur terbaru seperti *React Server Components* (RSC) untuk meminimalkan beban JavaScript di sisi *client* dan *Server Actions* untuk mutasi data yang aman.
- **React 19**: Memanfaatkan fitur terbaru React untuk manajemen *state* dan integrasi komponen yang lebih efisien.
- **TypeScript**: Memastikan keamanan tipe data (*type safety*) di seluruh alur kerja UI, mengurangi bug runtime secara signifikan.

## 2. Headless UI & Accessibility (Radix UI)

Untuk komponen UI yang kompleks, Makalah AI menggunakan **Radix UI**. Library ini dipilih karena sifatnya yang *headless* (tanpa gaya bawaan), memungkinkan tim untuk menerapkan desain **Mechanical Grace** secara penuh tanpa hambatan.

- **Komponen Utama**: Accordion, Dialog (Modal), Dropdown Menu, Select, Tabs, dan Tooltip.
- **Aksesibilitas**: Radix menjamin kepatuhan terhadap standar WAI-ARIA, memastikan aplikasi dapat diakses oleh semua pengguna termasuk pengguna pembaca layar (*screen reader*).

## 3. Animasi & Interaksi (Framer Motion)

Pengalaman pengguna yang "hidup" dicapai melalui animasi mikro yang halus menggunakan **Framer Motion**.

- **Layout Transitions**: Perpindahan antar panel (seperti membuka sidebar atau artifact) terasa mulus dan alami.
- **AI Streaming UI**: Digunakan untuk menganimasikan kemunculan token teks dan elemen progres penelusuran agar tidak terasa kaku.
- **Gestur**: Mendukung interaksi seret (*drag*) dan hover yang responsif.

## 4. Visualisasi Data & AI Output

- **Recharts**: Digunakan untuk menyajikan data statistik dan tren dalam riset melalui grafik yang interaktif dan responsif.
- **json-render**: Library khusus untuk mengubah *output* AI (dalam format JSON/YAML) menjadi elemen UI yang fungsional seperti *choice cards* atau draf naskah.
- **Tiptap**: Editor teks kaya (*rich-text editor*) yang digunakan untuk fitur penyuntingan naskah riset secara kolaboratif.

## 5. Sistem Ikon & Utilitas

- **Iconoir**: Digunakan sebagai pustaka ikon tunggal yang konsisten di seluruh aplikasi. Pemilihan **Iconoir** didasarkan pada estetika garis tipis yang teknis dan minimalis, mendukung filosofi desain **Mechanical Grace**. Ikon ini digunakan mulai dari navigasi utama, panel admin, hingga indikator status pada pipeline AI.
- **Sonner**: Sistem notifikasi (*toast*) yang ringan dan tidak mengganggu alur kerja pengguna.
- **React Virtuoso**: Menangani pemuatan ribuan pesan dalam percakapan melalui *virtual scrolling*, menjaga performa tetap optimal meskipun riwayat chat sangat panjang.

---
**Rujukan Kode:**
- [package.json](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/package.json): Daftar lengkap library dan versi yang digunakan.
- [src/components/ui/](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/ui/): Implementasi komponen dasar berbasis Radix UI dan Tailwind v4.
