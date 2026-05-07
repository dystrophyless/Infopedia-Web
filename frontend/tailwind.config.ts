import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        highlight: 'var(--color-highlight)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        'text-body': 'var(--color-text-body)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        sans: ['"Mabry Pro"', 'sans-serif'],
      },
      boxShadow: {
        card: '8px 8px 0px rgba(58,28,110,0.5)',
        feature: '4px 4px 0px rgba(150,131,183,0.5)',
      },
    },
  },
  plugins: [],
} satisfies Config;
