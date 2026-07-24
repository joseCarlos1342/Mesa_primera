import { listen } from "@colyseus/tools";
import type { Server as HTTPServer } from "http";
import type { Server as SocketIOServer } from "socket.io";
import app from "./app.config";
import { startIntegrityCron } from "./cron/integrityCheck";
import { startAntiCollusionCron } from "./cron/antiCollusion";
import { initializeSocketIOServer } from "./services/socket";
import { setDraining } from "./runtime-state";
import { ledgerQueue, ledgerQueueEvents, ledgerWorker } from "./workers";
import { CrashRecoveryService } from "./services/CrashRecoveryService";
import { installCrashProcessHandlers } from "./services/CrashProcessHandlers";
import { startNotificationDispatcher } from "./services/notification-dispatcher";
import { pushWorker } from "./workers/push.worker";

// Polyfill WebSocket for Node 20 compatibility with Colyseus 0.17+
if (typeof WebSocket === "undefined") {
    const WS = require("ws");
    (globalThis as any).WebSocket = WS;
}

let socketHttpServer: HTTPServer | null = null;
let socketIo: SocketIOServer | null = null;
let shuttingDown = false;
let stopNotificationDispatcher: (() => void) | null = null;

listen(app, 2567).then(async () => {
    console.log("⚔️  Listening on http://0.0.0.0:2567");

    try {
        await new CrashRecoveryService().start();
    } catch (error) {
        console.error("[recovery] No se pudieron recuperar partidas pendientes:", error);
    }

    // Iniciar tareas en segundo plano (CronJobs sin costo adicional)
    startIntegrityCron();
    startAntiCollusionCron();
    stopNotificationDispatcher = startNotificationDispatcher();

    // Start Socket.IO for chat and notifications
    const { io, httpServer } = initializeSocketIOServer();
    socketIo = io;
    socketHttpServer = httpServer;
});

/**
 * Apagado limpio para que el script `mesa-deploy` pueda recrear el contenedor
 * sin perder apuestas activas. El guardrail del script garantiza que no haya
 * jugadores cuando se entra aquí; igual cerramos todo de forma ordenada con
 * un timeout de 30s como red de seguridad.
 */
async function gracefulShutdown(signal: string, exitCode = 0): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] Recibido ${signal}, iniciando apagado limpio...`);
    setDraining(true);

    const forceExitTimer = setTimeout(() => {
        console.error("[shutdown] Timeout de 30s alcanzado, forzando exit(1)");
        process.exit(1);
    }, 30_000);
    forceExitTimer.unref();

    try {
        if (socketIo) {
            await new Promise<void>((resolve) => {
                socketIo!.close(() => resolve());
            });
            console.log("[shutdown] Socket.IO cerrado");
        }
        stopNotificationDispatcher?.();
        if (socketHttpServer && socketHttpServer.listening) {
            await new Promise<void>((resolve) => {
                socketHttpServer!.close(() => resolve());
            });
            console.log("[shutdown] HTTP server (Socket.IO) cerrado");
        }

        await Promise.allSettled([
            pushWorker.close(),
            ledgerWorker.close(),
            ledgerQueue.close(),
            ledgerQueueEvents.close(),
        ]);
        console.log("[shutdown] BullMQ workers/queues cerrados");
    } catch (err) {
        console.error("[shutdown] Error durante apagado:", err);
    } finally {
        clearTimeout(forceExitTimer);
        console.log(`[shutdown] Saliendo con código ${exitCode}`);
        process.exit(exitCode);
    }
}

process.on("SIGTERM", () => { void gracefulShutdown("SIGTERM"); });
process.on("SIGINT", () => { void gracefulShutdown("SIGINT"); });
installCrashProcessHandlers({
    drain: (source) => { void gracefulShutdown(source, 1); },
});
