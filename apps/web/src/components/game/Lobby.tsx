"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { client } from '@/lib/colyseus'
import { createClient } from '@/utils/supabase/client'
import { RoomAvailable, Room } from '@colyseus/sdk'
import { useRouter } from 'next/navigation'
import { Film, Plus, RefreshCcw, Settings2 } from 'lucide-react'
import { DepositModal } from '@/components/game/DepositModal'
import { CustomMesaModal } from '@/components/game/CustomMesaModal'
import Link from 'next/link'
import { formatAmount } from '@/utils/format'
import type { LobbyTable } from '@/app/actions/admin-tables'
import { AuthAlert } from '@/components/auth/AuthForm'
import { ConfirmDialog } from '@/components/player/ConfirmDialog'
import { PageHeader, Section, playerButton } from '@/components/player/PlayerUI'
import { LobbyTableCard, ServerStatusBar, toTableView, type ServerStatus } from './LobbyParts'

interface LobbyProps {
  lobbyTables?: { common: LobbyTable[]; custom: LobbyTable[] };
}

type MatchmakingIdentity = {
  userId: string;
  accessToken: string;
};

type LobbyRoomEntry = RoomAvailable & { _dbConfig?: LobbyTable }

interface LobbyProfile {
  id: string
  role?: string
  username?: string | null
  avatar_url?: string | null
  balance: number
  balance_cents: number
}

const MATCHMAKING_SESSION_ERROR = 'Tu sesión expiró. Vuelve a iniciar sesión para entrar a una mesa.';
const RETRY_DELAY_MS = 8000

async function getMatchmakingIdentity(): Promise<MatchmakingIdentity | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user?.id || !session.access_token) return null;

    return {
      userId: session.user.id,
      accessToken: session.access_token,
    };
  } catch {
    return null;
  }
}

/** Mensaje legible a partir del error de Colyseus (el servidor ya envía el motivo en español). */
function matchmakingMessage(e: unknown, fallback: string): string {
  const message = e instanceof Error ? e.message : typeof e === 'string' ? e : ''
  if (/acceso denegado|suspend|sanci/i.test(message)) return message
  if (/saldo|fondos/i.test(message)) return message
  return fallback
}

