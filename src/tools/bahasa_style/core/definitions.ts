export const BUDGETED_WORDS: Record<string, { limit: number, suggestion?: string }> = {
    'namun': { limit: 1, suggestion: 'Akan tetapi' },
    'oleh karena itu': { limit: 0, suggestion: 'Hapus (biarkan logika mengalir) atau gunakan "Dengan demikian"' },
    'jadi': { limit: 0, suggestion: 'Hapus' },
    'maka dari itu': { limit: 0, suggestion: 'Hapus atau gunakan "Akibatnya"' },
    'selanjutnya': { limit: 0, suggestion: 'Hapus' },
    'selain itu': { limit: 0, suggestion: 'Hapus' },
    'kesimpulannya': { limit: 0, suggestion: 'Hapus (Lazy closing)' },
    'sebagai simpulan': { limit: 0, suggestion: 'Hapus' },
    'intinya': { limit: 0, suggestion: 'Hapus' },
    'secara keseluruhan': { limit: 0, suggestion: 'Hapus' },
};

export const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp, message: string, suggestion?: string }> = [
    // Indonenglish & Grammar
    {
        pattern: /\bdimana\b/i,
        message: 'Penggunaan "dimana" sebagai kata penghubung (Indonenglish).',
        suggestion: 'Gunakan "tempat", "yang", atau pecah kalimat.'
    },
    {
        pattern: /tidak hanya.*?tetapi juga/i,
        message: 'Struktur "Tidak hanya... tetapi juga" (Not only... but also).',
        suggestion: 'Gunakan kalimat tunggal yang lebih kuat atau variasi lain.'
    },
    {
        pattern: /\btergantung\b(?!\s+pada)/i, // Basic check, refining might be needed
        message: 'Kata "Tergantung" untuk opsi.',
        suggestion: 'Gunakan "bergantung pada" atau jelaskan kondisinya.'
    },
    // Self Reference at start (Placement check handled logic, but this catches specific phrases too)
    {
        pattern: /^penelitian ini/i,
        message: 'Memulai kalimat dengan "Penelitian ini".',
        suggestion: 'Gunakan subjek spesifik (misal: "Fenomena tersebut...").'
    },
    {
        pattern: /^hal ini/i,
        message: 'Memulai kalimat dengan "Hal ini".',
        suggestion: 'Gunakan referensi spesifik (misal: "Kegagalan tersebut...").'
    },
    // Opinion Probability (Zone Forbidden)
    {
        pattern: /\b(mungkin|bisa jadi)\b/i,
        message: 'Kata ragu-ragu dalam konteks fakta.',
        suggestion: 'Gunakan "kemungkinan besar" atau data spesifik.'
    }
];

export const EFFICIENCY_TARGETS: string[] = [
    'adalah',
    'bahwa'
];
