import Link from "next/link";
import { Film, TrendingDown, Trophy } from "lucide-react";
import { getPlayerReplaysForRoom, type ReplayFilters } from "@/app/actions/replays";
import { EmptyState, ListRow, Money, PageHeader, RowList, playerButton } from "@/components/player/PlayerUI";
import { REPLAY_PERIODS, periodLabel, replayQuery } from "@/components/replay/ReplayFilters";

interface Props {
  params: Promise<{ roomId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const dateFormat = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" });

export default async function MesaDetailPage({ params, searchParams }: Props) {
  const { roomId } = await params;
  const query = await (searchParams ?? Promise.resolve<Record<string, string | string[] | undefined>>({}));
  const period = typeof query.period === "string" && (REPLAY_PERIODS as readonly string[]).includes(query.period)
    ? (query.period as ReplayFilters["period"])
    : "7d";
  const filters: ReplayFilters = {
    period,
    from: typeof query.from === "string" ? query.from : undefined,
    to: typeof query.to === "string" ? query.to : undefined,
  };
  const replays = await getPlayerReplaysForRoom(roomId, filters);

  return (
    <div className="max-w-4xl">
      <PageHeader
        back={{ href: `/replays${replayQuery(filters)}`, label: "Repeticiones" }}
        title="Partidas de la mesa"
        lead={
          <>
            {replays.length} {replays.length === 1 ? "partida" : "partidas"} · {periodLabel(filters.period)} · mesa{" "}
            <span className="font-mono text-[#bdb7a6]">{roomId.substring(0, 8)}</span>
          </>
        }
      />

      {replays.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No hay partidas grabadas"
          text="Esta mesa todavía no tiene repeticiones en el periodo elegido."
          action={
            <Link href="/replays?period=all" className={`${playerButton.secondary} w-full`}>
              Ver todas
            </Link>
          }
        />
      ) : (
        <RowList label="Partidas">
          {replays.map((r) => {
            const playedAt = new Date(r.played_at);
            const rivals = (r.players ?? []).map((p) => p.nickname).filter(Boolean);
            return (
              <li key={r.game_id}>
                <ListRow
                  href={`/replays/${r.game_id}`}
                  icon={r.is_winner ? Trophy : TrendingDown}
                  iconTone={r.is_winner ? "credit" : "debit"}
                  title={
                    <>
                      {r.is_winner ? "Ganaste" : "Perdiste"}
                      <span className="ml-2 text-base font-normal tabular-nums text-[#bdb7a6]">
                        {dateFormat.format(playedAt)} · {timeFormat.format(playedAt)}
                      </span>
                    </>
                  }
                  meta={
                    <>
                      Bote <Money cents={r.total_pot} className="text-[#d9d3bf]" />
                      {rivals.length > 0 && <span className="block truncate">{rivals.join(" · ")}</span>}
                    </>
                  }
                  trailing={
                    <Money
                      cents={r.net_result}
                      direction={r.net_result > 0 ? "credit" : r.net_result < 0 ? "debit" : undefined}
                      className="text-lg font-semibold"
                    />
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
