# Panduan Komponen Standar - Makalah-Carbon

Dokumen ini adalah "Blueprints" untuk seluruh komponen UI di Makalah App, yang dirancang sesuai prinsip **Mechanical Grace** (Hybrid Radius + Mono Dominance).

## 1. Button (Action & Command)
Semua tombol menggunakan font **Mono + Uppercase**. State Hover menggunakan pola **Diagonal Stripes (Slash)** khas terminal.

```tsx
// 1.1 Command Button (Primary - White)
<Button className="text-signal text-sm uppercase tracking-widest rounded-action bg-[color:var(--slate-50)] text-[color:var(--slate-950)] px-6 py-2 hover:bg-[color:var(--slate-200)]">
  LOG IN
</Button>

// 1.2 Navigation Link (Ghost with Arrow)
<Button variant="ghost" className="text-interface text-xs uppercase tracking-wider text-[color:var(--slate-400)] hover:text-[color:var(--slate-50)] flex items-center gap-2">
  LEARN MORE ->
</Button>

// 1.3 Segmented Switcher (The System Mode)
<div className="flex bg-[color:var(--slate-900)] border border-main rounded-action p-1 gap-1">
  <Button className="text-signal text-[10px] uppercase bg-[color:var(--slate-50)] text-[color:var(--slate-950)] rounded-badge px-3 py-1 flex items-center gap-1.5">
    <Monitor className="w-3 h-3" /> SYSTEM
  </Button>
  <Button variant="ghost" className="p-2 text-slate-500 hover:text-slate-300">
    <Sun className="w-4 h-4" />
  </Button>
</div>
```

## 2. Input Field & Forms
Gunakan **Mono + Uppercase** untuk label dengan tracking lebar. Input value dan placeholder wajib menggunakan **Mono**.

```tsx
// 2.1 Standard Text Input
<div className="flex flex-col gap-2">
  <label className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
    FIRST NAME*
  </label>
  <Input 
    className="rounded-md border-sm border-slate-800 bg-slate-950 font-mono text-sm px-3 py-2 text-slate-200 placeholder:text-slate-700 focus:ring-1 focus:ring-info transition-all"
    placeholder="First Name"
  />
</div>

// 2.2 Select / Dropdown
<div className="flex flex-col gap-2">
  <label className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
    HOW DID YOU FIND US?*
  </label>
  <div className="relative">
    <select className="w-full appearance-none rounded-md border-sm border-slate-800 bg-slate-950 font-mono text-sm px-3 py-2 text-slate-200 outline-none focus:ring-1 focus:ring-info cursor-pointer">
      <option>Select one...</option>
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
  </div>
</div>
```

## 3. Card & Module Layout (Structural Grid)
Menggunakan **Hybrid Radius** (XL buat shell, XS/None buat data). Pemisahan internal menggunakan **Hairline (0.5px)**.

```tsx
// 3.1 Tiered Content Card (Pricing/Project Style)
<div className="rounded-xl border-sm border-border bg-slate-900 p-6 flex flex-col gap-4">
  {/* Header Tier: Label + Title */}
  <div className="flex flex-col gap-1">
    <span className="font-mono text-[10px] text-amber-500 font-bold uppercase tracking-widest">
      01. ANALYSIS_PRO
    </span>
    <div className="flex justify-between items-baseline">
      <h2 className="font-sans text-2xl text-slate-50">Pro Plan</h2>
      <span className="font-sans text-slate-400">$20<span className="text-sm">/mo</span></span>
    </div>
  </div>

  {/* Divider: Hairline Border */}
  <div className="border-t-[0.5px] border-slate-800 w-full" />

  {/* Content Tier: Feature List (Mono) */}
  <div className="flex flex-col gap-3">
    <p className="font-mono text-xs text-slate-400">Complete analysis workspace for individuals.</p>
    <ul className="flex flex-col gap-2 font-mono text-[11px] text-slate-300">
      <li>+ 10M Analysis Tokens</li>
      <li>+ Automated Citation Engine</li>
      <li>+ Early access to new features</li>
    </ul>
  </div>

  {/* Action Tier: Full-width Command */}
  <Button className="w-full mt-4 font-mono uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-50 py-2">
    SIGN UP ->
  </Button>
</div>
```

