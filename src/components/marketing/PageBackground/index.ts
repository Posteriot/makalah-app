/**
 * PageBackground Components
 *
 * Page-level background effects untuk marketing pages.
 * Gunakan bersama untuk layered background effect.
 *
 * Layer order (bottom to top):
 * 1. AuroraBackground (z-index: -2)
 * 2. VignetteOverlay (z-index: -1)
 * 3. TintOverlay from background/ (optional, z-index: 0)
 */

export { AuroraBackground } from "./AuroraBackground"
export { VignetteOverlay } from "./VignetteOverlay"
