import { defineServer, defineRoom, LobbyRoom } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import cors from "cors";
import express from "express";
import { MesaRoom } from "./rooms/MesaRoom";
import { ReplayFileService } from "./services/ReplayFileService";
import { emitBroadcastToClients } from "./services/socket";

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

        app.get("/health", (req, res) => {
            res.json({ status: "ok", version: "0.17.8", timestamp: new Date().toISOString() });
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
