import { listen } from "@colyseus/tools";
import app from "./app.config";
import { startIntegrityCron } from "./cron/integrityCheck";
import { startAntiCollusionCron } from "./cron/antiCollusion";
import { initializeSocketIOServer } from "./services/socket";
import "./workers/push.worker";  // Initialize BullMQ worker

// Initialize render worker only if RENDER_SECRET_TOKEN is configured
if (process.env.RENDER_SECRET_TOKEN) {
    require("./workers/render.worker");
    console.log("[RenderWorker] Initialized — MP4 rendering enabled");
}

// Polyfill WebSocket for Node 20 compatibility with Colyseus 0.17+
if (typeof WebSocket === "undefined") {
    const WS = require("ws");
    (globalThis as any).WebSocket = WS;
}

listen(app, 2567).then(() => {
    console.log("⚔️  Listening on http://0.0.0.0:2567");
    
    // Iniciar tareas en segundo plano (CronJobs sin costo adicional)
    startIntegrityCron();
    startAntiCollusionCron();

    // Start Socket.IO for chat and notifications
    initializeSocketIOServer();
});
