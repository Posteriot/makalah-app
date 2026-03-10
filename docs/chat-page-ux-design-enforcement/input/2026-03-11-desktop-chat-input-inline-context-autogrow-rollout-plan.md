# Desktop Chat Input Inline Context Autogrow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mengubah composer desktop chat agar mengikuti pola mobile yang ringkas, dengan strip konteks inline, textarea satu baris saat kosong, auto-grow hingga lima baris, dan batas input `8000` karakter.

**Architecture:** Refactor dilakukan langsung di `ChatInput.tsx` tanpa membuat composer desktop baru dari nol. Desktop mengadopsi mental model mobile, sementara mobile dibiarkan tetap stabil; logika shared dipertahankan untuk upload konteks, remove item, clear all, submit, dan stop generating.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library

---

### Task 1: Audit struktur desktop dan mobile composer yang ada

**Files:**
- Read: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatInput.tsx`
- Search tests: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__`

**Step 1: Catat bagian desktop yang harus dibongkar**

- grid desktop lama
- tray konteks besar
- min-height desktop tiga baris

**Step 2: Catat bagian yang harus dipertahankan**

- upload file konteks
- remove item konteks
- clear all konteks
- submit behavior
- stop generating
- mobile behavior

**Step 3: Commit**

```bash
git status --short
```

Expected: belum ada perubahan file implementasi untuk task ini.

### Task 2: Tulis test gagal untuk perilaku desktop satu baris dan auto-grow

**Files:**
- Create/Modify Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/chat-input-desktop-layout.test.tsx`

**Step 1: Tulis test empty state desktop**

Cases:

- composer desktop tampil satu baris saat input kosong
- tidak lagi memakai min-height tiga baris lama

**Step 2: Tulis test auto-grow desktop**

Cases:

- textarea tumbuh saat user mengetik
- tinggi berhenti bertambah setelah batas lima baris

**Step 3: Run test untuk memastikan gagal**

```bash
npx vitest run __tests__/chat/chat-input-desktop-layout.test.tsx
```

Expected: FAIL karena composer desktop lama belum sesuai kontrak baru.

**Step 4: Commit**

```bash
git add __tests__/chat/chat-input-desktop-layout.test.tsx
git commit -m "test: define desktop chat input autogrow behavior"
```

### Task 3: Tulis test gagal untuk strip konteks inline desktop

**Files:**
- Modify/Create Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/chat-input-desktop-layout.test.tsx`

**Step 1: Tulis test struktur strip konteks**

Cases:

- tombol `+ Konteks` tampil di baris atas
- strip konteks tetap hadir saat belum ada konteks aktif
- separator tampil di bawah strip konteks
- daftar konteks tidak dirender sebagai tray blok besar

**Step 2: Tulis test overflow konteks**

Cases:

- area item konteks berada dalam strip horizontal scroll
- strip konteks tidak wrap ke banyak baris

**Step 3: Run test untuk memastikan gagal**

```bash
npx vitest run __tests__/chat/chat-input-desktop-layout.test.tsx
```

Expected: FAIL karena layout konteks desktop lama belum inline.

**Step 4: Commit**

```bash
git add __tests__/chat/chat-input-desktop-layout.test.tsx
git commit -m "test: define inline desktop context strip"
```

### Task 4: Tulis test gagal untuk batas input `8000` karakter

**Files:**
- Modify/Create Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/chat-input-desktop-limit.test.tsx`

**Step 1: Tulis test max length**

Cases:

- input tidak menerima lebih dari `8000` karakter
- submit button state tetap konsisten setelah teks mencapai limit

**Step 2: Tulis test no permanent counter**

Case:

- composer desktop tidak memunculkan counter permanen pada fase ini

**Step 3: Run test untuk memastikan gagal**

```bash
npx vitest run __tests__/chat/chat-input-desktop-limit.test.tsx
```

Expected: FAIL karena kontrak limit belum ditegakkan eksplisit.

**Step 4: Commit**

```bash
git add __tests__/chat/chat-input-desktop-limit.test.tsx
git commit -m "test: define chat input character limit"
```

### Task 5: Refactor struktur desktop di ChatInput

**Files:**
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatInput.tsx`

**Step 1: Ganti composer desktop ke struktur dua baris**

Desktop baru harus berisi:

- baris konteks inline
- separator tipis
- baris input dan aksi utama
- tombol kirim/stop tetap inline di baris input, bukan membuat row tambahan

**Step 2: Buang tray konteks besar desktop**

Pastikan desktop tidak lagi memakai blok konteks besar yang sama seperti layout lama.

**Step 3: Pertahankan mobile apa adanya**

Jangan ubah flow collapsed/expanded/fullscreen mobile kecuali ada kebutuhan teknis kecil yang tidak mengubah UX.

**Step 4: Run targeted test**

```bash
npx vitest run __tests__/chat/chat-input-desktop-layout.test.tsx
```

Expected: sebagian test mulai PASS, sisanya mungkin masih FAIL sampai resize dan scrollbar dirapikan.

**Step 5: Commit**

