import { describe, it, expect } from 'vitest';
import { calculateSidePots, type SidePotPlayer } from '../PotManager';

const p = (id: string, totalMainBet: number): SidePotPlayer => ({ id, totalMainBet });

describe('PotManager — calculateSidePots', () => {
  it('apuestas iguales producen un único pot con todos los elegibles', () => {
    const pots = calculateSidePots([p('a', 100), p('b', 100), p('c', 100)]);
    expect(pots).toEqual([
      { amount: 300, eligiblePlayerIds: ['a', 'b', 'c'] },
    ]);
  });

  it('un all-in asimétrico genera main pot + side pot', () => {
    // a all-in con 50, b y c apostaron 100
    const pots = calculateSidePots([p('a', 50), p('b', 100), p('c', 100)]);
    expect(pots).toEqual([
      { amount: 150, eligiblePlayerIds: ['a', 'b', 'c'] },
      { amount: 100, eligiblePlayerIds: ['b', 'c'] },
    ]);
  });

  it('tres niveles distintos generan tres side pots', () => {
    const pots = calculateSidePots([p('a', 30), p('b', 70), p('c', 100)]);
    // nivel 30: 30*3=90 elegibles a,b,c
    // nivel 70: (70-30)*2=80 elegibles b,c
    // nivel 100: (100-70)*1=30 elegibles c
    expect(pots).toEqual([
      { amount: 90, eligiblePlayerIds: ['a', 'b', 'c'] },
      { amount: 80, eligiblePlayerIds: ['b', 'c'] },
      { amount: 30, eligiblePlayerIds: ['c'] },
    ]);
  });

  it('heads-up con apuestas iguales: un solo pot', () => {
    expect(calculateSidePots([p('a', 200), p('b', 200)])).toEqual([
      { amount: 400, eligiblePlayerIds: ['a', 'b'] },
    ]);
  });

  it('heads-up con apuestas distintas: solo main pot al nivel menor', () => {
    expect(calculateSidePots([p('a', 50), p('b', 200)])).toEqual([
      { amount: 100, eligiblePlayerIds: ['a', 'b'] },
      { amount: 150, eligiblePlayerIds: ['b'] },
    ]);
  });

  it('jugadores con bet 0 no generan pots vacíos', () => {
    const pots = calculateSidePots([p('a', 0), p('b', 0), p('c', 100)]);
    // nivel 0: amount 0 → omitido
    // nivel 100: 100*1 = 100 elegibles c
    expect(pots).toEqual([
      { amount: 100, eligiblePlayerIds: ['c'] },
    ]);
  });

  it('todos con bet 0 retornan array vacío', () => {
    expect(calculateSidePots([p('a', 0), p('b', 0)])).toEqual([]);
  });

  it('array vacío retorna []', () => {
    expect(calculateSidePots([])).toEqual([]);
  });

  it('no muta el array de entrada', () => {
    const players: SidePotPlayer[] = [p('a', 100), p('b', 50)];
    const snapshot = JSON.stringify(players);
    calculateSidePots(players);
    expect(JSON.stringify(players)).toBe(snapshot);
  });

  it('preserva el id correctamente al ordenar', () => {
    // Entrada en orden distinto al de bets
    const pots = calculateSidePots([p('hi', 100), p('lo', 50), p('mid', 75)]);
    expect(pots).toEqual([
      { amount: 150, eligiblePlayerIds: ['lo', 'mid', 'hi'] },
      { amount: 50, eligiblePlayerIds: ['mid', 'hi'] },
      { amount: 25, eligiblePlayerIds: ['hi'] },
    ]);
  });

  it('suma de side pots equivale a la suma total de bets', () => {
    const players = [p('a', 30), p('b', 70), p('c', 100), p('d', 100)];
    const totalBets = players.reduce((acc, q) => acc + q.totalMainBet, 0);
    const totalPots = calculateSidePots(players).reduce((acc, sp) => acc + sp.amount, 0);
    expect(totalPots).toBe(totalBets);
  });
});
