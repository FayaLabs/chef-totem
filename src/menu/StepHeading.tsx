import { Check } from 'lucide-react'
import './steps.css'

/** O título de uma etapa, com o número e o que ela ainda pede. */
export function StepHeading({ index, title, hint, done, required }: {
  index: number
  title: string
  /** Texto curto à direita: "Escolha 1", "Até 3", "Opcional". */
  hint?: string
  done: boolean
  required?: boolean
}) {
  return (
    <h3 className="step-heading" data-testid={`step-heading-${index}`}>
      <span className="step-heading-index" data-done={done || undefined} aria-hidden="true">
        {done ? <Check strokeWidth={3} aria-hidden="true" /> : index}
      </span>
      <span className="step-heading-name">{title}</span>
      {hint ? (
        <span className="step-heading-hint" data-required={required && !done ? '' : undefined}>
          {hint}
        </span>
      ) : null}
    </h3>
  )
}

/** A dica da direita, derivada do grupo — mesma frase nos três sheets. */
export function stepHint(required: boolean, min: number, max: number, count: number): string {
  if (required && count < Math.max(1, min)) return `Escolha ${Math.max(1, min)}`
  if (!required && !count) return max > 1 ? `Até ${max}` : 'Opcional'
  return count > 1 ? `${count} escolhidos` : 'Pronto'
}
