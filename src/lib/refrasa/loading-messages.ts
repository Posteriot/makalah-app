/**
 * Educational Loading Messages for Refrasa Tool
 *
 * These messages are displayed during the Refrasa analysis process
 * to educate users about what's happening behind the scenes.
 */

/**
 * Array of rotating loading messages
 * Each message explains a step in the Refrasa process
 */
export const LOADING_MESSAGES = [
  "Menganalisis pola kalimat...",
  "Memeriksa variasi kosa kata...",
  "Menyesuaikan ritme paragraf...",
  "Memperbaiki gaya penulisan...",
  "Menyeimbangkan hedging akademik...",
  "Memastikan konsistensi terminologi...",
  "Memeriksa keseragaman struktur...",
  "Menambahkan variasi kompleksitas...",
  "Mempertahankan format akademis...",
  "Finalisasi perbaikan teks...",
] as const

/**
 * Rotation interval in milliseconds
 * Messages rotate every 2.5 seconds
 */
export const LOADING_ROTATION_INTERVAL = 2500
