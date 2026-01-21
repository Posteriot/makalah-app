"use client"

import { useState } from "react"
import { User, MessageCircle, Shield, ClipboardList, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const BENEFITS = [
  {
    id: "sparring-partner",
    number: 1,
    icon: User,
    title: "Sparring Partner",
    items: [
      "Mendampingi riset dari awal",
      "Juru tulis yang terampil",
      "Paper orisinal dan berkualitas",
    ],
  },
  {
    id: "percakapan-natural",
    number: 2,
    icon: MessageCircle,
    title: "Percakapan Natural",
    items: [
      "Ngobrol saja, tidak perlu prompt rumit",
      "Bahasa Indonesia yang natural",
      "Balik ke bahasan utama kapan saja",
    ],
  },
  {
    id: "sitasi-akurat",
    number: 3,
    icon: Shield,
    title: "Sitasi Akurat",
    items: [
      "Sumber dari jurnal kredibel",
      "Format sitasi sesuai preferensi",
      "Anti link mati dan hoax",
    ],
  },
  {
    id: "dipandu-bertahap",
    number: 4,
    icon: ClipboardList,
    title: "Dipandu Bertahap",
    items: [
      "Workflow ketat dan terstruktur",
      "Dari ide hingga paper jadi",
      "Ujungnya pasti jadi paper",
    ],
  },
]

function BenefitCard({ benefit }: { benefit: (typeof BENEFITS)[0] }) {
  const Icon = benefit.icon

  return (
    <div className="benefit-card">
      <div className="benefit-header">
        <div className="benefit-icon">
          <Icon />
        </div>
        <span className="benefit-label">Benefit #{benefit.number}</span>
      </div>
      <h3 className="benefit-title">{benefit.title}</h3>
      <ul className="benefit-list">
        {benefit.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function BenefitsAccordion() {
  const [openId, setOpenId] = useState<string | null>(null)

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="benefits-accordion md:hidden">
      {BENEFITS.map((benefit) => {
        const Icon = benefit.icon
        const isOpen = openId === benefit.id

        return (
          <div
            key={benefit.id}
            className={cn("accordion-item", isOpen && "open")}
          >
            <button
              onClick={() => toggle(benefit.id)}
              className="accordion-trigger"
              aria-expanded={isOpen}
            >
              <div className="accordion-header">
                <div className="benefit-icon">
                  <Icon />
                </div>
                <span className="accordion-title">{benefit.title}</span>
              </div>
              <ChevronDown className="accordion-chevron" />
            </button>
            <div className="accordion-content">
              <ul className="benefit-list">
                {benefit.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BenefitsSection() {
  return (
    <section className="why-makalah-section" id="why-makalah">
      <div className="section-container">
        <h2 className="section-heading">Kenapa Makalah AI?</h2>

        {/* Desktop: Grid */}
        <div className="benefits-grid hidden md:grid">
          {BENEFITS.map((benefit) => (
            <BenefitCard key={benefit.id} benefit={benefit} />
          ))}
        </div>

        {/* Mobile: Accordion */}
        <BenefitsAccordion />
      </div>
    </section>
  )
}
