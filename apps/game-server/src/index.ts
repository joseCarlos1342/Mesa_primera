import { listen } from "@colyseus/tools";
import app from "./app.config";
import { startIntegrityCron } from "./cron/integrityCheck";

// Polyfill WebSocket for Node 20 compatibility with Colyseus 0.17+
if (typeof WebSocket === "undefined") {
    const WS = require("ws");
    (globalThis as any).WebSocket = WS;
}

listen(app, 2567).then(() => {
    console.log("⚔️  Listening on http://0.0.0.0:2567");
    
    // Iniciar tareas en segundo plano (CronJobs sin costo adicional)
    startIntegrityCron();
});
