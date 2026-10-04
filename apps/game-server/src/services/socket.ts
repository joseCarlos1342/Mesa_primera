import { Server as SocketIOServer, Namespace } from "socket.io";
import { createServer } from "http";
import { enqueuePushNotification } from "./push-notifications";
import { SupabaseService, type SocketIdentity } from "./SupabaseService";

let notifNamespace: Namespace | null = null;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isTicketId(value: unknown): value is string {
    return typeof value === 'string' && UUID_PATTERN.test(value);
}

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

    supportNamespace.use(async (socket, next) => {
        try {
            const auth = socket.handshake.auth;
            const accessToken = auth && typeof auth === 'object' && 'accessToken' in auth
                ? (auth as { accessToken?: unknown }).accessToken
                : undefined;
            const identity = await SupabaseService.getSocketIdentity(accessToken);
            if (!identity) {
                next(new Error("unauthorized"));
                return;
            }
            socket.data.identity = identity;
            next();
        } catch {
            next(new Error("unauthorized"));
        }
    });

    supportNamespace.on("connection", (socket) => {
        const identity = socket.data.identity as SocketIdentity;
        console.log(`[Socket.IO] New connection in /support: ${socket.id}`);

        if (identity.role === 'admin') socket.join('support:admins');

        // Player/Admin joins their ticket room for scoped broadcasts
        socket.on("support:join", async (ticketId: string) => {
            if (!isTicketId(ticketId) || !await SupabaseService.canAccessSupportTicket(ticketId, identity)) return;
            socket.join(`ticket:${ticketId}`);
            console.log(`[Socket.IO] ${socket.id} joined ticket:${ticketId}`);
        });

        socket.on("support:leave", (ticketId: string) => {
            if (!isTicketId(ticketId)) return;
            socket.leave(`ticket:${ticketId}`);
        });

        // New ticket created by player — notify admins
        socket.on("support:ticket-created", async (data: {
            ticketId: string;
            username: string;
            preview: string;
        }) => {
            if (!data || typeof data !== 'object') return;
            if (identity.role !== 'player' || !isTicketId(data.ticketId)) return;
            if (!await SupabaseService.canAccessSupportTicket(data.ticketId, identity)) return;
            supportNamespace.to('support:admins').emit("support:ticket-created", {
                ticketId: data.ticketId,
                userId: identity.userId,
                username: typeof data.username === 'string' ? data.username.slice(0, 120) : '',
                preview: typeof data.preview === 'string' ? data.preview.slice(0, 200) : '',
            });
        });

        // Message appended (player or admin) — broadcast to ticket room
        socket.on("support:message-created", async (data: {
            ticketId: string;
            messageId: string;
            message?: string;
            from?: "player" | "admin";
            userId?: string;
            username?: string;
            timestamp?: string;
        }) => {
            if (!data || typeof data !== 'object') return;
            if (!isTicketId(data.ticketId) || typeof data.messageId !== 'string') return;
            if (!await SupabaseService.canAccessSupportTicket(data.ticketId, identity)) return;
            const event = await SupabaseService.getSupportMessageEvent(data.messageId, data.ticketId, identity);
            if (!event) return;
            socket.to(`ticket:${data.ticketId}`).emit("support:message-created", event);
            supportNamespace.to('support:admins').emit("support:message-created", event);
        });

        // Ticket attended (auto-transition when admin replies)
        socket.on("support:ticket-attended", async (data: {
            ticketId: string;
        }) => {
            if (!data || typeof data !== 'object') return;
            if (identity.role !== 'admin' || !isTicketId(data.ticketId)) return;
            if (!await SupabaseService.canAccessSupportTicket(data.ticketId, identity)) return;
            const state = await SupabaseService.getSupportTicketEventState(data.ticketId);
            if (state?.status !== 'attended' || state.lastMessageFrom !== 'admin') return;
            socket.to(`ticket:${data.ticketId}`).emit("support:ticket-attended", data);
            supportNamespace.to('support:admins').emit("support:ticket-attended", data);
        });

        // Ticket finalized (bilateral close)
        socket.on("support:ticket-finalized", async (data: {
            ticketId: string;
            closedByRole?: "player" | "admin";
        }) => {
            if (!data || typeof data !== 'object') return;
            if (!isTicketId(data.ticketId) || !await SupabaseService.canAccessSupportTicket(data.ticketId, identity)) return;
            const state = await SupabaseService.getSupportTicketEventState(data.ticketId);
            if (state?.status !== 'finalized' || state.closedByRole !== identity.role) return;
            const event = { ticketId: data.ticketId, closedByRole: state.closedByRole };
            socket.to(`ticket:${data.ticketId}`).emit("support:ticket-finalized", event);
            supportNamespace.to('support:admins').emit("support:ticket-finalized", event);
        });

        // Attachment added
        socket.on("support:attachment-added", async (data: {
            ticketId: string;
            fileName: string;
            mimeType: string;
        }) => {
            if (!data || typeof data !== 'object') return;
            if (!isTicketId(data.ticketId) || !await SupabaseService.canAccessSupportTicket(data.ticketId, identity)) return;
            socket.to(`ticket:${data.ticketId}`).emit("support:attachment-added", data);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket.IO] Disconnected from /support: ${socket.id}`);
        });
    });

    // --- Notifications Namespace ---
    notifNamespace = io.of("/notifications");
    notifNamespace.use(async (socket, next) => {
        try {
            const auth = socket.handshake.auth;
            const accessToken = auth && typeof auth === 'object' && 'accessToken' in auth
                ? (auth as { accessToken?: unknown }).accessToken
                : undefined;
            const identity = await SupabaseService.getSocketIdentity(accessToken);
            if (!identity) {
                next(new Error("unauthorized"));
                return;
            }
            socket.data.identity = identity;
            next();
        } catch {
            next(new Error("unauthorized"));
        }
    });
    notifNamespace.on("connection", (socket) => {
        console.log(`[Socket.IO] New connection in /notifications: ${socket.id}`);

        socket.on("register", () => {
            const identity = socket.data.identity as SocketIdentity;
            socket.join(identity.userId);
            console.log(`[Socket.IO] User ${identity.userId} registered for notifications`);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket.IO] Disconnected from /notifications: ${socket.id}`);
        });
    });

    const PORT = process.env.SOCKET_PORT || 2568;
    httpServer.listen(PORT, () => {
        console.log(`💬 Socket.IO Listening on http://0.0.0.0:${PORT}`);
    });
    
    return { io, httpServer };
}
