import { totemConfig } from '@/config/totem.config'
import { createMockTerminal } from '@/payment/mock-driver'
import { createPinpadTerminal } from '@/payment/pinpad-driver'
import type { PaymentTerminalDriver } from '@/payment/driver'

export * from '@/payment/driver'

export function paymentTerminal(): PaymentTerminalDriver {
  return totemConfig.flags.terminal ? createPinpadTerminal() : createMockTerminal()
}
