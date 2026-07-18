import { matchMaker } from "colyseus";
import { createHash, randomUUID } from "node:crypto";
import { AlertService } from "./AlertService";
import { isRecoverableGamePhase, stableJson } from "./RecoveryPolicy";
import {
  markRecoveryDegraded,
  markRecoveryHealthy,
  recoveryObserver,
  type RecoveryObserver,
} from "./RecoveryObservability";
import {
  SupabaseService,
  type PendingRecoveryCheckpoint,
  type RecoveryClaimInput,
  type RecoveredRoomMappingInput,
  type RecoveryIncidentInput,
} from "./SupabaseService";

export interface CrashRecoveryDependencies {
  loadPendingRecoveryCheckpoints: () => Promise<PendingRecoveryCheckpoint[]>;
  createRecoveryIncident: (input: RecoveryIncidentInput) => Promise<{ success: boolean; recoveryDeadlineAt?: Date; error?: string }>;
  claimRecoveryIncident: (input: RecoveryClaimInput) => Promise<{ claimed: boolean; fence?: number; error?: string }>;
  saveRecoveredRoomMapping: (input: RecoveredRoomMappingInput) => Promise<{ success: boolean; error?: string }>;
  renewRecoveredRoomMappingLease: (input: RecoveredRoomMappingInput) => Promise<{ renewed: boolean; error?: string }>;
  createReplacementRoom: (options: {
    recovery: Record<string, unknown>;
    recoveryContext: { ownerId: string; fence: number };
  }) => Promise<{ roomId: string }>;
  disposeReplacementRoom: (roomId: string) => Promise<void>;
  deriveRecoveryRefunds: (gameId: string) => Promise<{ success: boolean; refunds?: Array<{ userId: string; amountCents: number }>; error?: string }>;
  expireRecoveryIncidentAndRefund: (input: { gameId: string; refunds: Array<{ userId: string; amountCents: number; operationId: string }> }) => Promise<{ success: boolean; status?: string; error?: string }>;
  markRecoveryIncidentManualReview: (input: { gameId: string; reason: string }) => Promise<{ success: boolean; status?: string; updated?: boolean; error?: string }>;
  emitRecoveryManualReviewAlert: (input: { gameId?: string; roomId?: string; reason: string }) => Promise<void>;
  emitRecoveryInfrastructureAlert: (input: { event: "checkpoint_load_failed" | "replacement_retry"; gameId?: string; roomId?: string; reason: string }) => Promise<void>;
  schedule: (callback: () => Promise<void>, delayMs: number) => unknown;
  now: () => Date;
}

function isRecoverableCheckpoint(
  checkpoint: PendingRecoveryCheckpoint,
): boolean {
  return (
    isIntegrityCheckedCheckpoint(checkpoint)
    && isRecoverableGamePhase(checkpointPhase(checkpoint))
  );
}

function isIntegrityCheckedCheckpoint(checkpoint: PendingRecoveryCheckpoint): boolean {
  return (
    hasRecoveryIdentifiers(checkpoint)
    && Number.isSafeInteger(checkpoint.checkpointVersion)
    && checkpoint.checkpointVersion > 0
    && hasNonEmptyString(checkpoint.stateHash)
    && typeof checkpoint.privateState === "object"
    && checkpoint.privateState !== null
    && !Array.isArray(checkpoint.privateState)
    && createHash("sha256").update(stableJson(checkpoint.privateState)).digest("hex") === checkpoint.stateHash
    && Array.isArray(checkpoint.rosterUserIds)
    && checkpoint.rosterUserIds.length > 0
    && checkpoint.rosterUserIds.every(hasNonEmptyString)
    && new Set(checkpoint.rosterUserIds).size === checkpoint.rosterUserIds.length
  );
}

