★ Insight ─────────────────────────────────────                                                           
  - AI SDK v5 Naming: Menggunakan inputTokens/outputTokens bukan promptTokens/completionTokens dari versi   
  sebelumnya                                                                                                
  - Defensive Null Handling: Semua token akses menggunakan ?? 0 untuk handle undefined, karena provider     
  berbeda bisa mengembalikan data berbeda                                                                   
  - Non-blocking Billing: Usage recording menggunakan .catch() sehingga billing failure tidak mengganggu    
  user experience                                                                                           
  ─────────────────────────────────────────────────                                                         
                                                                                                            
  Summary Phase 3 Completed:                                                                                
                                                                                                            
  1. Pre-flight Quota Check (src/lib/billing/enforcement.ts)                                                
    - checkQuotaBeforeOperation() - Cek kuota sebelum AI call                                               
    - Returns 402 Payment Required jika kuota habis                                                         
    - Supports tier: gratis, bpp, pro                                                                       
  2. Usage Tracking (4 locations in src/app/api/chat/route.ts)                                              
    - Primary mode (non-web-search) - line ~1192                                                            
    - Primary web search - line ~1624                                                                       
    - Fallback without search - line ~1710                                                                  
    - Fallback web search (:online) - line ~1912                                                            
  3. QuotaWarningBanner Component (src/components/chat/QuotaWarningBanner.tsx)                              
    - Shows warning at 70% usage, critical at 90%, depleted at 100%                                         
    - Supports BPP tier (credit-based) with IDR balance warnings                                            
    - Dismissible but auto-reappears after quota reset                                                      
    - Integrated into ChatWindow                                                                            
  4. Bug Fixes                                                                                              
    - Added percentUsed computed field to getUserQuota return                                               
    - Fixed AI SDK v5 token naming (inputTokens/outputTokens)                                               
    - Added getById query to users.ts     