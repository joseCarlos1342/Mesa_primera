import { describe, expect, it } from "vitest";
import { decideGameRecovery } from "../RecoveryPolicy";

describe("decideGameRecovery", () => {
  const detectedAt = new Date("2026-07-12T12:00:00.000Z");
  const roster = ["player-a", "player-b", "player-c"];

  it("reanuda solamente cuando regresó todo el roster original", () => {
    const result = decideGameRecovery({
      detectedAt,
      now: new Date("2026-07-12T12:01:59.000Z"),
      originalUserIds: roster,
      reconnectedUserIds: ["player-c", "player-a", "player-b"],
    });

    expect(result).toEqual({ decision: "resume", missingUserIds: [] });
  });

  it("mantiene la recuperación pendiente antes del plazo de dos minutos", () => {
    const result = decideGameRecovery({
      detectedAt,
      now: new Date("2026-07-12T12:01:59.000Z"),
      originalUserIds: roster,
      reconnectedUserIds: ["player-a", "player-b"],
    });

    expect(result).toEqual({ decision: "wait", missingUserIds: ["player-c"] });
  });

  it("cancela al vencer el plazo si falta un jugador original", () => {
    const result = decideGameRecovery({
      detectedAt,
      now: new Date("2026-07-12T12:02:00.000Z"),
      originalUserIds: roster,
      reconnectedUserIds: ["player-a", "player-b"],
    });

    expect(result).toEqual({ decision: "cancel", missingUserIds: ["player-c"] });
  });

  it("rechaza un roster sin jugadores o con identidades duplicadas", () => {
    expect(() => decideGameRecovery({
      detectedAt,
      now: detectedAt,
      originalUserIds: [],
      reconnectedUserIds: [],
    })).toThrow("roster original");

    expect(() => decideGameRecovery({
      detectedAt,
      now: detectedAt,
      originalUserIds: ["player-a", "player-a"],
      reconnectedUserIds: [],
    })).toThrow("duplicados");
  });
});
