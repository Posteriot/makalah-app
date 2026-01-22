# Security Checklist (Payment/Xendit)

## Webhook & Signature
- Verifikasi signature webhook di server.
- Tolak payload tanpa signature yang valid.
- Gunakan timestamp tolerance untuk replay attack.

## Idempotency
- Pastikan handler webhook idempotent.
- Cek duplikasi event dan simpan event id.

## Secrets & Keys
- Secret hanya di server env, jangan bocor ke client.
- Pastikan logging tidak memuat key/token.

## Input Validation
- Validasi payload dari Xendit sebelum dipakai.
- Cek tipe data, required field, dan range nilai.

## Authorization
- Pastikan hanya user berizin bisa akses endpoint pembayaran.
- Pastikan tenant/user isolation aman.

## Data Exposure
- Hindari menyimpan PII di log.
- Masking data sensitif di UI dan error.

## Error Handling
- Error jangan bocorkan detail internal.
- Return status code yang tepat untuk webhook.
