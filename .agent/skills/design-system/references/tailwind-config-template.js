/** @type {import('tailwindcss').Config} */
module.exports = {
    theme: {
        extend: {
            colors: {
                // Semantic Tokens linked to Primitives
                'surface': {
                    'primary': 'var(--surface-primary)',
                    'secondary': 'var(--surface-secondary)',
                    'success': 'var(--surface-success)',
                    'danger': 'var(--surface-danger)',
                },
                'text': {
                    'primary': 'var(--text-primary)',
                    'secondary': 'var(--text-secondary)',
                    'inverse': 'var(--text-inverse)',
                },
            },
            spacing: {
                // 4px based scaling
                'xs': '4px',
                'sm': '8px',
                'md': '16px',
                'lg': '24px',
                'xl': '32px',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        },
    },
}
