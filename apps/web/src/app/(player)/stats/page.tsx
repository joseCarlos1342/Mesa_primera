import { createClient } from "@/utils/supabase/server";
import { StatsDashboard } from "./_components/stats-dashboard";

export default async function StatsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <h1 className="text-xl text-red-400">Debes iniciar sesión para ver tus estadísticas.</h1>
      </div>
    );
  }

  // Fetch stats
  const { data: stats, error } = await supabase
    .from("player_stats")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const playerStats = stats || {
    games_played: 0,
    games_won: 0,
    current_streak: 0,
    best_streak: 0,
    primeras_count: 0,
    chivos_count: 0,
    segundas_count: 0,
    total_won_cents: 0,
    total_lost_cents: 0,
    total_rake_paid_cents: 0
  };

  // Fetch recent completed games logic would go here if we want a chart
  // For now, we simulate recent balance changes array since games history isn't fully robust yet
  const recentHistory = [
    { label: "Juego 1", value: 100 },
    { label: "Juego 2", value: -50 },
    { label: "Juego 3", value: 200 },
    { label: "Juego 4", value: 150 },
    { label: "Juego 5", value: -100 },
    { label: "Juego 6", value: 300 }
  ];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in zoom-in duration-300">
      <div>
        <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          Mi Rendimiento
        </h1>
        <p className="text-slate-400">Tus estadísticas, rachas y evolución de saldo en Primera.</p>
      </div>

      <StatsDashboard stats={playerStats} history={recentHistory} />
    </div>
  );
}
