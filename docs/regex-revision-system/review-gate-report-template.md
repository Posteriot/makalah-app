==================================================
  REVIEW GATE MODE
  ==================================================

  Lo WAJIB:
  - berhenti dari implementasi
  - tidak mulai subtask berikutnya
  - tidak membuat perubahan tambahan kecuali benar-benar perlu untuk merapikan evidence review
  - tidak mengubah scope subtask yang sudah selesai
  - menyiapkan laporan review gate dengan format yang konsisten

  ==================================================
  OUTPUT YANG WAJIB LO BERIKAN
  ==================================================

  Balas dengan format ini, urut dan lengkap:

  1. `Subtask`
  - tulis ID subtask dan title persis sesuai implementation plan

  2. `Objective`
  - 1 paragraf singkat: apa yang seharusnya dicapai subtask ini

  3. `Files changed`
  - daftar file yang berubah
  - untuk tiap file, jelaskan singkat peran perubahannya
  - pastikan tidak ada file di luar scope subtask
  - kalau ada file tambahan, jelaskan kenapa

  4. `Tests added/updated`
  - daftar file test yang dibuat/diubah
  - jelaskan kasus apa saja yang dicakup
  - bedakan mana test baru dan mana test existing yang diupdate

  5. `Commands run`
  - tulis semua command verifikasi yang benar-benar dijalankan
  - jangan cuma bilang “tests passed”
  - tampilkan command-nya secara eksplisit

  6. `Result`
  - jelaskan status hasil subtask:
    - selesai / belum selesai
    - compile pass / fail
    - tests pass / fail
    - commit sudah dibuat atau belum
  - kalau belum commit, jelaskan kenapa

  7. `TDD evidence`
  - ini WAJIB untuk subtask P1 yang behavior-changing
  - jelaskan:
    - test fail awal apa
    - kenapa fail itu valid
    - perubahan minimum apa yang dibuat
    - test pass akhir apa
  - kalau subtask ini memang tidak cocok dengan TDD literal, jelaskan kenapa dengan alasan teknis,
  jangan ngeles

  8. `Parity / behavior evidence`
  - jelaskan bukti bahwa behavior target subtask tercapai
  - jika subtask ini parity-related, rangkum hasil parity
  - jika belum tahap parity, tulis itu secara eksplisit

  9. `Preserve regex audit`
  - list preserve regex/category yang relevan untuk subtask ini
  - nyatakan apakah semuanya untouched
  - kalau ada preserve area yang ikut berubah, jelaskan dan justifikasi

  10. `Diff scope audit`
  - pastikan perubahan hanya ada di scope subtask
  - sebutkan hasil verifikasi `git diff --name-only` atau equivalent
  - nyatakan apakah commit hygiene bersih

  11. `Open risks / assumptions`
  - list risiko yang masih tersisa
  - list asumsi yang dipakai
  - list hal yang perlu diperhatikan saat subtask berikutnya

  12. `Commit`
  - tulis commit SHA + commit message jika sudah commit
  - kalau belum commit, jelaskan alasannya

  13. `Request for review`
  - tutup dengan kalimat yang jelas bahwa lo menunggu verdict Codex
  - jangan lanjut coding sebelum ada approval

  ==================================================
  QUALITY BAR
  ==================================================

  Laporan review lo harus:
  - ringkas tapi lengkap
  - faktual
  - berbasis file dan command nyata
  - tidak defensif
  - tidak menutupi kegagalan
  - tidak pakai klaim tanpa evidence

  Kalau ada yang gagal:
  - bilang gagal
  - jelaskan di mana
  - jelaskan dampaknya
  - jangan pura-pura selesai

  ==================================================
  SPECIAL RULES
  ==================================================

  - Untuk subtask P1, `TDD evidence` wajib ada.
  - Untuk subtask yang menyentuh `route.ts` atau `completed-session.ts`, `Preserve regex audit` harus
  ekstra jelas.
  - Untuk subtask docs/planning-only, cukup bilang TDD tidak relevan dan kenapa.
  - Jangan paste isi file penuh kecuali diminta.
  - Jangan lanjut ke subtask berikutnya.
  - Tunggu verdict Codex.

  ==================================================
  FINAL INSTRUCTION
  ==================================================

  Susun laporan review gate untuk subtask yang baru lo selesaikan sekarang, dengan format di atas.
  Setelah itu STOP.