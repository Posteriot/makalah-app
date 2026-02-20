# Chat Page Docs

Folder `docs/chat-page` adalah dokumentasi source of truth untuk halaman chat.

## Prinsip Dokumen

- Konten harus berbasis kondisi kode yang faktual saat ini.
- Jika ada bagian normatif (misalnya quality gate), harus tetap diturunkan dari runtime aktual.
- Perubahan dokumen wajib sinkron dengan perubahan di `src/` dan `convex/`.

## Struktur

- `file-index.md`: indeks seluruh dokumen aktif di folder ini.
- `baseline-file-map.md`: peta file kode chat sebagai baseline.
- `chat-runtime-architecture.md`: arsitektur runtime dan alur data.
- `chat-contracts-and-data-model.md`: kontrak API/data model chat.
- `chat-ui-shell-responsive-and-theme-spec.md`: spesifikasi layout + responsive + tema.
- `chat-feature-spec-message-lifecycle.md`: lifecycle pesan end-to-end.
- `chat-feature-spec-artifact-workspace.md`: spesifikasi workspace artifact dan refrasa.
- `chat-feature-spec-paper-mode-and-rewind.md`: spesifikasi paper mode + rewind.
- `chat-optimization-playbook.md`: panduan optimasi berbasis hotspot.
- `chat-quality-gates-and-regression-checklist.md`: gate QA/regression sebelum merge.

## Catatan Penamaan

Gunakan `file-index.md` (bukan `files-index.md`) karena dokumen ini adalah indeks file dalam satu katalog dokumentasi.
