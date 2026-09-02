// O balão do WhatsApp.
//
// O lucide não tem ícones de marca (por decisão deles, e é a decisão certa: um
// set de ícones não deve carregar o risco de trademark). Um `MessageCircle`
// genérico aqui custa reconhecimento na única tela onde o cliente precisa
// entender em meio segundo que a coisa vai chegar no aplicativo verde dele.
//
// Desenhado com `currentColor` para herdar a cor do botão em vez de trazer o
// verde da marca — no painel escuro do recibo, o verde oficial reprova em
// contraste contra o branco do botão.
export function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.82c2.16 0 4.19.84 5.72 2.37a8.03 8.03 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.2 8.2 0 0 1-4.13-1.13l-.3-.18-3.06.8.82-2.99-.19-.31a8.05 8.05 0 0 1-1.24-4.28c0-4.46 3.64-8.09 8.11-8.09Z" />
      <path d="M8.53 7.33c-.18-.4-.36-.41-.53-.42h-.45c-.16 0-.4.06-.62.29-.21.23-.81.79-.81 1.94s.83 2.25.95 2.4c.12.16 1.6 2.57 3.95 3.5 1.96.77 2.36.62 2.78.58.43-.04 1.37-.56 1.56-1.1.19-.54.19-1 .14-1.1-.06-.1-.21-.15-.45-.27-.23-.12-1.37-.68-1.58-.75-.21-.08-.37-.12-.52.11-.16.23-.6.75-.73.91-.14.15-.27.17-.5.06-.24-.12-1-.37-1.9-1.18-.7-.63-1.17-1.4-1.31-1.63-.14-.23-.02-.36.1-.47.11-.11.23-.27.35-.41.11-.14.15-.24.23-.39.08-.16.04-.29-.02-.41-.06-.12-.51-1.28-.72-1.75Z" />
    </svg>
  )
}
