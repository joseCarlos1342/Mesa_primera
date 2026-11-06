import Link from "next/link";
import { Film } from "lucide-react";
import { getPlayerMesaReplays, type ReplayFilters } from "@/app/actions/replays";
import { EmptyState, ListRow, Money, PageHeader, RowList, playerButton } from "@/components/player/PlayerUI";
import { REPLAY_PERIODS, ReplayPeriodFilter, periodLabel, replayQuery } from "@/components/replay/ReplayFilters";

function replayFilters(searchParams: Record<string, string | string[] | undefined>): ReplayFilters {
  const period = typeof searchParams.period === "string" && REPLAY_PERIODS.includes(searchParams.period as typeof REPLAY_PERIODS[number])
    ? searchParams.period as ReplayFilters["period"]
    : "7d";
  const from = typeof searchParams.from === "string" ? searchParams.from : undefined;
  const to = typeof searchParams.to === "string" ? searchParams.to : undefined;
  return { period, from, to };
}

const dayFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });

export default async function PlayerReplaysPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = replayFilters(await searchParams);
  const mesas = await getPlayerMesaReplays(filters);
  const custom = Boolean(filters.from || filters.to);

  return (
    <div className="max-w-4xl">
      <PageHeader
        back={{ href: "/lobby", label: "Mesas" }}
        title="Repeticiones"
        lead={`${mesas.length} ${mesas.length === 1 ? "mesa jugada" : "mesas jugadas"}${custom ? " en las fechas elegidas" : ` · ${periodLabel(filters.period)}`}. Toca una mesa para ver sus partidas.`}
      />

      <ReplayPeriodFilter filters={filters} />

      {mesas.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No hay partidas en este periodo"
          text="Cuando termines una partida, la verás aquí para repetirla con la misma mesa."
          action={
            filters.period !== "all" || custom ? (
              <Link href="/replays?period=all" className={`${playerButton.secondary} w-full`}>
                Ver todas
              </Link>
            ) : (
              <Link href="/lobby" className={`${playerButton.primary} w-full`}>
                Ir a las mesas
              </Link>
            )
          }
        />
      ) : (
        <RowList label="Mesas jugadas">
          {mesas.map((mesa) => {
            const playerNames = [...new Set((mesa.players ?? []).map((p) => p.nickname).filter(Boolean))];
            const first = new Date(mesa.first_played_at);
            const last = new Date(mesa.last_played_at);
            const net = mesa.total_net_result;
            return (
              <li key={mesa.room_id}>
                <ListRow
                  href={`/replays/mesa/${encodeURIComponent(mesa.room_id)}${replayQuery(filters)}`}
                  icon={Film}
                  iconTone={net > 0 ? "credit" : "debit"}
                  title={mesa.table_name || "Mesa"}
                  meta={
                    <>
                      <span className="tabular-nums">
                        {dayFormat.format(last)} · {timeFormat.format(first)}–{timeFormat.format(last)}
                      </span>
                      {playerNames.length > 0 && <span className="block truncate">{playerNames.join(", ")}</span>}
                    </>
                  }
                  trailing={
                    <>
                      <Money cents={net} direction={net > 0 ? "credit" : net < 0 ? "debit" : undefined} className="text-lg font-semibold" />
                      <span className="text-sm text-[#bdb7a6]">
                        {mesa.game_count} {mesa.game_count === 1 ? "partida" : "partidas"}
                      </span>
                    </>
                  }
                />
              </li>
            );
          })}
        </RowList>
      )}
    </div>
  );
}
