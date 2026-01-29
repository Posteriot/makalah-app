Sistem billing ini menggunakan arsitektur hybrid 3-tier dengan Xendit sebagai payment
   gateway:                                                                            
  1. Gratis - Quota-based (monthly token limit)                                        
  2. BPP (Bayar Per Paper) - Credit-based (prepaid balance)                            
  3. Pro - Subscription-based (recurring billing)                                      
  ─────────────────────────────────────────────────                                    
                                                                                       
  Ringkasan Alur Subscription                                                          
                                                                                       
  1. Entry Point: Marketing Pages                                                      
                                                                                       
  PricingSection.tsx dan /pricing                                                      
  - Menampilkan 3 tier dari tabel pricingPlans (Convex)                                
  - Setiap card punya ctaHref yang mengarah ke halaman subscription                    
  - Contoh: BPP → /subscription/topup, Pro → /subscription/upgrade                     
                                                                                       
  2. Dashboard Subscription Pages                                                      
                                                                                       
  /subscription          → redirect ke /subscription/overview                          
  /subscription/overview → Status tier, quota usage, credit balance                    
  /subscription/topup    → Top-up credit untuk BPP                                     
  /subscription/upgrade  → Upgrade ke Pro (BELUM IMPLEMENTASI)                         
                                                                                       
  3. Alur BPP (Bayar Per Paper)                                                        
                                                                                       
  Ini yang SUDAH berfungsi:                                                            
                                                                                       
  User (Gratis) → /subscription/topup → Pilih nominal & metode bayar                   
                                             │                                         
                  POST /api/payments/topup   │                                         
                                             ▼                                         
                           Xendit API (v2024-11-11)                                    
                           Create Payment Request                                      
                                             │                                         
                      ┌──────────────────────┼──────────────────────┐                  
                      ▼                      ▼                      ▼                  
                    QRIS                Virtual Account         E-Wallet               
                  QR Code               (BCA/BNI/BRI/           (OVO/GoPay)            
                                        Mandiri)                                       
                                             │                                         
                                             ▼                                         
                            User bayar → Xendit Webhook                                
                            POST /api/webhooks/xendit                                  
                                             │                                         
                            handlePaymentSuccess()                                     
                                             │                                         
                            api.billing.credits.addCredits()                           
                                             │                                         
                                             ▼                                         
                            User tier berubah: "free" → "bpp"                          
                            Credit balance bertambah                                   
                                                                                       
  Nominal top-up yang tersedia:                                                        
  - Rp 25.000 = 250.000 tokens                                                         
  - Rp 50.000 = 500.000 tokens (Popular)                                               
  - Rp 100.000 = 1.000.000 tokens                                                      
                                                                                       
  Konversi: Rp 1 = 10 tokens                                                           
                                                                                       
  4. Alur Pro Subscription (BELUM IMPLEMENTASI)                                        
                                                                                       
  Di /subscription/upgrade/page.tsx:97-99:                                             
  const handleUpgrade = async () => {                                                  
    // TODO: Integrate with Xendit subscription                                        
    alert("Fitur upgrade ke Pro belum tersedia...")                                    
  }                                                                                    
                                                                                       
  Yang sudah disiapkan di Convex:                                                      
  - convex/billing/subscriptions.ts - CRUD subscription lengkap                        
  - createSubscription, renewSubscription, cancelSubscription                          
  - Schema subscriptions table sudah ada                                               
                                                                                       
  Yang BELUM ada:                                                                      
  - API route /api/payments/subscribe untuk create subscription                        
  - Integrasi Xendit Recurring Payment                                                 
  - UI flow pembayaran subscription                                                    
                                                                                       
  5. Flow Setelah Pembayaran Berhasil                                                  
                                                                                       
  Xendit Webhook Handler (/api/webhooks/xendit/route.ts):                              
                                                                                       
  Xendit → POST /api/webhooks/xendit                                                   
                │                                                                      
                ├─ Verify x-callback-token                                             
                │                                                                      
                ├─ Event: payment_request.succeeded                                    
                │     │                                                                
                │     ├─ paymentType: "credit_topup"                                   
                │     │     → addCredits() → user.subscriptionStatus = "bpp"           
                │     │                                                                
                │     ├─ paymentType: "subscription_initial"                           
                │     │     → TODO: createSubscription()                               
                │     │                                                                
                │     └─ paymentType: "subscription_renewal"                           
                │           → TODO: renewSubscription()                                
                │                                                                      
                ├─ Event: payment_request.failed                                       
                │     → updatePaymentStatus("FAILED")                                  
                │                                                                      
                └─ Event: payment_request.expired                                      
                      → updatePaymentStatus("EXPIRED")                                 
                                                                                       
  6. Database Schema Terkait                                                           
  ┌────────────────┬───────────────────────────────┐                                   
  │     Table      │            Fungsi             │                                   
  ├────────────────┼───────────────────────────────┤                                   
  │ payments       │ Record semua transaksi Xendit │                                   
  ├────────────────┼───────────────────────────────┤                                   
  │ creditBalances │ Saldo BPP per user            │                                   
  ├────────────────┼───────────────────────────────┤                                   
  │ subscriptions  │ Record langganan Pro          │                                   
  ├────────────────┼───────────────────────────────┤                                   
  │ userQuotas     │ Quota token per periode       │                                   
  ├────────────────┼───────────────────────────────┤                                   
  │ usageEvents    │ Log pemakaian token           │                                   
  └────────────────┴───────────────────────────────┘                                   
  ---                                                                                  
  ★ Insight ─────────────────────────────────────                                      
  Status Implementasi:                                                                 
  - ✅ BPP top-up: Fully implemented (QRIS, VA, E-Wallet)                              
  - ✅ Webhook handling: Implemented                                                   
  - ✅ Credit deduction: Implemented                                                   
  - ⚠️ Pro subscription: Schema ready, UI stub only                                    
  - ⚠️ Subscription renewal: Webhook stub, belum integrasi Xendit Recurring 