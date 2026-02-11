# Auth Page - Styling Extraction

Tanggal: 11 Februari 2026  
Scope: Seluruh CSS/Tailwind class, utility custom, inline style, dan token yang aktif pada halaman Auth (customizations from Clerk), termasuk shared component/dependency styling yang dipakai langsung.

Source files utama:
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/waiting-list/page.tsx`
- `src/app/(auth)/waiting-list/actions.ts`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/components/auth/AuthWideCard.tsx`
- `src/components/auth/WaitlistForm.tsx`

Source files shared/dependensi styling:
- `src/components/ui/input.tsx`
- `src/components/ui/button.tsx`
- `src/app/globals.css`

---

## 1. Metode Ekstraksi (Best Practice)

Metode yang dipakai untuk memastikan tidak ada styling yang tertinggal:

1. Tentukan boundary render auth page (layout + sign-in + sign-up + waiting-list + auth components).
2. Petakan dependency styling langsung (`Input`, `Button`, utility global di `globals.css`).
3. Inventaris styling dari dua sumber sekaligus:
   - className langsung di JSX,
   - string styling pada `appearance.elements` Clerk.
4. Trace utility custom (`rounded-action`, `hover-slash`, `btn-stripes-clerk`) ke definisi global CSS.
5. Trace semantic token (`success`, `destructive`, `border-hairline`, dsb) ke variabel `:root` dan `.dark`.
6. Catat semua inline style (`backgroundImage`, `backgroundSize`) karena ini styling aktif non-Tailwind.
7. Tutup dengan lampiran raw inventory lintas file untuk re-check coverage.

Metode ini efektif untuk halaman auth karena sebagian styling tidak muncul di `className` biasa, tetapi dikirim ke Clerk lewat object `appearance`.

---

## 2. Checklist Tracking

### Task 1
- [x] T1.1 Eksplorasi, analisis, audit semua file auth scope
- [x] T1.2 Rancang dokumentasi per directory target
- [x] T1.3 Tulis `src/app/(auth)/README.md`
- [x] T1.4 Tulis `src/components/auth/README.md`
- [x] T1.5 Review hasil Task 1 dan siap ke Task 2

### Task 2
- [x] T2.1 Kuasai metode ekstraksi styling lengkap
- [x] T2.2 Rancang rencana ekstraksi + dependency source
- [x] T2.3 Tulis `docs/tailwind-styling-consistency/auth-page/auth-page-style.md`
- [x] T2.4 Laporan hasil kerja

---

## 3. Dependency Styling Map

| Layer | File | Peran Styling |
|------|------|------|
| Route shell | `src/app/(auth)/layout.tsx` | Centered auth canvas + industrial grid background |
| Route page | `src/app/(auth)/waiting-list/page.tsx` | Komposisi `AuthWideCard` + `WaitlistForm` |
| Route page | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Skeleton + Clerk SignIn appearance customization |
| Route page | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Skeleton + invite state UI + Clerk SignUp appearance customization |
| Auth shell | `src/components/auth/AuthWideCard.tsx` | Card 2 kolom, stripe texture, heading/subtitle split |
| Auth form | `src/components/auth/WaitlistForm.tsx` | Input/button/error/success state |
| Primitive | `src/components/ui/input.tsx` | Base input style + focus/invalid state |
| Primitive | `src/components/ui/button.tsx` | Base button style + variants |
| Token/utilities | `src/app/globals.css` | token warna, `rounded-action`, `hover-slash`, `btn-stripes-clerk`, Clerk overrides |

---

## 4. Styling Surface per File

## 4.1 `src/app/(auth)/layout.tsx`

Class aktif:
- `min-h-dvh relative bg-background text-foreground flex items-center justify-center p-4 md:p-6`
- `absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-[1]`
- `relative z-10 w-full max-w-5xl flex justify-center`

Inline style aktif:
- `backgroundImage`:
  - `linear-gradient(var(--border-hairline) 1px, transparent 1px)`
  - `linear-gradient(90deg, var(--border-hairline) 1px, transparent 1px)`
- `backgroundSize: 48px 48px`

Referensi:
- `src/app/(auth)/layout.tsx:9`
- `src/app/(auth)/layout.tsx:12`
- `src/app/(auth)/layout.tsx:15`
- `src/app/(auth)/layout.tsx:24`

## 4.2 `src/app/(auth)/waiting-list/page.tsx`

Tidak memiliki class sendiri; styling sepenuhnya didelegasikan ke:
- `AuthWideCard`
- `WaitlistForm`

Referensi:
- `src/app/(auth)/waiting-list/page.tsx:8`
- `src/app/(auth)/waiting-list/page.tsx:12`

## 4.3 `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

### Skeleton fallback (JSX)

- `w-full space-y-5 animate-pulse`
- `h-10 bg-foreground/10 rounded-action`
- `flex items-center gap-4`
- `h-[0.5px] bg-foreground/10 flex-1`
- `h-2 w-10 bg-foreground/10 rounded`
- `h-10 bg-foreground/[0.07] rounded-action`
- `h-3 w-36 bg-foreground/[0.05] rounded mx-auto mt-4`

### Clerk appearance classes (via `elements`)

Kelas utama yang diinject ke UI Clerk:
- root/card/form transparency:
  - `w-full border-none !shadow-none`
  - `!shadow-none border-none bg-transparent p-0 w-full`
- action buttons:
  - `!relative !overflow-hidden inline-flex ... btn-stripes-clerk ...`
  - `!rounded-[var(--radius-sm)]` + `uppercase tracking-widest`
  - mode-specific:
    - dark: `!bg-slate-100 !text-slate-800 hover:!text-slate-100`
    - light: `!bg-slate-800 !text-slate-100 hover:!text-slate-800`
- input/otp:
  - `!rounded-md border-border h-10 !font-mono ...`
  - otp container dan otp input custom dengan amber focus state.
- footer/link/divider:
  - `dividerText`, `dividerRow`, `dividerLine`
  - `footer*` dipaksa transparan.

Referensi:
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:17`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:52`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:62`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:67`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:72`

## 4.4 `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

### Skeleton fallback (JSX)

