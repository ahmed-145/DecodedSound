/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                'ds-bg': '#0a0a0f',
                'ds-surface': '#12121a',
                'ds-border': '#1e1e2e',
                'ds-text': '#e2e2f0',
                'ds-muted': '#6b6b8a',
                'ds-accent': '#7c3aed',
                'ds-accent-light': '#a78bfa',
                'ds-purple': '#5b21b6',
                'ds-gold': '#f59e0b',
                'ds-green': '#10b981',
                'ds-red': '#ef4444',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
