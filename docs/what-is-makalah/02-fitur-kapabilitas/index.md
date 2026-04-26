# Kategori 02: Fitur & Kapabilitas

Dokumen ini menjelaskan fungsionalitas utama dan kemampuan unik yang dimiliki oleh Makalah AI. Fokus utama kategori ini adalah bagaimana teknologi AI diubah menjadi fitur produktivitas yang mendukung penulisan akademik yang terstruktur.

## 🚀 Fitur Utama (Core Features)

Fitur yang mendefinisikan pengalaman inti menggunakan Makalah AI:
- **[Workflow 14 Tahap](./01-workflow-14-stage.md)**: Penjelasan mengenai siklus hidup penulisan dari ide hingga naskah final.
- **[Search Orchestrator](./02-search-orchestrator.md)**: Kapabilitas pencarian cerdas yang memisahkan sumber akademik dan umum secara otomatis.
- **[Naskah Bertumbuh](./03-naskah.md)**: Konsep dokumen yang terus berkembang secara otomatis seiring dengan persetujuan setiap tahapan.
- **[Progress Timeline](./04-progress-timeline.md)**: Visualisasi status pengerjaan paper untuk transparansi proses.
- **[Fitur Refrasa](./05-refrasa.md)**: Alat bantu penulisan ulang konten untuk meningkatkan kualitas akademik dan menghindari plagiarisme.

## 🧱 Komponen Interaktif (Interactive Components)

Antarmuka khusus yang memungkinkan kolaborasi erat antara manusia dan AI:
- **[Artifact System](./06-artifact.md)**: Unit terkecil dari konten paper yang dapat diedit, di-rewind, dan divalidasi.
- **[Choice Card](./07-choice-card.md)**: Sistem pilihan interaktif yang memberikan kontrol pengambilan keputusan kepada pengguna.
- **[Unified Process Card](./08-unified-process-card.md)**: Indikator proses AI (tool calls, web search) dalam satu tampilan terpadu yang dapat diciutkan (*collapsible*).
- **[Validation Panel](./09-validation-panel.md)**: Gerbang kontrol untuk menyetujui (*approve*) atau meminta revisi (*revise*) pada setiap tahapan.

---

## 📚 Referensi Teknis (Technical References)

Untuk detil implementasi mengenai format data dan rendering komponen, rujuk ke folder referensi berikut:
- 👉 **[Artifact Definition & Types](../references/artifact/)**
- 👉 **[JSON Renderer & UI Specification](../references/json-renderer/)**

---

## 🤖 Panduan untuk Model LLM (LLM Navigation)

Jika Anda bekerja dengan fitur-fitur Makalah AI:
1. **Pahami Output**: Gunakan `06-artifact.md` untuk memahami bagaimana Anda harus menghasilkan konten (selalu via tool call).
2. **Gunakan Choice Card**: Selalu tawarkan opsi kepada pengguna menggunakan spesifikasi di `07-choice-card.md`.
3. **Patuhi Workflow**: Rujuk `01-workflow-14-stage.md` untuk memastikan Anda tidak melompati langkah yang seharusnya dilalui.
4. **Validasi**: Gunakan `09-validation-panel.md` untuk memahami apa yang terjadi setelah Anda memanggil `submitStageForValidation()`.

---
> [!NOTE]
> Seluruh fitur di Makalah AI didesain dengan prinsip **"Explainable AI"**, di mana setiap tindakan sistem harus transparan dan dapat divalidasi oleh pengguna di setiap langkahnya.
