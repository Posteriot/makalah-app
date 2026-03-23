# Exact Source Deterministic Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memaksa follow-up exact-source memakai jalur exact inspection secara deterministik, sehingga title/author/date/paragraf/verbatim dari sumber lama tidak lagi dijawab dari konteks semantik atau tebakan model.

**Architecture:** Tambahkan katalog exact source dari `sourceDocuments`, resolver intent+target source yang deterministik di route layer, lalu pakai `prepareStep` untuk memaksa `inspectSourceDocument` hanya saat source target berhasil diidentifikasi secara unik. Jika exact intent ada tapi source belum unik, model dipaksa klarifikasi secara naratif tanpa bocor jeroan internal.

**Tech Stack:** Next.js 16 App Router, Vercel AI SDK v5 `streamText` + `prepareStep`, Convex query/mutation, TypeScript, Vitest.

---

### Task 1: Tambah katalog exact source untuk route

**Files:**
- Modify: `convex/sourceDocuments.ts`
- Test: `convex/sourceDocuments.test.ts`

**Step 1: Write the failing test**

Tambahkan test untuk query baru yang mengembalikan daftar source exact per conversation, minimal berisi:
- `sourceId`
- `originalUrl`
- `resolvedUrl`
- `title`
- `siteName`
- `author`
- `publishedAt`

Tambahkan satu test bahwa daftar diurutkan deterministik dan tidak bocor ke conversation lain.

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/sourceDocuments.test.ts`
Expected: FAIL karena query katalog exact source belum ada.

**Step 3: Write minimal implementation**

Tambahkan query baru di `convex/sourceDocuments.ts`, misalnya `listSourceSummariesByConversation`, yang:
- memverifikasi ownership conversation
- query dengan index `by_conversation`
- return ringkasan source exact yang dibutuhkan route
- urut deterministik berdasarkan `createdAt` lalu `_creationTime`

**Step 4: Run test to verify it passes**

Run: `npx vitest run convex/sourceDocuments.test.ts`
Expected: PASS untuk test katalog exact source baru tanpa merusak test lama.

**Step 5: Commit**

```bash
git add convex/sourceDocuments.ts convex/sourceDocuments.test.ts
git commit -m "feat(convex): add exact source summaries for deterministic routing"
```

### Task 2: Tambah resolver exact-source follow-up

**Files:**
- Create: `src/lib/ai/exact-source-followup.ts`
- Test: `src/lib/ai/exact-source-followup.test.ts`

**Step 1: Write the failing test**

Tambahkan test untuk resolver dengan kasus:
- exact intent + satu source title cocok unik -> mode `force-inspect`
- exact intent + domain/site name cocok unik -> mode `force-inspect`
- exact intent + follow-up pendek seperti `lengkapnya?` setelah pertanyaan exact sebelumnya -> mode `force-inspect`
- exact intent + lebih dari satu source cocok -> mode `clarify`
- non exact intent -> mode `none`

Resolver output minimal:
- `mode: "force-inspect" | "clarify" | "none"`
- `matchedSource?`
- `reason`

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/exact-source-followup.test.ts`
Expected: FAIL karena resolver belum ada.

**Step 3: Write minimal implementation**

Implement resolver di `src/lib/ai/exact-source-followup.ts` dengan input:
- `lastUserMessage`
- `recentMessages`
- `availableExactSources`

Deteksi exact intent dari:
- judul
- penulis/author
- tanggal/published date
- paragraf ke-N
- verbatim/kutipan exact

Tambahkan continuation handling untuk follow-up pendek:
- `lengkapnya`
- `yang itu`
- `siapa penulisnya`
- `judul lengkapnya`

Matching source harus:
- cek title exact/partial yang kuat
- cek original/resolved URL mention
- cek site/domain label bila unik
- tidak memaksa kalau ambigu

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/exact-source-followup.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/ai/exact-source-followup.ts src/lib/ai/exact-source-followup.test.ts
git commit -m "feat(route): add exact source follow-up resolver"
```

### Task 3: Tambah builder prompt exact-source terstruktur

**Files:**
- Modify: `src/lib/ai/exact-source-guardrails.ts`
- Test: `src/lib/ai/chat-exact-source-guardrails.test.ts`

**Step 1: Write the failing test**

Tambahkan test untuk helper baru yang menghasilkan:
- system note untuk mode `force-inspect`
- system note untuk mode `clarify`
- blacklist frasa semi-internal yang tidak boleh muncul, misalnya:
  - `metadata sumber`
  - `data yang tersimpan`
  - `hasil pencarian sebelumnya`
  - `aku akan cek metadata`

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/chat-exact-source-guardrails.test.ts`
Expected: FAIL karena helper exact-source deterministic belum ada.

**Step 3: Write minimal implementation**

