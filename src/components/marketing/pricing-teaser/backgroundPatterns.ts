/**
 * Background pattern styles for Pricing Teaser section
 * Inline styles for Tailwind-first approach (complex gradients)
 */

// Light mode patterns (subtle for readability)
export const gridStyle = {
  backgroundImage: `
    linear-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.04) 1px, transparent 1px)
  `,
  backgroundSize: "48px 48px",
}

export const dotsStyle = {
  backgroundImage: "radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
}

// Dark mode patterns
export const gridStyleDark = {
  backgroundImage: `
    linear-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.15) 1px, transparent 1px)
  `,
  backgroundSize: "48px 48px",
}

export const dotsStyleDark = {
  backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
}
