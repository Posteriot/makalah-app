# Makalah Trace - Editor & Organization Management (Source of Truth)

Status: Final for v1 (implementation reference)
Updated: 2026-03-03

## 1) Tujuan
Dokumen ini adalah sumber aturan final untuk role, akses, audit flow, dan privasi Makalah Trace v1.
Jika ada konflik dengan dokumen lain, ikuti dokumen ini.

## 2) Prinsip Produk
1. Human-in-the-loop: keputusan akademik tetap di dosen/guru (Editor).
2. Audit proses, bukan vonis: hasil model adalah rekomendasi.
3. Privasi sejak desain: editor hanya melihat evidence snippets, bukan full raw chat.
4. Prinsip hak akses minimum: akses dibatasi per organisasi dan assignment.

## 3) Glossary Peran (Wajib Dipakai Konsisten)
1. Admin Organisasi: operator institusi yang mengelola anggota dan assignment.
2. Editor: dosen/guru yang menjalankan audit.
3. User: siswa/mahasiswa pengguna chat.
4. Superadmin: tim internal platform untuk support insiden saja, non-operasional harian.

## 4) Batas Kewenangan
1. Assignment `Editor -> User` hanya boleh dilakukan Admin Organisasi.
2. Superadmin tidak melakukan assignment rutin.
3. Pengecualian Superadmin hanya untuk break-glass support dengan:
- alasan akses (reason),
- audit log,
- batas waktu akses.

## 5) Model Otorisasi Akses Audit
Editor hanya boleh membuka audit jika semua kondisi ini terpenuhi (AND policy):
1. akun login valid,
2. role = Editor,
3. satu organisasi dengan User,
4. User tersebut di-assign ke Editor,
5. status share conversation masih aktif.

`conversation ID` dipakai sebagai pointer audit, bukan pengganti kontrol akses.

## 6) Alur Audit End-to-End (v1)
1. User klik Share pada conversation.
2. Sistem menyimpan share aktif per `conversation ID`.
3. Entri muncul di dashboard Editor yang berhak.
4. Editor klik Mulai Audit.
5. Sistem menjalankan audit per stage.
6. Editor melihat hasil stage dan memilih aksi: lanjut, ulang stage, atau hentikan.
7. Sistem hanya membuat PDF final jika audit run berstatus `completed`.

Arsitektur v1: On-demand Stage Audit Pipeline.

Status terminal dan transisi state machine ada di Bagian 13.

## 7) Definisi Stage Audit (Dikunci untuk v1)
Audit wajib berjalan per stage berikut:
1. Stage 1 - Originalitas Input (Inisiasi Ide)
2. Stage 2 - Refleksivitas Kritis
3. Stage 3 - Integritas Proses (sinyal dwell time)
4. Stage 4 - Sinkronisasi Semantik (suara user vs output)

Kontrak minimum setiap stage:
1. input: evidence bundle dari backend,
2. proses: evaluator audit tanpa free tool-calling,
3. output: JSON terstruktur,
4. keputusan: Editor lanjut/ulang/hentikan.

Struktur minimum `evidence_bundle`:
1. `audit_run_id`,
2. `conversation_id`,
3. `stage_id`,
4. `snippets` (array cuplikan evidence),
5. `signals` (indikator proses terkait stage, termasuk sinyal waktu/interaksi),
6. `collected_at` (timestamp pengumpulan evidence).

## 8) Aturan "Ulang Stage" dan Audit Trail
1. `Ulang stage` tidak boleh overwrite hasil lama.
2. Setiap run disimpan append-only sebagai `stage_attempt`.
3. Dashboard menampilkan `latest approved attempt` per stage.
4. PDF final memakai `latest approved attempt`.
5. Attempt lama tetap tersimpan untuk audit trail.
6. Jika belum ada approved attempt pada suatu stage, stage status = `incomplete`.
7. Audit run tidak boleh berstatus `completed` jika masih ada stage `incomplete`.

## 9) Kontrak Evaluator Audit
1. Wajib pakai system prompt `audit-evaluator`.
2. Tidak memakai skill stage penulisan paper.
3. Tidak ada free tool-calling.
4. Input evaluator disiapkan backend per stage.

Output minimum per stage (wajib):
```json
{
  "score": 0,
  "confidence": 0,
  "label": "",
  "summary": "",
  "snippets": []
}
```

Output turunan (opsional v1, direkomendasikan):
```json
{
  "derived_metrics": {
    "contribution_estimate": {
      "student": 0,
      "ai": 0
    },
    "substantive_interventions": 0,
    "dwell_time_signal": ""
  },
  "disclaimer": "Estimasi proses, bukan vonis otomatis"
}
```

Aturan penggunaan `derived_metrics`:
1. jika tersedia, boleh ditampilkan di dashboard dan PDF,
2. jika tidak tersedia, audit run tetap valid dan tidak memblokir `completed`,
3. semua metrik turunan harus ditandai sebagai estimasi, bukan vonis.

## 10) Privasi dan Data Exposure
1. Editor melihat:
- `conversation ID`,
- ringkasan hasil per stage,
- score/label/confidence,
- evidence snippets relevan.
2. Editor tidak melihat:
- email User,
- full raw chat transcript.
3. Fitur QR/Read-Only Discussion Player tidak masuk scope v1.

## 11) Aturan Revoke Share dan Pencabutan Assignment
1. Share aktif sampai User revoke atau conversation dihapus.
2. Setelah revoke/delete:
- akses dashboard ke audit terkait ditutup segera,
- pembuatan export baru ditolak.
3. File yang sudah terunduh sebelumnya tidak bisa ditarik dari perangkat penerima.
4. Semua PDF wajib memuat watermark waktu generate dan status akses saat generate.
5. Jika revoke/delete atau assignment dicabut sebelum run selesai, run berhenti dan tidak boleh menghasilkan PDF final.
6. Status terminal yang dipakai harus mengikuti state machine pada Bagian 13.

## 12) Output PDF Minimum
1. identitas audit run + timestamp,
2. ringkasan umum,
3. hasil per stage,
4. evidence snippets per stage,
5. disclaimer bahwa hasil model adalah rekomendasi.

Prasyarat PDF final:
1. audit run berstatus `completed`,
2. setiap stage memiliki `latest approved attempt`.

Jika run `terminated`, `share_revoked`, `revoked_access`, atau masih `incomplete`, sistem tidak membuat PDF final.

## 13) State Machine Audit Run (v1)
Status yang valid:
1. `queued`
2. `in_progress`
3. `completed`
4. `terminated`
5. `share_revoked`
6. `revoked_access`

Transisi utama:
1. `queued -> in_progress` saat Editor klik Mulai Audit.
2. `queued -> share_revoked` jika User revoke share atau conversation dihapus sebelum audit dimulai.
3. `queued -> revoked_access` jika assignment Editor-User dicabut sebelum audit dimulai.
4. `in_progress -> completed` jika semua stage punya approved attempt.
5. `in_progress -> terminated` jika Editor klik hentikan.
6. `in_progress -> share_revoked` jika User revoke share atau conversation dihapus.
7. `in_progress -> revoked_access` jika assignment Editor-User dicabut.

## 14) Out of Scope v1
1. auto-penalti nilai,
2. akses publik tanpa login,
3. pembukaan full raw chat untuk editor,
4. fitur organisasi lanjutan di luar kebutuhan audit inti.