export function Lobby({ lobbyTables }: LobbyProps) {
  const [rooms, setRooms] = useState<RoomAvailable[]>([])
  const [status, setStatus] = useState<ServerStatus>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userProfile, setUserProfile] = useState<LobbyProfile | null>(null)
  const router = useRouter()
  const lobbyRoomRef = useRef<Room | null>(null)
  const creatingRef = useRef(false)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showDeposit, setShowDeposit] = useState(false)
  const [showCustomMesa, setShowCustomMesa] = useState(false)

  const connectToLobby = useCallback(async () => {
    if (retryRef.current) {
      clearTimeout(retryRef.current)
      retryRef.current = null
    }
    setStatus('connecting')
    try {
      if (lobbyRoomRef.current) {
        lobbyRoomRef.current.leave()
      }

      const lobby = await client.joinOrCreate("lobby")
      lobbyRoomRef.current = lobby
      setStatus('online')
      setError(null)

      lobby.onMessage("rooms", (availableRooms) => {
        setRooms(availableRooms)
      })

      lobby.onMessage("+", ([roomId, room]) => {
        setRooms((prev) => {
          const index = prev.findIndex((r) => r.roomId === roomId)
          if (index !== -1) {
            const next = [...prev]
            next[index] = room
            return next
          }
          return [...prev, room]
        })
      })

      lobby.onMessage("-", (roomId) => {
        setRooms((prev) => prev.filter((r) => r.roomId !== roomId))
      })

      // Si el servidor cierra la conexión, el indicador pasa a rojo y se reintenta solo.
      lobby.onLeave?.((code: number) => {
        if (lobbyRoomRef.current !== lobby) return
        lobbyRoomRef.current = null
        if (code === 1000) return
        setStatus('offline')
        retryRef.current = setTimeout(() => { void connectToLobby() }, RETRY_DELAY_MS)
      })
    } catch (e) {
      console.error("Lobby Connection Error:", e)
      setStatus('offline')
      retryRef.current = setTimeout(() => { void connectToLobby() }, RETRY_DELAY_MS)
    }
  }, [])

  useEffect(() => {
    const syncUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profile) {
          setIsAdmin(profile.role === 'admin')

          const { data: wallet } = await supabase
            .from('wallets')
            .select('balance_cents')
            .eq('user_id', user.id)
            .single()

          setUserProfile({
            ...profile,
            balance: wallet ? wallet.balance_cents / 100 : 0,
            balance_cents: wallet ? wallet.balance_cents : 0,
          })
          if (profile.username) {
            localStorage.setItem('nickname', profile.username)
          }
          if (profile.avatar_url) {
            localStorage.setItem('avatarUrl', profile.avatar_url)
          } else if (user.user_metadata?.avatar_url) {
            localStorage.setItem('avatarUrl', user.user_metadata.avatar_url)
          }
        }
      }
    }

    // Reconexión automática: si hay un token activo en sessionStorage, vuelve a esa mesa.
    const checkActiveSessions = () => {
      const keys = Object.keys(sessionStorage);
      const reconnectionTokenKey = keys.find(k => k.startsWith('reconnectionToken_'));

      if (reconnectionTokenKey) {
        const roomId = reconnectionTokenKey.replace('reconnectionToken_', '');
        setReconnecting(true);
        router.push(`/play/${roomId}`);
        return true;
      }
      return false;
    }

    if (!checkActiveSessions()) {
      syncUser()
      connectToLobby()
    }

    return () => {
      if (retryRef.current) clearTimeout(retryRef.current)
      if (lobbyRoomRef.current) {
        const room = lobbyRoomRef.current
        lobbyRoomRef.current = null
        room.leave()
      }
    }
  }, [connectToLobby, router])

  const requireBalance = (minEntryCents: number, tableName: string): boolean => {
    const balance = userProfile?.balance_cents || 0
    if (balance >= minEntryCents) return true
    setError(`Necesitas al menos $${formatAmount(minEntryCents)} de saldo para entrar a ${tableName}. Carga saldo y vuelve a intentarlo.`)
    setShowDeposit(true)
    return false
  }

  const enterNewRoom = async (key: string, roomOptions: Record<string, unknown>, failMessage: string) => {
    if (creating || creatingRef.current) return
    creatingRef.current = true
    setCreating(true)
    setBusyKey(key)
    setError(null)

    const identity = await getMatchmakingIdentity();
    if (!identity) {
      setError(MATCHMAKING_SESSION_ERROR);
      creatingRef.current = false;
      setCreating(false);
      setBusyKey(null)
      return;
    }

    try {
      let nick = localStorage.getItem('nickname');
      if (!nick) {
        nick = 'Jugador ' + Math.floor(Math.random() * 1000);
        localStorage.setItem('nickname', nick);
      }

      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('deviceId', deviceId);
      }

      const avatarUrl = localStorage.getItem('avatarUrl') || 'as-oros';

      const room = await client.create("mesa", {
        maxPlayers: 7,
        ...roomOptions,
        nickname: nick,
        deviceId,
        avatarUrl,
        chips: userProfile?.balance_cents || 0,
        userId: identity.userId,
        accessToken: identity.accessToken,
      })

      sessionStorage.setItem(`reconnectionToken_${room.roomId}`, room.reconnectionToken);
      sessionStorage.setItem(`nickname_${room.roomId}`, nick);

      if (room.connection?.transport?.close) {
        room.connection.transport.close();
      } else {
        try { (room.connection as unknown as { close: () => void }).close(); } catch { /* ignore */ }
      }

      setShowCustomMesa(false)
      router.push(`/play/${room.roomId}`)
    } catch (e) {
      console.error("Room Creation Error:", e)
      setError(matchmakingMessage(e, failMessage))
      creatingRef.current = false
      setCreating(false)
      setBusyKey(null)
    }
  }

  const createTable = async () => {
    // Saldo mínimo para abrir una mesa normal: $50.000
    if (!requireBalance(5_000_000, 'una mesa nueva')) return
    await enterNewRoom('admin-new', { tableName: `Mesa #${rooms.length + 1}` }, "Error al crear la mesa. Asegúrate de que el servidor esté activo.")
  }

  const createCustomMesa = async (options: {
    tableName: string
    maxPlayers: number
    minEntry: number
    minPique: number
    disabledChips: number[]
    isCustom: boolean
  }) => {
    await enterNewRoom('admin-custom', options, "Error al crear la mesa personalizada.")
  }

  const playTable = async (room: LobbyRoomEntry) => {
    const view = toTableView(room as Parameters<typeof toTableView>[0])
    if (!requireBalance(view.minEntryCents, view.name)) return

    if (!view.isPlaceholder) {
      router.push(`/play/${room.roomId}`)
      return
    }

    const db = room._dbConfig
    const roomOptions: Record<string, unknown> = {
      tableName: view.name,
      maxPlayers: db?.max_players || 7,
    }
    if (db) {
      roomOptions.minEntry = db.min_entry_cents;
      roomOptions.minPique = db.min_pique_cents;
      roomOptions.disabledChips = db.disabled_chips;
      roomOptions.isCustom = db.table_category === 'custom';
    }
    await enterNewRoom(room.roomId, roomOptions, "No se pudo abrir la mesa. Inténtalo de nuevo.")
  }

  const [tableToClose, setTableToClose] = useState<{ roomId: string; name: string } | null>(null)

  const deleteTable = async (roomId: string) => {
    if (!isAdmin) return;
    try {
      const roomToDelete = await client.joinById(roomId);
      roomToDelete.send("delete-room", { adminToken: userProfile?.id });
    } catch (e) {
      console.error("Error deleting room:", e);
      setError("No se pudo cerrar la mesa.");
    }
  }

  // Mesas comunes desde BD (con Mesa #1 / Mesa #2 como respaldo)
  const commonTables: LobbyTable[] = (lobbyTables?.common && lobbyTables.common.length > 0)
    ? lobbyTables.common
    : [
        { id: 'fallback-1', name: 'Mesa #1', game_type: 'primera_28', max_players: 7, table_category: 'common' as const, lobby_slot: 1, min_entry_cents: 5000000, min_pique_cents: 500000, disabled_chips: [], sort_order: 1 },
        { id: 'fallback-2', name: 'Mesa #2', game_type: 'primera_28', max_players: 7, table_category: 'common' as const, lobby_slot: 2, min_entry_cents: 5000000, min_pique_cents: 500000, disabled_chips: [], sort_order: 2 },
      ];

  const customTables: LobbyTable[] = lobbyTables?.custom || [];
  const tableNameOf = (r: RoomAvailable) => (r.metadata as { tableName?: string } | undefined)?.tableName

  const fixedTableNames = commonTables.map(t => t.name);
  const fixedTablesToShow: LobbyRoomEntry[] = commonTables.map((dbTable) => {
    const existing = rooms.find(r => tableNameOf(r) === dbTable.name);
    if (existing) return { ...existing, _dbConfig: dbTable };
    return {
      roomId: `placeholder-${dbTable.id}`,
      metadata: { tableName: dbTable.name, isPlaceholder: true },
      clients: 0,
      maxClients: dbTable.max_players,
      _dbConfig: dbTable,
    } as unknown as LobbyRoomEntry;
  });

  const liveOtherRooms = rooms.filter(r => !fixedTableNames.includes(tableNameOf(r) ?? ''));
  const customPlaceholders: LobbyRoomEntry[] = customTables
    .filter(ct => !rooms.some(r => tableNameOf(r) === ct.name))
    .map(ct => ({
      roomId: `custom-${ct.id}`,
      metadata: { tableName: ct.name, isPlaceholder: true, isCustom: true },
      clients: 0,
      maxClients: ct.max_players,
      _dbConfig: ct,
    } as unknown as LobbyRoomEntry));
  const otherTables: LobbyRoomEntry[] = [
    ...liveOtherRooms.map(r => {
      const dbMatch = customTables.find(ct => ct.name === tableNameOf(r));
      return dbMatch ? { ...r, _dbConfig: dbMatch } : r;
    }),
    ...customPlaceholders,
  ];

  const allTables = [...fixedTablesToShow, ...otherTables]
  const views = allTables.map(t => toTableView(t as Parameters<typeof toTableView>[0]))
  const playingTables = views.filter(v => !v.isPlaceholder && v.occupied > 0).length
  const playersOnline = views.reduce((sum, v) => sum + v.occupied, 0)
  const offline = status !== 'online'

  const renderTables = (list: LobbyRoomEntry[]) => (
    <ul className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {list.map((room) => {
        const view = toTableView(room as Parameters<typeof toTableView>[0])
        return (
          <li key={room.roomId}>
            <LobbyTableCard
              table={view}
              busy={busyKey === room.roomId}
              disabled={creating || offline}
              onPlay={() => { void playTable(room) }}
              onClose={isAdmin && !view.isPlaceholder ? () => setTableToClose({ roomId: room.roomId, name: view.name }) : undefined}
            />
          </li>
        )
      })}
    </ul>
  )

  if (reconnecting) {
    return (
      <div role="status" className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <span aria-hidden="true" className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#8b6b2e] bg-[#0a2c20] text-brand-gold-light">
          <RefreshCcw className="h-9 w-9 motion-safe:animate-spin" />
        </span>
        <h1 className="font-display text-[2.25rem] font-bold leading-tight text-text-premium">Volviendo a tu mesa</h1>
        <p className="mt-2 max-w-sm text-lg text-[#d9d3bf]">Tenías una partida abierta. Te llevamos de vuelta a tu puesto.</p>
        <button
          type="button"
          onClick={() => {
            Object.keys(sessionStorage).forEach(k => {
              if (k.startsWith('reconnectionToken_')) sessionStorage.removeItem(k);
            });
            setReconnecting(false);
          }}
          className={`${playerButton.secondary} mt-8 px-8`}
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title="Mesas"
        lead="Elige una mesa libre para abrirla o entra a una donde ya hay jugadores."
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <ServerStatusBar
          status={status}
          openTables={views.length}
          playingTables={playingTables}
          players={playersOnline}
          onRetry={() => { void connectToLobby() }}
        />

        {userProfile && (
          <div className="flex flex-wrap items-center gap-4 lg:justify-end">
            <p className="text-lg text-[#d9d3bf]">
              Tu saldo{' '}
              <span className="ml-1 font-mono text-2xl font-medium tabular-nums text-text-premium">
                <span className="text-[#c5a059]">$</span>{formatAmount(userProfile.balance_cents)}
              </span>
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowDeposit(true)} className={`${playerButton.secondary} min-h-12! whitespace-nowrap px-4 text-base!`}>
                <Plus className="h-5 w-5" aria-hidden="true" />
                Cargar saldo
              </button>
              <Link href="/replays" className={`${playerButton.secondary} min-h-12! whitespace-nowrap px-4 text-base!`}>
                <Film className="h-5 w-5" aria-hidden="true" />
                Repeticiones
              </Link>
            </div>
          </div>
        )}
      </div>

      {error && (
        <AuthAlert className="mt-6">
          <span>{error}</span>
        </AuthAlert>
      )}

      <Section id="lobby-principales" title="Mesas del club" className="mt-10">
        {renderTables(fixedTablesToShow)}
      </Section>

      {otherTables.length > 0 && (
        <Section id="lobby-otras" title="Otras mesas" className="mt-12">
          {renderTables(otherTables)}
        </Section>
      )}

      {isAdmin && (
        <Section id="lobby-admin" title="Administración" className="mt-12">
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { void createTable() }}
              disabled={creating || offline}
              aria-label="Nueva mesa normal"
              className={`${playerButton.secondary} disabled:opacity-60`}
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
              Nueva mesa
            </button>
            <button
              type="button"
              onClick={() => setShowCustomMesa(true)}
              disabled={creating || offline}
              aria-label="Mesa personalizada"
              className={`${playerButton.secondary} disabled:opacity-60`}
            >
              <Settings2 className="h-5 w-5" aria-hidden="true" />
              Mesa personalizada
            </button>
          </div>
        </Section>
      )}

      <DepositModal isOpen={showDeposit} onClose={() => setShowDeposit(false)} />

      <ConfirmDialog
        open={tableToClose !== null}
        tone="danger"
        title={`¿Cerrar ${tableToClose?.name ?? 'la mesa'}?`}
        description="Los jugadores sentados saldrán de la mesa."
        confirmLabel="Sí, cerrar"
        onCancel={() => setTableToClose(null)}
        onConfirm={() => {
          const target = tableToClose
          setTableToClose(null)
          if (target) void deleteTable(target.roomId)
        }}
      />

      <CustomMesaModal
        isOpen={showCustomMesa}
        onClose={() => setShowCustomMesa(false)}
        onCreateMesa={createCustomMesa}
        creating={creating}
      />
    </>
  )
}
