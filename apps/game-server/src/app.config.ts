import { defineServer, defineRoom, LobbyRoom, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import cors from "cors";
import express from "express";
import { MesaRoom } from "./rooms/MesaRoom";
import { ReplayFileService } from "./services/ReplayFileService";
import { emitBroadcastToClients } from "./services/socket";
import { isDraining } from "./runtime-state";

export default defineServer({
    transport: new WebSocketTransport({
        pingInterval: 5000,
        pingMaxRetries: 3,
    }),

    rooms: {
        "lobby": defineRoom(LobbyRoom),
        "mesa": defineRoom(MesaRoom).enableRealtimeListing(),
    },

    express: (app) => {
        // Iniciar job de limpieza de replays antiguos (>7 días)
        ReplayFileService.startCleanupJob();

        app.use(cors({
            origin: (origin, callback) => callback(null, true),
            credentials: true
        }));
        app.use(express.json());

        app.get("/health", async (req, res) => {
            const draining = isDraining();
            let activeRooms = 0;
            let activePlayers = 0;
            let activeGames = 0;
            try {
                const rooms = await matchMaker.query({ name: "mesa" });
                activeRooms = rooms.length;
                for (const r of rooms) {
                    const meta: any = r.metadata || {};
                    const ap = typeof meta.activePlayers === "number"
                        ? meta.activePlayers
                        : (typeof r.clients === "number" ? r.clients : 0);
                    activePlayers += ap;
                    if (ap > 0) activeGames += 1;
                }
            } catch (err) {
                // Si matchMaker no está listo aún, devolvemos contadores en cero
                // pero no fallamos el endpoint para no romper healthchecks.
                console.warn("[/health] matchMaker.query failed:", (err as Error).message);
            }

            res.status(draining ? 503 : 200).json({
                status: draining ? "draining" : "ok",
                version: "0.17.8",
                timestamp: new Date().toISOString(),
                draining,
                activeRooms,
                activePlayers,
                activeGames,
            });
        });

        // ── Replay API: servir grabaciones desde filesystem del VPS ──

        app.get("/api/replays", (req, res) => {
            const roomId = typeof req.query.roomId === 'string' ? req.query.roomId : undefined;
            const limit = parseInt(String(req.query.limit || '100'), 10);
            const replays = ReplayFileService.list({ roomId, limit: Math.min(limit, 500) });
            res.json({ ok: true, count: replays.length, data: replays });
        });

        app.get("/api/replays/:gameId", (req, res) => {
            const replay = ReplayFileService.load(req.params.gameId);
            if (!replay) {
                res.status(404).json({ ok: false, error: "Replay not found" });
                return;
            }
            res.json({ ok: true, data: replay });
        });

        app.use("/colyseus", monitor());

        // ── Broadcast API: emit broadcast to all connected Socket.IO clients ──

        app.post("/api/internal/broadcast", (req, res) => {
            const secret = process.env.INTERNAL_API_SECRET;
            const authHeader = req.headers["x-internal-secret"];
            if (!secret || authHeader !== secret) {
                res.status(403).json({ ok: false, error: "Forbidden" });
                return;
            }

            const { broadcastId, type, title, body, createdAt } = req.body;
            if (!broadcastId || !type || !title || !body) {
                res.status(400).json({ ok: false, error: "Missing required fields" });
                return;
            }

            emitBroadcastToClients({ broadcastId, type, title, body, createdAt: createdAt || new Date().toISOString() });
            res.json({ ok: true });
        });
    },
});
