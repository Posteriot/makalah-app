# Verdict: Fake Citation Link `n.d` di Halaman Chat

Tanggal: 2026-03-26
Worktree: `/Users/eriksupit/Desktop/makalahapp/.worktrees/fix-chat-citation-nd-links`
Branch: `fix/chat-citation-nd-links`

## Ringkasan

Akar masalah utama sudah terkonfirmasi: fallback extractor sitasi lama salah mengenali teks sitasi akademik `n.d.` sebagai domain valid, lalu mengubahnya menjadi URL palsu `https://n.d/`.

Masalah ini lalu terlihat di UI karena helper presentasi sitasi memperlakukan `n.d` sebagai host yang bisa diparse, sehingga label domain berubah menjadi `N.d`.

Ada masalah kedua yang terpisah tapi masih satu keluarga: normalizer sitasi resmi untuk hasil web-search juga terlalu longgar saat memvalidasi URL. Artinya, bug `n.d` bukan cuma bug tampilan; ada celah di jalur data sumber resmi juga.

## Status Verdict

Verdict final:

- Penyebab utama screenshot adalah fallback parser di `legacy-source-extractor.ts`.
- Penyebab sekunder yang harus ikut ditutup adalah validator URL longgar di `normalizer.ts`.
- Jalur render `apaWeb.ts` dan komponen chat tidak menciptakan bug dari nol, tapi mereka memperjelas bug dengan merender `n.d` sebagai sumber yang terlihat sah.

## Bukti Reproduksi

### Reproduksi 1: fallback extractor menghasilkan URL palsu

Perintah:

```bash
node -e "const {extractLegacySourcesFromText}=require('./.worktrees/fix-chat-citation-nd-links/src/lib/citations/legacy-source-extractor.ts'); console.log(JSON.stringify(extractLegacySourcesFromText('IPB University (n.d.) menyoroti isu ini.'), null, 2))"
```

Output:

```json
[
  {
    "url": "https://n.d/",
    "title": "n.d"
  }
]
```

Kesimpulan:

- `n.d.` di teks akademik memang sedang dikonversi jadi URL palsu.

### Reproduksi 2: helper display mengubah `n.d` menjadi `N.d`

Perintah:

```bash
node -e "const {deriveSiteNameFromUrl}=require('./.worktrees/fix-chat-citation-nd-links/src/lib/citations/apaWeb.ts'); console.log(deriveSiteNameFromUrl('n.d'))"
```

Output:

```txt
N.d
```

Kesimpulan:

- kalau string `n.d` lolos ke layer presentasi, UI memang akan merendernya sebagai label domain yang terlihat seperti sumber sungguhan.

### Reproduksi 3: baseline test belum menangkap kasus ini

File test saat ini:

- `src/lib/citations/legacy-source-extractor.test.ts`
- `src/lib/citations/normalizer.test.ts`
- `__tests__/citation-normalizer.test.ts`

Temuan:

- belum ada test regresi untuk menolak `n.d`, `n.d.`, atau sitasi akademik serupa;
- coverage yang ada masih fokus ke URL valid, dedup, malformed input umum, dan domain terblokir.

## Akar Masalah

### 1. Root cause utama: parser fallback terlalu permisif

File: `src/lib/citations/legacy-source-extractor.ts`

Temuan inti:

- `DOMAIN_REGEX` pada baris 7 menerima pola `kata.kata` tanpa membedakan apakah itu benar-benar hostname web atau singkatan akademik.
- `normalizeCandidateUrl()` pada baris 9-23 hanya mensyaratkan:
  - protocol `http:` atau `https:`
  - hostname mengandung `.`
- hasilnya, `n.d` lolos validasi dan dinormalisasi menjadi `https://n.d/`.

Konsekuensi:

- teks seperti `(n.d.)`, yang sangat umum dalam sitasi APA, salah dianggap sebagai sumber/link.

### 2. Root cause sekunder: validator URL resmi juga terlalu permisif

File: `src/lib/citations/normalizer.ts`

Temuan inti:

- `isValidUrl()` pada baris 27-35 melakukan fallback terlalu longgar saat `new URL(value)` gagal;
- string dianggap valid hanya karena:
  - mengandung `.`
  - tidak mengandung spasi

Konsekuensi:

- string seperti `n.d` juga lolos di jalur normalizer sitasi resmi;
- ini memengaruhi:
  - `normalizeSourcesList()` pada baris 68-91
  - `normalizeGoogleGrounding()` pada baris 143-216
- dan otomatis memengaruhi retriever:
  - `src/lib/ai/web-search/retrievers/perplexity.ts`
  - `src/lib/ai/web-search/retrievers/grok.ts`
  - `src/lib/ai/web-search/retrievers/google-grounding.ts`

Ini berarti bug bukan terbatas pada fallback UI saja.

## Jalur Data Yang Terlibat

### Jalur screenshot yang paling mungkin

1. Model menghasilkan teks akademik seperti `IPB University (n.d.)`.
2. Message assistant tidak membawa inventory sumber yang valid.
3. `MessageBubble.tsx` masuk ke fallback `extractLegacySourcesFromText(...)`.
4. `legacy-source-extractor.ts` menangkap `n.d`.
5. `apaWeb.ts` mengubah hostname itu menjadi `N.d`.
6. `InlineCitationChip` dan `SourcesPanel` menampilkan sumber palsu.

