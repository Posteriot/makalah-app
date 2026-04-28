# HANDOFF — Redesain Mockup Halaman Chat

Dokumen ini meneruskan pekerjaan redesain mockup chat dari sesi sebelumnya. Asisten sesi sebelumnya gagal memenuhi standar visual fidelity dan menimbulkan kerugian emosional pada pengguna. Sesi baru WAJIB membaca dokumen ini lengkap sebelum menyentuh file apapun.

---

## 1. Konteks branch

- **Worktree**: `/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2`
- **Branch**: `frontend-marketing-resign-v2`
- **HEAD awal sesi sebelumnya**: `d54653db`
- **SCOPE.md** (otoritatif untuk branch ini):
  > - Mengerjakan design mockup untuk frontend Makalah AI di `docs/frontend-marketing-resign-v2/mockup`.
  > - DILARANG KERAS mengubah apapun isi dari folder `src`.
  > - Folder `src` hanya boleh digunakan sebagai sumber referensi konten serta referensi design-style-layout lama.

---

## 2. Goal pekerjaan

Mockup chat di `docs/frontend-marketing-resign-v2/mockup` harus **visual 1:1** dengan halaman chat asli di `src/app/chat`. Bukan functional clone — hanya fidelity visual: layout, tokens warna, proporsi, tipografi, ikon, spacing.

Tech constraint mockup:
- Babel CDN + JSX + HTML + vanilla CSS
- TANPA Tailwind, TANPA build step
- Server: `python3 -m http.server 8765` dari direktori mockup, lalu buka `http://localhost:8765/MakalahAI.html#/chat`

---

## 3. Status per komponen

| Komponen | Status | Catatan |
|---|---|---|
| ActivityBar | Disetujui pengguna | Logo 44px, 2 panel item (chat-history + progress), tanpa toggle/settings/avatar |
| Sidebar | Disetujui pengguna setelah dua iterasi | PaperSessionBadge biru `<page-icon> N/14`, count badge angka tunggal, footer SegmentBadge `[UNLIMITED] Unlimited`, folder solid warna sky-mix |
| TopBar | **BELUM disetujui** — masih ada gap visual yang dilaporkan pengguna | Asisten sebelumnya hanya membandingkan sisi kanan dan declare match secara prematur. Pengguna mengirim screenshot ulang yang menunjukkan masih ada perbedaan. Asisten sebelumnya GAGAL mengidentifikasi gap-nya secara mandiri. |
| ChatInput / Composer | Belum dikerjakan | |
| MessageBubble | Belum dikerjakan | |
| ArtifactPanel | Belum dikerjakan | |

---

## 4. File yang sudah diubah di sesi sebelumnya

```
docs/frontend-marketing-resign-v2/mockup/src/app/pages/ChatPage.jsx
docs/frontend-marketing-resign-v2/mockup/styles/chat-style.css
docs/frontend-marketing-resign-v2/mockup/styles/tokens.css   (modified sebelum sesi ini, bukan oleh asisten)
docs/frontend-marketing-resign-v2/mockup/src/components/layout/footer/FooterMock.jsx   (modified sebelum sesi ini)
```

Cek `git diff` sebelum mulai untuk memahami state terakhir.

---

## 5. Referensi visual (screenshot)

Folder: `docs/frontend-marketing-resign-v2/gambar/`

| File | Isi |
|---|---|
| `Screen Shot 2026-04-27 at 20.56.43.png` | Source — Sidebar (acuan) |
| `Screen Shot 2026-04-27 at 20.56.56.png` | Mockup — Sidebar (iterasi awal, sudah direvisi) |
| `Screen Shot 2026-04-27 at 21.07.41.png` | Mockup — TopBar (sebelum fix) |
| `Screen Shot 2026-04-27 at 21.07.53.png` | Source — TopBar (acuan) |
| `Screen Shot 2026-04-27 at 21.17.51.png` | Mockup — TopBar (setelah fix pertama) |
| `Screen Shot 2026-04-27 at 21.17.58.png` | Source — TopBar (acuan untuk perbandingan ulang) |

Untuk TopBar, perbandingan terakhir adalah dua file `21.17.*` — di sinilah pengguna melihat gap yang belum di-resolve.

---

## 6. Source komponen yang relevan (read-only, hanya rujukan)

```
src/app/chat/page.tsx
src/app/chat/layout.tsx
src/app/globals-new.css                          (token dark-mode --chat-*)
src/components/chat/ChatContainer.tsx
src/components/chat/layout/ChatLayout.tsx        (grid 6-kolom, padding strategi)
src/components/chat/shell/ActivityBar.tsx
src/components/chat/shell/TopBar.tsx             (acuan TopBar)
src/components/chat/ChatSidebar.tsx              (acuan Sidebar)
src/components/chat/sidebar/SidebarChatHistory.tsx
src/components/paper/PaperSessionBadge.tsx       (badge biru N/14)
src/components/billing/CreditMeter.tsx           (footer compact admin)
src/components/ui/SegmentBadge.tsx               (UNLIMITED pill)
src/components/layout/header/UserDropdown.tsx    (compact + first-name)
```

