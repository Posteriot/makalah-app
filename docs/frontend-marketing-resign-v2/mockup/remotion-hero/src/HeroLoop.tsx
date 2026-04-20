import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export const HeroLoop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animation logic
  const text = "## Framework Metodologi\n\nPenelitian ini mengusulkan kerangka kerja neural network baru untuk eksperimentasi materi. Kami mengembangkan arsitektur qubit yang mempercepat iterasi...";
  const charsToShow = Math.floor(interpolate(frame, [30, 90], [0, text.length], {
    extrapolateRight: 'clamp',
    extrapolateLeft: 'clamp'
  }));
  const typedText = text.substring(0, charsToShow);

  // Sidebar slide in at frame 100
  const sidebarSlide = spring({
    frame: frame - 100,
    fps,
    config: { damping: 14 }
  });

  // AI Assistant response typing at frame 130
  const aiText1 = "Kurasa penjelasan metodologi Qubit-nya kurang lengkap. Mau gue tambahin sitasi relevan dari jurnal terbaru buat memperkuat argumen?";
  const aiChars1 = Math.floor(interpolate(frame, [140, 190], [0, aiText1.length], { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }));
  const aiBubble1 = aiText1.substring(0, aiChars1);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a', color: '#f4f4f5', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {/* Background glow similar to main site */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '80%', height: '80%',
        background: 'radial-gradient(circle, rgba(217, 119, 6, 0.15) 0%, transparent 60%)',
        filter: 'blur(80px)', zIndex: 0
      }} />

      {/* Thin glass border representing the video edge */}
      <div style={{
         position: 'absolute', inset: 0,
         boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
         zIndex: 10, pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', width: '100%', height: '100%', zIndex: 1, position: 'relative' }}>
        {/* Editor Panel (Left) */}
        <div style={{ flex: 1, padding: '40px 60px', display: 'flex', flexDirection: 'column' }}>
          {/* Header Mock */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#333' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#333' }}></div>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#333' }}></div>
            <div style={{ marginLeft: '12px', padding: '6px 12px', background: '#1a1a1a', borderRadius: '6px', fontSize: '13px', color: '#a1a1aa' }}>Paper: Quantum AI</div>
            <div style={{ padding: '6px 12px', background: 'rgba(217, 119, 6, 0.15)', color: '#fbbf24', borderRadius: '6px', fontSize: '13px' }}>Auto-saved</div>
          </div>
          
          <div style={{ fontSize: '18px', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#d4d4d8', maxWidth: '800px' }}>
            {typedText}
            {frame > 30 && frame < 90 && frame % 15 < 7 ? <span style={{ borderRight: '2px solid #fbbf24' }} /> : null}
          </div>
        </div>

        {/* AI Sidebar (Right) */}
        <div style={{ 
          width: '380px', 
          backgroundColor: 'rgba(10, 10, 10, 0.8)', 
          backdropFilter: 'blur(10px)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          transform: `translateX(${(1 - sidebarSlide) * 100}%)`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '15px', fontWeight: 'bold', color: '#e5e5e5' }}>
            ✨ Asisten Makalah AI
          </div>
          
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {frame >= 140 && (
               <div style={{ 
                 background: 'rgba(255,255,255,0.05)', 
                 padding: '16px', 
                 borderRadius: '12px',
                 fontSize: '14px',
                 lineHeight: 1.6,
                 border: '1px solid rgba(255,255,255,0.08)'
               }}>
                 {aiBubble1}
               </div>
            )}
            {frame >= 210 && (
               <div style={{
                 transform: `scale(${spring({frame: frame - 210, fps})})`,
                 opacity: interpolate(frame, [210, 220], [0, 1]),
                 background: 'linear-gradient(to right, #d97706, #b45309)',
                 color: '#fff',
                 padding: '12px 20px',
                 borderRadius: '8px',
                 fontSize: '13px',
                 fontWeight: 'bold',
                 alignSelf: 'flex-start',
                 boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)'
               }}>
                 + Tambah Sitasi
               </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
