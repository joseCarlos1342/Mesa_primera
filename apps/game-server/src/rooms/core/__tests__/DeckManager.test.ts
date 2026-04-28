import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck } from '../DeckManager';

describe('DeckManager — createDeck', () => {
  it('genera exactamente 28 cartas', () => {
    expect(createDeck()).toHaveLength(28);
  });

  it('todas las cartas son únicas', () => {
    const deck = createDeck();
    expect(new Set(deck).size).toBe(28);
  });

  it('contiene los 4 palos (O, C, E, B) con 7 valores cada uno', () => {
    const deck = createDeck();
    for (const suit of ['O', 'C', 'E', 'B']) {
      const cardsOfSuit = deck.filter((card) => card.endsWith(`-${suit}`));
      expect(cardsOfSuit).toHaveLength(7);
      const values = cardsOfSuit.map((card) => card.split('-')[0]).sort();
      expect(values).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    }
  });

  it('respeta el orden canónico de inserción (palos O,C,E,B y valores 1..7)', () => {
    const deck = createDeck();
    expect(deck[0]).toBe('1-O');
    expect(deck[6]).toBe('7-O');
    expect(deck[7]).toBe('1-C');
    expect(deck[27]).toBe('7-B');
  });

  it('cada llamada retorna un array independiente', () => {
    const a = createDeck();
    const b = createDeck();
    a[0] = 'MUTATED';
    expect(b[0]).toBe('1-O');
  });
});

describe('DeckManager — shuffleDeck', () => {
  it('baraja in-place sin alterar el conjunto de cartas', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffleDeck(deck);
    expect(deck).toHaveLength(28);
    expect(new Set(deck)).toEqual(new Set(original));
  });

  it('produce un orden distinto al canónico (probabilístico, ~1 en 28!)', () => {
    const deck = createDeck();
    const original = [...deck];
    shuffleDeck(deck);
    expect(deck).not.toEqual(original);
  });

  it('no retorna valor (muta el array)', () => {
    const deck = createDeck();
    const result = shuffleDeck(deck);
    expect(result).toBeUndefined();
  });

  it('shuffles independientes producen permutaciones distintas (smoke)', () => {
    const a = createDeck();
    const b = createDeck();
    shuffleDeck(a);
    shuffleDeck(b);
    expect(a).not.toEqual(b);
  });

  it('soporta arrays vacíos y de un elemento sin error', () => {
    const empty: string[] = [];
    expect(() => shuffleDeck(empty)).not.toThrow();
    expect(empty).toEqual([]);

    const single = ['only'];
    expect(() => shuffleDeck(single)).not.toThrow();
    expect(single).toEqual(['only']);
  });
});