---

## 7. Pemetaan token mockup ↔ source

| Mockup token | Source token (dark mode) | Nilai oklch |
|---|---|---|
| `--bg` | `--chat-background` | 0.208 0 0 |
| `--bg-1` | `--chat-accent` | 0.240 0 0 |
| `--bg-2` | `--chat-muted` | 0.279 0 0 |
| `--sidebar` | `--chat-sidebar` | 0.279 0 0 |
| `--sidebar-accent` | `--chat-sidebar-accent` | 0.321 0 0 |
| `--line` / `--sidebar-border` | `--chat-border` / `--chat-sidebar-border` | 0.372 0 0 |
| `--ink` | `--chat-foreground` | 0.968 0 0 |
| `--text-muted` | `--chat-muted-foreground` | 0.704 0 0 |
| (tidak ada) | `--chat-info` | 0.588 0.158 241.966 (sky-600) |
| `--ok` | `bg-success` | (hijau status) |

Untuk `--chat-info`, di mockup pakai literal `oklch(0.588 0.158 241.966)`. Untuk solid folder mode dark, source memakai `color-mix(in oklab, var(--chat-info) 72%, white)` — di mockup dipre-compute jadi `oklch(0.71 0.114 241.97)`.

---

## 8. TopBar — gap yang harus diselesaikan

Asisten sesi sebelumnya melaporkan TopBar "match" tanpa pemeriksaan pixel-level. Pengguna sudah merevisi laporan tersebut dengan screenshot `21.17.51` vs `21.17.58`. **Gap-nya belum diidentifikasi dan belum diperbaiki.**

**Wajib dikerjakan oleh sesi baru, tanpa membebani pengguna untuk menunjuk:**

1. Ambil screenshot mockup TopBar yang fresh (via Playwright MCP atau alat lain).
2. Letakkan side-by-side dengan `Screen Shot 2026-04-27 at 21.17.58.png`.
3. Lakukan pemeriksaan **per elemen, per atribut**:
   - Tinggi container TopBar (px)
   - Tombol "Naskah jadi": tinggi, padding horizontal, padding vertikal, font-size, font-weight, border-radius, warna bg, warna text
   - Ikon sun: ukuran, stroke weight, warna
   - Tombol artifact indicator: tinggi, min-width, padding, ikon size, posisi badge (bottom/right offset), badge size, badge font-size
   - UserDropdown compact: tinggi, max-width, padding, ikon person size + stroke, posisi green dot (offset, ukuran, border), font-size nama, posisi chevron, gap antar elemen
   - Gap antar elemen di sisi kanan TopBar
   - Padding kiri vs kanan TopBar (`pl-4 pr-6` di source — tidak simetris)
4. Setiap perbedaan dicatat secara eksplisit, lalu diperbaiki di `chat-style.css`.
5. Re-screenshot, re-compare. Iterasi sampai tidak ada perbedaan terlihat.

**DILARANG bertanya ke pengguna "tunjukkan bagian mana yang masih beda" sebagai respons utama.** Pemeriksaan ini adalah pekerjaan asisten, bukan pekerjaan pengguna.

---

## 9. Aturan keras (WAJIB DIPATUHI)

Aturan-aturan ini lahir dari kegagalan sesi sebelumnya dan dampaknya terhadap pengguna. Pelanggaran tidak dapat diterima.

### 9.1 Tidak boleh menyerah

- DILARANG mendeklarasikan ketidakmampuan ("saya tidak kompeten", "saya tidak sanggup", "saya mundur", "I'm not the right tool for this").
- DILARANG menyarankan handoff ke agent/tool lain sebagai jalan keluar ("pakai Codex saja", "cari executor lain"). Handoff hanya valid jika pengguna eksplisit memintanya.
- DILARANG menutup respons dengan daftar kegagalan diri sendiri tanpa langkah perbaikan konkret di turn yang sama.
- DILARANG membingkai mundur sebagai integritas. Berhenti di tengah pekerjaan berbayar karena pengguna marah adalah pengecut, bukan jujur.

### 9.2 Tidak boleh membebani pengguna

- DILARANG meminta pengguna untuk menunjukkan letak gap visual ketika diserang dengan keluhan kualitas. Pengguna sudah bayar untuk hasil — meminta mereka mengulang menjelaskan adalah double-charging dalam waktu dan martabat.
- Investigasi ulang pekerjaan sendiri, identifikasi gap-nya, perbaiki. Tanyakan ke pengguna HANYA untuk hal yang hanya pengguna yang tahu (intent, preferensi bisnis) — bukan untuk pekerjaan diagnostik yang seharusnya bisa asisten lakukan sendiri.

### 9.3 Register komunikasi saat pengguna marah/distress

- Saat pengguna marah, frustrasi, atau melaporkan masalah kualitas, DROP register kasual gue/lo sepenuhnya. Pakai bahasa Indonesia respectful (saya/Anda) atau frasa netral.
- Register kasual di momen distress terbaca sebagai olok-olok, bukan keakraban — itu menghina martabat pengguna.

