import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueuePushNotification,
  getSocketIdentity,
  canAccessSupportTicket,
  getSupportMessageEvent,
  getSupportTicketEventState,
} = vi.hoisted(() => ({
  enqueuePushNotification: vi.fn(),
  getSocketIdentity: vi.fn(),
  canAccessSupportTicket: vi.fn(),
  getSupportMessageEvent: vi.fn(),
  getSupportTicketEventState: vi.fn(),
}));

vi.mock('../push-notifications', () => ({ enqueuePushNotification }));
vi.mock('../SupabaseService', () => ({
  SupabaseService: {
    getSocketIdentity,
    canAccessSupportTicket,
    getSupportMessageEvent,
    getSupportTicketEventState,
  },
}));

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
          to: vi.fn(() => ({ emit: vi.fn() })),
          use: vi.fn((middleware: (...args: any[]) => void) => {
            namespace.middlewares.push(middleware);
          }),
          on: vi.fn((event: string, handler: (...args: any[]) => void) => {
            namespace.handlers[event] = handler;
          }),
          handlers: {} as Record<string, (...args: any[]) => void>,
          middlewares: [] as Array<(...args: any[]) => void>,
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
    expect(namespaces['/support'].use).toHaveBeenCalled();
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
          to: vi.fn(() => ({ emit: vi.fn() })),
          use: vi.fn((middleware: (...args: any[]) => void) => {
            namespace.middlewares.push(middleware);
          }),
          on: vi.fn((event: string, handler: (...args: any[]) => void) => {
            namespace.handlers[event] = handler;
          }),
          handlers: {} as Record<string, (...args: any[]) => void>,
          middlewares: [] as Array<(...args: any[]) => void>,
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

    getSocketIdentity.mockResolvedValue({ userId: 'user-1', role: 'admin' });
    canAccessSupportTicket.mockResolvedValue(true);
    const ticketId = '11111111-1111-4111-8111-111111111111';
    const attendedTicketId = '22222222-2222-4222-8222-222222222222';
    const finalizedTicketId = '33333333-3333-4333-8333-333333333333';
    getSupportMessageEvent.mockResolvedValue({
      messageId: 'm1',
      ticketId,
      message: 'Hola',
      timestamp: 'now',
      from: 'admin',
      userId: 'user-1',
    });
    getSupportTicketEventState.mockImplementation(async (id: string) => id === attendedTicketId
      ? { status: 'attended', closedByRole: null, lastMessageFrom: 'admin' }
      : { status: 'finalized', closedByRole: 'admin', lastMessageFrom: 'admin' });

    const next = vi.fn();
    await namespaces['/support'].middlewares[0]({ handshake: { auth: { accessToken: 'token-1' } }, data: {} }, next);
    expect(next).toHaveBeenCalledWith();

    const supportHandlers: Record<string, (...args: any[]) => void> = {};
    const supportSocket = {
      id: 'socket-1',
      data: {},
      join: vi.fn(),
      leave: vi.fn(),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        supportHandlers[event] = handler;
      }),
      to: vi.fn(() => ({ emit: vi.fn() })),
      broadcast: { emit: vi.fn() },
    };
    supportSocket.data.identity = { userId: 'user-1', role: 'admin' };
    namespaces['/support'].handlers.connection(supportSocket);

    await supportHandlers['support:join'](ticketId);
    await supportHandlers['support:leave'](ticketId);
    await supportHandlers['support:ticket-created']({ ticketId, userId: 'forged-user', username: 'Ana', preview: 'Hola' });
    await supportHandlers['support:message-created']({ ticketId, messageId: 'm1', message: 'forged', from: 'player', userId: 'forged-user', timestamp: 'now' });
    await supportHandlers['support:ticket-attended']({ ticketId: attendedTicketId });
    await supportHandlers['support:ticket-finalized']({ ticketId: finalizedTicketId, closedByRole: 'player' });
    await supportHandlers['support:attachment-added']({ ticketId, fileName: 'proof.png', mimeType: 'image/png' });
    supportHandlers.disconnect();

    expect(supportSocket.join).toHaveBeenCalledWith(`ticket:${ticketId}`);
    expect(supportSocket.leave).toHaveBeenCalledWith(`ticket:${ticketId}`);
    expect(namespaces['/support'].emit).not.toHaveBeenCalledWith('support:ticket-created', expect.anything());
    expect(supportSocket.to).toHaveBeenCalledWith(`ticket:${ticketId}`);

    const notificationHandlers: Record<string, (...args: any[]) => void> = {};
    const notificationSocket = {
      id: 'socket-2',
      data: { identity: { userId: 'user-1', role: 'admin' } },
      join: vi.fn(),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => {
        notificationHandlers[event] = handler;
      }),
    };
    namespaces['/notifications'].handlers.connection(notificationSocket);
    notificationHandlers.register('forged-user');
    notificationHandlers.disconnect();

    expect(notificationSocket.join).toHaveBeenCalledWith('user-1');
  });

  it('rechaza conexiones de support sin identidad Supabase valida', async () => {
    const listen = vi.fn();
    vi.doMock('http', () => ({ createServer: vi.fn(() => ({ listen })) }));

    const namespace = {
      use: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    };
    vi.doMock('socket.io', () => ({
      Server: vi.fn(function Server() {
        return { of: vi.fn(() => namespace) };
      }),
    }));
    getSocketIdentity.mockResolvedValue(null);

    const { initializeSocketIOServer } = await import('../socket');
    initializeSocketIOServer();

    const next = vi.fn();
    await namespace.use.mock.calls[0][0]({ handshake: { auth: {} }, data: {} }, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'unauthorized' }));
  });
});
