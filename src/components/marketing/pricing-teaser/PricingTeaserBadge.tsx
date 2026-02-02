/**
 * PricingTeaserBadge - Badge label untuk section "Pemakaian & Harga"
 * Styling sama dengan BenefitsBadge (konsisten across marketing sections)
 * Spacing dihandle oleh parent flex gap, bukan margin
 */
export function PricingTeaserBadge() {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a7d6e]">
      {/* Animated orange dot */}
      <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-[badge-dot-blink_1.5s_ease-in-out_infinite]" />
      {/* Badge text */}
      <span className="text-[10px] font-medium tracking-wide text-white/95 uppercase">
        Pemakaian & Harga
      </span>
    </div>
  )
}
