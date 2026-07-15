import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { installCrashProcessHandlers } from "../CrashProcessHandlers";

describe("installCrashProcessHandlers", () => {
  it("alerta y drena ante una excepción no capturada sin ejecutar compensaciones", () => {
    const processEvents = new EventEmitter();
    const alertCritical = vi.fn();
    const drain = vi.fn();
    const record = vi.fn();

    installCrashProcessHandlers({
      processEvents,
      alertCritical,
      drain,
      observer: { record },
    });
    processEvents.emit("uncaughtException", new Error("database unavailable"));

    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      level: "error",
      event: "critical_process_failure",
      errCode: "uncaught_exception",
    }));
    expect(alertCritical).toHaveBeenCalledWith(expect.objectContaining({
      severity: "critical",
      category: "process_crash",
    }));
    expect(drain).toHaveBeenCalledWith("uncaughtException");
  });

  it("trata un rejection no manejado como fallo crítico", () => {
    const processEvents = new EventEmitter();
    const drain = vi.fn();
    const record = vi.fn();

    installCrashProcessHandlers({
      processEvents,
      alertCritical: vi.fn(),
      drain,
      observer: { record },
    });
    processEvents.emit("unhandledRejection", "worker failed");

    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      errCode: "unhandled_rejection",
    }));
    expect(drain).toHaveBeenCalledWith("unhandledRejection");
  });
});
