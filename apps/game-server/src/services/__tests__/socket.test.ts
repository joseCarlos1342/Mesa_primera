import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const enqueuePushNotification = vi.hoisted(() => vi.fn());

vi.mock('../push-notifications', () => ({ enqueuePushNotification }));

describe('socket service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('warns instead of emitting broadcast before notifications namespace is initialized', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { emitBroadcastToClients } = await import('../socket');

    emitBroadcastToClients({
      broadcastId: 'broadcast-1',
      type: 'info',
      title: 'Titulo',
      body: 'Cuerpo',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(warnSpy).toHaveBeenCalledWith('[Socket.IO] /notifications namespace not initialized');
  });

  it('queues push notifications and continues after individual failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    enqueuePushNotification
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('queue down'))
      .mockResolvedValueOnce(undefined);
    const { enqueueBroadcastPush } = await import('../socket');

    await expect(enqueueBroadcastPush(['u1', 'u2', 'u3'], {
      title: 'Mesa',
      body: 'Mensaje',
      broadcastId: 'broadcast-1',
    })).resolves.toBe(2);

    expect(enqueuePushNotification).toHaveBeenCalledTimes(3);
    expect(errorSpy).toHaveBeenCalledWith('[Socket.IO] Failed to enqueue push for u2:', expect.any(Error));
  });

  it('initializes support and notifications namespaces without opening a real port', async () => {
    const listen = vi.fn((_port: number | string, callback: () => void) => callback());
    vi.doMock('http', () => ({ createServer: vi.fn(() => ({ listen })) }));

    const namespaces: Record<string, any> = {};
    const socketServer = {
      of: vi.fn((name: string) => {
        const namespace = {
          name,
          emit: vi.fn(),
          on: vi.fn((event: string, handler: (...args: any[]) => void) => {
            namespace.handlers[event] = handler;
          }),
          handlers: {} as Record<string, (...args: any[]) => void>,
        };
        namespaces[name] = namespace;
        return namespace;
      }),
    };
    vi.doMock('socket.io', () => ({
      Server: vi.fn(function Server() {
        return socketServer;
      }),
    }));
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const { initializeSocketIOServer, emitBroadcastToClients } = await import('../socket');
    const result = initializeSocketIOServer();

    expect(result.io).toBe(socketServer);
    expect(socketServer.of).toHaveBeenCalledWith('/support');
    expect(socketServer.of).toHaveBeenCalledWith('/notifications');
    expect(listen).toHaveBeenCalledWith(2568, expect.any(Function));

    emitBroadcastToClients({
      broadcastId: 'broadcast-1',
      type: 'info',
      title: 'Titulo',
      body: 'Cuerpo',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(namespaces['/notifications'].emit).toHaveBeenCalledWith('notification', expect.objectContaining({ broadcastId: 'broadcast-1' }));
  });

  it('wires support and notification socket event handlers', async () => {
    const listen = vi.fn((_port: number | string, callback: () => void) => callback());
    vi.doMock('http', () => ({ createServer: vi.fn(() => ({ listen })) }));

    const namespaces: Record<string, any> = {};
    const socketServer = {
      of: vi.fn((name: string) => {
        const namespace = {
          name,
          emit: vi.fn(),
          on: vi.fn((event: string, handler: (...args: any[]) => void) => {
            namespace.handlers[event] = handler;
          }),
          handlers: {} as Record<string, (...args: any[]) => void>,
        };
        namespaces[name] = namespace;
        return namespace;
      }),
    };
    vi.doMock('socket.io', () => ({
      Server: vi.fn(function Server() {
        return socketServer;
      }),
    }));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { initializeSocketIOServer } = await import('../socket');
    initializeSocketIOServer();

    const supportHandlers: Record<string, (...args: any[]) => void> = {};
    const supportSocket = {
      id: 'socket-1',
      join: vi.fn(),
      leave: vi.fn(),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        supportHandlers[event] = handler;
      }),
      to: vi.fn(() => ({ emit: vi.fn() })),
      broadcast: { emit: vi.fn() },
    };
    namespaces['/support'].handlers.connection(supportSocket);

    supportHandlers['support:join']('ticket-1');
    supportHandlers['support:leave']('ticket-1');
    supportHandlers['support:ticket-created']({ ticketId: 'ticket-1', userId: 'user-1', username: 'Ana', preview: 'Hola' });
    supportHandlers['support:message-created']({ ticketId: 'ticket-1', messageId: 'm1', message: 'Hola', from: 'player', userId: 'user-1', timestamp: 'now' });
    supportHandlers['support:ticket-attended']({ ticketId: 'ticket-1' });
    supportHandlers['support:ticket-finalized']({ ticketId: 'ticket-1', closedByRole: 'admin' });
    supportHandlers['support:attachment-added']({ ticketId: 'ticket-1', fileName: 'proof.png', mimeType: 'image/png' });
    supportHandlers['support:message']({ legacy: true });
    supportHandlers['support:reply']({ legacy: true });
    supportHandlers['support:resolve']({ legacy: true });
    supportHandlers.disconnect();

    expect(supportSocket.join).toHaveBeenCalledWith('ticket:ticket-1');
    expect(supportSocket.leave).toHaveBeenCalledWith('ticket:ticket-1');
    expect(supportSocket.broadcast.emit).toHaveBeenCalledWith('support:ticket-created', expect.objectContaining({ ticketId: 'ticket-1' }));
    expect(supportSocket.to).toHaveBeenCalledWith('ticket:ticket-1');

    const notificationHandlers: Record<string, (...args: any[]) => void> = {};
    const notificationSocket = {
      id: 'socket-2',
      join: vi.fn(),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        notificationHandlers[event] = handler;
      }),
    };
    namespaces['/notifications'].handlers.connection(notificationSocket);
    notificationHandlers.register('user-1');
    notificationHandlers.disconnect();

    expect(notificationSocket.join).toHaveBeenCalledWith('user-1');
  });
});