```bash
git add src/components/chat/ChatInput.tsx __tests__/chat/chat-input-desktop-layout.test.tsx
git commit -m "refactor: align desktop chat input with mobile structure"
```

### Task 6: Implement auto-grow desktop 1 line → 5 lines

**Files:**
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatInput.tsx`
- Modify tests: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/chat-input-desktop-layout.test.tsx`

**Step 1: Ubah aturan min/max height desktop**

Kontrak:

- kosong: satu baris
- saat mengetik: auto-grow
- maksimum: lima baris
- setelah itu: scroll vertical internal

**Step 2: Pastikan desktop dan mobile punya kalkulasi terpisah**

Jangan memaksa angka mobile ke desktop tanpa alasan.

**Step 3: Run test**

```bash
npx vitest run __tests__/chat/chat-input-desktop-layout.test.tsx
```

Expected: PASS untuk kasus empty state dan auto-grow.

**Step 4: Commit**

```bash
git add src/components/chat/ChatInput.tsx __tests__/chat/chat-input-desktop-layout.test.tsx
git commit -m "feat: add desktop chat input autogrow limits"
```

### Task 7: Terapkan strip konteks horizontal scroll tipis

**Files:**
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatInput.tsx`
- Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/chat-input-desktop-layout.test.tsx`

**Step 1: Ubah daftar konteks desktop jadi strip horizontal**

Aturan:

- item inline
- no wrap
- overflow-x auto
- scrollbar tipis

**Step 2: Pastikan separator tetap statis**

Separator tidak boleh dipakai sebagai track scrollbar.

**Step 3: Run test**

```bash
npx vitest run __tests__/chat/chat-input-desktop-layout.test.tsx
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/components/chat/ChatInput.tsx __tests__/chat/chat-input-desktop-layout.test.tsx
git commit -m "feat: add inline desktop context strip"
```

### Task 8: Tegakkan batas input `8000` karakter

**Files:**
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatInput.tsx`
- Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/chat-input-desktop-limit.test.tsx`

**Step 1: Enforce limit pada perubahan input**

Perilaku:

- input baru di atas `8000` tidak diterima
- tidak hanya warning pasif

**Step 2: Pastikan kontrak ini tidak mematahkan mobile**

Limit berlaku pada chat input secara umum, tapi task ini harus diverifikasi terutama pada layout desktop baru.

**Step 3: Run test**

```bash
npx vitest run __tests__/chat/chat-input-desktop-limit.test.tsx
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/components/chat/ChatInput.tsx __tests__/chat/chat-input-desktop-limit.test.tsx
git commit -m "feat: enforce chat input character limit"
```

### Task 9: Kunci kontrak visual scrollbar tipis dan no-regression mobile

**Files:**
- Create/Modify Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/chat-input-style-contract.test.ts`
- Modify if needed: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatInput.tsx`

**Step 1: Tulis test kontrak style**

Cases:

- desktop memakai token chat
- tidak ada amber
- scrollbar strip konteks tipis
- scrollbar textarea tipis
- tidak ada tombol fullscreen desktop

**Step 2: Tulis test no-regression mobile**

Cases:

- layout mobile tetap punya affordance expand/fullscreen yang lama
- state mobile collapsed tetap ada

**Step 3: Run test**

```bash
npx vitest run __tests__/chat/chat-input-style-contract.test.ts __tests__/chat/chat-input-desktop-layout.test.tsx __tests__/chat/chat-input-desktop-limit.test.tsx
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/components/chat/ChatInput.tsx __tests__/chat/chat-input-style-contract.test.ts __tests__/chat/chat-input-desktop-layout.test.tsx __tests__/chat/chat-input-desktop-limit.test.tsx
git commit -m "test: lock desktop chat input style contract"
```

### Task 10: Verifikasi akhir

**Files:**
- Verify all touched files from tasks di atas

**Step 1: Run targeted tests**

```bash
npx vitest run __tests__/chat/chat-input-desktop-layout.test.tsx __tests__/chat/chat-input-desktop-limit.test.tsx __tests__/chat/chat-input-style-contract.test.ts
```

Expected: PASS

**Step 2: Run lint untuk area input**

```bash
npx eslint src/components/chat/ChatInput.tsx __tests__/chat/chat-input-desktop-layout.test.tsx __tests__/chat/chat-input-desktop-limit.test.tsx __tests__/chat/chat-input-style-contract.test.ts
```

Expected: PASS

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 4: Manual runtime verification**

Checklist:

- desktop kosong terlihat satu baris
- desktop mulai mengetik lalu tumbuh
- berhenti di lima baris
- tombol kirim/stop tetap inline di baris input
- strip konteks tetap terlihat walau belum ada konteks aktif
- strip konteks tetap satu baris dan bisa scroll horizontal
- scrollbar konteks tipis
- scrollbar textarea tipis
- upload konteks masih berfungsi
- remove item konteks masih berfungsi
- clear all konteks masih berfungsi
- mobile tetap sama

**Step 5: Commit**

```bash
git add .
git commit -m "feat: streamline desktop chat input composer"
```
