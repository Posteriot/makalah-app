# Kategori 07: Chat UI & Experience

Kategori ini mendokumentasikan seluruh lapisan antarmuka pengguna (UI) dan pengalaman pengguna (UX) yang membentuk inti interaksi di Makalah AI. Fokus utamanya adalah pada arsitektur layout, komponen pesan, dan elemen interaktif yang mendukung transparansi proses agen AI.

## Daftar Dokumen

1.  **[01-shell-layout.md](./01-shell-layout.md)**
    Penjelasan struktur 4-panel, sistem token visual (dark mode baseline), dan mekanisme responsivitas layout.
2.  **[02-message-components.md](./02-message-components.md)**
    Bedah anatomi message bubble, engine rendering markdown, sitasi inline, serta visualisasi proses penalaran (*reasoning*).
3.  **[03-interactive-elements.md](./03-interactive-elements.md)**
    Detail mekanisme interaksi pengguna seperti Quick Actions, Choice Cards, panel validasi paper, dan navigasi sumber referensi.
4.  **[04-error-states.md](./04-error-states.md)**
    Dokumentasi penanganan kondisi error, batasan kuota, dan fitur laporan teknis untuk diagnostik mandiri.
5.  **[05-ui-inventory.md](./05-ui-inventory.md)**
    Daftar lengkap komponen UI yang dikategorikan berdasarkan status kemunculannya (Default, Interaktif, Error).

## Prinsip Desain Chat UI

- **Transparansi Proses**: Setiap langkah agen AI (pencarian, penalaran, pemanggilan tool) memiliki representasi visual yang jelas.
- **Context Preservation**: Penggunaan panel samping (Artifact & Sources) memastikan pengguna tidak kehilangan konteks percakapan saat memeriksa detail teknis.
- **Premium Dark Aesthetic**: Penggunaan palet OKLCH neutral-slate untuk memberikan kesan aplikasi teknis yang canggih dan profesional.