### Bukti di kode

File: `src/components/chat/MessageBubble.tsx`

- baris 693-702 menunjukkan sumber diambil dari prioritas:
  - `referenceInventorySources`
  - `persistedOrStreamedSources`
  - `legacyExtractedSources`
- pada baris 695-696, fallback extractor aktif saat source resmi kosong.

File: `src/components/chat/SourcesPanel.tsx`

- baris 90-97 membangun presentasi sumber dari URL yang lolos;
- baris 97 memanggil `deriveSiteNameFromUrl(parts.url)`.

File: `src/components/chat/InlineCitationChip.tsx`

- chip label dibentuk dari hostname URL pertama yang lolos.

## Kenapa Bug Ini Terjadi

Masalah dasarnya bukan di model, melainkan di asumsi kode:

- kode saat ini menganggap semua token `x.y` layak diperlakukan sebagai kandidat domain;
- asumsi itu salah untuk teks akademik, karena notasi singkat seperti `n.d.` memang sering muncul dan formatnya kebetulan mirip domain.

Jadi akar masalahnya adalah definisi "URL/domain valid" terlalu lemah di dua tempat terpisah.

## File Yang Terlibat

File primer:

- `src/lib/citations/legacy-source-extractor.ts`
- `src/lib/citations/normalizer.ts`
- `src/lib/citations/apaWeb.ts`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/SourcesPanel.tsx`
- `src/components/chat/InlineCitationChip.tsx`

File jalur web-search resmi:

- `src/lib/ai/web-search/retrievers/perplexity.ts`
- `src/lib/ai/web-search/retrievers/grok.ts`
- `src/lib/ai/web-search/retrievers/google-grounding.ts`

File test yang perlu ditambah:

- `src/lib/citations/legacy-source-extractor.test.ts`
- `src/lib/citations/normalizer.test.ts`
- `__tests__/citation-normalizer.test.ts`
- test chat rendering yang mencakup fallback citation chip bila perlu

## Solusi Yang Paling Tepat

Rekomendasi terbaik: tutup dua lapis sekaligus dengan satu aturan validasi URL/hostname yang konsisten.

### Prinsip solusi

- Jangan pakai blocklist spesifik `n.d` saja.
- Perketat definisi URL/domain valid supaya singkatan akademik tidak lagi lolos.
- Tetap pertahankan dukungan untuk URL valid dan domain plain yang memang sah.
- Tambahkan guard defensif di layer presentasi supaya kalau data jelek lolos lagi di masa depan, UI tidak merender `N.d`.

### Bentuk solusi yang direkomendasikan

1. Buat helper validasi URL/hostname yang dipakai bersama oleh:
   - `legacy-source-extractor.ts`
   - `normalizer.ts`
   - idealnya helper display di `apaWeb.ts`
2. Aturan minimal helper:
   - hanya terima `http/https` untuk URL absolut;
   - untuk bare domain, parse sebagai `https://<candidate>` lalu validasi hostname dengan aturan lebih ketat;
   - hostname wajib punya setidaknya satu `.` dan label terakhir harus alphabetic dengan panjang minimal 2 karakter;
   - token pendek gaya singkatan akademik seperti `n.d` harus gagal validasi;
   - strip punctuation penutup seperti `. , ; : ) ]` tetap dipertahankan.
3. `MessageBubble` tidak perlu diubah besar-besaran bila source palsu sudah diblok di hulu.
4. `apaWeb.ts` tetap perlu guard defensif supaya string jelek tidak lagi tampil sebagai `N.d`.

## Hal Yang Tidak Gue Rekomendasikan

- Tidak cukup hanya patch UI label dari `N.d` ke `Situs web`.
  - Ini menutupi gejala, bukan sumber bug.
- Tidak cukup hanya bikin blocklist `n.d`.
  - Bug utamanya adalah validator longgar; singkatan lain bisa lolos lagi.
- Tidak tepat menghapus total fallback extraction.
  - Fallback masih berguna untuk pesan lama atau payload yang belum membawa source inventory resmi.

## Risiko Implementasi

Risiko utama:

- kalau validator dibuat terlalu ketat, domain valid tanpa skema bisa ikut terbuang;
- kalau validator dibuat terlalu longgar, bug `n.d` tetap lolos.

Mitigasi terbaik:

- gunakan TDD;
- tambahkan test untuk:
  - `example.com`, `data.gov`, `www.stat.test/news` tetap lolos;
  - `n.d`, `n.d.`, `(n.d.)`, `et.al` tidak lolos;
  - presentasi `deriveSiteNameFromUrl` tidak lagi mengembalikan `N.d`.

## Verdict Final

Fix yang benar bukan "hapus `N.d` dari tampilan", tapi:

- memperketat validasi hostname/URL di fallback extractor;
- memperketat validator URL di normalizer sumber resmi;
- menambah guard defensif di layer presentasi sitasi;
- menutup semuanya dengan test regresi yang eksplisit.

Itu satu-satunya pendekatan yang beneran menutup akar masalah dan mencegah regresi lintas jalur data.
