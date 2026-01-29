"use client"

import { useState, useRef, useEffect } from "react"
import { Users, MessageSquare, List, CheckCircle, LucideIcon } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

/**
 * Benefits data structure for reuse across desktop bento and mobile accordion
 */
type BenefitItem = {
  id: string
  title: string
  icon: LucideIcon
  content: React.ReactNode
  checklistItems?: string[]
}

const benefits: BenefitItem[] = [
  {
    id: "sparring-partner",
    title: "Sparring Partner",
    icon: Users,
    checklistItems: [
      "Mendampingi riset dari awal",
      "Juru tulis yang terampil",
      "Paper akuntabel dan berkualitas",
    ],
    content: null, // Uses checklistItems instead
  },
  {
    id: "chat-natural",
    title: "Chat Natural",
    icon: MessageSquare,
    content: "Ngobrol saja, tidak perlu prompt rumit, menggunakan Bahasa Indonesia sehari-hari",
  },
  {
    id: "sitasi-akurat",
    title: "Sitasi Akurat",
    icon: List,
    content: "Sumber kredibel, dengan format sitasi sesuai preferensi, anti link mati dan hoax",
  },
  {
    id: "dipandu-bertahap",
    title: "Dipandu Bertahap",
    icon: CheckCircle,
    content: (
      <>
        Workflow ketat dan terstruktur, mengolah ide hingga paper jadi.
        <br />
        Apapun percakapannya, ujungnya pasti jadi paper
      </>
    ),
  },
]

/**
 * Mobile Accordion View
 * - Single item open at a time (mutual exclusive)
 * - All collapsed by default
 * - Click outside closes any open accordion
 * - No SVG illustrations
 * - Card styling matching bento design
 */
function BenefitsAccordion() {
  // Use empty string instead of undefined for controlled accordion
  // This prevents "uncontrolled to controlled" React warning
  const [openItem, setOpenItem] = useState<string>("")
  const accordionRef = useRef<HTMLDivElement>(null)

  // Close accordion when clicking/touching outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        accordionRef.current &&
        !accordionRef.current.contains(event.target as Node)
      ) {
        setOpenItem("")
      }
    }

    // Use both click and touchstart for broader compatibility
    document.addEventListener("click", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("click", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [])

  return (
    <div ref={accordionRef} className="md:hidden">
      <Accordion
        type="single"
        collapsible
        value={openItem}
        onValueChange={(value) => setOpenItem(value ?? "")}
        className="benefits-accordion"
      >
        {benefits.map((benefit) => {
          const Icon = benefit.icon
          return (
            <AccordionItem
              key={benefit.id}
              value={benefit.id}
              className="benefits-accordion-item"
            >
              <AccordionTrigger className="benefits-accordion-trigger">
                <div className="benefits-accordion-header">
                  <div className="bento-icon-box">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span>{benefit.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="benefits-accordion-content">
                {benefit.checklistItems ? (
                  <ul className="bento-checklist">
                    {benefit.checklistItems.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{benefit.content}</p>
                )}
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

/**
 * Desktop Bento Grid View
 * - Asymmetric grid layout
 * - SVG illustrations visible
 * - Hover effects with glow
 */
function BentoBenefitsGrid() {
  return (
    <div className="bento-grid hidden md:grid">
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
              <path d="M35 15h35l15 15v55H35z" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
              <path d="M70 15v15h15" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
              {/* Front paper */}
              <path d="M20 25h35l15 15v50H20z" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
              <path d="M55 25v15h15" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
              {/* Lines on front paper */}
              <path d="M30 50h25M30 60h25M30 70h25M30 80h15" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
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
            <path d="M15 0v25l-7 7v10" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="8" cy="42" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M30 0v45l-8 8v12" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="22" cy="65" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M45 0v30" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="45" cy="30" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M60 0v55l10 10v15" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="70" cy="80" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M75 0v35l8 8v10" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="83" cy="53" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <path d="M90 0v20" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            <circle cx="90" cy="20" r="3.5" fill="none" stroke="currentColor" strokeWidth="0.8" />
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
            <rect x="45" y="15" width="40" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.5" />
            <rect x="55" y="25" width="40" height="60" rx="4" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <line x1="65" y1="40" x2="85" y2="40" stroke="currentColor" strokeWidth="0.8" />
            <line x1="65" y1="55" x2="85" y2="55" stroke="currentColor" strokeWidth="0.8" />
            <line x1="65" y1="70" x2="85" y2="70" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="20" cy="20" r="3" fill="none" stroke="currentColor" strokeWidth="0.8" />
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
          <p>
            Workflow ketat dan terstruktur, mengolah ide hingga paper jadi.
            <br />
            Apapun percakapannya, ujungnya pasti jadi paper
          </p>
        </div>
        {/* Illustration: Workflow Steps */}
        <div className="bento-illustration bento-illustration-tall">
          <svg viewBox="12 8 72 76" className="bento-svg" preserveAspectRatio="xMidYMid meet">
            {/* Gear */}
            <circle cx="28" cy="22" r="7" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="28" cy="22" r="3" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <path d="M28 12v3M28 29v3M18 22h3M35 22h3M21 15l2 2M33 27l2 2M21 29l2-2M33 15l2-2" fill="none" stroke="currentColor" strokeWidth="0.8" />
            {/* Box 1 */}
            <rect x="58" y="12" width="22" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <line x1="65" y1="19.5" x2="73" y2="19.5" stroke="currentColor" strokeWidth="0.8" />
            {/* Box 2 */}
            <rect x="18" y="38" width="22" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <line x1="25" y1="45.5" x2="33" y2="45.5" stroke="currentColor" strokeWidth="0.8" />
            {/* Box 3 */}
            <rect x="58" y="65" width="22" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <line x1="65" y1="72.5" x2="73" y2="72.5" stroke="currentColor" strokeWidth="0.8" />
            {/* Connectors */}
            <line x1="38" y1="22" x2="58" y2="22" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M69 27v8h-40v3" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
            <path d="M29 53v8h40v4" fill="none" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="bento-glow" />
      </div>
    </div>
  )
}

/**
 * BenefitsSection - "Kenapa Makalah AI?" section
 *
 * Responsive layout:
 * - Desktop (md+): Bento grid with asymmetric cards and SVG illustrations
 * - Mobile (<md): Accordion with card styling, single open, all collapsed by default
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

        {/* Desktop: Bento Grid */}
        <BentoBenefitsGrid />

        {/* Mobile: Accordion */}
        <BenefitsAccordion />
      </div>
    </section>
  )
}
