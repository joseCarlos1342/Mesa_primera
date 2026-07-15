import type { EventEmitter } from "node:events";
import { AlertService, type AlertPayload } from "./AlertService";
import { recoveryObserver, type RecoveryObserver } from "./RecoveryObservability";

interface CrashProcessHandlerDependencies {
  processEvents?: Pick<EventEmitter, "on">;
  observer?: RecoveryObserver;
  alertCritical?: (payload: AlertPayload) => void;
  drain: (source: "uncaughtException" | "unhandledRejection") => void;
}

function describeFailure(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * A process crash only drains the server. Financial recovery remains owned by
 * the next process startup and its persisted, idempotent recovery workflow.
 */
export function installCrashProcessHandlers(dependencies: CrashProcessHandlerDependencies): void {
  const processEvents = dependencies.processEvents ?? process;
  const observer = dependencies.observer ?? recoveryObserver;
  const alertCritical = dependencies.alertCritical ?? AlertService.emit;

  const handle = (
    source: "uncaughtException" | "unhandledRejection",
    reason: unknown,
  ): void => {
    const errCode = source === "uncaughtException" ? "uncaught_exception" : "unhandled_rejection";
    const message = describeFailure(reason);
    observer.record({ level: "error", event: "critical_process_failure", errCode });
    alertCritical({
      severity: "critical",
      category: "process_crash",
      title: "Game server entra en draining por fallo crítico",
      message,
      metadata: { source, errCode },
    });
    dependencies.drain(source);
  };

  processEvents.on("uncaughtException", (error: Error) => handle("uncaughtException", error));
  processEvents.on("unhandledRejection", (reason: unknown) => handle("unhandledRejection", reason));
}
