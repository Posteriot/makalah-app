# Fix Chat Citation `n.d` Links Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menghilangkan link sitasi palsu seperti `n.d` di halaman chat dengan menutup akar masalah di fallback extractor, normalizer sitasi resmi, dan guard presentasi UI.

**Architecture:** Pendekatan terbaik adalah TDD dengan satu helper validasi URL/hostname yang dipakai lintas layer. Jalur fallback dan jalur web-search resmi harus memakai aturan validasi yang sama supaya tidak ada divergence lagi. Layer presentasi tetap diberi guard defensif supaya bad data tidak tampil sebagai domain palsu walau ada bug lain di hulu.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Vercel AI SDK v5.

---

### Task 1: Kunci perilaku bug di test extractor

**Files:**
- Modify: `src/lib/citations/legacy-source-extractor.test.ts`

**Step 1: Write the failing test**

Tambahkan test baru yang memastikan:

- `extractLegacySourcesFromText('IPB University (n.d.) menyoroti isu ini.')` mengembalikan `[]`
- `extractLegacySourcesFromText('Rujukan APA: (n.d.) dan bukan link web.')` mengembalikan `[]`
- URL valid yang sudah dicakup test lama tetap lolos

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/lib/citations/legacy-source-extractor.test.ts
```

Expected:

- test baru gagal karena `https://n.d/` masih keluar.

**Step 3: Commit checkpoint intent**

Belum commit. Lanjut ke implementasi minimal setelah beberapa test fail terkunci.

### Task 2: Kunci perilaku bug di test normalizer resmi

**Files:**
- Modify: `src/lib/citations/normalizer.test.ts`
- Modify: `__tests__/citation-normalizer.test.ts`

**Step 1: Write the failing test**

Tambahkan test untuk:

- `normalizeSourcesList([{ url: 'n.d', title: 'n.d' }])` harus `[]`
- `normalizeGoogleGrounding({ groundingChunks: [{ web: { uri: 'n.d', title: 'n.d' } }] })` harus `[]`
- domain valid seperti `https://example.com/article` tetap lolos

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/lib/citations/normalizer.test.ts __tests__/citation-normalizer.test.ts
```

Expected:

- test baru gagal karena `isValidUrl()` masih menerima `n.d`.

### Task 3: Kunci guard presentasi di test `apaWeb`

**Files:**
- Create or Modify: `src/lib/citations/apaWeb.test.ts` jika sudah ada; kalau belum, buat file baru

**Step 1: Write the failing test**

Tambahkan test untuk:

- `deriveSiteNameFromUrl('n.d')` harus mengembalikan fallback aman, bukan `N.d`
- `deriveSiteNameFromUrl('https://example.com/path')` tetap mengembalikan `Example`
- `getApaWebReferenceParts({ url: 'n.d', title: 'n.d' })` tidak menghasilkan author/site name palsu yang terlihat seperti domain valid
- bila helper display menerima URL/domain valid, perilaku existing tetap aman

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/lib/citations/apaWeb.test.ts
```

Expected:

- test `n.d` gagal karena saat ini hasilnya `N.d`.

### Task 4: Tambah helper validasi URL/hostname bersama

**Files:**
- Create: `src/lib/citations/url-validation.ts`

**Step 1: Write minimal helper API**

Buat helper kecil dengan fungsi yang jelas, misalnya:

- `normalizeHttpishUrlCandidate(value: string): string | null`
- `isValidCitationUrl(value: unknown): value is string`
- `isValidCitationHostname(hostname: string): boolean`

**Step 2: Implement strict-but-practical validation**

Aturan implementasi:

- trim input;
- hapus punctuation penutup umum;
- kalau sudah absolute URL:
  - parse via `new URL`
  - hanya izinkan `http:` atau `https:`
  - hostname harus lolos validator hostname
- kalau bare domain:
  - parse sebagai `https://<candidate>`
  - hostname tetap harus lolos validator hostname
- validator hostname:
  - wajib punya minimal satu `.`
  - setiap label non-empty
  - label terakhir hanya huruf dan panjang minimal 2
  - hostname tidak boleh ada spasi

Catatan:

- Jangan bikin blocklist `n.d` hardcoded sebagai solusi utama.
- Jangan tambahkan scoring/filtering pipeline baru; cukup normalisasi dan validasi format.

**Step 3: Add direct unit tests if needed**

Kalau helper cukup kompleks, buat:

- `src/lib/citations/url-validation.test.ts`

untuk memastikan aturan helper eksplisit dan mudah dipelihara.

### Task 5: Pakai helper baru di fallback extractor

**Files:**
- Modify: `src/lib/citations/legacy-source-extractor.ts`

**Step 1: Replace local permissive logic**

Ubah:

- `DOMAIN_REGEX` bila perlu supaya tidak terlalu permisif terhadap bentuk non-domain;
- `normalizeCandidateUrl()` supaya memakai helper bersama.

Target perilaku:

- `n.d` ditolak;
- `example.com`, `data.gov`, `www.stat.test/news`, `https://site.test/a` tetap lolos.

