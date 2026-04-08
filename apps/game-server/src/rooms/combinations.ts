export type Suit = 'Oros' | 'Copas' | 'Espadas' | 'Bastos';

export interface Card {
  value: number; // 1 to 7
  suit: Suit;
}

export type HandType = 'SEGUNDA' | 'CHIVO' | 'PRIMERA' | 'NINGUNA';

export interface HandEvaluation {
  type: HandType;
  points: number;
}

// Valores fijos para la mesa de Primera (Ronda y Punto)
export const CARD_POINTS: Record<number, number> = {
  1: 16,
  2: 12,
  3: 13,
  4: 14,
  5: 15,
  6: 18,
  7: 21,
};

export function parseCardsStr(cardsStr: string): Card[] {
  if (!cardsStr) return [];
  const suitMap: Record<string, Suit> = {
    'O': 'Oros',
    'C': 'Copas',
    'E': 'Espadas',
    'B': 'Bastos'
  };

  return cardsStr.split(',').filter(Boolean).map(c => {
    const [valStr, suitCode] = c.split('-');
    return {
      value: parseInt(valStr),
      suit: suitMap[suitCode] || suitCode as Suit
    };
  });
}

export function evaluateHand(cardsStr: string): HandEvaluation {
  const cards = parseCardsStr(cardsStr);

  // Puntos por palo: la suma más alta de cartas del mismo palo
  const suitGroups: Record<string, number> = {};
  for (const c of cards) {
    suitGroups[c.suit] = (suitGroups[c.suit] || 0) + (CARD_POINTS[c.value] || 0);
  }
  const maxSuitPoints = Math.max(0, ...Object.values(suitGroups));
  
  if (cards.length < 4) {
    return { type: 'NINGUNA', points: maxSuitPoints };
  }

  // Check Segunda (4 cartas del mismo palo)
  const isSegunda = cards.every(c => c.suit === cards[0].suit);
  if (isSegunda) {
    return { type: 'SEGUNDA', points: maxSuitPoints };
  }

  // Check Chivo (As, 6, 7 del mismo palo)
  const hasChivo = ['Oros', 'Copas', 'Espadas', 'Bastos'].some(suit => {
    const suitCards = cards.filter(c => c.suit === suit);
    const hasAs = suitCards.some(c => c.value === 1);
    const has6 = suitCards.some(c => c.value === 6);
    const has7 = suitCards.some(c => c.value === 7);
    return hasAs && has6 && has7;
  });
  
  if (hasChivo) {
    return { type: 'CHIVO', points: maxSuitPoints };
  }

  // Check Primera (4 cartas de diferente palo)
  // Para Primera: suma total (una carta por palo = valor de primera tradicional)
  const suits = new Set(cards.map(c => c.suit));
  const isPrimera = suits.size === 4;
  
  if (isPrimera) {
    const totalPoints = cards.reduce((sum, c) => sum + (CARD_POINTS[c.value] || 0), 0);
    return { type: 'PRIMERA', points: totalPoints };
  }

  return { type: 'NINGUNA', points: maxSuitPoints };
}

// Devuelve verdadero si handA venció a handB
// Segunda > Chivo > Primera > Ninguna. Empate => gana el que tenga mayor puntaje de cartas.
export function compareHands(evalA: HandEvaluation, evalB: HandEvaluation): number {
  const hierarchy: Record<HandType, number> = {
    'SEGUNDA': 4,
    'CHIVO': 3,
    'PRIMERA': 2,
    'NINGUNA': 1
  };

  const rankA = hierarchy[evalA.type];
  const rankB = hierarchy[evalB.type];

  if (rankA !== rankB) {
    return rankA - rankB; // Positivo si A gana
  }

  // Si son del mismo tipo, desempata por puntos sumados
  return evalA.points - evalB.points;
}
