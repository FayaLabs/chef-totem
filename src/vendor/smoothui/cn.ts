/** O `cn` que o SmoothUI espera. O app não usa shadcn, então mora aqui. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
