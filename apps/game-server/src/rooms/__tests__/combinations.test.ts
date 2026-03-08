import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, HandEvaluation } from '../combinations';

describe('combinations logic', () => {
  
  describe('evaluateHand()', () => {
    it('Should return NINGUNA if less than 4 cards are passed', () => {
      const eval1 = evaluateHand('01-O,02-C,05-E');
      expect(eval1.type).toBe('NINGUNA');
    });

    it('Should correctly identify a SEGUNDA (4 cards of same suit)', () => {
      const eval1 = evaluateHand('01-O,02-O,05-O,07-O');
      expect(eval1.type).toBe('SEGUNDA');
      // points = 16 + 12 + 15 + 21 = 64
      expect(eval1.points).toBe(64);
    });

    it('Should correctly identify a CHIVO (As, 6, 7 of same suit) alongside any 4th card', () => {
      const eval1 = evaluateHand('01-C,06-C,07-C,10-E');
      expect(eval1.type).toBe('CHIVO');
      // points = 16 + 18 + 21 + 0 = 55
      expect(eval1.points).toBe(55);
    });

    it('Should NOT identify CHIVO if As, 6, 7 are of different suits mixed', () => {
      const eval1 = evaluateHand('01-C,06-O,07-C,10-E');
      // 4 different suits -> Wait, it has Copas, Oros, Espadas. That's 3 suits. So NINGUNA.
      expect(eval1.type).toBe('NINGUNA');
    });

    it('Should correctly identify a PRIMERA (4 cards, each of different suit)', () => {
      const eval1 = evaluateHand('01-O,02-C,05-E,07-B');
      expect(eval1.type).toBe('PRIMERA');
      // points = 16 + 12 + 15 + 21 = 64
      expect(eval1.points).toBe(64);
    });

    it('Should default to NINGUNA with calculated points for any normal hand', () => {
      const eval1 = evaluateHand('01-O,02-C,05-C,07-B');
      expect(eval1.type).toBe('NINGUNA');
    });
  });

  describe('compareHands()', () => {
    it('Should favor SEGUNDA over CHIVO, PRIMERA, and NINGUNA', () => {
      const segunda: HandEvaluation = { type: 'SEGUNDA', points: 64 };
      const chivo: HandEvaluation = { type: 'CHIVO', points: 55 };
      const primera: HandEvaluation = { type: 'PRIMERA', points: 64 };
      const ninguna: HandEvaluation = { type: 'NINGUNA', points: 70 };

      expect(compareHands(segunda, chivo)).toBeGreaterThan(0);
      expect(compareHands(segunda, primera)).toBeGreaterThan(0);
      expect(compareHands(segunda, ninguna)).toBeGreaterThan(0);
      
      expect(compareHands(chivo, segunda)).toBeLessThan(0);
    });

    it('Should favor CHIVO over PRIMERA and NINGUNA', () => {
      const chivo: HandEvaluation = { type: 'CHIVO', points: 55 };
      const primera: HandEvaluation = { type: 'PRIMERA', points: 80 };
      const ninguna: HandEvaluation = { type: 'NINGUNA', points: 70 };

      expect(compareHands(chivo, primera)).toBeGreaterThan(0);
      expect(compareHands(chivo, ninguna)).toBeGreaterThan(0);
    });

    it('Should favor PRIMERA over NINGUNA', () => {
      const primera: HandEvaluation = { type: 'PRIMERA', points: 40 };
      const ninguna: HandEvaluation = { type: 'NINGUNA', points: 80 };

      expect(compareHands(primera, ninguna)).toBeGreaterThan(0);
    });

    it('Should tie-break two identical hand types using total points', () => {
      const ninguna1: HandEvaluation = { type: 'NINGUNA', points: 50 };
      const ninguna2: HandEvaluation = { type: 'NINGUNA', points: 60 };

      expect(compareHands(ninguna2, ninguna1)).toBeGreaterThan(0);
      expect(compareHands(ninguna1, ninguna2)).toBeLessThan(0);
      expect(compareHands(ninguna1, ninguna1)).toBe(0);
    });
  });
});
