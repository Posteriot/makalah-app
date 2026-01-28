★ Insight ─────────────────────────────────────                                                           
  Billing System Architecture:                                                                              
  - usageEvents: Granular tracking per API call (tokens, cost, operation type)                              
  - userQuotas: Aggregated monthly/daily limits with period reset                                           
  - creditBalances: BPP prepaid system dengan lifetime stats                                                
  - payments: Xendit transaction records dengan idempotency                                                 
  - subscriptions: Pro recurring billing dengan cancellation flow                                           
  ─────────────────────────────────────────────────                                                         
                                                                                                            
  Phase 2 Summary: Convex Schema & Functions                                                                
                                                                                                            
  Database Tables Created (5 new tables)                                                                    
  ┌────────────────┬────────────────────────────────────┐                                                   
  │     Table      │              Purpose               │                                                   
  ├────────────────┼────────────────────────────────────┤                                                   
  │ usageEvents    │ Track setiap token usage event     │                                                   
  ├────────────────┼────────────────────────────────────┤                                                   
  │ userQuotas     │ Monthly/daily quota state per user │                                                   
  ├────────────────┼────────────────────────────────────┤                                                   
  │ creditBalances │ Credit balance untuk BPP tier      │                                                   
  ├────────────────┼────────────────────────────────────┤                                                   
  │ payments       │ Xendit payment transaction records │                                                   
  ├────────────────┼────────────────────────────────────┤                                                   
  │ subscriptions  │ Pro tier recurring subscription    │                                                   
  └────────────────┴────────────────────────────────────┘                                                   
  Convex Functions Created (convex/billing/)                                                                
  ┌──────────────────┬────────────────────────────────────────────────────────────────────────────────────┐ 
  │       File       │                                     Functions                                      │ 
  ├──────────────────┼────────────────────────────────────────────────────────────────────────────────────┤ 
  │ constants.ts     │ Tier limits, pricing, helpers                                                      │ 
  ├──────────────────┼────────────────────────────────────────────────────────────────────────────────────┤ 
  │ usage.ts         │ recordUsage, getMonthlyBreakdown, getTodayUsage, getSessionUsage                   │ 
  ├──────────────────┼────────────────────────────────────────────────────────────────────────────────────┤ 
  │ quotas.ts        │ getUserQuota, checkQuota, deductQuota, initializeQuota, getQuotaStatus             │ 
  ├──────────────────┼────────────────────────────────────────────────────────────────────────────────────┤ 
  │ credits.ts       │ getCreditBalance, addCredits, deductCredits, checkCredits, getCreditHistory        │ 
  ├──────────────────┼────────────────────────────────────────────────────────────────────────────────────┤ 
  │ payments.ts      │ createPayment, updatePaymentStatus, getPaymentHistory, getPaymentStats             │ 
  ├──────────────────┼────────────────────────────────────────────────────────────────────────────────────┤ 
  │ subscriptions.ts │ createSubscription, renewSubscription, cancelSubscription, checkSubscriptionStatus │ 
  └──────────────────┴────────────────────────────────────────────────────────────────────────────────────┘ 
  UI Pages Updated (use real Convex queries)                                                                
                                                                                                            
  - /subscription/overview - Real quota status, usage breakdown, credit balance                             
  - /subscription/topup - Real credit balance display                                                       
  - /subscription/history - Real transaction history from getCreditHistory                                  
  - /subscription/upgrade - Real subscription status check                                                  
                                                                                                            
  Next Steps (Phase 3-4)                                                                                    
                                                                                                            
  Phase 3: Usage Tracking Implementation                                                                    
  - Integrate recordUsage ke src/app/api/chat/route.ts via onFinish callback                                
  - Add enforceQuota pre-flight check sebelum AI call                                                       
  - Create QuotaWarningBanner component untuk chat interface                                                
                                                                                                            
  Phase 4: Xendit Integration                                                                               
  - Create API routes: /api/payments/topup, /api/webhooks/xendit                                            
  - Implement QRIS/VA payment flow                                                                          
  - Connect real payment to addCredits mutation                    