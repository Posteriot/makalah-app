"use client"

import { Users, MessageSquare, List, CheckCircle } from "lucide-react"

/**
 * BenefitsSection - "Kenapa Makalah AI?" bento grid layout
 * Features 4 benefit cards in asymmetric grid:
 * - Sparring Partner (large, 2x2)
 * - Chat Natural (1x1)
 * - Sitasi Akurat (1x1)
 * - Dipandu Bertahap (full row, 3x1)
 */
export function BenefitsSection() {
  return (
    <section className="benefits-section" id="kenapa-makalah-ai">
      {/* Background patterns */}
      <div className="benefits-bg-stripes" />
      <div className="benefits-bg-dots" />

      {/* Top border line */}
      <div className="benefits-top-line" />

      <div className="benefits-container">
        {/* Section Header */}
        <div className="benefits-header">
          <div className="benefits-badge">
            <span className="benefits-badge-dot" />
            <span className="benefits-badge-text">Kenapa Makalah AI?</span>
          </div>
          <h2 className="benefits-title">
            Karya kolaborasi dengan AI,
            <br />
            bukan dibuatkan AI.
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">
          {/* Feature 1: Sparring Partner (Large - 2x2) */}
          <div className="bento-item bento-large">
            <div className="bento-content bento-content-row">
              <div className="bento-text-wrap">
                <div className="bento-header-flex">
                  <div className="bento-icon-box">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3>Sparring Partner</h3>
                </div>
                <ul className="bento-checklist">
                  <li>Mendampingi riset dari awal</li>
                  <li>Juru tulis yang terampil</li>
                  <li>Paper akuntabel dan berkualitas</li>
                </ul>
              </div>
              {/* Illustration: Paper Stack */}
              <div className="bento-illustration-static">
                <svg viewBox="0 0 100 100" className="bento-svg">
                  {/* Back paper */}
                  <path d="M35 15h35l15 15v55H35z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M70 15v15h15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  {/* Front paper */}
                  <path d="M20 25h35l15 15v50H20z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M55 25v15h15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  {/* Lines on front paper */}
                  <path d="M30 50h25M30 60h25M30 70h25M30 80h15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="bento-glow" />
          </div>

          {/* Feature 2: Chat Natural */}
          <div className="bento-item">
            <div className="bento-content bento-content-col">
              <div className="bento-header-flex">
                <div className="bento-icon-box">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3>Chat Natural</h3>
              </div>
              <p>Ngobrol saja, tidak perlu prompt rumit, menggunakan Bahasa Indonesia sehari-hari</p>
            </div>
            {/* Illustration: Circuit/Neuron */}
            <div className="bento-illustration">
              <svg viewBox="0 0 100 100" className="bento-svg">
                <path d="M15 0v25l-7 7v10" fill="none" stroke="currentColor" strokeLinejoin="round" />
                <circle cx="8" cy="42" r="3.5" fill="none" stroke="currentColor" />
                <path d="M30 0v45l-8 8v12" fill="none" stroke="currentColor" strokeLinejoin="round" />
                <circle cx="22" cy="65" r="3.5" fill="none" stroke="currentColor" />
                <path d="M45 0v30" fill="none" stroke="currentColor" strokeLinejoin="round" />
                <circle cx="45" cy="30" r="3.5" fill="none" stroke="currentColor" />
                <path d="M60 0v55l10 10v15" fill="none" stroke="currentColor" strokeLinejoin="round" />
                <circle cx="70" cy="80" r="3.5" fill="none" stroke="currentColor" />
                <path d="M75 0v35l8 8v10" fill="none" stroke="currentColor" strokeLinejoin="round" />
                <circle cx="83" cy="53" r="3.5" fill="none" stroke="currentColor" />
                <path d="M90 0v20" fill="none" stroke="currentColor" strokeLinejoin="round" />
                <circle cx="90" cy="20" r="3.5" fill="none" stroke="currentColor" />
              </svg>
            </div>
            <div className="bento-glow" />
          </div>

          {/* Feature 3: Sitasi Akurat */}
          <div className="bento-item">
            <div className="bento-content bento-content-col">
              <div className="bento-header-flex">
                <div className="bento-icon-box">
                  <List className="w-6 h-6" />
                </div>
                <h3>Sitasi Akurat</h3>
              </div>
              <p>Sumber kredibel, dengan format sitasi sesuai preferensi, anti link mati dan hoax</p>
            </div>
            {/* Illustration: Document Stack */}
            <div className="bento-illustration">
              <svg viewBox="0 0 100 100" className="bento-svg">
                <rect x="45" y="15" width="40" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
                <rect x="55" y="25" width="40" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <line x1="65" y1="40" x2="85" y2="40" stroke="currentColor" strokeWidth="1.2" />
                <line x1="65" y1="55" x2="85" y2="55" stroke="currentColor" strokeWidth="1.2" />
                <line x1="65" y1="70" x2="85" y2="70" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="20" cy="20" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
              </svg>
            </div>
            <div className="bento-glow" />
          </div>

          {/* Feature 4: Dipandu Bertahap (Full Row) */}
          <div className="bento-item bento-row">
            <div className="bento-content">
              <div className="bento-header-flex">
                <div className="bento-icon-box">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3>Dipandu Bertahap</h3>
              </div>
              <p>Workflow ketat dan terstruktur, mengolah ide hingga paper jadi. Apapun percakapannya, ujungnya pasti jadi paper</p>
            </div>
            {/* Illustration: Workflow Steps */}
            <div className="bento-illustration">
              <svg viewBox="0 0 100 100" className="bento-svg">
                {/* Gear */}
                <circle cx="28" cy="22" r="7" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="28" cy="22" r="3" fill="none" stroke="currentColor" strokeWidth="1" />
                <path d="M28 12v3M28 29v3M18 22h3M35 22h3M21 15l2 2M33 27l2 2M21 29l2-2M33 15l2-2" fill="none" stroke="currentColor" strokeWidth="1.2" />
                {/* Box 1 */}
                <rect x="58" y="12" width="22" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <line x1="65" y1="19.5" x2="73" y2="19.5" stroke="currentColor" strokeWidth="1.2" />
                {/* Box 2 */}
                <rect x="18" y="38" width="22" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <line x1="25" y1="45.5" x2="33" y2="45.5" stroke="currentColor" strokeWidth="1.2" />
                {/* Box 3 */}
                <rect x="58" y="65" width="22" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <line x1="65" y1="72.5" x2="73" y2="72.5" stroke="currentColor" strokeWidth="1.2" />
                {/* Connectors */}
                <line x1="38" y1="22" x2="58" y2="22" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M69 27v8h-40v3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M29 53v8h40v4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bento-glow" />
          </div>
        </div>
      </div>
    </section>
  )
}