**Step 2: Run extractor test**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/lib/citations/legacy-source-extractor.test.ts
```

Expected:

- semua test extractor pass.

### Task 6: Pakai helper baru di normalizer sitasi resmi

**Files:**
- Modify: `src/lib/citations/normalizer.ts`

**Step 1: Replace `isValidUrl()` implementation**

Ubah `isValidUrl()` supaya tidak lagi memakai fallback:

```ts
return value.includes('.') && !value.includes(' ')
```

karena itu akar bug sekunder.

Ganti dengan helper bersama yang benar-benar memvalidasi URL/hostname web.

**Step 2: Keep behavior compatible for valid sources**

Pastikan:

- absolute URL valid tetap lolos;
- bare domain valid dari provider tetap bisa dinormalisasi bila memang didukung helper;
- blocked-domain filtering tetap jalan setelah validasi.

**Step 3: Run normalizer tests**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/lib/citations/normalizer.test.ts __tests__/citation-normalizer.test.ts
```

Expected:

- semua test normalizer pass;
- `n.d` tertolak di jalur resmi.

### Task 7: Tambah guard defensif di `apaWeb`

**Files:**
- Modify: `src/lib/citations/apaWeb.ts`
- Verify compatibility: `src/lib/citations/webTitle.ts`

**Step 1: Harden `tryParseAbsoluteUrl()` or `deriveSiteNameFromUrl()`**

Gunakan helper baru atau guard setara supaya:

- string non-domain seperti `n.d` tidak lagi diperlakukan sebagai host yang layak dirender;
- fallback yang aman adalah `Situs web`, bukan `N.d`.

**Step 2: Keep valid display intact**

Jangan sampai perubahan ini merusak:

- `normalizeWebSearchUrl()`
- `getApaWebReferenceParts()`
- `getWebCitationDisplayParts()`
- caller lain yang memakai `deriveSiteNameFromUrl()`, terutama `src/lib/citations/webTitle.ts`

untuk URL valid dan vertex proxy URL yang sah.

**Step 3: Run `apaWeb` tests**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/lib/citations/apaWeb.test.ts
```

Expected:

- `n.d` tidak lagi jadi `N.d`;
- output valid tetap stabil.

**Step 4: Run caller compatibility check**

Kalau perubahan guard memengaruhi perilaku title cleanup, tambahkan atau jalankan test yang relevan untuk `webTitle.ts`. Minimal lakukan inspeksi terarah pada callsite `deriveSiteNameFromUrl(finalUrlSafe ?? normalized)` supaya fallback baru tidak merusak trimming judul yang valid.

### Task 8: Tambah regression test level chat jika perlu

**Files:**
- Modify: test file `MessageBubble` yang paling relevan; cari file existing untuk citation/source rendering dan pakai itu

**Step 1: Add focused rendering test**

Tambahkan satu test yang memastikan:

- assistant message berisi teks dengan `(n.d.)`
- tanpa `sources` resmi
- tidak memunculkan citation chip/link palsu

**Step 2: Run targeted test**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/components/chat/MessageBubble*.test.tsx __tests__/*citation*.test.tsx
```

Expected:

- tidak ada source palsu yang dirender.

### Task 9: Jalankan rangkaian verifikasi bertahap

**Files:**
- No code changes

**Step 1: Run all targeted tests**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/lib/citations/legacy-source-extractor.test.ts src/lib/citations/normalizer.test.ts __tests__/citation-normalizer.test.ts src/lib/citations/apaWeb.test.ts src/lib/citations/url-validation.test.ts
```

Expected:

- semua pass.
- kalau `url-validation.test.ts` tidak jadi dibuat, hapus file itu dari command final dan pastikan helper tetap tercakup via test lain.

**Step 2: Run broader chat/citation test sweep**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npx vitest run src/components/chat __tests__/chat --reporter=dot
```

Expected:

- area chat yang relevan tetap hijau.

**Step 3: Run full repo test**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
npm test
```

Expected:

- baseline tetap hijau;
- tidak ada regresi baru.

### Task 10: Review diff dan commit

**Files:**
- Review all touched files

**Step 1: Inspect final diff**

Run:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links
git diff -- src/lib/citations src/components/chat __tests__
```

Checklist:

- tidak ada perubahan di luar scope bug;
- helper validasi tidak over-engineered;
- test baru benar-benar menangkap regresi `n.d`.

**Step 2: Commit**

Run:

```bash
git add src/lib/citations src/components/chat __tests__
git commit -m "fix: reject fake n.d citation links"
```

Expected:

- commit tunggal yang bersih untuk bug ini.

## Acceptance Criteria

- `IPB University (n.d.)` tidak lagi menghasilkan source `https://n.d/`
- `deriveSiteNameFromUrl('n.d')` tidak lagi menghasilkan `N.d`
- `normalizeSourcesList([{ url: 'n.d' }])` menghasilkan `[]`
- domain valid dan URL valid yang existing tetap lolos
- `npm test` tetap hijau penuh

## Catatan Eksekusi

- Jangan menyelesaikan bug ini hanya di UI.
- Jangan menambah pipeline filter/skor baru di jalur tool output.
- Satu helper validasi bersama adalah pilihan paling bersih karena menghilangkan divergence antar layer.
