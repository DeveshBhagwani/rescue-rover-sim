/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Futuristic and premium robotics-oriented dark theme colors
        dark: {
          bg: '#0F172A',     // Slate 900
          card: '#1E293B',   // Slate 800
          border: '#334155', // Slate 700
          text: '#F8FAFC'    // Slate 50
        },
        cyber: {
          primary: '#06B6D4',  // Cyan 500
          accent: '#A855F7',   // Purple 500
          warning: '#F59E0B',  // Amber 500
          danger: '#EF4444',   // Red 500
          success: '#10B981'   // Emerald 500
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
}