- `space-y-4 animate-pulse`
- `space-y-3`
- `h-10 bg-muted rounded-md`
- `flex items-center gap-3`
- `h-px bg-muted flex-1`
- `h-2 w-14 bg-muted rounded`
- `h-3 w-40 bg-muted rounded mx-auto`

### Invite panel custom (JSX)

- `flex flex-col justify-between h-full`
- `inline-flex items-center gap-2 group w-fit`
- `transition-transform group-hover:scale-105`
- `hidden dark:block` / `block dark:hidden`
- `text-success`, `bg-muted/50`, `rounded-action`, `border-hairline`
- error variant: `bg-destructive/10`, `text-destructive`
- CTA invalid token: `bg-primary text-primary-foreground ... rounded-action`

### Clerk appearance classes

Hampir paralel dengan sign-in, plus:
- `formFieldRow: !flex !flex-col !gap-4`
- beberapa key berbeda di visibility helper field.

Referensi:
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:24`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:53`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:84`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:94`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:150`

## 4.5 `src/components/auth/AuthWideCard.tsx`

Class aktif:
- wrapper:
  - `w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-lg border border-border bg-card shadow-none relative`
- left panel:
  - `md:w-5/12 bg-slate-950 p-6 md:p-12 relative flex flex-col`
  - stripe overlay: `absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]`
- content alignment:
  - `relative z-10 w-full h-full flex flex-col`
  - `relative z-10 w-full flex flex-col justify-between flex-grow`
- typography:
  - `font-sans text-2xl md:text-3xl font-medium text-foreground dark:text-slate-200`
  - subtitle emphasis split via `text-muted-foreground` dan `text-slate-50`.
- right panel:
  - `md:w-7/12 p-8 md:p-12 flex flex-col items-center bg-slate-100 dark:bg-slate-800 relative`
  - `w-full max-w-sm relative z-10 flex flex-col items-center`

Inline style aktif:
- left panel stripe:
  - `repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 1px, transparent 8px)`

Referensi:
- `src/components/auth/AuthWideCard.tsx:33`
- `src/components/auth/AuthWideCard.tsx:35`
- `src/components/auth/AuthWideCard.tsx:38`
- `src/components/auth/AuthWideCard.tsx:68`
- `src/components/auth/AuthWideCard.tsx:87`

## 4.6 `src/components/auth/WaitlistForm.tsx`

### Success state
- `w-full flex flex-col items-center justify-center py-8 text-center`
- `w-16 h-16 rounded-full bg-success/10`
- `w-8 h-8 text-success`
- `text-lg font-mono font-bold text-foreground`
- `text-sm text-muted-foreground`

### Form state
- `w-full space-y-4`
- input wrapper: `relative`
- icon prefix: `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground`
- custom input class:
  - `pl-10 h-10 rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary`
- error text:
  - `text-sm text-destructive`
- submit button class:
  - `w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold text-xs uppercase tracking-widest rounded-action hover-slash`
- loading spinner:
  - `h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin`

Referensi:
- `src/components/auth/WaitlistForm.tsx:68`
- `src/components/auth/WaitlistForm.tsx:69`
- `src/components/auth/WaitlistForm.tsx:83`
- `src/components/auth/WaitlistForm.tsx:96`
- `src/components/auth/WaitlistForm.tsx:109`
- `src/components/auth/WaitlistForm.tsx:113`

## 4.7 `src/components/ui/input.tsx` (dipakai WaitlistForm)

Base utility utama:
- `border-input h-9 w-full rounded-md border bg-transparent ...`
- `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]`
- invalid state:
  - `aria-invalid:ring-destructive/20`
  - `dark:aria-invalid:ring-destructive/40`
  - `aria-invalid:border-destructive`

Referensi:
- `src/components/ui/input.tsx:10`

## 4.8 `src/components/ui/button.tsx` (dipakai WaitlistForm)

Base + variants:
- base:
  - `inline-flex items-center justify-center ... rounded-md ... focus-visible:*`
- default variant:
  - `bg-primary text-primary-foreground hover:bg-primary/90`
- destructive variant:
  - `bg-destructive text-white hover:bg-destructive/90`
- size default:
  - `h-9 px-4 py-2`

Referensi:
- `src/components/ui/button.tsx:8`
- `src/components/ui/button.tsx:12`
- `src/components/ui/button.tsx:13`

---

## 5. Token dan Utility Mapping (`globals.css`)

### 5.1 Token semantic yang dipakai Auth

- `--success`, `--success-foreground` untuk success state.
- `--destructive`, `--destructive-foreground` untuk error state.
- `--border-hairline` untuk grid/texture line.

Referensi:
- `src/app/globals.css:511`
- `src/app/globals.css:498`
- `src/app/globals.css:548`
- `src/app/globals.css:631`

### 5.2 Utility custom yang dipakai langsung

- `.rounded-action`
- `.hover-slash` (+ `::before` hover pattern)
- `.btn-stripes-clerk::before` (+ dark variant)

Referensi:
- `src/app/globals.css:1535`
- `src/app/globals.css:1635`
- `src/app/globals.css:1696`
- `src/app/globals.css:1708`

### 5.3 Clerk global overrides

Clerk footer/root dipaksa transparan untuk menyatu dengan shell custom:
- `.cl-footer`, `.cl-footerAction`, `.cl-footerPages`, `.cl-signIn-root`, `.cl-signUp-root`, dan selector wildcard terkait.

Referensi:
- `src/app/globals.css:1721`
- `src/app/globals.css:1723`

---

## 6. Dependency Chain (Asal-usul Styling)

1. `src/app/(auth)/layout.tsx`
2. `src/components/auth/AuthWideCard.tsx`
3. `src/components/auth/WaitlistForm.tsx`
4. `src/components/ui/input.tsx`
5. `src/components/ui/button.tsx`
6. `src/app/globals.css` (token + utility + Clerk overrides)
7. `appearance.elements` object di `sign-in` dan `sign-up` (inject class ke komponen Clerk)

Chain ini menjelaskan asal class apakah dari JSX langsung, primitive shared, global utility, atau Clerk appearance API.

---

## 7. Audit Ringkas Task 1

1. `WaitlistForm` menampilkan sukses meskipun email konfirmasi bisa gagal (karena fire-and-forget).
- Bukti: `src/components/auth/WaitlistForm.tsx:41`, `src/components/auth/WaitlistForm.tsx:45`.

2. `WaitlistForm` belum normalisasi email sebelum submit.
- Bukti: `src/components/auth/WaitlistForm.tsx:28`, `src/components/auth/WaitlistForm.tsx:38`.

3. Appearance object sign-in dan sign-up duplicated besar, risk drift saat maintenance.
- Bukti: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:52`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:152`.

---

## 8. Lampiran Raw Inventory

```txt
### src/app/(auth)/layout.tsx
9:        <div className="min-h-dvh relative bg-background text-foreground flex items-center justify-center p-4 md:p-6">
12:                className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-[1]"
13:                style={{
15:                        linear-gradient(var(--border-hairline) 1px, transparent 1px),
16:                        linear-gradient(90deg, var(--border-hairline) 1px, transparent 1px)
24:            <div className="relative z-10 w-full max-w-5xl flex justify-center">

### src/app/(auth)/waiting-list/page.tsx

### src/app/(auth)/waiting-list/actions.ts
21:): Promise<{ success: number; failed: number }> {
22:  let success = 0
37:      success++
44:  return { success, failed }

### src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
24:      <div className="space-y-4 animate-pulse">
27:            <div className="space-y-3">
28:              <div className="h-10 bg-muted rounded-md" />
29:              <div className="h-10 bg-muted rounded-md" />
31:            <div className="flex items-center gap-3">
32:              <div className="h-px bg-muted flex-1" />
33:              <div className="h-2 w-14 bg-muted rounded" />
34:              <div className="h-px bg-muted flex-1" />
38:        <div className="space-y-3">
39:          <div className="h-10 bg-muted rounded-md" />
40:          <div className="h-10 bg-muted rounded-md" />
41:          <div className="h-10 bg-muted rounded-md" />
43:        <div className="h-10 bg-muted rounded-md" />
44:        <div className="h-3 w-40 bg-muted rounded mx-auto" />
53:    <div className="flex flex-col justify-between h-full">
54:      <div className="flex flex-col">
55:        <Link href="/" className="inline-flex items-center gap-2 group w-fit">
62:            className="transition-transform group-hover:scale-105"
66:            src="/logo-makalah-ai-white.svg"
70:            className="hidden dark:block transition-transform group-hover:scale-105"
74:            src="/logo-makalah-ai-black.svg"
78:            className="block dark:hidden transition-transform group-hover:scale-105"
83:      <div className="space-y-4 mt-auto">
84:        <div className="flex items-center gap-2 text-success">
85:          <CheckCircle className="h-5 w-5" />
86:          <span className="font-mono text-xs font-bold uppercase tracking-widest">UNDANGAN VALID</span>
88:        <h1 className="font-mono text-2xl md:text-3xl font-bold tracking-tighter text-foreground leading-[1.1]">
91:        <p className="text-sm text-muted-foreground">
94:        <div className="flex items-center gap-2 bg-muted/50 rounded-action px-3 py-2 border border-hairline">
95:          <Mail className="h-4 w-4 text-muted-foreground" />
96:          <span className="font-mono text-sm">{email}</span>
98:        <p className="text-xs text-muted-foreground">
109:    <div className="w-full flex flex-col items-center justify-center py-8 text-center">
110:      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
111:        <WarningCircle className="w-8 h-8 text-destructive" />
113:      <h3 className="text-lg font-semibold text-foreground mb-2">
116:      <p className="text-sm text-muted-foreground mb-6">
121:        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-action font-mono text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
152:    elements: {
153:      rootBox: "w-full border-none !shadow-none",
154:      cardBox: "border-none !shadow-none",
155:      card: "!shadow-none border-none bg-transparent p-0 w-full",
156:      form: "border-none !shadow-none",
157:      formContainer: "border-none !shadow-none",
158:      formBox: "!shadow-none",
161:      main: "p-0 border-none",
162:      formFieldRow: "!flex !flex-col !gap-4",
164:      socialButtonsBlockButton: `!relative !overflow-hidden inline-flex items-center justify-center gap-2 !rounded-[var(--radius-sm)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors !border !border-solid !border-transparent before:content-[''] before:absolute before:inset-0 before:pointer-events-none before:translate-x-[101%] before:transition-transform before:duration-300 before:ease-out hover:before:translate-x-0 btn-stripes-clerk [&>*]:relative [&>*]:z-10 hover:!border-[color:var(--slate-400)] ${
166:          ? "!bg-[color:var(--slate-100)] !text-[color:var(--slate-800)] hover:!text-[color:var(--slate-100)]"
167:          : "!bg-[color:var(--slate-800)] !text-[color:var(--slate-100)] hover:!text-[color:var(--slate-800)]"
169:      formButtonPrimary: `!relative !overflow-hidden inline-flex items-center justify-center gap-2 !rounded-[var(--radius-sm)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors !border-[1px] !border-solid !border-transparent !outline-none !ring-0 !shadow-none before:content-[''] before:absolute before:inset-0 before:pointer-events-none before:translate-x-[101%] before:transition-transform before:duration-300 before:ease-out hover:before:translate-x-0 btn-stripes-clerk [&>*]:relative [&>*]:z-10 hover:!border-[color:var(--slate-400)] ${
171:          ? "!bg-[color:var(--slate-100)] !text-[color:var(--slate-800)] hover:!text-[color:var(--slate-100)]"
172:          : "!bg-[color:var(--slate-800)] !text-[color:var(--slate-100)] hover:!text-[color:var(--slate-800)]"
174:      formFieldInput: `!rounded-md border-border h-10 !font-mono text-sm placeholder:!font-mono focus:ring-primary focus:border-primary transition-all ${isDark ? "!bg-[color:var(--slate-900)]" : "bg-background"}`,
175:      otpCodeField: "w-full",
176:      otpCodeFieldInputs: "grid !grid-cols-6 gap-2",
177:      otpCodeFieldInputContainer: `cursor-text !rounded-md !border !border-border transition-colors ${
179:          ? "!bg-[color:var(--slate-900)]/70 focus-within:!bg-amber-500/10 focus-within:!border-amber-400"
180:          : "!bg-[color:var(--slate-100)]/70 focus-within:!bg-amber-500/10 focus-within:!border-amber-600"
182:      otpCodeFieldInput: `!h-10 !w-full !rounded-md !border-0 !bg-transparent !font-mono !text-sm !cursor-text !caret-amber-400 transition-colors focus:!outline-none focus:!ring-2 focus:!ring-amber-500/35 focus:!bg-amber-500/10 active:!bg-amber-500/10 ${isDark ? "!text-[color:var(--slate-100)]" : "!text-foreground"}`,
183:      footerActionLink: "!text-[color:var(--slate-50)] hover:!text-[color:var(--slate-300)] font-bold",
184:      identityPreviewText: "text-foreground font-mono",
185:      identityPreviewEditButtonIcon: "!text-slate-200",
189:      formFieldInputShowPasswordButton: "hover:!text-[color:var(--slate-200)]",
192:      formResendCodeLink: "font-mono text-xs !text-slate-300 hover:!text-slate-50 hover:underline",
193:      dividerText: "text-muted-foreground font-mono text-xs uppercase tracking-wider px-4",
194:      dividerRow: "flex items-center gap-0 w-full",
195:      dividerLine: "flex-1 h-[0.5px] !bg-[color:var(--slate-400)]",
196:      footer: "!bg-transparent mt-4 [&]:!bg-transparent",
197:      footerBox: "!bg-transparent !shadow-none",
198:      footerAction: "!bg-transparent",
199:      footerActionText: "text-muted-foreground font-sans text-xs !bg-transparent",
200:      footerPages: "!bg-transparent",
201:      footerPagesLink: "!bg-transparent",
203:    variables: {
209:      borderRadius: "8px",
211:    layout: {
225:          <div className="animate-pulse space-y-4">
226:            <div className="h-10 bg-muted rounded-md" />
227:            <div className="h-10 bg-muted rounded-md" />
228:            <div className="h-10 bg-muted rounded-md" />

### src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
17:      <div className="w-full space-y-5 animate-pulse">
21:            <div className="h-10 bg-foreground/10 rounded-action" />
23:            <div className="flex items-center gap-4">
24:              <div className="h-[0.5px] bg-foreground/10 flex-1" />
25:              <div className="h-2 w-10 bg-foreground/10 rounded" />
26:              <div className="h-[0.5px] bg-foreground/10 flex-1" />
31:        <div className="h-10 bg-foreground/10 rounded-action" />
33:        <div className="h-10 bg-foreground/[0.07] rounded-action" />
35:        <div className="h-3 w-36 bg-foreground/[0.05] rounded mx-auto mt-4" />
52:    elements: {
53:      rootBox: "w-full border-none !shadow-none",
54:      cardBox: "border-none !shadow-none",
55:      card: "!shadow-none border-none bg-transparent p-0 w-full",
56:      form: "border-none !shadow-none",
57:      formContainer: "border-none !shadow-none",
58:      formBox: "!shadow-none",
61:      main: "p-0 border-none",
62:      socialButtonsBlockButton: `!relative !overflow-hidden inline-flex items-center justify-center gap-2 !rounded-[var(--radius-sm)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors !border !border-solid !border-transparent before:content-[''] before:absolute before:inset-0 before:pointer-events-none before:translate-x-[101%] before:transition-transform before:duration-300 before:ease-out hover:before:translate-x-0 btn-stripes-clerk [&>*]:relative [&>*]:z-10 hover:!border-slate-400 ${
64:          ? "!bg-slate-100 !text-slate-800 hover:!text-slate-100"
65:          : "!bg-slate-800 !text-slate-100 hover:!text-slate-800"
67:      formButtonPrimary: `!relative !overflow-hidden inline-flex items-center justify-center gap-2 !rounded-[var(--radius-sm)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest transition-colors !border-[1px] !border-solid !border-transparent !outline-none !ring-0 !shadow-none before:content-[''] before:absolute before:inset-0 before:pointer-events-none before:translate-x-[101%] before:transition-transform before:duration-300 before:ease-out hover:before:translate-x-0 btn-stripes-clerk [&>*]:relative [&>*]:z-10 hover:!border-slate-400 ${
69:          ? "!bg-slate-100 !text-slate-800 hover:!text-slate-100"
70:          : "!bg-slate-800 !text-slate-100 hover:!text-slate-800"
72:      formFieldInput: `!rounded-md border-border h-10 !font-mono text-sm placeholder:!font-mono focus:ring-primary focus:border-primary transition-all ${isDark ? "!bg-slate-900" : "bg-background"}`,
73:      otpCodeField: "w-full",
74:      otpCodeFieldInputs: "grid !grid-cols-6 gap-2",
75:      otpCodeFieldInputContainer: `cursor-text !rounded-md !border !border-border transition-colors ${
77:          ? "!bg-slate-900/70 focus-within:!bg-amber-500/10 focus-within:!border-amber-400"
78:          : "!bg-slate-100/70 focus-within:!bg-amber-500/10 focus-within:!border-amber-600"
80:      otpCodeFieldInput: `!h-10 !w-full !rounded-md !border-0 !bg-transparent !font-mono !text-sm !cursor-text !caret-amber-400 transition-colors focus:!outline-none focus:!ring-2 focus:!ring-amber-500/35 focus:!bg-amber-500/10 active:!bg-amber-500/10 ${isDark ? "!text-slate-100" : "!text-foreground"}`,
81:      footerActionLink: "!text-slate-50 hover:!text-slate-300 font-bold",
82:      identityPreviewText: "text-foreground font-mono",
83:      identityPreviewEditButtonIcon: "!text-slate-200",
84:      formFieldAction: "!text-slate-50 font-mono text-xs",
85:      formResendCodeLink: "font-mono text-xs !text-slate-300 hover:!text-slate-50 hover:underline",
86:      backLink: "!text-slate-200 font-sans text-xs",
87:      backRow: "[&_a]:!text-slate-200 [&_a]:!decoration-slate-200 [&_a]:!font-sans [&_a]:!text-xs",
93:      formFieldInputShowPasswordButton: "hover:!text-slate-200",
96:      dividerText: "text-muted-foreground font-mono text-xs uppercase tracking-wider px-4",
97:      dividerRow: "flex items-center gap-0 w-full",
98:      dividerLine: "flex-1 h-[0.5px] !bg-slate-400",
99:      footer: "!bg-transparent mt-4 [&]:!bg-transparent",
100:      footerBox: "!bg-transparent !shadow-none",
101:      footerAction: "!bg-transparent",
102:      footerActionText: "text-muted-foreground font-sans text-xs !bg-transparent",
103:      footerPages: "!bg-transparent",
104:      footerPagesLink: "!bg-transparent",
106:    variables: {
112:      borderRadius: "8px",
114:    layout: {

### src/components/auth/AuthWideCard.tsx
33:        <div className="w-full max-w-4xl flex flex-col md:flex-row overflow-hidden rounded-lg border border-border bg-card shadow-none relative">
35:            <div className="md:w-5/12 bg-slate-950 p-6 md:p-12 relative flex flex-col">
38:                    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
39:                    style={{
46:                    <div className="relative z-10 w-full h-full flex flex-col">
51:                    <div className="relative z-10 w-full flex flex-col justify-between flex-grow">
53:                        <div className="flex flex-col">
54:                            <Link href="/" className="inline-flex items-center gap-2 group w-fit">
61:                                    className="transition-transform group-hover:scale-105 brightness-[.88] sepia-[.06] hue-rotate-[185deg] saturate-[3]"
67:                        <div className="space-y-3 mt-6 md:space-y-4 md:mt-auto">
68:                            <h1 className="font-sans text-2xl md:text-3xl font-medium text-foreground dark:text-slate-200 leading-[1.1]">
71:                            <p className="text-sm leading-relaxed max-w-[280px] font-mono">
72:                                <span className="text-muted-foreground font-normal">
76:                                    <span className="text-slate-50 font-normal">
87:            <div className="md:w-7/12 p-8 md:p-12 flex flex-col items-center bg-slate-100 dark:bg-slate-800 relative">
88:                <div className="w-full max-w-sm relative z-10 flex flex-col items-center">

### src/components/auth/WaitlistForm.tsx
13:type FormState = "idle" | "loading" | "success"
45:      setFormState("success")
47:      // Show success toast
48:      toast.success("Berhasil terdaftar!", {
54:        router.push("/?waitlist=success")
66:  if (formState === "success") {
68:      <div className="w-full flex flex-col items-center justify-center py-8 text-center">
69:        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
70:          <CheckCircle className="w-8 h-8 text-success" />
72:        <h3 className="text-lg font-mono font-bold text-foreground mb-2 tracking-tight">
75:        <p className="text-sm text-muted-foreground">
83:    <form onSubmit={handleSubmit} className="w-full space-y-4">
84:      <div className="space-y-2">
85:        <div className="relative">
86:          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
96:            className="pl-10 h-10 rounded-action border-border bg-background font-mono text-sm focus:ring-primary focus:border-primary"
102:          <p className="text-sm text-destructive">{error}</p>
109:        className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-mono font-bold text-xs uppercase tracking-widest rounded-action hover-slash"
113:            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
121:      <p className="text-xs text-center text-muted-foreground font-sans">

### src/components/ui/input.tsx
10:      className={cn(
11:        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
12:        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
13:        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",

### src/components/ui/button.tsx
8:  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
12:        default: "bg-primary text-primary-foreground hover:bg-primary/90",
13:        destructive:
14:          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
16:          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
18:          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
20:          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
21:        link: "text-primary underline-offset-4 hover:underline",
24:        default: "h-9 px-4 py-2 has-[>svg]:px-3",
25:        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
26:        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
56:      className={cn(buttonVariants({ variant, size, className }))}

### src/app/globals.css
2:@import "tw-animate-css";
4:@custom-variant dark (&:is(.dark *));
11: * - Identity: Makalah-Carbon tokens (this file)
149:  --neo-card-bg-light: oklch(0.99 0.01 70 / 0.85);
150:  --neo-input-bg-light: oklch(0.96 0.01 180);
152:  --neo-card-bg-dark: oklch(0.18 0 0 / 0.98);
153:  --neo-input-bg-dark: oklch(0.22 0.01 180);
154:  --neo-muted-dark: oklch(0.30 0.02 75);
157:  --section-bg-alt: var(--slate-200);
162: * Maps CSS variables to Tailwind utility classes
180:  --color-destructive: var(--destructive);
181:  --color-destructive-foreground: var(--destructive-foreground);
182:  --color-border: var(--border);
315:  --color-success: var(--success);
316:  --color-success-foreground: var(--success-foreground);
343:  --color-sidebar-border: var(--sidebar-border);
355:  --color-neo-border: var(--neo-border);
356:  --color-neo-shadow: var(--neo-shadow);
359:  --color-neo-text-muted: var(--neo-text-muted);
363:   * --font-sans: Geist (primary UI font)
364:   * --font-mono: Geist Mono (technical text, prices, code)
366:  --font-family-sans: var(--font-sans);
367:  --font-family-mono: var(--font-mono);
370:  --font-size-xs: 0.5rem;
372:  --font-size-sm: 0.625rem;
374:  --font-size-base: 0.75rem;
376:  --font-size-lg: 0.875rem;
378:  --font-size-xl: 1rem;
380:  --font-size-2xl: 1.125rem;
382:  --font-size-3xl: 1.25rem;
384:  --font-size-4xl: 1.5rem;
386:  --font-size-5xl: 1.75rem;
393:  --radius-s-md: 6px;
394:  --radius-md: 8px;
402:  --color-ai-border: var(--ai-border);
403:  --color-ai-bg-subtle: var(--ai-bg-subtle);
410:  --animate-accordion-down: accordion-down 200ms ease-out;
411:  --animate-accordion-up: accordion-up 200ms ease-out;
413:  /* Element Spacing (Tailwind utilities: gap-element-gap-*, mb-element-gap-*, etc.)
414:   * Vertical gap between stacked elements like badge → title
417:  --spacing-element-gap-sm: 0.5rem;
418:  --spacing-element-gap-md: 0.75rem;
419:  --spacing-element-gap-lg: 1rem;
420:  --spacing-element-gap-xl: 1.25rem;
423:  --spacing-neo-border: 4px;
424:  --spacing-neo-border-sm: 3px;
425:  --spacing-neo-shadow-x: -8px;
426:  --spacing-neo-shadow-y: 8px;
436:   * Semantic colors for specific components (usage: bg-bento, text-dot, etc.)
441:  --color-bento-hover: #3a3a3e;
443:  --color-bento-light-hover: #fafafa;
444:  --color-bento-border: rgba(255, 255, 255, 0.15);
445:  --color-bento-border-hover: rgba(255, 255, 255, 0.25);
446:  --color-bento-border-light: rgba(0, 0, 0, 0.1);
447:  --color-bento-border-light-hover: rgba(0, 0, 0, 0.15);
455:   * Font sizes for specific components (usage: text-bento-heading, etc.)
458:  --font-size-bento-heading: 2rem;
459:  --font-size-bento-paragraph: 0.9375rem;
465: * Makalah-Carbon values mapped to shadcn/ui semantic tokens
498:  --destructive: var(--rose-500);
499:  --destructive-foreground: var(--neutral-0);
502:  --border: var(--slate-200);
510:  /* --- Semantic Status (Makalah-Carbon) --- */
511:  --success: var(--teal-500);
512:  --success-foreground: var(--neutral-0);
519:  --ai-border: var(--sky-500);
520:  --ai-bg-subtle: var(--slate-950);
522:  /* --- Business Tier (Makalah-Carbon) --- */
528:  --neo-card-bg: var(--neo-card-bg-light);
529:  --neo-shadow: var(--neutral-800-a40);
530:  --neo-border: var(--neutral-950);
531:  --neo-input-bg: var(--neo-input-bg-light);
534:  --neo-text-muted: var(--neutral-700);
545:  --container-max-width: 1200px;
548:  --border-hairline: rgba(0, 0, 0, 0.15);
549:  --border-hairline-soft: rgba(0, 0, 0, 0.08);
567:  /* Chart Colors (Makalah-Carbon Data Viz) */
581:  --sidebar-border: var(--slate-200);
587:  --scrollbar-thumb-hover: var(--neutral-500-a50);
593: * Makalah-Carbon dark palette (Slate 900/950 depth layers)
623:  --destructive: var(--rose-600);
624:  --destructive-foreground: var(--neutral-0);
627:  --border: var(--neutral-0-a10);
631:  --border-hairline: rgba(255, 255, 255, 0.2);
632:  --border-hairline-soft: rgba(255, 255, 255, 0.08);
635:  --neo-card-bg: var(--neo-card-bg-dark);
636:  --neo-shadow: var(--neutral-100-a55);
637:  --neo-border: var(--neutral-450);
638:  --neo-input-bg: var(--neo-input-bg-dark);
641:  --neo-text-muted: var(--neutral-300);
651:  --section-bg-alt: var(--slate-800);
665:  --sidebar-border: var(--slate-800);
669:  --scrollbar-thumb-hover: var(--neutral-600-a50);
677:    @apply border-border outline-ring/50;
681:    @apply bg-background text-foreground font-sans;
691:    font-weight: 700;
713:    position: relative;
714:    z-index: 20;
715:    flex-shrink: 0;
716:    transition: background 150ms ease;
722:    position: absolute;
745:    display: inline-flex;
747:    justify-content: center;
750:    font-size: 0.875rem;
751:    font-weight: 600;
752:    border-radius: var(--radius);
753:    transition: filter 0.2s, transform 0.2s;
776:  .section-screen-with-header {
777:    min-height: calc(100vh - var(--header-h));
778:    min-height: calc(100dvh - var(--header-h));
779:    display: flex;
780:    flex-direction: column;
781:    justify-content: flex-start;
783:    position: relative;
788:    min-height: 100dvh;
799:    position: relative;
804:  /* Container with max-width */
806:    max-width: var(--container-max-width);
817:   * HERO SECTION - Two-column flex layout
822:    position: relative;
823:    overflow: hidden;
825:    text-align: left;
827:    min-height: 100vh;
828:    min-height: 100dvh;
830:    display: flex;
832:    box-sizing: border-box;
842:  /* Hero flex container */
843:  .hero-flex {
844:    display: flex;
848:    max-width: 1200px;
851:    flex-wrap: wrap;
852:    position: relative;
853:    z-index: 10;
858:    flex: 1;
860:    display: flex;
861:    flex-direction: column;
867:    flex: 1;
868:    display: flex;
869:    justify-content: flex-end;
871:    min-height: 420px;
873:    position: relative;
878:  @media (max-width: 1024px) {
881:      justify-content: center; /* Center content vertically */
883:      min-height: auto;
887:      box-sizing: border-box;
890:    .hero-flex {
891:      flex-direction: column-reverse;
893:      text-align: left;
900:      max-width: none; /* Allow heading to reach viewport edge */
902:      text-align: left;
905:      box-sizing: border-box;
908:      justify-content: center;
917:      justify-content: flex-start;
918:      flex-direction: column;
926:    display: flex;
927:    justify-content: flex-start;
929:    flex-wrap: wrap;
932:  @media (max-width: 1024px) {
934:      justify-content: center;
940:    position: relative;
946:    position: absolute;
954:    pointer-events: none;
955:    z-index: -2;
968:    position: absolute;
974:    z-index: -1;
975:    pointer-events: none;
987:  /* Research grid overlay */
988:  .hero-grid-thin {
997:    position: absolute;
1004:    z-index: 0;
1005:    pointer-events: none;
1024:    position: absolute;
1028:    background: var(--border-hairline);
1029:    box-shadow: 0 0 4px rgba(255, 255, 255, 0.15);
1030:    z-index: 5;
1037:    box-shadow: 0 0 4px rgba(0, 0, 0, 0.08);
1042:    position: absolute;
1048:    pointer-events: none;
1049:    z-index: 1;
1054:    border: 1px solid var(--border-hairline);
1055:    border-radius: 12px;
1056:    overflow: hidden;
1057:    box-shadow: -25px 30px 0 rgba(0, 0, 0, 0.46);
1058:    position: absolute;
1060:    flex-shrink: 0;
1061:    text-align: left;
1062:    transition: all 0.5s ease;
1067:    box-shadow: -25px 30px 0 rgba(255, 255, 255, 0.08);
1072:   * Used by Tailwind animate-[keyframe_...] in hero components
1081:  /* Dot pulse animation for animated dots */
1107:    display: inline-flex;
1109:    justify-content: center;
1112:    font-size: 0.875rem;
1113:    font-weight: 600;
1116:    border-radius: var(--radius-sm);
1117:    transition: background-color 0.2s, transform 0.2s;
1140:  /* Outline button - transparent with border */
1142:    display: inline-flex;
1144:    justify-content: center;
1147:    font-size: 0.875rem;
1148:    font-weight: 600;
1151:    border: 1px solid rgba(255, 255, 255, 0.3);
1152:    border-radius: var(--radius-sm);
1153:    transition: all 0.2s;
1158:    border-color: rgba(255, 255, 255, 0.6);
1169:    border-color: rgba(0, 0, 0, 0.3);
1175:    border-color: rgba(0, 0, 0, 0.6);
1179:  .btn-success {
1180:    display: inline-flex;
1182:    justify-content: center;
1185:    font-size: 0.875rem;
1186:    font-weight: 600;
1187:    color: var(--success-foreground);
1188:    background-color: var(--success);
1189:    border-radius: var(--radius);
1190:    transition: opacity 0.2s, transform 0.2s;
1193:  .btn-success:hover {
1216:  font-weight: 500;
1217:  transition: all 0.2s ease;
1222:  box-shadow: 0 4px 12px rgba(232, 102, 9, 0.3);
1244: * See: src/components/layout/footer/Footer.tsx
1259:    flex: 1;
1263:    max-width: 1400px;
1284:    /* Border on sides and bottom only - no top border to merge with header */
1285:    border-left: 0.5px solid var(--border-hairline);
1286:    border-right: 0.5px solid var(--border-hairline);
1287:    border-bottom: 0.5px solid var(--border-hairline);
1288:    border-top: none;
1290:    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
1291:    overflow: hidden;
1308:    max-width: none;
1314:    max-width: none;
1319:    min-height: calc(100vh - var(--header-h) - var(--footer-h) - 48px);
1321:    /* Border on sides and bottom only - no top border to merge with header */
1322:    border-left: 0.5px solid var(--border-hairline);
1323:    border-right: 0.5px solid var(--border-hairline);
1324:    border-bottom: 0.5px solid var(--border-hairline);
1325:    border-top: none;
1327:    border-radius: 0 0 var(--radius-xl) var(--radius-xl);
1328:    overflow: hidden;
1333:    border-right: 1px solid var(--sidebar-border);
1345:    display: flex;
1346:    flex-direction: column;
1352:    border-radius: 0;
1357:    position: relative;
1358:    display: flex;
1360:    justify-content: flex-start;
1363:    font-size: 14px;
1364:    font-weight: 500;
1367:    border: none;
1368:    border-radius: 6px;
1370:    text-align: left;
1372:    transition: color 150ms ease, background-color 150ms ease;
1374:    box-shadow: none;
1390:    position: absolute;
1396:    border-radius: 0 2px 2px 0;
1399:  .sidebar-nav-item:focus-visible {
1407:    flex-shrink: 0;
1413:    min-height: 400px;
1414:    overflow: auto;
1422:    display: flex;
1423:    flex-direction: column;
1424:    justify-content: center;
1428:@media (max-width: 768px) {
1434:    border-right: none;
1435:    border-bottom: 1px solid var(--sidebar-border);
1440:    flex-direction: row;
1441:    flex-wrap: wrap;
1446:    flex: 1;
1448:    justify-content: center;
1461:@media (max-width: 480px) {
1471:    font-size: 20px;
1501:  .text-brand {
1506:  .font-heading {
1507:    font-family: var(--font-sans);
1511:  .font-hero {
1512:    font-family: var(--font-mono);
1516:  .text-narrative {
1517:    font-family: var(--font-sans);
1520:  .text-interface {
1521:    font-family: var(--font-mono);
1524:  .text-signal {
1525:    font-family: var(--font-mono);
1526:    text-transform: uppercase;
1531:  .rounded-shell {
1532:    border-radius: var(--radius-xl); /* 16px - Premium shell */
1535:  .rounded-action {
1536:    border-radius: var(--radius-sm); /* 4px - Action elements */
1539:  .rounded-badge {
1540:    border-radius: var(--radius-s-md); /* 6px - Badges */
1544:  .border-hairline {
1545:    border-width: 0.5px;
1546:    border-color: var(--border-hairline);
1549:  .border-main {
1550:    border-width: 1px;
1553:  .border-ai {
1554:    border-width: 1px;
1555:    border-style: dashed;
1556:    border-color: var(--ai-border);
1559:  /* Blog neutral input: keep border neutral on focus (no blue ring) */
1560:  input.blog-neutral-input:focus,
1561:  input.blog-neutral-input:focus-visible,
1563:    border-color: var(--border) !important;
1568:    box-shadow: none !important;
1569:    --tw-ring-color: transparent !important;
1570:    --tw-ring-offset-width: 0px !important;
1571:    --tw-ring-offset-color: transparent !important;
1572:    --tw-ring-shadow: 0 0 #0000 !important;
1573:    --tw-ring-offset-shadow: 0 0 #0000 !important;
1577:  .p-comfort {
1581:  .p-dense {
1585:  .p-airy {
1589:  .gap-comfort {
1593:  .gap-dense {
1614:  .z-base {
1615:    z-index: 0;
1618:  .z-overlay {
1619:    z-index: 10;
1622:  .z-popover {
1623:    z-index: 20;
1626:  .z-drawer {
1627:    z-index: 50;
1630:  .z-command {
1631:    z-index: 100;
1635:  .hover-slash {
1636:    position: relative;
1639:  .hover-slash::before {
1641:    position: absolute;
1643:    background-image: url('/slash-pattern.svg');
1647:    transition: opacity 150ms ease;
1648:    pointer-events: none;
1651:  .hover-slash:hover::before {
1656:    border-left: 2px solid var(--amber-500);
1659:  .focus-ring:focus-visible {
1671:  .btn-stripes-pattern {
1683:  .dark .btn-stripes-pattern {
1696:  .btn-stripes-clerk::before {
1708:  .dark .btn-stripes-clerk::before {
1728:.cl-signUp-root,
1734:  box-shadow: none !important;
1747:  font-family: var(--font-mono) !important;
1752:  font-family: var(--font-mono) !important;
1761: * isolation + z-index:-1 keeps ::before stripe behind bare text node. */
1764:  position: relative !important;
1765:  overflow: hidden !important;
1766:  display: inline-flex !important;
1768:  justify-content: center !important;
1770:  border-radius: var(--radius-sm) !important;
1772:  font-family: var(--font-sans) !important;
1773:  font-size: 13px !important;
1774:  font-weight: 500 !important;
1775:  text-transform: uppercase !important;
1776:  transition: color 0.15s, border-color 0.15s !important;
1777:  border: 1px solid transparent !important;
1787:/* Keep auth buttons in sm radius even when Clerk variables use md radius for inputs */
1790:  border-radius: var(--radius-sm) !important;
1795:  border-color: var(--slate-400) !important;
1807:  position: absolute !important;
1809:  z-index: -1 !important;
1810:  pointer-events: none !important;
1812:  transition: transform 0.3s ease-out !important;
1821:.cl-main > .cl-alternativeMethodsBlockButton:hover::before,
1822:.cl-signIn-havingTrouble .cl-button:hover::before {
1836:  border: none !important;
1837:  box-shadow: none !important;
1839:  border-radius: 0 !important;
1840:  overflow: visible !important;
1841:  font-family: var(--font-mono) !important;
1842:  font-size: 0.75rem !important;
1843:  font-weight: 400 !important;
1844:  text-transform: none !important;
1848:  transition: color 0.15s !important;
1849:  display: inline-flex !important;
1881:  .animate-thinking-dot {
1909:  .animate-cursor-blink {
1910:    animation: cursor-blink 1s step-end infinite;
1949:  .animate-thinking-dot,
1950:  .animate-cursor-blink,
1951:  .animate-pulse,
1952:  .hero-text-shimmer,
1954:  .animate-accordion-down,
1955:  .animate-accordion-up {
1962:  .hero-text-shimmer {
1969:  /* Disable transition animations */
1975:  .btn-success,
1977:    transition: none;
2006:    border-radius: var(--radius);
2030:  border-radius: calc(var(--scrollbar-width) / 2);
2045:        var(--border) 8px,
2046:        var(--border) 9px);
2065:    pointer-events: none !important;
2070:    position: absolute !important;
2071:    z-index: -9999 !important;
2110:    position: absolute !important;
2111:    z-index: -9999 !important;
2117:  [data-cl-element='rootBox'] input:-webkit-autofill:focus,
2121:  .cl-rootBox input:-webkit-autofill:focus,
2125:  .cl-formFieldInput:-webkit-autofill:focus,
2129:  input[data-cl-element='formFieldInput']:-webkit-autofill:focus,
2132:    -webkit-box-shadow: 0 0 0 1000px var(--background) inset !important;
2133:    box-shadow: 0 0 0 1000px var(--background) inset !important;
2134:    -webkit-text-fill-color: var(--foreground) !important;
2136:    border-color: var(--border) !important;
2137:    transition: background-color 99999s ease-in-out 0s !important;
2142:  .dark [data-cl-element='rootBox'] input:-webkit-autofill:focus,
2146:  .dark .cl-rootBox input:-webkit-autofill:focus,
2150:  .dark .cl-formFieldInput:-webkit-autofill:focus,
2154:  .dark input[data-cl-element='formFieldInput']:-webkit-autofill:focus,
2157:    -webkit-box-shadow: 0 0 0 1000px var(--slate-900) inset !important;
2158:    box-shadow: 0 0 0 1000px var(--slate-900) inset !important;
2159:    -webkit-text-fill-color: var(--slate-100) !important;
2161:    border-color: var(--neutral-0-a10) !important;
2164:  [data-cl-element='rootBox'] input:-moz-autofill,
2165:  [data-cl-element='rootBox'] input:-moz-autofill:focus,
2166:  .cl-rootBox input:-moz-autofill,
2167:  .cl-rootBox input:-moz-autofill:focus,
2168:  .cl-formFieldInput:-moz-autofill,
2169:  .cl-formFieldInput:-moz-autofill:focus,
2170:  input[data-cl-element='formFieldInput']:-moz-autofill,
2171:  input[data-cl-element='formFieldInput']:-moz-autofill:focus {
2172:    box-shadow: 0 0 0 1000px var(--background) inset !important;
2175:    border-color: var(--border) !important;
2178:  /* Fallback: if Clerk internal selectors change, keep autofill neutral app-wide */
2181:  input:-webkit-autofill:focus,
2184:    -webkit-box-shadow: 0 0 0 1000px var(--background) inset !important;
2185:    box-shadow: 0 0 0 1000px var(--background) inset !important;
2186:    -webkit-text-fill-color: var(--foreground) !important;
2188:    border-color: var(--border) !important;
2189:    transition: background-color 99999s ease-in-out 0s !important;
2194:  .dark input:-webkit-autofill:focus,
2197:    -webkit-box-shadow: 0 0 0 1000px var(--slate-900) inset !important;
2198:    box-shadow: 0 0 0 1000px var(--slate-900) inset !important;
2199:    -webkit-text-fill-color: var(--slate-100) !important;
2201:    border-color: var(--neutral-0-a10) !important;

```
