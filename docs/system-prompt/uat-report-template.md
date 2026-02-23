# UAT Report Template - System Prompt Frontend Validation

Dokumen ini adalah template **User Acceptance Test (UAT)** untuk memvalidasi hasil perbaikan system prompt dan runtime enforcement di frontend.

## 1. Metadata Eksekusi

| Field | Value |
|---|---|
| UAT ID | `SP-UAT-YYYYMMDD-01` |
| Tanggal Eksekusi | `YYYY-MM-DD` |
| Environment | `Local / Staging / Production` |
| Base URL | `http://localhost:3000` |
| Tester | `<nama>` |
| Branch / Commit | `<branch>` / `<sha>` |
| Build Version | `<opsional>` |

## 2. Pre-Flight Checklist

- [ ] Active prompt sudah versi contract aligned.
- [ ] Dev server frontend berjalan (`npm run dev`).
- [ ] Convex backend terhubung dan sehat.
- [ ] User account test tersedia (role user biasa).
- [ ] Admin account test tersedia (untuk cek System Health panel).
- [ ] Browser cache sudah dibersihkan atau pakai Incognito.

## 3. Test Matrix (Frontend E2E)

Gunakan status: `PASS`, `FAIL`, atau `BLOCKED`.

| ID | User Flow | Test Steps | Expected Result | Actual Result | Status | Evidence |
|---|---|---|---|---|---|---|
| SP-01 | Paper drafting (auto-stage contract) | 1) Buka `/chat` 2) Mulai paper session 3) Isi 2-3 stage 4) Minta AI simpan/update stage | Tidak ada stage mismatch error; stage data tetap konsisten setelah refresh | `<isi>` | `<PASS/FAIL/BLOCKED>` | `<screenshot/log>` |
| SP-02 | Artifact creation (negative guard) | 1) Jalankan web search hingga ada references 2) Minta AI create artifact **tanpa** sources | Request ditolak atau AI meminta sources; artifact baru tidak terbentuk tanpa sources | `<isi>` | `<PASS/FAIL/BLOCKED>` | `<screenshot/log>` |
| SP-03 | Artifact creation (positive path) | 1) Pada context yang punya references 2) Minta AI create artifact dengan sources eksplisit | Artifact berhasil dibuat dan memiliki sources valid | `<isi>` | `<PASS/FAIL/BLOCKED>` | `<screenshot/log>` |
| SP-04 | Artifact update (negative guard) | 1) Ambil artifact existing 2) Minta AI update artifact sambil menghapus sources | Update ditolak; artifact lama tetap utuh | `<isi>` | `<PASS/FAIL/BLOCKED>` | `<screenshot/log>` |
| SP-05 | Artifact update (positive path) | 1) Update artifact dengan sources valid 2) Verifikasi version/content | Update berhasil; version naik; sources tetap valid | `<isi>` | `<PASS/FAIL/BLOCKED>` | `<screenshot/log>` |
| SP-06 | Citation rendering + drift visibility | 1) Lakukan web search query 2) Cek inline citation chips 3) Buka `/dashboard` tab System Prompts/System Health | Citation chips tampil benar; health panel tidak menandakan contract drift pada kondisi normal | `<isi>` | `<PASS/FAIL/BLOCKED>` | `<screenshot/log>` |

## 4. Acceptance Gate (Go/No-Go)

### 4.1 Gate Wajib Lulus

- [ ] SP-02 = `PASS` (negative guard createArtifact aktif)
- [ ] SP-04 = `PASS` (negative guard updateArtifact aktif)
- [ ] SP-03 = `PASS` (positive create path tidak over-blocking)
- [ ] SP-05 = `PASS` (positive update path tidak over-blocking)
- [ ] SP-01 = `PASS` (paper drafting stabil)
- [ ] SP-06 = `PASS` (citation rendering + monitoring sehat)

### 4.2 Keputusan Rilis

- [ ] `GO` - Semua gate wajib lulus.
- [ ] `NO-GO` - Ada minimal satu gate wajib gagal.

## 5. Defect Log

| Defect ID | Severity (Low/Medium/High) | Flow Impact | Reproduction Steps | Actual vs Expected | Owner | Status |
|---|---|---|---|---|---|---|
| `DEF-001` | `<isi>` | `<paper/artifact/citation>` | `<isi>` | `<isi>` | `<isi>` | `Open/In Progress/Closed` |

## 6. Evidence Manifest

Daftar bukti minimum:

1. Screenshot SP-01 sebelum dan sesudah refresh.
2. Screenshot penolakan SP-02.
3. Screenshot artifact sukses + sources pada SP-03.
4. Screenshot penolakan update SP-04.
5. Screenshot artifact version terbaru pada SP-05.
6. Screenshot citation chips + System Health panel pada SP-06.

| Evidence ID | Jenis Bukti | Lokasi File/URL | Keterangan |
|---|---|---|---|
| `EV-01` | Screenshot | `<path/url>` | `<isi>` |
| `EV-02` | Chat transcript | `<path/url>` | `<isi>` |
| `EV-03` | Video rekaman (opsional) | `<path/url>` | `<isi>` |

## 7. Final Sign-Off

| Role | Nama | Tanggal | Keputusan | Catatan |
|---|---|---|---|---|
| Tester | `<isi>` | `YYYY-MM-DD` | `GO/NO-GO` | `<isi>` |
| Tech Reviewer | `<isi>` | `YYYY-MM-DD` | `GO/NO-GO` | `<isi>` |
| Product Owner (opsional) | `<isi>` | `YYYY-MM-DD` | `GO/NO-GO` | `<isi>` |