## 4. AI Identity (Machine Flow)
Gunakan **Dashed Border** dan warna **Sky/Info** untuk membedakan output AI dari konten user.

```tsx
<div className="relative rounded-lg border-sm border-dashed border-info bg-info/5 p-5">
  {/* AI Tag - Consistent Mono Uppercase */}
  <div className="absolute -top-3 -left-2 bg-info text-white font-mono text-[9px] px-2 py-0.5 rounded-full">
    AI_SYSTEM
  </div>
  
  <p className="font-mono text-sm leading-relaxed text-foreground">
    Analisis makalah lo nunjukin kontribusi AI sekitar 15%.
  </p>
  
  <div className="mt-4 border-t border-xs border-info/20 pt-2 font-mono text-[10px] text-info">
    ENGINE: GPT-4o-REASONING // STATUS: VERIFIED
  </div>
</div>
```

## 5. Navigation & Sidebar
Wajib menggunakan **Geist Mono** untuk menjaga presisi geometris. Active state menggunakan aksen garis dan warna oranye.

```tsx
// 5.1 Sidebar Navigation Item (Active & Inactive)
<div className="flex flex-col gap-1 w-full">
  {/* Category Namespace */}
  <span className="font-mono text-[11px] text-slate-500 px-3 py-2">Integrations</span>
  
  {/* Active Item */}
  <div className="relative flex items-center gap-3 px-3 py-1.5 bg-amber-500/5 text-amber-500 group">
    <div className="absolute left-0 w-[2px] h-4 bg-amber-500 rounded-r-full" />
    <span className="font-mono text-sm font-medium">Welcome to Factory</span>
  </div>

  {/* Inactive Item */}
  <div className="flex items-center justify-between px-3 py-1.5 text-slate-400 hover:text-slate-50 hover:bg-muted/50 cursor-pointer transition-all">
    <span className="font-mono text-sm">CLI</span>
    <ChevronRight className="w-3 h-3 opacity-50" />
  </div>
</div>

// 5.2 Sidebar Search Bar
<div className="relative px-3 mb-6">
  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-md px-3 py-1.5 text-slate-500">
    <Search className="w-4 h-4" />
    <span className="font-mono text-xs flex-1">Search...</span>
    <kbd className="font-mono text-[10px] bg-slate-800 px-1 rounded">⌘K</kbd>
  </div>
</div>
```
## 6. Status Badges & Tags (Technical Tags)
// Menggunakan radius: 6px, Hairline Border (0.5px), dan Tracking Widest.

```tsx
// 6.1 Category Tag (e.g. CASE STUDY)
<span className="text-signal text-[9px] font-medium uppercase tracking-[0.2em] border-hairline border-[color:var(--slate-700)] bg-[color:var(--slate-900)]/50 px-2 py-1 rounded-badge text-[color:var(--slate-300)]">
  CASE STUDY
</span>

// 6.2 Signal Tag (e.g. NEW)
<span className="text-signal text-[9px] font-bold uppercase tracking-wider bg-[color:var(--amber-500)] text-[color:var(--neutral-950)] px-1.5 py-0.5 rounded-badge">
  NEW
</span>
```

## 7. Progress & Status Diagnostics
Nampilin proses AI yang sedang berjalan dengan vibe mekanis.

```tsx
<div className="flex flex-col gap-2 w-full max-w-md">
  <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-slate-400">
    <span>SYSTEM_ANALYZING_PAPER</span>
    <span>67%</span>
  </div>
  <div className="h-1 w-full bg-slate-900 border border-slate-800 rounded-none overflow-hidden">
    <div className="h-full bg-amber-500 w-[67%] transition-all duration-500" />
  </div>
</div>
```

## 8. Tooltips & Citation Popovers
Radius kecil (4px) dengan kontras tinggi untuk metadata teknis.

