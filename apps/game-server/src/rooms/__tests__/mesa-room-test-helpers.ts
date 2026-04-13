import type { ColyseusTestServer } from '@colyseus/testing';

interface CreateMesaTestContextOptions {
  tableId: string;
  playerCount?: number;
  chips?: number;
}

export async function createMesaTestContext(
  colyseus: ColyseusTestServer,
  options: CreateMesaTestContextOptions,
) {
  const {
    tableId,
    playerCount = 3,
    chips = 10_000_000,
  } = options;

  const room = await colyseus.createRoom<any>('mesa_primera', { tableId });
  const clients = [];

  for (let index = 0; index < playerCount; index += 1) {
    const client = await colyseus.connectTo(room, {
      userId: `test-user-${index + 1}`,
      username: `Player${index + 1}`,
      avatarUrl: '',
      chips,
    });
    clients.push(client);
  }

  await waitForStatePropagation();

  const ids = Array.from(room.state.players.keys()) as string[];
  const players = ids.map((id) => room.state.players.get(id)!);
  const internalRoom = colyseus.getRoomById(room.roomId) as any;

  return {
    room,
    internalRoom,
    clients,
    ids,
    players,
  };
}

export async function waitForStatePropagation(delayMs: number = 100) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}