function isUnsupportedPhaseCheckpoint(checkpoint: PendingRecoveryCheckpoint): boolean {
  const phase = checkpointPhase(checkpoint);
  return isIntegrityCheckedCheckpoint(checkpoint) && typeof phase === "string" && !isRecoverableGamePhase(phase);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasRecoveryIdentifiers(checkpoint: PendingRecoveryCheckpoint): boolean {
  return hasNonEmptyString(checkpoint.gameId) && hasNonEmptyString(checkpoint.roomId);
}

function checkpointPhase(checkpoint: PendingRecoveryCheckpoint): string | undefined {
  const privateState = checkpoint.privateState;
  if (typeof privateState !== "object" || privateState === null || Array.isArray(privateState)) {
    return undefined;
  }
  const gameState = (privateState as { gameState?: unknown }).gameState;
  if (typeof gameState !== "object" || gameState === null || Array.isArray(gameState)) {
    return undefined;
  }
  const phase = (gameState as { phase?: unknown }).phase;
  return typeof phase === "string" ? phase : undefined;
}

const defaultDependencies: CrashRecoveryDependencies = {
  loadPendingRecoveryCheckpoints: () => SupabaseService.loadPendingRecoveryCheckpoints(),
  createRecoveryIncident: (input) => SupabaseService.createRecoveryIncident(input),
  claimRecoveryIncident: (input) => SupabaseService.claimRecoveryIncident(input),
  saveRecoveredRoomMapping: (input) => SupabaseService.saveRecoveredRoomMapping(input),
  renewRecoveredRoomMappingLease: (input) => SupabaseService.renewRecoveredRoomMappingLease(input),
  async createReplacementRoom(options) {
    const reservation = await matchMaker.create("mesa", options);
    return { roomId: reservation.roomId };
  },
  async disposeReplacementRoom(roomId) {
    await matchMaker.remoteRoomCall(roomId, "discardFailedRecoveryReplacement");
  },
  deriveRecoveryRefunds: (gameId) => SupabaseService.deriveRecoveryRefunds(gameId),
  expireRecoveryIncidentAndRefund: (input) => SupabaseService.expireRecoveryIncidentAndRefund(input),
  markRecoveryIncidentManualReview: (input) => SupabaseService.markRecoveryIncidentManualReview(input),
  emitRecoveryManualReviewAlert: async (input) => {
    if (input.gameId) await AlertService.recoveryManualReview(input.gameId, input.roomId);
  },
  emitRecoveryInfrastructureAlert: async (input) => {
    await AlertService.emitAsync({
      severity: "critical",
      category: "recovery_infrastructure",
      title: input.event === "checkpoint_load_failed"
        ? "No se pudieron cargar checkpoints de recuperación"
        : "Reintento de sala de recuperación",
      message: input.reason,
      game_id: input.gameId,
      room_id: input.roomId,
      metadata: { event: input.event, reason: input.reason },
    });
  },
  schedule: (callback, delayMs) => setTimeout(() => { void callback(); }, delayMs),
  now: () => new Date(),
};

function stableRecoveryRefundOperationId(gameId: string, userId: string): string {
  const bytes = createHash("sha256").update(`recovery-refund:${gameId}:${userId}`).digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Detecta checkpoints de juegos interrumpidos al iniciar el proceso. */
export class CrashRecoveryService {
  private readonly recoveryOwnerId = randomUUID();
  private readonly replacementRoomIds = new Map<string, string>();
  private checkpointLoadRetries = 0;
  private readonly replacementRetries = new Map<string, number>();
  private readonly leaseRenewalRetries = new Map<string, number>();

  constructor(
    private readonly dependencies: CrashRecoveryDependencies = defaultDependencies,
    private readonly observer: RecoveryObserver = recoveryObserver,
  ) {}

  async start(): Promise<Record<string, string>> {
    return this.recoverPendingCheckpoints();
  }

  async recoverPendingCheckpoints(): Promise<Record<string, string>> {
    const recoveredRooms: Record<string, string> = {};
    let checkpoints: PendingRecoveryCheckpoint[];
    try {
      checkpoints = await this.dependencies.loadPendingRecoveryCheckpoints();
      this.checkpointLoadRetries = 0;
      markRecoveryHealthy();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.observer.record({ level: "error", event: "checkpoint_load_failed", errCode: "checkpoint_load_failed" });
      markRecoveryDegraded("checkpoint_load_failed");
      await this.dependencies.emitRecoveryInfrastructureAlert({ event: "checkpoint_load_failed", reason });
      this.dependencies.schedule(
        () => this.recoverPendingCheckpoints().then(() => undefined),
        this.retryDelay(this.checkpointLoadRetries++),
      );
      return recoveredRooms;
    }

    for (const checkpoint of checkpoints) {
      const context = {
        roomId: hasNonEmptyString(checkpoint.roomId) ? checkpoint.roomId : undefined,
        gameId: hasNonEmptyString(checkpoint.gameId) ? checkpoint.gameId : undefined,
        phase: checkpointPhase(checkpoint),
      };
      this.observer.record({ level: "info", event: "recovery_detected", ...context });

      if (isUnsupportedPhaseCheckpoint(checkpoint)) {
        const incident = await this.dependencies.createRecoveryIncident({
          gameId: checkpoint.gameId,
          roomId: checkpoint.roomId,
          detectedAt: this.dependencies.now(),
          causeCode: "unsupported_phase",
        });
        if (incident.success) {
          await this.scheduleOrExpireRecovery(checkpoint, incident.recoveryDeadlineAt);
        } else {
          await this.dependencies.emitRecoveryManualReviewAlert({
            gameId: checkpoint.gameId,
            roomId: checkpoint.roomId,
            reason: incident.error ?? "No se pudo abrir el incidente para una fase no recuperable",
          });
        }
        continue;
      }

      if (!isRecoverableCheckpoint(checkpoint)) {
        if (!hasRecoveryIdentifiers(checkpoint)) {
          await this.dependencies.emitRecoveryManualReviewAlert({
            gameId: hasNonEmptyString(checkpoint.gameId) ? checkpoint.gameId : undefined,
            roomId: hasNonEmptyString(checkpoint.roomId) ? checkpoint.roomId : undefined,
            reason: "Checkpoint inválido sin identificadores de juego o sala",
          });
          continue;
        }

        const incident = await this.dependencies.createRecoveryIncident({
          gameId: checkpoint.gameId,
          roomId: checkpoint.roomId,
          detectedAt: this.dependencies.now(),
          causeCode: "invalid_checkpoint",
        });
        if (incident.success) {
          await this.markManualReview(checkpoint, "Checkpoint inválido o no recuperable");
        } else {
          await this.dependencies.emitRecoveryManualReviewAlert({
            gameId: checkpoint.gameId,
            roomId: checkpoint.roomId,
            reason: incident.error ?? "No se pudo abrir el incidente para un checkpoint inválido",
          });
        }
        continue;
      }

      const incident = await this.dependencies.createRecoveryIncident({
        gameId: checkpoint.gameId,
        roomId: checkpoint.roomId,
        detectedAt: this.dependencies.now(),
        causeCode: "process_restart",
      });
      if (!incident.success) continue;

      const recovery = await this.scheduleOrExpireRecovery(checkpoint, incident.recoveryDeadlineAt);
      if (!recovery) continue;

      const recoveredRoomId = await this.createReplacement(recovery);
      if (recoveredRoomId) recoveredRooms[checkpoint.roomId] = recoveredRoomId;
    }

    return recoveredRooms;
  }

  private async createReplacement(
    checkpoint: PendingRecoveryCheckpoint & { recoveryDeadlineAt: Date },
  ): Promise<string | undefined> {
    if (checkpoint.recoveryDeadlineAt.getTime() <= this.dependencies.now().getTime()) {
      await this.expireRecovery(checkpoint);
      return undefined;
    }

    const context = {
      roomId: checkpoint.roomId,
      gameId: checkpoint.gameId,
      phase: checkpointPhase(checkpoint),
    };
    const claim = await this.dependencies.claimRecoveryIncident({
      gameId: checkpoint.gameId,
      ownerId: this.recoveryOwnerId,
    });
    const fence = claim.fence;
    if (!claim.claimed || !isPositiveSafeInteger(fence)) {
      await this.scheduleReplacementRetry(checkpoint);
      return undefined;
    }

    let replacement: { roomId: string } | undefined;
    const disposeReplacement = async (): Promise<void> => {
      if (!replacement) return;
      const roomId = replacement.roomId;
      replacement = undefined;
      this.replacementRoomIds.delete(checkpoint.gameId);
      await this.dependencies.disposeReplacementRoom(roomId);
    };

    try {
      replacement = await this.dependencies.createReplacementRoom({
        recovery: checkpoint.privateState as Record<string, unknown>,
        recoveryContext: { ownerId: this.recoveryOwnerId, fence },
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.observer.record({ level: "warn", event: "replacement_retry", ...context, errCode: "replacement_creation_failed" });
      await this.dependencies.emitRecoveryInfrastructureAlert({
        event: "replacement_retry",
        gameId: checkpoint.gameId,
        roomId: checkpoint.roomId,
        reason,
      });
      await this.scheduleReplacementRetry(checkpoint);
      return undefined;
    }

    this.replacementRoomIds.set(checkpoint.gameId, replacement.roomId);
    this.observer.record({ level: "info", event: "replacement_created", ...context });
    const mapping = await this.dependencies.saveRecoveredRoomMapping({
      gameId: checkpoint.gameId,
      originalRoomId: checkpoint.roomId,
      recoveredRoomId: replacement.roomId,
      ownerId: this.recoveryOwnerId,
      fence,
    });
    if (!mapping.success) {
      await disposeReplacement();
      this.observer.record({ level: "warn", event: "replacement_retry", ...context, errCode: "mapping_fenced_failed" });
      await this.dependencies.emitRecoveryInfrastructureAlert({
        event: "replacement_retry",
        gameId: checkpoint.gameId,
        roomId: checkpoint.roomId,
        reason: mapping.error ?? "No se pudo persistir el mapping fenced de la sala recuperada",
      });
      await this.scheduleReplacementRetry(checkpoint);
      return undefined;
    }

    this.replacementRetries.delete(checkpoint.gameId);
    this.renewRecoveredRoomMappingLease({
      gameId: checkpoint.gameId,
      originalRoomId: checkpoint.roomId,
      recoveredRoomId: replacement.roomId,
      ownerId: this.recoveryOwnerId,
      fence,
    }, checkpoint);
    this.observer.record({ level: "info", event: "replacement_published", ...context });
    return replacement.roomId;
  }

  private retryDelay(attempt: number): number {
    return Math.min(1_000 * 2 ** attempt, 30_000);
  }

  private async scheduleReplacementRetry(
    checkpoint: PendingRecoveryCheckpoint & { recoveryDeadlineAt: Date },
  ): Promise<void> {
    const remainingMs = checkpoint.recoveryDeadlineAt.getTime() - this.dependencies.now().getTime();
    if (remainingMs <= 0) {
      await this.expireRecovery(checkpoint);
      return;
    }
    const attempt = this.replacementRetries.get(checkpoint.gameId) ?? 0;
    this.dependencies.schedule(
      () => this.createReplacement(checkpoint).then(() => undefined),
      Math.min(this.retryDelay(attempt), remainingMs),
    );
    this.replacementRetries.set(checkpoint.gameId, attempt + 1);
  }

  private renewRecoveredRoomMappingLease(
    mapping: RecoveredRoomMappingInput,
    checkpoint: PendingRecoveryCheckpoint,
    delayMs = 10_000,
  ): void {
    this.dependencies.schedule(async () => {
      try {
        const renewal = await this.dependencies.renewRecoveredRoomMappingLease(mapping);
        if (renewal.renewed) {
          this.leaseRenewalRetries.delete(mapping.gameId);
          this.renewRecoveredRoomMappingLease(mapping, checkpoint);
          return;
        }
        await this.retryLeaseRenewal(mapping, checkpoint, renewal.error ?? "lease no renovado");
      } catch (error) {
        await this.retryLeaseRenewal(
          mapping,
          checkpoint,
          error instanceof Error ? error.message : String(error),
        );
      }
    }, delayMs);
  }

  private async retryLeaseRenewal(
    mapping: RecoveredRoomMappingInput,
    checkpoint: PendingRecoveryCheckpoint,
    reason: string,
  ): Promise<void> {
    const attempts = this.leaseRenewalRetries.get(mapping.gameId) ?? 0;
    if (attempts >= 3) {
      const manualReviewReason = `No se pudo renovar el lease de la sala recuperada: ${reason}`;
      this.leaseRenewalRetries.delete(mapping.gameId);
      const result = await this.markManualReview(checkpoint, manualReviewReason);
      if (result.status === "manual_review" || result.success) {
        await this.disposeReplacementRoom(mapping.gameId);
      }
      return;
    }

    this.leaseRenewalRetries.set(mapping.gameId, attempts + 1);
    this.renewRecoveredRoomMappingLease(mapping, checkpoint, this.retryDelay(attempts));
  }

  private scheduleExpiration(checkpoint: PendingRecoveryCheckpoint & { recoveryDeadlineAt: Date }): void {
    const delayMs = Math.max(0, checkpoint.recoveryDeadlineAt.getTime() - this.dependencies.now().getTime());
    this.dependencies.schedule(() => this.expireRecovery(checkpoint), delayMs);
  }

  private async scheduleOrExpireRecovery(
    checkpoint: PendingRecoveryCheckpoint,
    incidentDeadlineAt?: Date,
  ): Promise<(PendingRecoveryCheckpoint & { recoveryDeadlineAt: Date }) | undefined> {
    const recoveryDeadlineAt = incidentDeadlineAt ?? checkpoint.recoveryDeadlineAt;
    if (!(recoveryDeadlineAt instanceof Date) || Number.isNaN(recoveryDeadlineAt.getTime())) {
      await this.markManualReview(checkpoint, "El incidente no tiene un deadline de recuperación persistido");
      return undefined;
    }

    const recovery = { ...checkpoint, recoveryDeadlineAt };
    if (recoveryDeadlineAt.getTime() <= this.dependencies.now().getTime()) {
      await this.expireRecovery(recovery);
      return undefined;
    }
    this.scheduleExpiration(recovery);
    return recovery;
  }

  private async expireRecovery(checkpoint: PendingRecoveryCheckpoint): Promise<void> {
    this.observer.record({
      level: "warn",
      event: "deadline_expired",
      roomId: checkpoint.roomId,
      gameId: checkpoint.gameId,
      phase: checkpointPhase(checkpoint),
    });
    const derived = await this.dependencies.deriveRecoveryRefunds(checkpoint.gameId);
    if (!derived.success || !derived.refunds) {
      const result = await this.markManualReview(checkpoint, derived.error ?? "No se pudieron derivar refunds desde el ledger");
      if (result.status === "manual_review") {
        await this.disposeReplacementRoom(checkpoint.gameId);
      }
      return;
    }

    const result = await this.dependencies.expireRecoveryIncidentAndRefund({
      gameId: checkpoint.gameId,
      refunds: derived.refunds.map((refund) => ({
        ...refund,
        operationId: stableRecoveryRefundOperationId(checkpoint.gameId, refund.userId),
      })),
    });
    if (!result.success) {
      const manualReview = await this.markManualReview(checkpoint, result.error ?? "La expiración del incidente falló");
      if (manualReview.status === "manual_review") {
        await this.disposeReplacementRoom(checkpoint.gameId);
      }
      return;
    }

    if (result.status === "recovery_pending") {
      // The database clock may still be just before the persisted deadline.
      this.dependencies.schedule(() => this.expireRecovery(checkpoint), 1_000);
      return;
    }

    if (result.status === "cancelled_crash" || result.status === "manual_review") {
      await this.disposeReplacementRoom(checkpoint.gameId);
    }
  }

  private async markManualReview(
    checkpoint: PendingRecoveryCheckpoint,
    reason: string,
  ): Promise<{ success: boolean; status?: string; error?: string }> {
    this.observer.record({
      level: "error",
      event: "manual_review",
      roomId: checkpoint.roomId,
      gameId: checkpoint.gameId,
      phase: checkpointPhase(checkpoint),
      errCode: "manual_review_required",
    });
    const result = await this.dependencies.markRecoveryIncidentManualReview({ gameId: checkpoint.gameId, reason });
    if (result.status === "manual_review") {
      await this.dependencies.emitRecoveryManualReviewAlert({
        gameId: checkpoint.gameId,
        roomId: checkpoint.roomId,
        reason,
      });
    }
    return result;
  }

  private async disposeReplacementRoom(gameId: string): Promise<void> {
    const roomId = this.replacementRoomIds.get(gameId);
    if (!roomId) return;
    this.replacementRoomIds.delete(gameId);
    await this.dependencies.disposeReplacementRoom(roomId);
  }
}