```tsx
<div className="rounded-[4px] bg-slate-50 text-slate-950 p-3 shadow-xl max-w-xs border border-slate-200">
  <div className="font-mono text-[10px] font-bold uppercase tracking-widest mb-1 opacity-60">Source Ref [04]</div>
  <p className="font-mono text-[11px] leading-relaxed">Smith et al. (2024). "Neural Architectures for Semantic Alignment". Journal of AI Ethics, Vol 12.</p>
</div>
```

## 9. Breadcrumbs & Stage Indicators
Navigasi alur pengerjaan makalah dengan font Mono kecil.

```tsx
<nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
  <span className="hover:text-slate-100 cursor-pointer">START</span>
  <ChevronRight className="w-3 h-3" />
  <span className="text-amber-500 font-bold">ANALYSIS</span>
  <ChevronRight className="w-3 h-3 opacity-30" />
  <span className="opacity-30">AUDIT</span>
  <ChevronRight className="w-3 h-3 opacity-30" />
  <span className="opacity-30">FINAL</span>
</nav>
```

## 10. Data Grid & Tables (Info-Dense Core)
Radius 0px (Sharp), font Mono total, hairline horizontal dividers (0.5px).

```tsx
<table className="w-full text-left font-mono text-xs border-collapse">
  <thead className="bg-slate-900/50 border-b border-slate-800">
    <tr>
      <th className="px-4 py-3 uppercase tracking-widest text-slate-500 font-bold">ID</th>
      <th className="px-4 py-3 uppercase tracking-widest text-slate-500 font-bold">METRIC</th>
      <th className="px-4 py-3 uppercase tracking-widest text-slate-500 font-bold">SCORE</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-800/50">
    <tr className="hover:bg-slate-900/40 transition-colors">
      <td className="px-4 py-3 text-slate-400">A-01</td>
      <td className="px-4 py-3 text-slate-200 text-sm">Semantic Alignment</td>
      <td className="px-4 py-3 text-amber-500">0.92</td>
    </tr>
  </tbody>
</table>
```

## 11. Command Palette / Quick Actions
Shell radius lebar (16px), list item dengan Mono dan Slash Hover.

```tsx
<div className="rounded-[16px] border border-slate-800 bg-slate-950/90 backdrop-blur-xl shadow-2xl w-full max-w-lg overflow-hidden">
  <div className="p-4 border-b border-slate-800 flex items-center gap-3">
    <Search className="w-5 h-5 text-slate-500" />
    <input className="bg-transparent border-none outline-none font-sans text-lg text-slate-100 placeholder:text-slate-600 w-full" placeholder="Search commands..." />
  </div>
  <div className="p-2 flex flex-col gap-1">
    <div className="flex items-center justify-between px-3 py-2 rounded-[8px] hover:bg-[url('/slash-pattern.svg')] hover:bg-repeat cursor-pointer group">
      <div className="flex items-center gap-3">
        <FileText className="w-4 h-4 text-slate-400 group-hover:text-slate-100" />
        <span className="font-mono text-sm text-slate-300 group-hover:text-slate-950">Scan New Paper</span>
      </div>
      <kbd className="font-mono text-[10px] text-slate-600 group-hover:text-slate-950">⌘N</kbd>
    </div>
  </div>
</div>
```

## 12. Code & Quote Blocks
Background slate-950, border slate-800, monospaced font dengan line numbers.

```tsx
<div className="rounded-[8px] border border-slate-800 bg-slate-950 overflow-hidden">
  <div className="px-4 py-2 border-b border-slate-900 bg-slate-900/30 flex justify-between font-mono text-[10px] text-slate-500 uppercase">
    <span>original_source.pdf</span>
    <span>page_04</span>
  </div>
  <div className="p-4 font-mono text-sm leading-relaxed text-slate-300 flex gap-4">
    <div className="text-slate-700 select-none text-right">01<br/>02<br/>03</div>
    <div className="flex-1 italic border-l border-slate-800 pl-4 bg-slate-900/20">
      "The integration of agentic workflows into document analysis provides a 15x increase in citation accuracy..."
    </div>
  </div>
</div>
```

## 13. UI Elements (Accordion, Alert, etc.)
Varian standar dengan sentuhan **Mechanical Grace**.