Di `src/lib/ai/exact-source-guardrails.ts`, tambahkan helper:
- builder note untuk `force-inspect`
- builder note untuk `clarify`
- guardrail naratif anti semi-internal phrasing

Note `force-inspect` harus memuat:
- source yang sudah dipilih
- `sourceId` exact yang harus dipakai
- instruksi bahwa model tidak boleh jawab dari memory/context sebelum tool result

Note `clarify` harus memuat:
- instruksi minta klarifikasi sumber
- larangan menjawab dengan tebakan

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/chat-exact-source-guardrails.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/ai/exact-source-guardrails.ts src/lib/ai/chat-exact-source-guardrails.test.ts
git commit -m "feat(route): add deterministic exact-source guardrail notes"
```

### Task 4: Paksa `inspectSourceDocument` via `prepareStep` saat target unik

**Files:**
- Modify: `src/app/api/chat/route.ts`
- Test: `src/lib/ai/chat-exact-source-guardrails.test.ts`

**Step 1: Write the failing test**

Tambahkan test route helper/wiring untuk:
- exact follow-up + source unik -> `prepareStep` step 0 memaksa `inspectSourceDocument`
- exact follow-up + source ambigu -> tidak force tool, tapi injeksi note klarifikasi
- non exact follow-up -> flow lama tetap

Kalau route terlalu susah dites langsung, ekstrak helper kecil dari route, misalnya:
- `buildDeterministicExactSourcePrepareStep(...)`

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ai/chat-exact-source-guardrails.test.ts`
Expected: FAIL karena route wiring deterministik exact-source belum ada.

**Step 3: Write minimal implementation**

Di `src/app/api/chat/route.ts`:
- ambil exact source catalog dari query baru `sourceDocuments`
- jalankan resolver exact-source follow-up sebelum `streamText`
- kalau mode `force-inspect`:
  - set `prepareStep` baru atau extend existing prepareStep
  - step 0: `toolChoice = { type: "tool", toolName: "inspectSourceDocument" }`
  - step 0: `activeTools = ["inspectSourceDocument"]`
  - step 0: override `messages` dengan note exact-source force-inspect
  - step 1: `toolChoice = "none"`
- kalau mode `clarify`:
  - jangan paksa tool
  - inject note klarifikasi ke system messages

Gabungkan dengan flow sync existing tanpa merusak `getCurrentPaperState` special case.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ai/chat-exact-source-guardrails.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/ai/chat-exact-source-guardrails.test.ts
git commit -m "fix(route): force exact source inspection for deterministic follow-ups"
```

### Task 5: Verifikasi anti-regression exact-source end-to-end

**Files:**
- Modify if needed: `src/lib/ai/paper-tools.inspect-source.test.ts`
- Modify if needed: `__tests__/skills/web-search-quality-index.test.ts`

**Step 1: Add targeted regression tests**

Tambahkan test untuk memastikan:
- skill/runtime instructions tetap menyebut `inspectSourceDocument` untuk exact-source
- route deterministic helper tidak menurunkan `quoteFromSource` jadi exact tool

**Step 2: Run the focused tests**

Run: `npx vitest run src/lib/ai/paper-tools.inspect-source.test.ts src/lib/ai/chat-exact-source-guardrails.test.ts __tests__/skills/web-search-quality-index.test.ts`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/lib/ai/paper-tools.inspect-source.test.ts __tests__/skills/web-search-quality-index.test.ts src/lib/ai/chat-exact-source-guardrails.test.ts
git commit -m "test: lock deterministic exact source follow-up behavior"
```

### Task 6: Final verification

**Files:**
- No code changes unless verification fails

**Step 1: Run lint**

```bash
npx eslint convex/sourceDocuments.ts convex/sourceDocuments.test.ts src/lib/ai/exact-source-followup.ts src/lib/ai/exact-source-followup.test.ts src/lib/ai/exact-source-guardrails.ts src/lib/ai/chat-exact-source-guardrails.test.ts src/app/api/chat/route.ts
```

Expected: no errors

**Step 2: Run targeted tests**

```bash
npx vitest run convex/sourceDocuments.test.ts src/lib/ai/exact-source-followup.test.ts src/lib/ai/chat-exact-source-guardrails.test.ts src/lib/ai/paper-tools.inspect-source.test.ts __tests__/skills/web-search-quality-index.test.ts
```

Expected: PASS

**Step 3: Manual UI checklist**

Verifikasi:
- exact title follow-up dari source lama langsung benar pada jawaban pertama
- exact author follow-up dari source lama langsung benar pada jawaban pertama
- follow-up pendek `lengkapnya?` setelah pertanyaan exact tidak jatuh ke tebakan semantik
- jika source ambigu, model minta klarifikasi
- jawaban tidak memakai frasa semi-internal seperti `metadata sumber` atau `data yang tersimpan`

**Step 4: Commit if needed**

```bash
git add -A
git commit -m "chore: finalize deterministic exact source routing"
```
