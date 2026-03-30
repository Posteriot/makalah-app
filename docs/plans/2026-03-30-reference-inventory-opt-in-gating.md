# Reference Inventory Opt-In Gating Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membatasi UI `reference inventory` inline agar hanya muncul saat user memang meminta sumber/link/rujukan, termasuk permintaan PDF/paper, sambil mempertahankan akses `Rujukan` untuk jawaban search biasa.

**Architecture:** Terapkan gating utama di backend web-search payload supaya `data-reference-inventory` hanya di-emit untuk mode `reference_inventory`, lalu tambahkan guard defensif di frontend agar bubble chat tidak pernah merender inventori inline pada mode `synthesis`. Pertahankan `data-cited-sources` dan `SourcesPanel` sebagai akses sumber default untuk jawaban analitis biasa.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vercel AI SDK v5 UI message stream, Vitest.

---

## Context

Problem yang harus ditutup:

- payload inventori sumber sekarang dibentuk setiap kali ada `referenceItems`, tanpa cek `responseMode`
- `MessageBubble` lalu merender inventori inline sekaligus tetap merender `SourcesIndicator`
- hasilnya daftar URL muncul di bubble chat walau user tidak meminta sumber
- UX menjadi redundan karena panel `Rujukan` sudah menampilkan data yang sama

Target perilaku final:

1. `synthesis`
   - bubble chat menampilkan jawaban utama saja
   - `SourcesIndicator` / panel `Rujukan` tetap tersedia jika ada sumber
   - inventori inline tidak tampil
2. `reference_inventory`
   - bubble chat boleh menampilkan intro singkat + inventori inline
   - trigger untuk mode ini tetap berdasarkan permintaan eksplisit sumber/link/rujukan/PDF/paper
   - panel `Rujukan` tetap bisa dibuka sebagai viewer detail

Prinsip implementasi:

1. Akar masalah diselesaikan di backend payload, bukan cuma ditutup kosmetik di frontend.
2. Frontend tetap diberi guard defensif agar payload nyasar tidak membocorkan inventori inline.
3. Jangan ubah heuristik intent melebihi scope yang sudah disepakati.
4. Jangan ubah kontrak `SourcesPanel`; itu tetap jadi akses sumber default untuk mode biasa.

## Target Files

### Modified files

- `src/lib/ai/internal-thought-separator.ts`
- `src/lib/ai/web-search/orchestrator.ts`
- `src/components/chat/MessageBubble.tsx`
- `src/lib/ai/internal-thought-separator.test.ts`
- `src/components/chat/MessageBubble.reference-inventory.test.tsx`
- `src/components/chat/MessageBubble.search-status.test.tsx`

### Optional modified files

- `src/lib/ai/web-search/types.ts`
- `__tests__/reference-presentation.test.ts`

File optional hanya disentuh jika implementasi guard perlu merapikan type atau menambah assertion kontrak mode.

## Task 1: Kunci kontrak payload inventori agar opt-in

**Files:**
- Modify: `src/lib/ai/internal-thought-separator.ts`
- Test: `src/lib/ai/internal-thought-separator.test.ts`

**Step 1: Write the failing test**

Tambahkan test baru untuk `buildUserFacingSearchPayload()`:

- `responseMode: "synthesis"` + `referenceItems` terisi -> `referenceInventory` harus `undefined`
- `responseMode: "reference_inventory"` + `referenceItems` terisi -> `referenceInventory` harus ada
- `responseMode: "reference_inventory"` + text biasa -> `citedText` tetap aman dan tidak memaksa daftar URL ke body

Contoh minimal:

```ts
it("does not attach reference inventory in synthesis mode", () => {
  const out = buildUserFacingSearchPayload({
    text: "Ini rangkumannya.",
    responseMode: "synthesis",
    referenceItems: [
      {
        sourceId: "s1",
        title: "Paper A",
        url: "https://example.com/a.pdf",
        verificationStatus: "unverified_link",
      },
    ],
  })

  expect(out.referenceInventory).toBeUndefined()
  expect(out.citedText).toBe("Ini rangkumannya.")
})

it("attaches reference inventory in reference_inventory mode", () => {
  const out = buildUserFacingSearchPayload({
    text: "Berikut sumber yang gue temukan.",
    responseMode: "reference_inventory",
    referenceItems: [
      {
        sourceId: "s1",
        title: "Paper A",
        url: "https://example.com/a.pdf",
        verificationStatus: "unverified_link",
      },
    ],
  })

  expect(out.referenceInventory?.items).toHaveLength(1)
})
```

**Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/lib/ai/internal-thought-separator.test.ts
```

Expected:

- FAIL karena mode `synthesis` saat ini masih ikut membawa `referenceInventory`

**Step 3: Write minimal implementation**

Di `src/lib/ai/internal-thought-separator.ts`:

- ubah builder `referenceInventory` agar hanya dibuat saat:
  - `normalizedInput.responseMode === "reference_inventory"`
  - atau jika nanti memang ingin support `mixed` secara eksplisit
- jangan ubah logic `splitInternalThought`
- jangan ubah `citedText` untuk mode `synthesis`

**Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run src/lib/ai/internal-thought-separator.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/lib/ai/internal-thought-separator.ts src/lib/ai/internal-thought-separator.test.ts
git commit -m "fix(search): gate reference inventory payload by response mode"
```

## Task 2: Hentikan orchestrator mengirim inventori untuk mode biasa

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts`
- Optional: `src/lib/ai/web-search/types.ts`

**Step 1: Write the failing test**

Kalau belum ada test level orchestrator yang realistis, tambahkan assertion minimal di test UI message yang sudah ada:

- message hasil `synthesis` dengan `data-cited-sources` tidak perlu `data-reference-inventory`
- test ini bisa ditempatkan di `MessageBubble.reference-inventory.test.tsx` atau test baru kecil yang membaca parts message mock

Kalau test orchestrator terlalu berat untuk scope ini, cukup dokumentasikan bahwa enforcement utama akan diverifikasi lewat unit payload + UI render guard.

**Step 2: Run test to verify it fails**

Run:

```bash
npx vitest run src/components/chat/MessageBubble.reference-inventory.test.tsx
```

Expected:

- FAIL jika test synthesis/no-inline sudah ditambahkan di task berikut

**Step 3: Write minimal implementation**

Di `src/lib/ai/web-search/orchestrator.ts`:

- tetap bangun `referencePresentationSources`
- tetap simpan `referencePresentation` ke hasil `onFinish` bila dibutuhkan observability
- emit `data-reference-inventory` hanya jika `userFacingPayload.referenceInventory` ada
- setelah Task 1, kondisi ini otomatis hanya true untuk `reference_inventory`

Jangan ubah:

- `data-cited-text`
- `data-cited-sources`
- persistence sources untuk history/panel

**Step 4: Run focused verification**

Run:

```bash
npx vitest run src/lib/ai/internal-thought-separator.test.ts src/components/chat/MessageBubble.reference-inventory.test.tsx
```

Expected:

- PASS untuk gating payload dasar

**Step 5: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts src/lib/ai/internal-thought-separator.ts src/lib/ai/internal-thought-separator.test.ts src/components/chat/MessageBubble.reference-inventory.test.tsx
git commit -m "fix(search): emit reference inventory only for opt-in responses"
```

## Task 3: Tambah guard frontend agar inventori inline hanya muncul di mode inventori

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`
- Test: `src/components/chat/MessageBubble.reference-inventory.test.tsx`
- Test: `src/components/chat/MessageBubble.search-status.test.tsx`

**Step 1: Write the failing tests**

Tambah test berikut:

1. `does not render inline inventory for synthesis mode`
   - message punya `data-reference-inventory` dengan `responseMode: "synthesis"`
   - bubble tidak boleh merender daftar URL / inventaris referensi
   - `SourcesIndicator` tetap muncul jika `data-cited-sources` ada

2. `renders inline inventory only for reference_inventory mode`
   - pertahankan test existing

3. `keeps search status and no inline inventory in synthesis fallback case`
   - kombinasi `data-search` + `data-reference-inventory` mode synthesis
   - status pencarian tampil
   - inventori inline tidak tampil

Contoh minimal untuk test pertama:

```ts
it("does not render inline inventory for synthesis mode", () => {
  const message = {
    id: "m-synth",
    role: "assistant",
    parts: [
      { type: "data-cited-text", data: { text: "Ini ringkasannya." } },
      {
        type: "data-reference-inventory",
        data: {
          responseMode: "synthesis",
          introText: "Inventori tidak boleh tampil di mode ini.",
          items: [
            {
              sourceId: "s1",
              title: "Paper A",
              url: "https://example.com/a.pdf",
              verificationStatus: "unverified_link",
            },
          ],
        },
      },
      {
        type: "data-cited-sources",
        data: {
          sources: [{ url: "https://example.com/a.pdf", title: "Paper A" }],
        },
      },
    ],
  } as unknown as UIMessage

  render(<MessageBubble message={message} />)

  expect(screen.queryByLabelText("Inventaris referensi")).not.toBeInTheDocument()
  expect(screen.getByTestId("sources-indicator")).toBeInTheDocument()
})
```

**Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/components/chat/MessageBubble.reference-inventory.test.tsx src/components/chat/MessageBubble.search-status.test.tsx
```

