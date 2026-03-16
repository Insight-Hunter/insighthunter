/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts,svelte}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"',
          '"SF Pro Text"', '"Helvetica Neue"', 'Arial', 'sans-serif',
        ],
        mono: ['"SF Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        // Apple system colors
        'apple-blue':   '#0a84ff',
        'apple-indigo': '#5e5ce6',
        'apple-purple': '#bf5af2',
        'apple-pink':   '#ff375f',
        'apple-red':    '#ff453a',
        'apple-orange': '#ff9f0a',
        'apple-yellow': '#ffd60a',
        'apple-green':  '#30d158',
        'apple-teal':   '#5ac8fa',
        'apple-cyan':   '#64d2ff',
      },
      borderRadius: {
        'apple-sm':  '8px',
        'apple-md':  '12px',
        'apple-lg':  '16px',
        'apple-xl':  '20px',
        'apple-2xl': '28px',
      },
      backdropBlur: {
        'apple': '20px',
      },
    },
  },
  plugins: [],
};
