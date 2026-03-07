import { defineServer, defineRoom, LobbyRoom } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import cors from "cors";
import express from "express";
import { MesaRoom } from "./rooms/MesaRoom";

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
        app.use(cors({
            origin: (origin, callback) => callback(null, true),
            credentials: true
        }));
        app.use(express.json());

        app.get("/health", (req, res) => {
            res.json({ status: "ok", version: "0.17.8", timestamp: new Date().toISOString() });
        });

        app.use("/colyseus", monitor());
    },
});
