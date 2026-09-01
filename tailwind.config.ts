import type { Config } from 'tailwindcss'

// The scale is calibrated for a 1080x1920 kiosk but written in vw, so the same
// build fills any 9:16 panel. 1vw = 10.8px at 1080 wide.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B0C',
        surface: '#FFFFFF',
        page: '#F4F4F5',
        action: '#DC2626',
        gold: '#A16207',
        muted: '#6B7280',
        hairline: '#E4E4E7',
      },
      fontFamily: {
        display: ['Anton', 'Archivo', 'Impact', 'sans-serif'],
        body: ['Archivo', 'system-ui', 'sans-serif'],
      },
      // Touch sizes, not spacing. 88px is the kiosk floor (~27mm at 82 DPI);
      // 44px would be 13mm, under the 19mm standard.
      spacing: {
        tap: '88px',
        'tap-lg': '104px',
        'tap-bar': '120px',
      },
      borderRadius: { totem: '28px', sheet: '40px' },
    },
  },
  plugins: [],
} satisfies Config
