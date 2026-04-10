import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, HandEvaluation } from '../combinations';

describe('Combinations & Hand Evaluation', () => {
  it('identificats NINGUNA for empty or insufficient cards', () => {
    expect(evaluateHand('').type).toBe('NINGUNA');
    expect(evaluateHand('1-O,7-C').type).toBe('NINGUNA');
  });

  it('identifies SEGUNDA correctly (4 cards same suit)', () => {
    // 1 de Oros, 3 de Oros, 6 de Oros, 7 de Oros
    const result = evaluateHand('1-O,3-O,6-O,7-O');
    expect(result.type).toBe('SEGUNDA');
    expect(result.points).toBeGreaterThan(0);
  });

  it('identifies CHIVO correctly (As, 6, 7 of same suit)', () => {
    // As de Copas, 6 de Copas, 7 de Copas, and any other card
    const result = evaluateHand('1-C,6-C,7-C,4-E');
    expect(result.type).toBe('CHIVO');
  });

  it('identifies PRIMERA correctly (4 cards of different suits)', () => {
    // 1 de Oros, 2 de Copas, 3 de Espadas, 4 de Bastos
    const result = evaluateHand('1-O,2-C,3-E,4-B');
    expect(result.type).toBe('PRIMERA');
  });

  it('identifies NINGUNA correctly (4 cards, no special combo)', () => {
    // 1 de Oros, 2 de Oros, 3 de Espadas, 4 de Bastos
    // Not 4 different suits (2 Oros), not all same (Segunda), no As+6+7 of same suit (Chivo)
    const result = evaluateHand('1-O,2-O,3-E,4-B');
    expect(result.type).toBe('NINGUNA');
  });

  describe('compareHands', () => {
    it('ranks SEGUNDA over CHIVO', () => {
      const segunda = evaluateHand('1-O,3-O,6-O,7-O'); // SEGUNDA
      const chivo = evaluateHand('1-C,6-C,7-C,4-E');   // CHIVO
      expect(compareHands(segunda, chivo)).toBeGreaterThan(0); // segunda wins
    });

    it('ranks CHIVO over PRIMERA', () => {
      const chivo = evaluateHand('1-C,6-C,7-C,4-E');   // CHIVO
      const primera = evaluateHand('1-O,2-C,3-E,4-B'); // PRIMERA
      expect(compareHands(chivo, primera)).toBeGreaterThan(0); // chivo wins
    });

    it('ranks PRIMERA over NINGUNA', () => {
      const primera = evaluateHand('1-O,2-C,3-E,4-B'); // PRIMERA
      const ninguna = evaluateHand('1-O,2-O,3-E,4-B'); // NINGUNA
      expect(compareHands(primera, ninguna)).toBeGreaterThan(0); // primera wins
    });

    it('breaks ties by points if hand types are equal', () => {
      // Both Ninguna, but different points
      const handA = evaluateHand('7-O,6-O,5-E,1-B'); // Not Primera, 2 Oros
      const handB = evaluateHand('2-O,3-O,4-E,4-B'); // 12 + 13 + 14 + 14 = 53 points
      
      expect(handA.type).toBe('NINGUNA');
      expect(handB.type).toBe('NINGUNA');
      expect(compareHands(handA, handB)).toBeGreaterThan(0); // handA wins due to points
      expect(compareHands(handB, handA)).toBeLessThan(0); // handB loses
    });
  });

  describe('Sin juego / Points-based resolution with Mano bonus', () => {
    it('La Mano wins a NINGUNA vs NINGUNA tie with +1 point bonus', () => {
      // Same NINGUNA hand — Mano should win with the +1 bonus
      const handA = evaluateHand('7-O,6-O,5-E,1-B'); // NINGUNA
      const handB = evaluateHand('7-C,6-C,5-B,1-E'); // NINGUNA — same points, different suits

      expect(handA.type).toBe('NINGUNA');
      expect(handB.type).toBe('NINGUNA');
      expect(handA.points).toBe(handB.points); // tied on points

      // Simulate Mano bonus for handA
      const handAWithBonus: HandEvaluation = { ...handA, points: handA.points + 1 };
      expect(compareHands(handAWithBonus, handB)).toBeGreaterThan(0); // Mano wins
    });

    it('higher NINGUNA points beat La Mano bonus', () => {
      // Player 2 has clearly more points than Mano even with +1
      const manoHand = evaluateHand('2-O,3-O,4-E,4-B'); // NINGUNA — lower points
      const otherHand = evaluateHand('7-O,6-O,5-E,1-B'); // NINGUNA — higher points

      expect(manoHand.type).toBe('NINGUNA');
      expect(otherHand.type).toBe('NINGUNA');

      const manoWithBonus: HandEvaluation = { ...manoHand, points: manoHand.points + 1 };
      expect(compareHands(otherHand, manoWithBonus)).toBeGreaterThan(0); // Other player wins
    });

    it('NINGUNA hands are comparable for sin-juego resolution', () => {
      // All three players have NINGUNA — ensure they can be sorted
      const hand1 = evaluateHand('1-O,2-O,3-E,4-B'); // NINGUNA
      const hand2 = evaluateHand('7-O,6-O,5-E,1-B'); // NINGUNA
      const hand3 = evaluateHand('5-C,4-C,3-O,2-E'); // NINGUNA

      expect(hand1.type).toBe('NINGUNA');
      expect(hand2.type).toBe('NINGUNA');
      expect(hand3.type).toBe('NINGUNA');

      // Should produce deterministic ordering
      const sorted = [hand1, hand2, hand3].sort((a, b) => compareHands(b, a));
      expect(sorted[0].points).toBeGreaterThanOrEqual(sorted[1].points);
      expect(sorted[1].points).toBeGreaterThanOrEqual(sorted[2].points);
    });
  });
});