```tsx
// 13.1 Alert Dialong / Dialog
<div className="rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col gap-4 max-w-sm shadow-2xl">
  <h3 className="font-sans text-xl text-slate-50">Delete Analysis?</h3>
  <p className="font-mono text-xs text-slate-400 leading-relaxed">Warning: This action will permanently remove all interaction logs corresponding to this document ID.</p>
  <div className="flex gap-2 justify-end mt-2">
    <Button variant="ghost" className="font-mono text-xs uppercase text-slate-500 px-4 py-2">CANCEL</Button>
    <Button className="font-mono text-xs uppercase bg-red-500 text-white rounded-[6px] px-4 py-2 hover:bg-red-600">DELETECOMMAND</Button>
  </div>
</div>

// 13.2 Switch & Dark/Light Toggle
<div className="flex items-center gap-3">
  <div className="w-10 h-5 bg-slate-800 border border-slate-700 rounded-full relative cursor-pointer group">
    <div className="absolute left-1 top-1 w-3 h-3 bg-amber-500 rounded-full group-hover:bg-amber-400 transition-all" />
  </div>
  <span className="font-mono text-[10px] uppercase text-slate-400">AI_ASSIST_MODE</span>
</div>

// 13.3 Skeleton Loaders (Technical Pulse)
<div className="flex flex-col gap-3 w-full">
  <div className="h-6 w-1/3 bg-slate-900 rounded-[4px] animate-pulse" />
  <div className="h-4 w-full bg-slate-900/50 rounded-[2px] animate-pulse" />
  <div className="h-4 w-5/6 bg-slate-900/50 rounded-[2px] animate-pulse" />
</div>

// 13.4 Drawer / Slide-over
<div className="fixed right-0 top-0 h-full w-80 bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
  <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/20">
    <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-300">Diagnostic Details</span>
    <X className="w-4 h-4 text-slate-500 hover:text-slate-100 cursor-pointer" />
  </div>
  <div className="p-6 font-mono text-[11px] text-slate-400">
    // Diagnostic logs streaming...
  </div>
</div>

// 13.5 Chart Placeholder (Data Logic)
<div className="h-48 w-full bg-slate-900/30 rounded-lg border border-slate-800 flex items-end gap-2 p-4">
  <div className="flex-1 bg-amber-500/20 border-t-2 border-amber-500 h-[40%]" />
  <div className="flex-1 bg-amber-500/20 border-t-2 border-amber-500 h-[70%]" />
  <div className="flex-1 bg-amber-500/20 border-t-2 border-amber-500 h-[55%]" />
  <div className="flex-1 bg-amber-500/20 border-t-2 border-amber-500 h-[90%]" />
</div>

// 14. Bento Grid Module (The 16-Col Snap)
<div className="grid grid-cols-16 gap-4 w-full">
  {/* Larger Feature Block */}
  <div className="col-span-10 rounded-xl bg-slate-900 border border-slate-800 p-6">
    <h4 className="font-sans text-xl text-slate-50 mb-2">Primary Insight</h4>
    <p className="font-mono text-xs text-slate-400">Deep semantic analysis results...</p>
  </div>
  
  {/* Side Info Block */}
  <div className="col-span-6 rounded-xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between">
    <Activity className="icon-display text-amber-500" />
    <span className="font-mono text-2xl text-slate-50">98.2%</span>
  </div>
</div>
```

## 15. Background Patterns & Industrial Textures
Tekstur latar belakang untuk menambah kedalaman visual tanpa mengganggu keterbacaan (Density: 10-15% Opacity).

```tsx
// 15.1 Dotted Pattern (The Research Grid)
// Dot 1px dengan spacing 24px. Gunakan radial mask untuk fade-out di pinggir.
<div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(circle_at_center,black_50%,transparent_100%)]" />

// 15.2 Diagonal Stripes (The Action Texture)
// Stripe 1px dengan gap 8px pada sudut 45 derajat. Memberikan kesan "Caution/Industrial".
<div className="absolute inset-0 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.12)_0,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_8px)]" />

// 15.3 Engineering Grid (The Structural Base)
// Kotak grid 48px dengan garis Slate-400 (15% opacity).
<div className="absolute inset-0 [background-image:linear-gradient(rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] [background-size:48px_48px]" />
```

