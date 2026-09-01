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
        // Dividers only — never the sole boundary of something tappable.
        hairline: '#E4E4E7',
        // The boundary of an outlined CONTROL. 4.0:1 against the page, because
        // white-on-near-white leaves the border carrying the whole affordance.
        edge: '#71717A',
        // Disabled is a neutral, not a faded accent: a pale red button reads
        // as "red button, dim screen", and the customer keeps tapping it.
        'disabled-bg': '#E4E4E7',
        'disabled-fg': '#52525B',
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
