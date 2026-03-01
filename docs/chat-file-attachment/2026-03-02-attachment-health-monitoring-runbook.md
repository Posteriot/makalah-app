# Attachment Health Monitoring Runbook

## Tujuan
Runbook ini dipakai admin untuk memonitor kesehatan pipeline attachment di `/ai-ops` dan melakukan investigasi cepat saat ada kegagalan parsing atau context injection.

## Lokasi Monitoring
1. Buka `/ai-ops`.
2. Pilih menu `Attachment Health`.
3. Gunakan period filter (`1j`, `24j`, `7h`) sesuai kebutuhan investigasi.

## Arti Status Health
1. `healthy`
- File request siap dipakai model.
- Bisa karena dokumen berhasil diekstrak, atau image-only yang terkirim via multimodal native.

2. `degraded`
- Ada keberhasilan parsial.
- Sebagian file masih pending atau gagal.

3. `failed`
- Tidak ada konteks dokumen yang berhasil terinjeksi.
- Umumnya karena extractor gagal atau hasil ekstraksi kosong.

4. `processing`
- Dokumen masih pending di extractor saat request chat diproses.

5. `unknown`
- Tidak ada file efektif pada request.
- Kasus umum: request chat tanpa attachment.

## Langkah Investigasi Saat Failed Naik
1. Buka tab `Attachment Health > Kegagalan`.
2. Cek `failureReason`, `runtimeEnv`, `mode`, dan `extraction S/P/F`.
3. Identifikasi pola:
- Jika dominan `runtimeEnv=vercel`: fokus ke parity dependency/runtime deploy.
- Jika dominan `processing`: cek latency extractor dan beban server.
- Jika dominan `failed` dengan `docContextChars=0`: cek extractor per format.
4. Cocokkan dengan log route lokal/vercel:
- `[ATTACH-DIAG][route] request body`
- `[ATTACH-DIAG][route] effective fileIds`
- `[ATTACH-DIAG][route] context result`
5. Uji ulang 1 file per format utama (PDF, DOCX, XLSX, PPTX, TXT, image).

## Eskalasi Cepat
1. Jika hanya 1 format gagal konsisten (mis. PDF), eskalasi ke extractor format tersebut.
2. Jika semua dokumen gagal tapi image sehat, fokus ke jalur extraction/context injection.
3. Jika local sehat tapi vercel gagal, fokus ke runtime parity (Node version, bundle trace, dependency availability).

## Batasan Monitoring
1. Dashboard mengukur readiness pipeline attachment, bukan kualitas jawaban model secara semantik.
2. Telemetry tidak menyimpan raw `extractedText` demi keamanan data.
