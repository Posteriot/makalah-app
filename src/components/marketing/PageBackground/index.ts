/**
 * PageBackground Components
 *
 * Page-level background effects untuk marketing pages.
 * Gunakan bersama untuk layered background effect.
 *
 * Layer order (bottom to top):
 * 1. AuroraBackground (z-index: -2) - theme-agnostic gradients
 * 2. VignetteOverlay (z-index: -1) - theme-agnostic edge darkening
 * 3. TintOverlay from BackgroundOverlay/ (z-index: 0) - brightness control
 *
 * IMPORTANT: Aurora and Vignette are theme-agnostic.
 * Always pair with TintOverlay for proper dark/light adaptation.
 * TintOverlay is the SINGLE SOURCE OF TRUTH for theme brightness.
 */

export { AuroraBackground } from "./AuroraBackground"
export { VignetteOverlay } from "./VignetteOverlay"
