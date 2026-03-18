import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";

export function initializeSocketIOServer() {
    const httpServer = createServer();
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow empty origin (like non-browser clients) or any localhost/127.0.0.1 for dev
                if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || process.env.NODE_ENV !== 'production') {
                    callback(null, true);
                } else {
                    callback(null, false);
                }
            },
            credentials: true
        }
    });

    // --- Support Chat Namespace ---
    const supportNamespace = io.of("/support");
    
    // Supabase client is no longer needed here as persistence moved to client side
    let supabase: any = null;


    supportNamespace.on("connection", (socket) => {
        console.log(`[Socket.IO] New connection in /support: ${socket.id}`);
        
        socket.on("support:message", async (data) => {
            // Broadcasts the incoming message to admins
            socket.broadcast.emit("support:incoming", data);
        });
        
        socket.on("support:reply", async (data) => {
            // Broadcasts the reply back to players
            socket.broadcast.emit("support:message", data);
        });

        socket.on("support:resolve", (data) => {
            // Broadcasts the resolution event to notify players the chat is closed
            socket.broadcast.emit("support:resolved", data);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket.IO] Disconnected from /support: ${socket.id}`);
        });
    });

    // --- Notifications Namespace ---
    const notifNamespace = io.of("/notifications");
    notifNamespace.on("connection", (socket) => {
        console.log(`[Socket.IO] New connection in /notifications: ${socket.id}`);

        socket.on("register", (userId) => {
            // Join a room specifically for this user to receive targeted notifications
            socket.join(userId);
            console.log(`[Socket.IO] User ${userId} registered for notifications`);
        });

        socket.on("admin:broadcast", async (data) => {
            console.log(`[Socket.IO] Admin broadcast received:`, data);
            
            // 1. In-app real-time notification to all connected clients in this namespace
            socket.broadcast.emit('notification', { title: data.title, body: data.body });
            
            // 2. Queue web pushes for offline/all users via BullMQ
            try {
                const { createClient } = require('@supabase/supabase-js');
                const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
                const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
                const supabase = createClient(supabaseUrl, supabaseKey);
                
                const { enqueuePushNotification } = require('./push-notifications');
                
                const { data: users } = await supabase.from('push_subscriptions').select('user_id');
                if (users && users.length > 0) {
                    const uniqueUsers = [...new Set(users.map((u: any) => u.user_id))];
                    for (const uid of uniqueUsers) {
                        await enqueuePushNotification(uid, { title: data.title, body: data.body });
                    }
                    console.log(`[Socket.IO] Queued push notifications for ${uniqueUsers.length} users.`);
                }
            } catch (e) {
                console.error('[Socket.IO] Failed to queue broadcast push notifications:', e);
            }
        });
    });

    const PORT = process.env.SOCKET_PORT || 2568;
    httpServer.listen(PORT, () => {
        console.log(`💬 Socket.IO Listening on http://0.0.0.0:${PORT}`);
    });
    
    return io;
}
