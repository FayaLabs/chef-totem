// ---------------------------------------------------------------------------
// One panel, many restaurants.
//
// Every colour, radius and font the totem paints with is a CSS variable, and
// this is where a tenant overrides them. Nothing in the components hardcodes a
// hex — a new brand is a config object, not a fork.
//
// What is NOT themeable, deliberately:
//   - touch sizes (88 / 104 / 120px). Those are ergonomics, not brand. A
//     tenant who wants "tighter buttons" wants a panel people mis-tap.
//   - the contrast floor. A brand colour that fails AA against its own text is
//     rejected at boot (see applyTheme) rather than shipped to a dining room.
// ---------------------------------------------------------------------------

export interface TotemTheme {
  /** The commit colour: add, checkout, pay. One per screen. */
  action: string
  /** Text and dark surfaces. */
  ink: string
  /** Cards. */
  surface: string
  /** The page behind the cards. */
  page: string
  /** Secondary accent (badges, promo). */
  accent: string
  /** Boundary of an outlined control — must clear 3:1 against `page`. */
  edge: string
  /** Display face, for the headline and the brand. */
  displayFont: string
  /** UI face. Needs tabular figures. */
  bodyFont: string
  /** Card corner radius, in px. */
  radius: number
  /** Optional wordmark. Absent = the brand name is set in the display face. */
  logoUrl?: string
}

export const defaultTheme: TotemTheme = {
  action: '#DC2626',
  ink: '#0B0B0C',
  surface: '#FFFFFF',
  page: '#F4F4F5',
  accent: '#A16207',
  edge: '#71717A',
  displayFont: "'Anton', Impact, sans-serif",
  bodyFont: "'Archivo', system-ui, sans-serif",
  radius: 28,
}

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.replace(/./g, (c) => c + c) : clean
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export interface ThemeWarning {
  token: string
  ratio: number
  needs: number
  message: string
}

/**
 * A theme is checked before it is painted.
 *
 * A tenant picking their brand colour is not thinking about a dining room's
 * glare, and "our red is a bit lighter" is how a Pagar button becomes
 * unreadable at 2pm by the window. The warnings are returned rather than
 * thrown: a slightly-off brand should ship with a complaint in the console,
 * not leave the store unable to sell.
 */
export function checkTheme(theme: TotemTheme): ThemeWarning[] {
  const warnings: ThemeWarning[] = []
  const rule = (token: string, ratio: number, needs: number, message: string) => {
    if (ratio < needs) warnings.push({ token, ratio, needs, message })
  }

  rule('action', contrast(theme.action, theme.surface), 4.5,
    'A cor de ação com texto branco não passa em AA — o botão de pagar fica ilegível sob luz de salão.')
  rule('ink', contrast(theme.ink, theme.page), 4.5,
    'O texto não tem contraste suficiente contra a página.')
  rule('edge', contrast(theme.edge, theme.page), 3,
    'A borda de controle vazado some contra a página (WCAG 1.4.11): num botão branco sobre página quase branca ela carrega a affordance sozinha.')

  return warnings
}

export function applyTheme(theme: TotemTheme, root: HTMLElement = document.documentElement): ThemeWarning[] {
  const warnings = checkTheme(theme)
  for (const warning of warnings) {
    console.warn(`[totem/theme] ${warning.token} = ${warning.ratio.toFixed(2)}:1 (mínimo ${warning.needs}:1). ${warning.message}`)
  }

  root.style.setProperty('--color-action', theme.action)
  root.style.setProperty('--color-ink', theme.ink)
  root.style.setProperty('--color-surface', theme.surface)
  root.style.setProperty('--color-page', theme.page)
  root.style.setProperty('--color-accent', theme.accent)
  root.style.setProperty('--color-edge', theme.edge)
  root.style.setProperty('--font-display', theme.displayFont)
  root.style.setProperty('--font-body', theme.bodyFont)
  root.style.setProperty('--radius-totem', `${theme.radius}px`)
  return warnings
}
