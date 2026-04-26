# Mekanisme Inti (Core Mechanisms)

Makalah AI bukan sekadar pembungkus (*wrapper*) LLM biasa. Sistem ini menggunakan *Agent Harness* yang secara deterministik mengontrol, memvalidasi, dan mengarahkan perilaku model AI melalui tiga mekanisme utama: *Plan-Spec*, *Choice Card*, dan *Tool Chain Enforcement*.

## 1. Plan-Spec (Perencanaan Tugas)

*Plan-Spec* adalah cara model AI melakukan dekomposisi tugas yang kompleks menjadi langkah-langkah kecil yang dapat dipahami oleh pengguna.

### Cara Kerja (Audit Forensik: `pipe-plan-capture.ts` + `updatePlan`)
Setiap kali AI memberikan respon, sistem menggunakan *Stream Transformer* untuk mendeteksi blok YAML khusus yang mendefinisikan rencana kerja (*plan*).
- **Deteksi State Machine**: Sistem memantau aliran teks secara *real-time* dan beralih status antara `normal`, `fenced` (menggunakan blok kode ```plan-spec), atau `unfenced` (mendeteksi pola `stage: <word>` di awal baris).
- **Validasi**: Plan diparse dengan `js-yaml` dan divalidasi dengan Zod schema (`planSpecSchema`). Konten malformed dilog dan dilewati.
- **Persistensi**: Setelah stream selesai, `route.ts` memanggil `updatePlan` mutation (bukan model) untuk menyimpan plan ke `stageData[stage]._plan` di Convex. AI tidak memanggil `updatePlan` secara langsung.
- **Visualisasi**: Plan di-render di UI melalui komponen `UnifiedProcessCard`. Komponen `SidebarQueueProgress` juga menggunakan `stageData._plan` sebagai fallback saat `UnifiedProcessCard` tidak tersedia.

## 2. Choice Card (Bahasa Visual Interaksi)

AI diinstruksikan untuk tidak pernah membiarkan pengguna bingung tanpa opsi langkah berikutnya. Ini dicapai melalui *Choice Card*.

### Workflow Action
Setiap kartu pilihan membawa instruksi operasional bagi sistem (4 nilai valid):
- **`continue_discussion`**: Melanjutkan obrolan tanpa menyimpan data permanen ke draf. Digunakan untuk eksplorasi ide atau pencarian referensi.
- **`finalize_stage`**: Titik komitmen. Pengguna menyetujui hasil diskusi, dan sistem akan memicu pembuatan artifak.
- **`compile_then_finalize`**: Khusus untuk tahap Daftar Pustaka, memicu audit referensi sebelum finalisasi.
- **`special_finalize`**: Jalur finalisasi deterministik untuk stage dengan urutan tool yang sudah ditentukan (Judul, Lampiran, Hasil).

## 3. Tool Chain Enforcement (Penjaga Alur)

Integritas alur kerja dijamin oleh *Runtime Enforcer* yang tertanam di level kode, bukan hanya instruksi teks (*prompt*).

### Audit Forensik: `enforcers.ts`
Sistem menggunakan `PrepareStepFunction` untuk memvalidasi urutan pemanggilan *tool*. Jika AI mencoba melakukan jalan pintas, *Enforcer* akan mengintervensi:

- **Revision Chain**: Jika status sesi adalah `revision`, AI dipaksa menggunakan tool (`toolChoice: "required"`). Satu-satunya langkah yang **dipaksa spesifik** adalah setelah artifact berhasil dibuat/diperbarui → system memaksa `submitStageForValidation`.
- **Artifact Locking**: AI dilarang memanggil `submitStageForValidation` jika `createArtifact` atau `updateArtifact` belum berhasil dipanggil dalam putaran yang sama.
- **Search-Function Separation**: Sistem melarang pemanggilan *function tools* (simpan data) di putaran yang sama dengan *web search* untuk menjaga kebersihan data.

---

## Referensi Dokumen Sumber
- [User Flows 00: General Mechanisms](./user-flows-00.md)

---
> [!IMPORTANT]
> Pemisahan antara *Control Plane* (Harness) dan *Domain Reasoning* (AI) memastikan bahwa meskipun AI melakukan kesalahan logika, alur kerja aplikasi tetap aman dan terjaga integritasnya.
