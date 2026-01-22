# Webhook Security

## Validasi
- Verifikasi signature dan secret.
- Cek timestamp tolerance.

## Idempotency
- Simpan event id untuk dedup.
- Jangan proses event yang sama dua kali.

## Error Handling
- Return status code yang tepat.
- Jangan bocorkan detail internal.

## References wajib dibaca
- `.references/search-web`
- `.references/tools-calling-api`
