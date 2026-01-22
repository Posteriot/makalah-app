# Security Audit Checklist

## Auth & Session
- Pastikan semua route protected memiliki guard.
- Cek role enforcement di server.

## Data Exposure
- Pastikan PII tidak bocor ke client/log.
- Kurangi field response ke minimum.

## API Hardening
- Validasi input semua endpoint.
- Pastikan error message tidak bocor detail internal.

## Webhook
- Verifikasi signature.
- Terapkan idempotency.
- Cek timestamp untuk replay.

## References wajib dibaca
- `.references/system-prompt`
- `.references/tools-health-system`
- `.references/tools-calling-api`
