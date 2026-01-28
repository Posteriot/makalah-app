Step-by-Step: Setup Xendit Payment Testing                                                                
                                                                                                            
  Step 1: Daftar & Dapatkan API Keys dari Xendit                                                            
                                                                                                            
  1. Buka Xendit Dashboard                                                                                  
  https://dashboard.xendit.co                                                                               
  2. Sign up / Login - Pakai email bisnis lo                                                                
  3. Masuk ke Settings → API Keys                                                                           
    - Di sidebar kiri, klik Settings → API Keys                                                             
  4. Generate Secret Key (Sandbox)                                                                          
    - Pastikan toggle Test Mode aktif (biasanya di pojok kanan atas)                                        
    - Copy Secret API Key yang dimulai dengan xnd_development_...                                           
                                                                                                            
  Contoh: xnd_development_P4qDfOss0OCpl8RtKrROHjaQYNCk...                                                   
  5. Generate Webhook Verification Token                                                                    
    - Di halaman yang sama, scroll ke bagian Webhooks                                                       
    - Klik Create Webhook                                                                                   
    - Nanti lo bakal dapet Verification Token - copy ini juga                                               
                                                                                                            
  ---                                                                                                       
  Step 2: Set Environment Variables                                                                         
                                                                                                            
  1. Buka file .env.local di root project                                                                   
  2. Tambahkan variables ini:                                                                               
                                                                                                            
  # Xendit Payment Gateway                                                                                  
  XENDIT_SECRET_KEY=xnd_development_P4qDfOss0OCpl8RtKrROHjaQYNCk...                                         
  XENDIT_WEBHOOK_TOKEN=your_webhook_verification_token_here                                                 
                                                                                                            
  # Pastikan APP_URL juga ada (untuk e-wallet redirect)                                                     
  APP_URL=http://localhost:3000                                                                             
  3. Restart Next.js dev server kalau sudah jalan                                                           
  # Stop dulu (Ctrl+C), lalu start lagi                                                                     
  npm run dev                                                                                               
                                                                                                            
  ---                                                                                                       
  Step 3: Setup ngrok untuk Webhook                                                                         
                                                                                                            
  Xendit perlu bisa hit webhook lo dari internet. Karena localhost gak bisa diakses dari luar, pakai ngrok. 
                                                                                                            
  1. Install ngrok (kalau belum)                                                                            
  # macOS dengan Homebrew                                                                                   
  brew install ngrok                                                                                        
                                                                                                            
  # atau download dari https://ngrok.com/download                                                           
  2. Start ngrok                                                                                            
  ngrok http 3000                                                                                           
  3. Copy HTTPS URL yang muncul                                                                             
  Session Status                online                                                                      
  Account                       your-email (Plan: Free)                                                     
  Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000                      
                                                                                                            
  3. Copy URL ini: https://abc123.ngrok-free.app                                                            
                                                                                                            
  ---                                                                                                       
  Step 4: Configure Webhook di Xendit Dashboard                                                             
                                                                                                            
  1. Buka Xendit Dashboard → Settings → Webhooks                                                            
  2. Klik "Add Webhook URL"                                                                                 
  3. Isi form:                                                                                              
    - URL: https://abc123.ngrok-free.app/api/webhooks/xendit                                                
  (ganti abc123.ngrok-free.app dengan URL ngrok lo)                                                         
    - Events: Centang semua, atau minimal:                                                                  
        - payment_request.succeeded                                                                         
      - payment_request.failed                                                                              
      - payment_request.expired                                                                             
  4. Save webhook                                                                                           
  5. Test webhook (optional)                                                                                
    - Klik tombol "Test" di sebelah webhook                                                                 
    - Cek terminal ngrok, harusnya ada request masuk                                                        
    - Cek terminal Next.js, harusnya ada log [Xendit Webhook]                                               
                                                                                                            
  ---                                                                                                       
  Step 5: Test Top Up Flow                                                                                  
                                                                                                            
  1. Buka browser: http://localhost:3000                                                                    
  2. Login dengan akun yang sudah ada                                                                       
  3. Navigate ke Top Up page:                                                                               
  http://localhost:3000/subscription/topup                                                                  
  4. Pilih nominal (misal Rp 50.000)                                                                        
  5. Pilih metode pembayaran:                                                                               
    - QRIS - Akan muncul QR code                                                                            
    - Virtual Account - Pilih bank, akan muncul nomor VA                                                    
    - E-Wallet - Akan redirect ke halaman Xendit                                                            
  6. Untuk testing QRIS/VA di Sandbox:                                                                      
    - Buka Xendit Dashboard → Transactions → Payment Requests                                               
    - Cari payment yang baru dibuat                                                                         
    - Klik Simulate Payment (tombol di kanan)                                                               
    - Pilih status: SUCCEEDED                                                                               
    - Klik Simulate                                                                                         
  7. Verifikasi hasil:                                                                                      
    - Cek terminal Next.js - harusnya ada log webhook received                                              
    - Cek saldo di /subscription/overview - harusnya bertambah                                              
    - Cek Convex dashboard - payment status jadi SUCCEEDED                                                  
                                                                                                            
  ---                                                                                                       
  Troubleshooting                                                                                           
                                                                                                            
  Webhook tidak masuk?                                                                                      
  # Cek ngrok masih jalan                                                                                   
  # Cek URL di Xendit Dashboard benar                                                                       
  # Cek logs: tail -f di terminal ngrok                                                                     
                                                                                                            
  Error "XENDIT_SECRET_KEY is not configured"?                                                              
  # Pastikan .env.local ada dan benar                                                                       
  # Restart Next.js dev server                                                                              
                                                                                                            
  Error 401 Unauthorized di webhook?                                                                        
  # Pastikan XENDIT_WEBHOOK_TOKEN di .env.local                                                             
  # sama persis dengan yang di Xendit Dashboard                                                             
                                                                                                            
  QR Code tidak muncul?                                                                                     
  # Cek next.config.ts ada domain qr.xendit.co                                                              
  # Cek browser console untuk error                                                                         
                                                                                                            
  ---                                                                                                       
  Terminal Setup (3 tabs)                                                                                   
                                                                                                            
  # Tab 1: Next.js                                                                                          
  npm run dev                                                                                               
                                                                                                            
  # Tab 2: Convex                                                                                           
  npm run convex:dev                                                                                        
                                                                                                            
  # Tab 3: ngrok                                                                                            
  ngrok http 3000  