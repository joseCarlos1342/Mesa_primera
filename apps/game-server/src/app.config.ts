import { defineServer, defineRoom, LobbyRoom } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import cors from "cors";
import express from "express";
import { MesaRoom } from "./rooms/MesaRoom";
import { ReplayFileService } from "./services/ReplayFileService";

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

        // ── MP4 download: requiere RENDER_SECRET_TOKEN para acceso ──

        app.get("/api/replays/:gameId/mp4", (req, res) => {
            const token = req.query.token as string | undefined;
            const secret = process.env.RENDER_SECRET_TOKEN;
            if (!secret || token !== secret) {
                res.status(403).json({ ok: false, error: "Forbidden" });
                return;
            }
            const gameId = req.params.gameId;
            const mp4Path = ReplayFileService.findMp4(gameId);
            if (!mp4Path) {
                res.status(404).json({ ok: false, error: "MP4 not found" });
                return;
            }
            res.setHeader("Content-Type", "video/mp4");
            res.setHeader("Content-Disposition", `attachment; filename="${gameId}.mp4"`);
            const stream = require("fs").createReadStream(mp4Path);
            stream.pipe(res);
        });

        app.use("/colyseus", monitor());
    },
});