## 16. Auth & Access Modules
Pola antarmuka untuk Login, Signup, dan Manajemen Sesi. Mengombinasikan `AuthWideCard` dengan tekstur industrial.

```tsx
// 16.1 Auth Card Shell
// Radius XL (16px) untuk container utama, Hairline 0.5px untuk sekat branding.
<div className="w-full max-w-4xl flex overflow-hidden rounded-[16px] border-[1px] border-slate-800 bg-slate-900 shadow-2xl">
  {/* Left: Branding Column with Diagonal Texture */}
  <div className="md:w-5/12 bg-slate-950 p-12 border-r-[0.5px] border-slate-800 relative">
    <div className="absolute inset-0 [background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.05)_0,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_8px)]" />
    <span className="relative z-10 font-mono text-[10px] text-amber-500 uppercase tracking-widest">STEP_01: AUTHENTICATION</span>
  </div>
  
  {/* Right: Interaction Area (The Form) */}
  <div className="md:w-7/12 p-12 bg-slate-900">
    {/* Input & Action buttons follow Section 1 & 2 standards */}
  </div>
</div>

// 16.2 Social Login (Monochrome Standard)
// Tombol Google/GitHub dengan background solid Slate-950 dan border standard.
<Button className="w-full font-mono text-xs uppercase bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-200 py-3 rounded-[8px] flex gap-3">
  <GitHubIcon className="w-4 h-4" /> CONTINUE_WITH_GITHUB
</Button>
```

```

## 17. Dashboard & Admin Interface
Standar antarmuka untuk pengelolaan data intensif dan monitoring sistem. Fokus pada presisi data dan efisiensi ruang.

```tsx
// 17.1 Admin Sidebar Navigation
// Font Geist Mono, Active Indicator berupa hairline bar 2px di sisi kiri.
<nav className="flex flex-col gap-1 w-full bg-slate-950/50">
  <button className="relative flex items-center gap-3 px-4 py-2.5 bg-slate-50/5 text-slate-50 transition-colors group">
    <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-amber-500 rounded-r-full" />
    <LayoutDashboard className="w-4 h-4 text-amber-500" />
    <span className="font-mono text-sm uppercase tracking-wider">OVERVIEW</span>
  </button>
  <button className="flex items-center gap-3 px-4 py-2.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors">
    <Users className="w-4 h-4" />
    <span className="font-mono text-sm uppercase tracking-wider">USER_MANAGEMENT</span>
  </button>
</nav>

// 17.2 Data Grid (Dense Table)
// Hairline internal (0.5px), Header Mono + Uppercase + Tracking Widest.
<table className="w-full text-left font-mono text-[11px] border-collapse">
  <thead className="bg-slate-950/80 border-b-[0.5px] border-slate-800">
    <tr>
      <th className="px-4 py-3 text-slate-500 uppercase tracking-[0.2em] font-bold">USER_ID</th>
      <th className="px-4 py-3 text-slate-500 uppercase tracking-[0.2em] font-bold">STATUS</th>
      <th className="px-4 py-3 text-slate-500 uppercase tracking-[0.2em] font-bold">LAST_ACCESS</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-slate-800/50">
    <tr className="hover:bg-slate-50/5 text-slate-300">
      <td className="px-4 py-3 font-mono">USR_82C810ED</td>
      <td className="px-4 py-3"><span className="text-emerald-500 tracking-tighter">[VERIFIED]</span></td>
      <td className="px-4 py-3">2026-02-04_19:30</td>
    </tr>
  </tbody>
</table>

// 17.3 Stats Counter Card
// Menggunakan Hybrid Radius (XL) dan Tipografi Mono untuk angka.
<div className="rounded-[16px] border-[0.5px] border-slate-800 bg-slate-900/50 p-6 flex flex-col gap-2">
  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">TOTAL_ACTIVE_SESSIONS</span>
  <div className="flex items-baseline gap-2">
    <span className="font-mono text-3xl font-bold text-slate-50 tracking-tighter">1,284</span>
    <span className="font-mono text-[10px] text-emerald-500">+12%_INC</span>
  </div>