Expected:

- FAIL karena `MessageBubble` sekarang merender inventori kalau `items.length > 0` tanpa cek mode

**Step 3: Write minimal implementation**

Di `src/components/chat/MessageBubble.tsx`:

- buat boolean eksplisit, misalnya:

```ts
const isInlineReferenceInventory =
  referenceInventory?.responseMode === "reference_inventory"
```

- `referenceInventoryIntroText` dan `referenceInventoryItems` untuk render bubble hanya aktif saat boolean ini true
- `sources` jangan dihilangkan; `SourcesIndicator` tetap harus memakai source list normal
- jangan matikan `SourcesPanel`

**Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run src/components/chat/MessageBubble.reference-inventory.test.tsx src/components/chat/MessageBubble.search-status.test.tsx
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx src/components/chat/MessageBubble.reference-inventory.test.tsx src/components/chat/MessageBubble.search-status.test.tsx
git commit -m "fix(chat): show inline reference inventory only on explicit reference requests"
```

## Task 4: Verifikasi contract parity antara mode biasa dan mode inventori

**Files:**
- Optional modify: `__tests__/reference-presentation.test.ts`
- Optional modify: `src/lib/ai/web-search/types.ts`

**Step 1: Write the failing test**

Tambahkan satu test kontrak kecil:

- `inferSearchResponseMode()` tetap mengembalikan `reference_inventory` untuk prompt `sumber/link/rujukan/pdf/paper`
- prompt analitis biasa tetap `synthesis`

Kalau sudah tercakup, cukup tambahkan assertion bahwa perubahan ini tidak mengubah heuristik intent.

**Step 2: Run test to verify it fails or remains green**

Run:

```bash
npx vitest run __tests__/reference-presentation.test.ts
```

Expected:

- tetap PASS atau perlu adjustment kecil bila ada type mismatch

**Step 3: Minimal implementation**

Hanya lakukan perubahan bila:

- type `ReferenceInventoryItem` perlu diberi komentar bahwa inventori inline adalah opt-in UI
- atau test perlu di-update agar kontrak intent tetap terdokumentasi

Jangan perluas scope ke filter PDF-only pada task ini.

**Step 4: Run test to verify it passes**

Run:

```bash
npx vitest run __tests__/reference-presentation.test.ts
```

Expected:

- PASS

**Step 5: Commit**

```bash
git add __tests__/reference-presentation.test.ts src/lib/ai/web-search/types.ts
git commit -m "test(search): lock opt-in reference inventory intent contract"
```

## Task 5: Final verification and manual smoke test

**Files:**
- No code changes required unless failures found

**Step 1: Run focused regression suite**

Run:

```bash
npx vitest run \
  src/lib/ai/internal-thought-separator.test.ts \
  __tests__/reference-presentation.test.ts \
  src/components/chat/MessageBubble.reference-inventory.test.tsx \
  src/components/chat/MessageBubble.search-status.test.tsx
```

Expected:

- PASS semua

**Step 2: Run broader chat regression if needed**

Run:

```bash
npx vitest run src/components/chat
```

Expected:

- PASS atau hanya fail di test yang memang unrelated pre-existing

**Step 3: Manual smoke test**

Jalankan app dan cek dua skenario:

1. Prompt analitis biasa:
   - contoh: `jelaskan dampak AI terhadap siswa SD`
   - expected:
     - jawaban utama tampil
     - inventori inline tidak tampil
     - `Menemukan X rujukan` tetap muncul

2. Prompt permintaan sumber:
   - contoh: `tampilkan sumbernya`, `carikan link PDF`, `mana rujukannya`
   - expected:
     - inventori inline tampil
     - panel `Rujukan` tetap bisa dibuka

Run:

```bash
npm run dev
```

Expected:

- dua skenario sesuai target UX

**Step 4: Commit final verification note**

Kalau ada code perubahan tambahan dari hasil smoke test:

```bash
git add <relevant-files>
git commit -m "test(chat): verify opt-in reference inventory behavior"
```

**Step 5: Prepare handoff**

Catat hasil verifikasi di summary implementasi:

- mode `synthesis` tidak lagi menampilkan inventori inline
- mode `reference_inventory` tetap menampilkan inventori inline
- panel `Rujukan` tetap tersedia sebagai akses sumber default
