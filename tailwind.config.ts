import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#020617',
        'elevated-background': '#0a0f1f',
        accent: '#4c6fff',
        'accent-glow': 'rgba(76, 111, 255, 0.4)',
        text: '#e5e7eb',
        'muted-text': '#9ca3af',
        'border-subtle': '#111827',
        'border-strong': '#1f2937',
        success: '#22c55e',
        warning: '#facc15',
        danger: '#ef4444',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
