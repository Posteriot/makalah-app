# Global Header Audit Findings

**Status:** Audit findings
**Branch:** `marketing-pages-ui-design`
**Date:** 2026-03-09

## Scope

Audit ini mencakup:

- [`GlobalHeader.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx)
- [`UserDropdown.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx)
- [`useCurrentUser.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/lib/hooks/useCurrentUser.ts)

Dokumen ini hanya mencatat findings audit. Dokumen ini belum berisi rencana implementasi.

## Findings

### 1. Authenticated UI bisa tertahan lebih lama dari auth state asli

**Severity:** High

`GlobalHeader` melatch status authenticated ke `hasBeenAuthenticated`, lalu memakai:

- `showAuthSkeleton = isAuthLoading && !hasBeenAuthenticated`
- `showAsAuthenticated = isAuthenticated || hasBeenAuthenticated`

Karena `hasBeenAuthenticated` hanya pernah diset ke `true` dan tidak pernah di-reset ke `false`, header bisa tetap menampilkan UI authenticated walaupun auth state dasarnya sudah berubah ke logged-out pada window transisi tertentu.

Referensi kode:

- [`GlobalHeader.tsx`#L125C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L125C1)
- [`GlobalHeader.tsx`#L130C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L130C1)
- [`GlobalHeader.tsx`#L359C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L359C1)
- [`GlobalHeader.tsx`#L405C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L405C1)

Dampak perilaku yang mungkin muncul:

- CTA auth desktop tidak langsung kembali ke state signed-out
- mobile auth section masih dianggap signed-in sesaat
- link `Chat` masih di-resolve memakai jalur signed-in walaupun session sedang hilang

### 2. UserDropdown menyimpan session lama tanpa clear path saat logout

**Severity:** High

`UserDropdown` menyimpan `lastSession`, lalu memakai `stableSession = session ?? lastSession`.
Saat `session` berubah menjadi `null`, komponen masih boleh memakai session lama selama render berikutnya.

Referensi kode:

- [`UserDropdown.tsx`#L61C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx#L61C1)
- [`UserDropdown.tsx`#L68C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx#L68C1)
- [`UserDropdown.tsx`#L94C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx#L94C1)
- [`UserDropdown.tsx`#L120C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx#L120C1)

Temuan ini memperkuat risiko stale authenticated UI di dropdown user, terutama pada:

- refocus tab
- revalidation auth
- sign-out flow

### 3. Redirect login dari header membuang query string dan hash

**Severity:** Medium

Link login hanya menyimpan `pathname` ke `redirect_url`.
Ini berarti query string dan hash aktif tidak ikut dipertahankan.

Referensi kode:

- [`GlobalHeader.tsx`#L367C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L367C1)
- [`GlobalHeader.tsx`#L406C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L406C1)

Contoh dampak:

- halaman dokumentasi bisa kehilangan `?section=...`
- halaman blog bisa kehilangan parameter filter atau posisi hash

### 4. State stabilization dilakukan di beberapa layer sekaligus

**Severity:** Medium

Saat ini ada tiga lapisan penahan state:

- `hasBeenAuthenticated` di `GlobalHeader`
- `lastSession` di `UserDropdown`
- `lastKnownUser` di [`useCurrentUser.ts`#L24C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/lib/hooks/useCurrentUser.ts#L24C1)

Referensi kode:

- [`GlobalHeader.tsx`#L125C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L125C1)
- [`UserDropdown.tsx`#L64C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx#L64C1)
- [`useCurrentUser.ts`#L27C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/lib/hooks/useCurrentUser.ts#L27C1)

Belum tentu semuanya salah, tetapi kombinasi ini membuat perilaku auth header lebih sulit diprediksi dan lebih sulit diuji karena setiap layer bisa menahan state berbeda untuk durasi berbeda.

### 5. Sign-out flow memakai cookie clear manual + async signOut + hard redirect

**Severity:** Medium

Baik `GlobalHeader` maupun `UserDropdown` menjalankan pola:

1. set `isSigningOut`
2. hapus cookie `ba_session`
3. `await signOut()`
4. `window.location.href = "/"`

Referensi kode:

- [`GlobalHeader.tsx`#L197C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L197C1)
- [`UserDropdown.tsx`#L120C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx#L120C1)

Flow ini terlihat sengaja mengantisipasi unmount dan abort request. Namun karena ada kombinasi perubahan state sinkron dan asinkron, area ini tetap pantas dianggap hotspot audit untuk:

- stale menu state
- flicker auth UI
- menu action yang masih sempat aktif di frame transisi

### 6. Event close behavior bertumpu pada document listener

**Severity:** Low

`GlobalHeader` menutup mobile menu lewat listener document `click`.
`UserDropdown` menutup dropdown lewat listener document `mousedown` dan `keydown`.

Referensi kode:

- [`GlobalHeader.tsx`#L170C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx#L170C1)
- [`UserDropdown.tsx`#L70C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx#L70C1)
- [`UserDropdown.tsx`#L82C1](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx#L82C1)

Belum ada bukti bug final dari sini, tetapi ini tetap area rawan untuk interaksi cepat seperti:

- klik trigger lalu klik luar cepat
- mobile menu dan dropdown compact dalam context lain
- route change saat listener masih aktif

## Testing Gaps

Pada pencarian test file saat audit ini dilakukan, tidak ditemukan coverage test spesifik untuk:

- `GlobalHeader`
- `UserDropdown`

Implikasi langsung:

- belum ada safety net otomatis untuk transisi auth header
- belum ada pembuktian terotomasi untuk click-outside behavior
- belum ada pembuktian terotomasi untuk sign-out race window

## Summary

Temuan paling penting untuk saat ini:

1. Header dan dropdown sama-sama menyimpan auth state lama untuk menahan flicker.
2. Mekanisme penahan state itu saat ini berisiko membuat UI authenticated bertahan lebih lama dari auth state asli.
3. Redirect login dari header belum mempertahankan query string dan hash.
4. Area header belum terlihat punya test khusus untuk memverifikasi transisi auth dan menu behavior.
