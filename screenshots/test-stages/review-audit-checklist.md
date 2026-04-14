Per-Stage Review/Audit Checklist (Final)                                       
   
  A. Tool Chain & Artifact Lifecycle                                             
                                                            
  1. Tool ordering benar — artifact muncul SETELAH respons chat, bukan           
  sebelum/bersamaan. Verify dari: [F1-F6-TEST] ToolChainOrder { correct: true }
  2. Tidak ada tool call text leakage — model nggak print nama tool atau JSON    
  tool call sebagai teks di chat. Verify dari: [PAPER][outcome-guard] kalau ada  
  correction, atau visual inspection.                                           
                                                                                 
  B. Unified Process UI                                                          
                                                                                
  3. UnifiedProcessCard muncul di setiap respons assistant selama stage aktif.   
  Verify dari: [UNIFIED-PROCESS-UI] di browser console.     
  4. Task counter konsisten — progress counter naik sesuai data yang disimpan,   
  dan semua task tercentang (✅) sebelum stage di-submit. Verify dari:           
  [UNIFIED-PROCESS-UI] progress=N/N harus match [F1-F6-TEST] updateStageData {  
  dataKeys }.                                                                    
                                                            
  C. Choice Card & Validation                                                   

  5. Choice card muncul dengan button confirmation (bukan numbered list/bullet). 
  Verify dari: [F1-F6-TEST] ChoiceCardSpec { hasSubmitButton: true }.
  6. Validation panel muncul setelah submitStageForValidation. Verify dari:      
  [F1-F6-TEST] submitStageForValidation { status: "pending_validation" }.        
                                                                                
  D. Response Quality                                                            
                                                            
  7. Brief muncul — respons yang menyertai artifact berisi summary               
  keputusan/angle (2-4 kalimat), bukan cuma "silakan cek artifact". Ini
  visual/content judgment, nggak bisa di-automate dari log.                      
                                                            
  E. Search Policy Compliance                                                    
   
  8. Active stages (gagasan, tinjauan_literatur) — search berjalan kalau         
  diperlukan. Passive stages (semua lainnya) — search TIDAK berjalan kecuali user
   explicit minta. Verify dari: [F1-F6-TEST] SearchDecision { stage, search,     
  reason }.                                                 
                                                                                
  F. Architecture-Specific (test sekali, bukan per-stage)                        
   
  9. Auto paper session — conversation baru langsung punya paper session tanpa   
  startPaperSession tool call. Verify dari: [PAPER][session-resolve] di request
  pertama menunjukkan stage=gagasan.                                             
  10. Completed state — setelah stage 14 approved, model responds normal (bukan
  short-circuit). Rewind via timeline ke stage mana aja works.                   
  11. Stage transition — setiap approve menghasilkan [PAPER][stage-transition] 
  stageA → stageB di Convex logs.                                                

  G. Edit/Resend stageData Reset

  12. Edit/resend on incomplete stage — jika user edit/resend pesan apapun
  saat stage belum punya artifact, stageData harus di-clear. Model harus mulai
  fresh (choice card baru untuk stage yang pakai choice card, atau diskusi ulang
  untuk stage yang nggak pakai).

  Verify dari 3 sumber:
  - Terminal: [PAPER][session-resolve] ... postEditResendReset=true
    (muncul di request setelah edit/resend, menandakan stageData empty)
  - Convex logs: [PAPER][edit-resend-reset] stage=X cleared=[field1,field2,...]
    (muncul saat mutation jalan, menandakan fields mana yang di-clear)
  - Browser console: [PAPER][edit-resend-reset] Client: stage=X cleared=N fields
    (konfirmasi client-side bahwa mutation berhasil)

  Guard behavior:
  - HARUS reset: stageData ada tapi artifactId belum ada (stage incomplete)
  - NGGAK BOLEH reset: artifactId sudah ada (stage complete/revision)
  - NGGAK BOLEH reset: stage = "completed"
  - NGGAK BOLEH block edit/resend: kalau reset gagal, edit/resend tetap jalan
                                                            
  Mana yang per-stage, mana yang sekali?                                         
                                                            
  ┌──────┬────────────────────────────────────────────────────┐                  
  │ Item │                     Frequency                      │
  ├──────┼────────────────────────────────────────────────────┤                  
  │ 1-8  │ Per stage — verify di setiap stage 1-14            │
  ├──────┼────────────────────────────────────────────────────┤                 
  │ 9    │ Sekali — di stage 1 (first message)                │                  
  ├──────┼────────────────────────────────────────────────────┤                  
  │ 10   │ Sekali — setelah stage 14 approved                 │                  
  ├──────┼────────────────────────────────────────────────────┤                  
  │ 11   │ Per stage — tapi cukup spot-check dari Convex logs │
  ├──────┼────────────────────────────────────────────────────┤                  
  │ 12   │ Spot-check — test 1-2x saat edit/resend terjadi   │                 
  └──────┴────────────────────────────────────────────────────┘  