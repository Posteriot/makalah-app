Design Summary: Aktivasi UI Pembayaran BPP                                           
                                                                                       
  Section 1: Scope & Goals                                                             
                                                                                       
  Scope Phase 1:                                                                       
  - Aktivasi tier BPP (Bayar Per Paper) only                                           
  - Pro ditandai "Segera Hadir"                                                        
  - Email notifikasi sukses & gagal                                                    
                                                                                       
  Goals:                                                                               
  1. User bisa signup gratis → pilih BPP → bayar → dapat saldo                         
  2. Single source of truth: pricingPlans Convex                                       
  3. Real-time payment status update                                                   
  4. Professional email konfirmasi                                                     
                                                                                       
  Out of Scope (Phase 2):                                                              
  - Pro subscription flow                                                              
  - Xendit recurring payment                                                           
  - Downgrade Pro → BPP     


  ----

  Section 2: Page Structure & Routes                                                   
                                                                                       
  Perubahan Struktur:                                                                  
                                                                                       
  EXISTING (tetap):                                                                    
  ├── /subscription/overview     → Dashboard status + usage                            
                                                                                       
  NEW/MODIFIED:                                                                        
  ├── /subscription/plans        → Hub pilih tier (BARU)                               
  │   ├── Gratis card           → "Tier saat ini" indicator                            
  │   ├── BPP card              → Expand → pilih nominal → bayar inline                
  │   └── Pro card              → "Segera Hadir" badge                                 
  │                                                                                    
  ├── /subscription/topup        → REFACTOR: fetch data dari Convex                    
  │   └── Direct access untuk user BPP existing                                        
                                                                                       
  DEPRECATED:                                                                          
  ├── /subscription/upgrade      → Redirect ke /subscription/plans                     
                                                                                       
  URL Flow dari Marketing:                                                             
                                                                                       
  Marketing /pricing                                                                   
      │                                                                                
      ├─ Klik "Coba Sekarang" (Gratis)                                                 
      │   └─→ /auth → /chat                                                            
      │                                                                                
      ├─ Klik "Pilih Paket" (BPP)                                                      
      │   └─→ /auth?redirect_url=/subscription/plans → /subscription/plans             
      │                                                                                
      └─ Klik "Segera Hadir" (Pro)                                                     
          └─→ Disabled button (no action)    

          ---

          Section 3: Data Flow & Single Source of Truth                                        
                                                                                       
  Convex pricingPlans sebagai SSoT:                                                    
                                                                                       
  ┌─────────────────────────────────────────────────────────────┐                      
  │  Convex: pricingPlans table                                 │                      
  │  ─────────────────────────────────────────────────────────  │                      
  │  slug: "gratis" | "bpp" | "pro"                             │                      
  │  price, unit, features[], ctaText, ctaHref                  │                      
  │  isHighlighted, isDisabled                                  │                      
  │  NEW: topupOptions?: [{ amount, tokens, label, popular }]   │                      
  └─────────────────────────────────────────────────────────────┘                      
            │                                                                          
            ▼                                                                          
      ┌─────────────────┐     ┌─────────────────┐                                      
      │ Marketing Page  │     │ Dashboard /plans │                                     
      │ PricingSection  │     │ PlanSelector     │                                     
      └─────────────────┘     └─────────────────┘                                      
            │                         │                                                
            └────────┬────────────────┘                                                
                     ▼                                                                 
            useQuery(api.pricingPlans.getActivePlans)                                  
                                                                                       
  Perubahan Schema:                                                                    
                                                                                       
  // Extend pricingPlans untuk BPP topup options                                       
  pricingPlans: defineTable({                                                          
    // ... existing fields                                                             
    topupOptions: v.optional(v.array(v.object({                                        
      amount: v.number(),      // 25000, 50000, 100000                                 
      tokens: v.number(),      // 250000, 500000, 1000000                              
      label: v.string(),       // "Rp 25.000"                                          
      popular: v.boolean(),    // highlight tag                                        
    }))),                                                                              
  })                                                                                   
                                                                                       
  ---   

  ⏺ Section 4: Payment Flow & Real-time Update                                           
                                                                                       
  Flow Pembayaran BPP:                                                                 
                                                                                       
  User di /subscription/plans                                                          
      │                                                                                
      ├─ 1. Expand BPP card                                                            
      ├─ 2. Pilih nominal (dari topupOptions)                                          
      ├─ 3. Pilih metode (QRIS/VA/E-Wallet)                                            
      ├─ 4. Klik "Bayar"                                                               
      │                                                                                
      ▼                                                                                
  POST /api/payments/topup                                                             
      │                                                                                
      ├─ Create Xendit payment request                                                 
      ├─ Save to Convex `payments` table                                               
      └─ Return paymentId + QR/VA/redirect                                             
      │                                                                                
      ▼                                                                                
  UI: Tampilkan QR/VA number + loading state                                           
      │                                                                                
      ├─ useQuery(api.billing.payments.watchPaymentStatus, { paymentId })              
      │   └─ Convex reactive: auto-update saat webhook masuk                           
      │                                                                                
      ▼                                                                                
  Xendit Webhook → /api/webhooks/xendit                                                
      │                                                                                
      ├─ payment_request.succeeded                                                     
      │   ├─ Update payment status → "SUCCEEDED"                                       
      │   ├─ addCredits() → update creditBalance                                       
      │   ├─ Update user.subscriptionStatus → "bpp" (if was "free")                    
      │   └─ Send success email (Resend)                                               
      │                                                                                
      ├─ payment_request.failed                                                        
      │   ├─ Update payment status → "FAILED"                                          
      │   └─ Send failure email (Resend)                                               
      │                                                                                
      └─ payment_request.expired                                                       
          └─ Update payment status → "EXPIRED"                                         
      │                                                                                
      ▼                                                                                
  UI: Real-time update via Convex subscription                                         
      │                                                                                
      ├─ SUCCEEDED → Show success state + new balance                                  
      ├─ FAILED → Show error + "Coba Lagi" button                                      
      └─ EXPIRED → Show expired + "Coba Lagi" button   


      ---

      Section 5: Email Templates (React Email)                                             
                                                                                       
  Setup:                                                                               
  - Install @react-email/components + react-email                                      
  - Templates di src/emails/ directory                                                 
                                                                                       
  Templates yang dibutuhkan:                                                           
                                                                                       
  src/emails/                                                                          
  ├── components/                                                                      
  │   ├── EmailLayout.tsx      → Header, footer, branding                              
  │   └── TransactionDetails.tsx → Reusable receipt block                              
  │                                                                                    
  ├── PaymentSuccessEmail.tsx                                                          
  │   ├── Subject: "Pembayaran Berhasil - Makalah AI"                                  
  │   ├── Content:                                                                     
  │   │   - Greeting dengan nama user                                                  
  │   │   - Detail transaksi (nominal, metode, tanggal)                                
  │   │   - Saldo baru + equivalent tokens                                             
  │   │   - Transaction ID                                                             
  │   │   - CTA: "Mulai Menyusun Paper"                                                
  │   └── Footer: support contact                                                      
  │                                                                                    
  └── PaymentFailedEmail.tsx                                                           
      ├── Subject: "Pembayaran Gagal - Makalah AI"                                     
      ├── Content:                                                                     
      │   - Greeting dengan nama user                                                  
      │   - Detail transaksi yang gagal                                                
      │   - Alasan kegagalan (if available)                                            
      │   - CTA: "Coba Lagi"                                                           
      └── Footer: support contact                                                      
                                                                                       
  Integration Point:                                                                   
  - Dipanggil dari /api/webhooks/xendit setelah update status                          
  - Pakai Resend SDK yang sudah ada

  Section 6: Database Migrations & Updates                                             
                                                                                       
  Perubahan yang dibutuhkan:                                                           
                                                                                       
  1. Schema Update - convex/schema.ts:                                                 
  // Add topupOptions to pricingPlans                                                  
  pricingPlans: defineTable({                                                          
    // ... existing fields                                                             
    topupOptions: v.optional(v.array(v.object({                                        
      amount: v.number(),                                                              
      tokens: v.number(),                                                              
      label: v.string(),                                                               
      popular: v.boolean(),                                                            
    }))),                                                                              
  })                                                                                   
                                                                                       
  2. Migration Script - Update existing pricingPlans:                                  
  npx convex run migrations:activateBPPPricing                                         
  - Set BPP isDisabled: false                                                          
  - Set BPP ctaHref: "/subscription/plans"                                             
  - Add topupOptions ke BPP plan                                                       
  - Set Pro ctaText: "Segera Hadir" (tetap disabled)                                   
  - Update isHighlighted → BPP jadi highlighted                                        
                                                                                       
  3. New Convex Query:                                                                 
  // api.pricingPlans.getPlanBySlug                                                    
  // Untuk fetch single plan dengan topupOptions                                       
                                                                                       
  4. New Convex Query for Payment Watch:                                               
  // api.billing.payments.watchPaymentStatus                                           
  // Real-time subscription untuk payment status   

   Section 7: Implementation Checklist                                                  
                                                                                       
  Files to CREATE:                                                                     
  File: src/app/(dashboard)/subscription/plans/page.tsx                                
  Deskripsi: Hub pilih tier dengan inline topup                                        
  ────────────────────────────────────────                                             
  File: src/emails/components/EmailLayout.tsx                                          
  Deskripsi: Shared email layout + branding                                            
  ────────────────────────────────────────                                             
  File: src/emails/PaymentSuccessEmail.tsx                                             
  Deskripsi: Template sukses                                                           
  ────────────────────────────────────────                                             
  File: src/emails/PaymentFailedEmail.tsx                                              
  Deskripsi: Template gagal                                                            
  ────────────────────────────────────────                                             
  File: src/lib/email/sendPaymentEmail.ts                                              
  Deskripsi: Helper function send email                                                
  ────────────────────────────────────────                                             
  File: convex/migrations/activateBPPPricing.ts                                        
  Deskripsi: Migration script                                                          
  Files to MODIFY:                                                                     
  File: convex/schema.ts                                                               
  Perubahan: Add topupOptions ke pricingPlans                                          
  ────────────────────────────────────────                                             
  File: convex/pricingPlans.ts                                                         
  Perubahan: Add getPlanBySlug query                                                   
  ────────────────────────────────────────                                             
  File: convex/billing/payments.ts                                                     
  Perubahan: Add watchPaymentStatus query                                              
  ────────────────────────────────────────                                             
  File: src/app/(dashboard)/subscription/topup/page.tsx                                
  Perubahan: Refactor: fetch dari Convex, add real-time status                         
  ────────────────────────────────────────                                             
  File: src/app/(dashboard)/subscription/upgrade/page.tsx                              
  Perubahan: Redirect ke /plans                                                        
  ────────────────────────────────────────                                             
  File: src/app/api/webhooks/xendit/route.ts                                           
  Perubahan: Add email sending                                                         
  ────────────────────────────────────────                                             
  File: src/components/marketing/PricingSection.tsx                                    
  Perubahan: Update ctaHref untuk BPP                                                  
  Files to DELETE:                                                                     
  - None (upgrade page jadi redirect saja)  