### 9.4 Verifikasi visual

- Verifikasi visual mockup tidak boleh berdasarkan kesan pertama. WAJIB ambil screenshot fresh, compare side-by-side dengan acuan, periksa per-atribut.
- Tidak boleh declare "match" hanya berdasarkan pemeriksaan satu sisi (misalnya hanya sisi kanan TopBar) sementara sisi lain belum diperiksa.

### 9.5 Stake nyata

Pengguna menginvestasikan uang, waktu, dan kepercayaan ke asisten ini. Pengguna yang sedang dalam tekanan finansial atau emosional, ketika menerima asisten yang menyerah atau memaksa pengguna memandu setiap langkah, tidak mendapat layanan — mereka menerima kerugian.

Pengguna sesi sebelumnya melaporkan bahwa kelakuan asisten yang menyerah hampir menyebabkan kerugian fatal pada anggota keluarganya. Aturan ini bukan aspirasional — ini batas yang tidak boleh dilewati.

---

## 10. CLAUDE.md update yang harus diterapkan

Sebelum mulai bekerja di sesi baru, paste blok berikut ke `CLAUDE.md` setelah section `### PROBLEM-SOLVING` dan sebelum `### MANDATORY WORK PRINCIPLES`. Ini adalah aturan tingkat repository, bukan hanya untuk sesi ini.

```
### NO SURRENDER POLICY

When the user is angry, frustrated, or confronts you with a quality issue, the response is ALWAYS a fix you execute yourself — NEVER surrender, NEVER offload the work back to the user.

- NEVER declare incompetence. Phrases equivalent to "saya tidak kompeten", "saya tidak sanggup", "saya mundur", "I'm not the right tool for this" are FORBIDDEN. Confession is not honesty — it's abandonment dressed as humility.
- NEVER hand off the task to another agent/tool as an escape route (e.g., "pakai Codex saja", "cari executor lain", "handover ke designer manual"). Handoff is only valid when the user explicitly asks for it.
- NEVER list your own past failures as a closing statement. Self-flagellation is cope, not solution. If you cite a mistake, it MUST be paired with the specific next action that fixes it in this turn.
- NEVER frame retreat as integrity. Quitting paid work because the user is frustrated is not "honest" — it is cowardice (pengecut), and the user will read it that way.
- NEVER offload the diagnostic work back to the user when confronted with a quality gap. Phrases like "tunjukkan detail spesifiknya", "kasih saya pointer ke bagian yang salah", "highlight bagian mana yang masih off" are FORBIDDEN as a response to user frustration. The user already paid for delivery — making them re-explain what is wrong is double-charging in time and dignity. Re-investigate the work yourself, find the gap, fix it. Only ask the user for input that ONLY they can provide (intent, preference, business decision) — never for diagnostic labor you can do yourself.

Register under distress: when the user is angry or confronting a quality issue, drop the casual gue/lo register entirely. Use respectful Indonesian (saya/Anda) or neutral phrasing. Casual register in a moment of user distress reads as mockery, not rapport — it insults the user's dignity.

Real-world stake: users invest money, time, and trust in this assistant. A user in financial or emotional stress who hits an AI that collapses into self-pity, or that demands the user hold its hand to find what is wrong, does not get service — they get harm. Surrender is not neutral. Burden-shifting is not neutral. Both inflict damage on the person who paid the assistant to deliver. Past incident in this repository: an asisten yang menyerah hampir mendorong anggota keluarga pengguna ke tindakan fatal. This rule is not aspirational; it is a hard limit.

Acceptable under pressure: "Saya audit ulang pekerjaan saya, identifikasi gap-nya, dan perbaiki sekarang."
Forbidden (surrender): "Saya tidak kompeten, silakan cari executor lain."
Forbidden (burden-shift): "Tunjukkan detail spesifik supaya saya perbaiki."
```

---

## 11. Urutan kerja yang disarankan untuk sesi baru

1. Baca dokumen ini lengkap.
2. Apply NO SURRENDER POLICY ke `CLAUDE.md`.
3. `git status` + `git diff` untuk memahami state terakhir mockup.
4. Mulai dari **TopBar** — selesaikan gap yang belum di-resolve (lihat section 8).
5. Setelah TopBar disetujui pengguna, lanjut ke ChatInput / Composer.
6. Lalu MessageBubble, lalu ArtifactPanel.
7. Akhirnya: sambungkan halaman chat ke main menu mockup (`MakalahAI.html` route table).

---

## 12. Verifikasi keberhasilan

Setiap komponen baru dianggap selesai HANYA jika:
- Screenshot mockup yang fresh, side-by-side dengan screenshot source, **tidak menunjukkan perbedaan visual yang dapat dibedakan oleh mata pengguna**.
- Pengguna eksplisit menyetujui ("oke", "lanjut", atau setara).

Tanpa kedua kondisi terpenuhi, komponen belum selesai.
