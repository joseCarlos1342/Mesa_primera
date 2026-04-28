import crypto from 'crypto';

/**
 * DeckManager — funciones puras para construir y barajar el mazo de Mesa Primera.
 *
 * El mazo consta de 28 cartas: 4 palos (Oros, Copas, Espadas, Bastos) por
 * 7 valores (1..7). Cada carta se representa como `"<valor>-<palo>"`,
 * por ejemplo `"5-O"`.
 *
 * Estas funciones son puras y deterministas (createDeck) o usan la fuente de
 * aleatoriedad criptográfica del runtime (shuffleDeck con `crypto.randomInt`).
 * Extraídas desde MesaRoom como parte del refactor (Fase 1.1) sin modificar
 * comportamiento: el orden de inserción al construir el mazo y el algoritmo
 * Fisher-Yates in-place se mantienen idénticos al original.
 */

const SUITS = ["O", "C", "E", "B"] as const;
const VALUES = ["1", "2", "3", "4", "5", "6", "7"] as const;

/**
 * Construye un mazo nuevo de 28 cartas en orden canónico
 * (recorriendo palos en orden O, C, E, B y dentro de cada palo del 1 al 7).
 */
export function createDeck(): string[] {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const val of VALUES) {
      deck.push(`${val}-${suit}`);
    }
  }
  return deck;
}

/**
 * Baraja el mazo recibido in-place con Fisher-Yates usando `crypto.randomInt`.
 * Mantiene el comportamiento original: muta el array y no retorna copia.
 */
export function shuffleDeck(deck: string[]): void {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }
}
