import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Instrument Serif', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: '#6c63ff',
        bg: {
          DEFAULT: '#0a0a0f',
          card: '#111118',
          elevated: '#16161f',
        },
        border: {
          DEFAULT: '#1e1e2e',
          bright: '#2a2a3e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
