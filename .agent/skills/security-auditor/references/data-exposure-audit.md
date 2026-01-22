# Data Exposure Audit

## Client Leakage
- Pastikan env secret tidak bocor ke client.
- Jangan expose token atau API key di UI.

## Logging
- Mask data sensitif di log.
- Hindari log payload mentah.

## Response Shape
- Minimalkan data yang dikirim ke client.
- Gunakan allowlist field.

## References wajib dibaca
- `.references/ai-gateway`
- `.references/llm-models-provider`
