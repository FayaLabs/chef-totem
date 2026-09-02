import type { Config } from 'tailwindcss'

/** Uma cor de tema que aceita o modificador de opacidade do Tailwind. */
const alpha = (variable: string, fallback: string): string =>
  `color-mix(in srgb, var(${variable}, ${fallback}) calc(<alpha-value> * 100%), transparent)`

// The scale is calibrated for a 1080x1920 kiosk but written in vw, so the same
// build fills any 9:16 panel. 1vw = 10.8px at 1080 wide.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Each maps to a CSS variable so a tenant theme can override it at
        // runtime (see src/design/theme.ts). The literal here is the default.
        //
        // `color-mix` e não `var()` cru. Com a variável nua, `bg-ink/25` compila
        // para uma cor INVÁLIDA e o navegador descarta a regra inteira — o
        // elemento fica transparente, sem erro, sem aviso. Foi assim que o
        // puxador do sheet e a tarja de ESGOTADO ficaram invisíveis: as duas
        // usavam opacidade sobre uma cor de marca, e as duas simplesmente não
        // pintavam. `<alpha-value>` vira `1` quando não há modificador, então o
        // caso comum continua sendo exatamente a cor de antes.
        ink: alpha('--color-ink', '#0B0B0C'),
        surface: alpha('--color-surface', '#FFFFFF'),
        page: alpha('--color-page', '#F4F4F5'),
        action: alpha('--color-action', '#DC2626'),
        gold: alpha('--color-accent', '#A16207'),
        muted: '#6B7280',
        // Dividers only — never the sole boundary of something tappable.
        hairline: '#E4E4E7',
        // The boundary of an outlined CONTROL. Must clear 3:1 against the page,
        // because white-on-near-white leaves the border carrying the affordance.
        edge: alpha('--color-edge', '#71717A'),
        // Disabled is a neutral, not a faded accent: a pale red button reads
        // as "red button, dim screen", and the customer keeps tapping it.
        'disabled-bg': '#E4E4E7',
        'disabled-fg': '#52525B',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Anton', 'Impact', 'sans-serif'],
        body: ['var(--font-body)', 'Archivo', 'system-ui', 'sans-serif'],
      },
      // Touch sizes, not spacing. 88px is the kiosk floor (~27mm at 82 DPI);
      // 44px would be 13mm, under the 19mm standard.
      spacing: {
        tap: '88px',
        'tap-lg': '104px',
        'tap-bar': '120px',
      },
      borderRadius: { totem: 'var(--radius-totem, 28px)', sheet: '40px' },
    },
  },
  plugins: [],
} satisfies Config