</div>
```

```

## 19. Onboarding Flow
Antarmuka untuk pendaftaran awal dan pengenalan fitur. Fokus pada kejernihan langkah dan minimalis.

```tsx
// 19.1 Onboarding Header
// Minimalis dengan hairline border (0.5px) dan indikator langkah Mono.
<header className="h-16 border-b-[0.5px] border-slate-800 bg-slate-950/80 backdrop-blur-md">
  <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
    <Logo />
    <div className="flex items-center gap-4">
      <span className="font-mono text-[10px] text-amber-500 uppercase tracking-widest">STEP_01_OF_03</span>
      <button className="p-2 text-slate-400 hover:text-slate-50"><X className="w-4 h-4" /></button>
    </div>
  </div>
</header>

// 19.2 Welcome Hero Section
// Tipografi Mono untuk headline teknis, tekstur Dotted atau Grid untuk background.
<section className="relative py-24 overflow-hidden bg-slate-950">
  <DottedPattern />
  <div className="relative z-10 text-center">
    <h1 className="font-mono text-3xl font-bold uppercase tracking-tighter">INITIATING_YOUR_WORKSPACE</h1>
    <p className="text-slate-400 mt-4 max-w-lg mx-auto">Selamat datang di ekosistem Makalah AI. Mari siapkan mesin risetmu.</p>
  </div>
</section>
```

## 20. Subscription & Billing
Modul transaksi, pemilihan paket, dan monitoring kuota. Mengedepankan akurasi angka dan hierarki paket.

```tsx
// 20.1 Pricing Card (The Factor Plan)
// Radius XL (16px), Hairline Border, Mono Typography untuk harga.
// Highlighted plan menggunakan DiagonalStripes (3% opacity).
<div className="relative flex flex-col p-8 rounded-[16px] border-[1px] border-amber-500/50 bg-slate-900 shadow-xl overflow-hidden">
  <div className="absolute inset-0 [background-image:repeating-linear-gradient(45deg,rgba(251,191,36,0.03)_0,rgba(251,191,36,0.03)_1px,transparent_1px,transparent_6px)]" />
  <span className="font-mono text-[10px] text-amber-500 uppercase font-bold tracking-[0.2em] mb-4">RECOMMENDED: PRO_TIER</span>
  <h3 className="text-xl font-bold text-slate-50">PRO PLAN</h3>
  <div className="flex items-baseline gap-1 mt-6">
    <span className="font-mono text-3xl font-bold tracking-tighter">Rp_200.000</span>
    <span className="font-mono text-xs text-slate-500 lowercase">/BULAN</span>
  </div>
</div>

// 20.2 Billing Table (Tabular Data)
// Semua angka menggunakan Geist Mono untuk ketelitian pembacaan.
<tr className="border-b border-slate-800/50 hover:bg-slate-50/5">
  <td className="py-4 font-mono text-xs text-slate-400">2026-02-04</td>
  <td className="py-4"><span className="font-mono text-xs text-slate-100 font-bold uppercase">TOPUP_CREDIT: 100_CREDITS</span></td>
  <td className="py-4 text-right font-mono text-xs text-emerald-500 font-bold">Rp_25.000</td>
</tr>

// 20.3 Payment Module (Deep Terminal Mode)
// Background gelap solid, font Mono neon-like untuk kode VA/Pembayaran.
<div className="p-6 bg-black border border-slate-800 rounded-[12px] flex flex-col gap-4 text-center">
  <span className="font-mono text-[10px] text-slate-500 uppercase">VIRTUAL_ACCOUNT_NUMBER</span>
  <div className="py-4 px-2 border-y border-slate-900">
    <span className="font-mono text-2xl font-bold text-amber-400 tracking-[0.3em]">8801_0812_3456_7890</span>
  </div>
</div>
```

---
> [!TIP]
> **Mechanical Pro-Tip**: Jangan biarkan ada teks naratif di card yang menggunakan Sans jika teks tersebut menjelaskan fungsi teknis. Gunakan **Mono** untuk menjaga konsistensi tekstur industri.
