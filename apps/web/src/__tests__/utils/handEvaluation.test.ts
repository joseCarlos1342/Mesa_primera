import {
  parseCardsStr,
  evaluateHand,
  CARD_POINTS,
  type Card,
} from '@/utils/handEvaluation';

describe('parseCardsStr', () => {
  it('returns empty array for empty string', () => {
    expect(parseCardsStr('')).toEqual([]);
  });

  it('returns empty array for undefined-like input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseCardsStr(undefined as any)).toEqual([]);
  });

  it('parses a single card', () => {
    const cards = parseCardsStr('7-O');
    expect(cards).toEqual([{ value: 7, suit: 'Oros' }]);
  });

  it('parses multiple cards separated by commas', () => {
    const cards = parseCardsStr('1-O,6-C,7-E,3-B');
    expect(cards).toHaveLength(4);
    expect(cards[0]).toEqual({ value: 1, suit: 'Oros' });
    expect(cards[1]).toEqual({ value: 6, suit: 'Copas' });
    expect(cards[2]).toEqual({ value: 7, suit: 'Espadas' });
    expect(cards[3]).toEqual({ value: 3, suit: 'Bastos' });
  });

  it('maps all suit codes correctly', () => {
    const cards = parseCardsStr('1-O,1-C,1-E,1-B');
    expect(cards.map(c => c.suit)).toEqual(['Oros', 'Copas', 'Espadas', 'Bastos']);
  });

  it('handles trailing commas gracefully', () => {
    const cards = parseCardsStr('7-O,');
    expect(cards).toHaveLength(1);
  });
});

describe('CARD_POINTS', () => {
  it('maps known card values to expected punto values', () => {
    expect(CARD_POINTS[1]).toBe(16);
    expect(CARD_POINTS[2]).toBe(12);
    expect(CARD_POINTS[3]).toBe(13);
    expect(CARD_POINTS[4]).toBe(14);
    expect(CARD_POINTS[5]).toBe(15);
    expect(CARD_POINTS[6]).toBe(18);
    expect(CARD_POINTS[7]).toBe(21);
  });

  it('7 is the highest-value card', () => {
    const max = Math.max(...Object.values(CARD_POINTS));
    expect(CARD_POINTS[7]).toBe(max);
  });
});

describe('evaluateHand', () => {
  describe('NINGUNA — fewer than 4 cards', () => {
    it('returns NINGUNA for an empty hand', () => {
      const result = evaluateHand('');
      expect(result.type).toBe('NINGUNA');
      expect(result.points).toBe(0);
    });

    it('returns NINGUNA for 3 cards', () => {
      const result = evaluateHand('7-O,6-O,1-O');
      expect(result.type).toBe('NINGUNA');
      // points = best suit group = Oros: 21+18+16 = 55
      expect(result.points).toBe(55);
    });

    it('returns NINGUNA for 1 card', () => {
      const result = evaluateHand('7-O');
      expect(result.type).toBe('NINGUNA');
      expect(result.points).toBe(21);
    });
  });

  describe('SEGUNDA — all 4 cards same suit', () => {
    it('detects segunda when all cards share a suit', () => {
      const result = evaluateHand('1-O,6-O,7-O,3-O');
      expect(result.type).toBe('SEGUNDA');
      // All Oros: 16+18+21+13 = 68
      expect(result.points).toBe(68);
    });

    it('detects segunda with Bastos', () => {
      const result = evaluateHand('2-B,4-B,5-B,7-B');
      expect(result.type).toBe('SEGUNDA');
      expect(result.points).toBe(12 + 14 + 15 + 21);
    });
  });

  describe('CHIVO — A+6+7 of the same suit present', () => {
    it('detects chivo when 1-6-7 are in the same suit', () => {
      // Cards: 1-O, 6-O, 7-O, 3-C (not all same suit → not segunda)
      const result = evaluateHand('1-O,6-O,7-O,3-C');
      expect(result.type).toBe('CHIVO');
      // maxSuitPoints = Oros: 16+18+21 = 55
      expect(result.points).toBe(55);
    });

    it('segunda takes precedence over chivo (all same suit with 1-6-7)', () => {
      // All Oros including 1,6,7 → detected as SEGUNDA first
      const result = evaluateHand('1-O,6-O,7-O,3-O');
      expect(result.type).toBe('SEGUNDA');
    });

    it('detects chivo when 1-6-7 are in Copas but 4th card is different suit', () => {
      const result = evaluateHand('1-C,6-C,7-C,2-E');
      expect(result.type).toBe('CHIVO');
    });
  });

  describe('PRIMERA — exactly 4 different suits', () => {
    it('detects primera when each card is a different suit', () => {
      const result = evaluateHand('7-O,7-C,7-E,7-B');
      expect(result.type).toBe('PRIMERA');
      // Total points = 21*4 = 84
      expect(result.points).toBe(84);
    });

    it('calculates primera points as the sum of all 4 cards', () => {
      const result = evaluateHand('1-O,2-C,3-E,4-B');
      expect(result.type).toBe('PRIMERA');
      expect(result.points).toBe(16 + 12 + 13 + 14);
    });

    it('primera cannot have chivo (chivo requires 3 same-suit)', () => {
      // 1-O,6-C,7-E,3-B → 4 different suits → primera (no 1-6-7 in same suit)
      const result = evaluateHand('1-O,6-C,7-E,3-B');
      expect(result.type).toBe('PRIMERA');
    });
  });

  describe('NINGUNA — 4 cards but no special pattern', () => {
    it('returns NINGUNA for 4 cards with 2 suits but no chivo or segunda', () => {
      // 2 Oros + 2 Copas → 2 suits → not primera (need 4), not segunda (need 1), no 1-6-7 in same suit
      const result = evaluateHand('2-O,3-O,4-C,5-C');
      expect(result.type).toBe('NINGUNA');
      // maxSuitPoints = max(Oros: 12+13, Copas: 14+15) = max(25, 29) = 29
      expect(result.points).toBe(29);
    });

    it('returns NINGUNA for 3 suits (not 4, not 1)', () => {
      const result = evaluateHand('2-O,3-C,4-E,5-E');
      expect(result.type).toBe('NINGUNA');
    });
  });

  describe('point calculations edge cases', () => {
    it('handles lowest possible primera (all 2s)', () => {
      const result = evaluateHand('2-O,2-C,2-E,2-B');
      expect(result.type).toBe('PRIMERA');
      expect(result.points).toBe(48); // 12*4
    });

    it('handles highest possible segunda (all 7s of same suit is impossible — uses 4 highest Oros)', () => {
      // Only one 7 per suit in a normal deck; use 7+6+5+4 Oros
      const result = evaluateHand('7-O,6-O,5-O,4-O');
      expect(result.type).toBe('SEGUNDA');
      expect(result.points).toBe(21 + 18 + 15 + 14);
    });
  });
});
