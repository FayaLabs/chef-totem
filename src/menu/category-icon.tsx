import {
  Beef,
  Beer,
  Cake,
  Coffee,
  Cookie,
  Croissant,
  CupSoda,
  Drumstick,
  Fish,
  IceCreamCone,
  LayoutGrid,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  Wine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ---------------------------------------------------------------------------
// O ícone da categoria, deduzido do nome dela.
//
// O tenant escreve "Carnes premium defumadas e congeladas" no ChefControl; não
// existe campo de ícone e não vai existir tão cedo. Um garfo-e-faca em todas as
// linhas transforma a trilha lateral num menu de texto — que é exatamente o que
// um ícone deveria evitar num painel lido de dois metros de distância.
//
// A regra é keyword, não IA: previsível, testável, e erra para o lado certo
// (garfo-e-faca) quando não reconhece. As chaves vão sem acento porque o nome
// da categoria chega de um humano digitando, e "sobremesas" e "Sobremesas" e
// "SOBREMESAS" são a mesma coisa.
// ---------------------------------------------------------------------------

const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

/** Ordem importa: a primeira chave contida no nome ganha. Do mais específico
 *  para o mais genérico — "suco de carne"… não existe, mas "prato de peixe"
 *  existe, e `peixe` tem de vencer `prato`. */
const RULES: readonly (readonly [readonly string[], LucideIcon])[] = [
  [['pizza'], Pizza],
  [['hamburg', 'burger', 'lanche', 'sanduic'], Sandwich],
  [['peixe', 'frutos do mar', 'salmao', 'sushi'], Fish],
  [['frango', 'aves', 'galeto'], Drumstick],
  [['carne', 'churrasco', 'defumad', 'grelhad', 'bovin', 'costela', 'brisket'], Beef],
  [['salada', 'vegetarian', 'vegano', 'saudav'], Salad],
  [['sopa', 'caldo', 'feijoada'], Soup],
  [['acompanhament', 'porcao', 'entrada', 'petisc', 'aperitiv', 'guarnic'], UtensilsCrossed],
  [['sorvete', 'gelato', 'aca'], IceCreamCone],
  [['sobremesa', 'doce', 'torta', 'bolo', 'cheesecake'], Cake],
  [['padaria', 'paes', 'croissant', 'salgad'], Croissant],
  [['biscoito', 'cookie'], Cookie],
  [['cafe', 'expresso', 'capuccin'], Coffee],
  [['cerveja', 'chopp', 'chope'], Beer],
  [['vinho', 'drink', 'coquetel', 'destilad'], Wine],
  [['bebida', 'refrigerante', 'suco', 'agua'], CupSoda],
]

export function categoryIcon(name: string): LucideIcon {
  const folded = fold(name)
  for (const [keys, icon] of RULES) {
    if (keys.some((key) => folded.includes(key))) return icon
  }
  return UtensilsCrossed
}

/** "Todos" não é uma categoria do cardápio, é a ausência de filtro. */
export const allCategoriesIcon = LayoutGrid
