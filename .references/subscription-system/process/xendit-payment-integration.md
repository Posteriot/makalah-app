  Phase 4: Xendit Payment Integration - Complete                                                            
                                                                                                            
  1. Xendit Client Library (src/lib/xendit/client.ts)                                                       
    - QRIS, Virtual Account, E-Wallet payment creation                                                      
    - Basic auth with secret key pattern                                                                    
    - Webhook token verification helper                                                                     
  2. Payment API Route (src/app/api/payments/topup/route.ts)                                                
    - Creates payment request based on method                                                               
    - Saves to Convex with idempotency key                                                                  
    - Returns QR code URL / VA number / redirect URL                                                        
  3. Webhook Handler (src/app/api/webhooks/xendit/route.ts)                                                 
    - Verifies x-callback-token header                                                                      
    - Updates payment status                                                                                
    - Adds credits on success                                                                               
  ─────────────────────────────────────────────────                                                         
                                                                                                            
  Phase 4: Xendit Payment Integration sudah selesai. Summary:                                               
                                                                                                            
  Files Created:                                                                                            
  - src/lib/xendit/client.ts - Xendit API client                                                            
  - src/app/api/payments/topup/route.ts - Top up payment creation                                           
  - src/app/api/webhooks/xendit/route.ts - Webhook handler                                                  
  - src/app/(dashboard)/subscription/topup/success/page.tsx - E-wallet success page                         
  - src/app/(dashboard)/subscription/topup/failed/page.tsx - E-wallet failed page                           
                                                                                                            
  Files Updated:                                                                                            
  - src/app/(dashboard)/subscription/topup/page.tsx - Connected to real API                                 
  - next.config.ts - Added Xendit QR code image domain                                                      
  - CLAUDE.md - Added Xendit env vars + billing documentation                                               
                                                                                                            
  Environment Variables yang diperlukan:                                                                    
  XENDIT_SECRET_KEY=xnd_development_xxx  # atau production key                                              
  XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token                                                      
                                                                                                            
  Untuk testing:                                                                                            
  1. Set env vars di .env.local                                                                             
  2. Start ngrok: ngrok http 3000                                                                           
  3. Configure webhook URL di Xendit Dashboard                                                              
  4. Test top up di /subscription/topup                                                                     
                                                                                                            
  Convex functions (payments.ts, credits.ts) sudah siap dari sebelumnya. Flow lengkapnya:                   
                                                                                                            
  User pilih nominal & method                                                                               
      ↓                                                                                                     
  POST /api/payments/topup                                                                                  
      ↓                                                                                                     
  Xendit API create payment                                                                                 
      ↓                                                                                                     
  Save to Convex (PENDING)                                                                                  
      ↓                                                                                                     
  Show QR/VA number                                                                                         
      ↓                                                                                                     
  User bayar                                                                                                
      ↓                                                                                                     
  Xendit webhook → /api/webhooks/xendit                                                                     
      ↓                                                                                                     
  Update payment status (SUCCEEDED)                                                                         
      ↓                                                                                                     
  Add credits to user balance                                                                               
                                