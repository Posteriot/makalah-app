# Tools Calling Guardrails

## Definisi Tools
- Pastikan schema args jelas dan tervalidasi.
- Gunakan validator yang konsisten dengan patterns repo.

## Mode & Security
- Tools hanya boleh aktif di mode yang diizinkan.
- Hindari tool chain yang bisa bocorin data sensitif.

## Error Handling
- Pastikan tool error tidak memutus stream.
- Return error yang aman dan informatif.

## Idempotency
- Tool yang menulis data wajib idempotent bila mungkin.

## References wajib dibaca
- `.references/tools-calling-api`
- `.references/tools-apis-list`
- `.references/tools-health-system`
