# Task 6 QA Notes - Chat Technical Report

Tanggal: 2026-03-05  
Branch: `feat/chat-technical-report`

## Scope Verifikasi

- Validasi regression untuk fitur `technical report` chat.
- Validasi trigger otomatis saat:
  - `chat status = error` (non-quota error)
  - `tool state = error` / `output-error`
- Validasi link footer non-chat ke halaman report.

## Bukti Automated Check

### 1) Targeted tests

Command:

```bash
npx vitest run __tests__/technical-report-payload.test.ts
npx vitest run __tests__/technical-report-form.test.tsx
npx vitest run __tests__/chat-technical-report-snapshot.test.ts
```

Hasil:

- PASS `technical-report-payload` (4 tests)
- PASS `technical-report-form` (1 test)
- PASS `chat-technical-report-snapshot` (4 tests)

### 2) Global checks

Command:

```bash
npm run typecheck
npm run test
```

Hasil:

- PASS `typecheck`
- PASS `test` total `52` file dan `244` test

## Bukti Manual UI

### 1) Footer non-chat reminder link

Skenario:

1. Buka route non-chat: `/documentation`.
2. Scroll ke footer.
3. Klik `Lapor Masalah Chat`.

Observed:

- Browser diarahkan ke:
  `/sign-in?redirect_url=%2Fsupport%2Ftechnical-report%3Fsource%3Dfooter-link`

Makna:

- Link footer benar mengarah ke halaman report (dengan source `footer-link`) dan melewati guard auth.

### 2) Auto-trigger evidence by implementation

Lokasi kode:

- `src/components/chat/ChatWindow.tsx`
- `src/lib/technical-report/chatSnapshot.ts`

Poin yang tervalidasi:

- `chat status` dipetakan ke error report mode pada non-quota failure.
- trigger `true` saat `chatStatus === "error"`.
- trigger `true` saat ada tool dengan state `error` atau `output-error`.
- CTA report muncul di:
  - mobile header
  - desktop action area
  - auto-trigger banner
  - error overlay

## Catatan

- Submit report tetap manual oleh user (tidak ada auto-submit).
- Test ownership/rate-limit end-to-end butuh akun login aktif dan data user berbeda saat uji manual.
