import { Server as SocketIOServer, Namespace } from "socket.io";
import { createServer } from "http";
import { enqueuePushNotification } from "./push-notifications";

let notifNamespace: Namespace | null = null;

/** Broadcast a notification to all connected clients in /notifications */
export function emitBroadcastToClients(payload: {
    broadcastId: string;
    type: string;
    title: string;
    body: string;
    createdAt: string;
}) {
    if (!notifNamespace) {
        console.warn("[Socket.IO] /notifications namespace not initialized");
        return;
    }
    notifNamespace.emit("notification", payload);
    console.log(`[Socket.IO] Broadcast emitted to /notifications:`, payload.broadcastId);
}

/** Enqueue push notifications for a list of user IDs */
export async function enqueueBroadcastPush(
    userIds: string[],
    payload: { title: string; body: string; broadcastId: string }
) {
    let queued = 0;
    for (const uid of userIds) {
        try {
            await enqueuePushNotification(uid, payload);
            queued++;
        } catch (e) {
            console.error(`[Socket.IO] Failed to enqueue push for ${uid}:`, e);
        }
    }
    console.log(`[Socket.IO] Queued push for ${queued}/${userIds.length} users`);
    return queued;
}

export function initializeSocketIOServer() {
    const httpServer = createServer();
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => callback(null, true),
            credentials: true
        }
    });

    // --- Support Chat Namespace ---
    const supportNamespace = io.of("/support");

    supportNamespace.on("connection", (socket) => {
        console.log(`[Socket.IO] New connection in /support: ${socket.id}`);

        // Player/Admin joins their ticket room for scoped broadcasts
        socket.on("support:join", (ticketId: string) => {
            socket.join(`ticket:${ticketId}`);
            console.log(`[Socket.IO] ${socket.id} joined ticket:${ticketId}`);
        });

        socket.on("support:leave", (ticketId: string) => {
            socket.leave(`ticket:${ticketId}`);
        });

        // New ticket created by player — notify admins
        socket.on("support:ticket-created", (data: {
            ticketId: string;
            userId: string;
            username: string;
            preview: string;
        }) => {
            socket.broadcast.emit("support:ticket-created", data);
        });

        // Message appended (player or admin) — broadcast to ticket room
        socket.on("support:message-created", (data: {
            ticketId: string;
            messageId: string;
            message: string;
            from: "player" | "admin";
            userId: string;
            username?: string;
            timestamp: string;
        }) => {
            socket.to(`ticket:${data.ticketId}`).emit("support:message-created", data);
            // Also broadcast to all admins for list updates
            socket.broadcast.emit("support:message-created", data);
        });

        // Ticket attended (auto-transition when admin replies)
        socket.on("support:ticket-attended", (data: {
            ticketId: string;
        }) => {
            socket.to(`ticket:${data.ticketId}`).emit("support:ticket-attended", data);
            socket.broadcast.emit("support:ticket-attended", data);
        });

        // Ticket finalized (bilateral close)
        socket.on("support:ticket-finalized", (data: {
            ticketId: string;
            closedByRole: "player" | "admin";
        }) => {
            socket.to(`ticket:${data.ticketId}`).emit("support:ticket-finalized", data);
            socket.broadcast.emit("support:ticket-finalized", data);
        });

        // Attachment added
        socket.on("support:attachment-added", (data: {
            ticketId: string;
            fileName: string;
            mimeType: string;
        }) => {
            socket.to(`ticket:${data.ticketId}`).emit("support:attachment-added", data);
        });

        // Legacy event compatibility (temporary — remove after full migration)
        socket.on("support:message", async (data: any) => {
            socket.broadcast.emit("support:incoming", data);
        });
        socket.on("support:reply", async (data: any) => {
            socket.broadcast.emit("support:message", data);
        });
        socket.on("support:resolve", (data: any) => {
            socket.broadcast.emit("support:resolved", data);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket.IO] Disconnected from /support: ${socket.id}`);
        });
    });

    // --- Notifications Namespace ---
    notifNamespace = io.of("/notifications");
    notifNamespace.on("connection", (socket) => {
        console.log(`[Socket.IO] New connection in /notifications: ${socket.id}`);

        socket.on("register", (userId) => {
            socket.join(userId);
            console.log(`[Socket.IO] User ${userId} registered for notifications`);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket.IO] Disconnected from /notifications: ${socket.id}`);
        });
    });

    const PORT = process.env.SOCKET_PORT || 2568;
    httpServer.listen(PORT, () => {
        console.log(`💬 Socket.IO Listening on http://0.0.0.0:${PORT}`);
    });
    
    return io;
}
