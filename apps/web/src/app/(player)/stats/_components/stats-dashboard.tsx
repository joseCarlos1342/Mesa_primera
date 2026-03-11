"use client";

import { useMemo } from "react";

interface PlayerStats {
  games_played: number;
  games_won: number;
  current_streak: number;
  best_streak: number;
  primeras_count: number;
  chivos_count: number;
  segundas_count: number;
  total_won_cents: number;
  total_lost_cents: number;
  total_rake_paid_cents: number;
}

interface HistoryData {
  label: string;
  value: number; // can be negative
}

export function StatsDashboard({ stats, history }: { stats: PlayerStats, history: HistoryData[] }) {
  const winRate = stats.games_played > 0 
    ? Math.round((stats.games_won / stats.games_played) * 100) 
    : 0;

  const netBalance = (stats.total_won_cents - stats.total_lost_cents - stats.total_rake_paid_cents) / 100;
  
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  const chartMax = useMemo(() => {
    if (history.length === 0) return 100;
    const max = Math.max(...history.map(h => Math.abs(h.value)));
    return max > 0 ? max : 100;
  }, [history]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* KPIs */}
      <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Partidas" value={stats.games_played} icon="🎲" />
        <StatCard title="Juegos Ganados" value={stats.games_won} sub={`${winRate}% Win Rate`} icon="🏆" />
        <StatCard 
          title="Mejor Racha" 
          value={stats.best_streak} 
          sub={`Racha actual: ${stats.current_streak}`} 
          icon="🔥" 
          valueColor="text-orange-400"
        />
        <StatCard 
          title="Ganancia Neta" 
          value={`$${netBalance.toFixed(2)}`} 
          sub={netBalance >= 0 ? "¡En positivo!" : "En negativo"}
          icon="💸"
          valueColor={netBalance >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </div>

      {/* Special Plays */}
      <div className="col-span-1 bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
        <h2 className="text-xl font-bold mb-6 text-emerald-400">Cantos Especiales</h2>
        <div className="space-y-4">
          <ProgressBar label="Primera (La mayor)" count={stats.primeras_count} total={stats.games_played} color="bg-yellow-500" />
          <ProgressBar label="Chivo" count={stats.chivos_count} total={stats.games_played} color="bg-orange-500" />
          <ProgressBar label="Segunda" count={stats.segundas_count} total={stats.games_played} color="bg-red-500" />
        </div>
      </div>

      {/* Balance Evolution Chart (CSS based) */}
      <div className="col-span-1 md:col-span-2 bg-slate-900/50 rounded-2xl p-6 border border-slate-800">
        <h2 className="text-xl font-bold mb-6 text-emerald-400">Evolución de Saldo Reciente</h2>
        
        <div className="h-48 flex items-end justify-between gap-2 mt-8">
          {history.map((item, i) => {
            const isPositive = item.value >= 0;
            const heightPct = Math.min(100, Math.max(5, (Math.abs(item.value) / chartMax) * 100));
            return (
              <div key={i} className="relative flex flex-col items-center flex-1 group">
                <div 
                  className="w-full rounded-t-sm transition-all duration-500 ease-out"
                  style={{ 
                    height: `${heightPct}%`, 
                    backgroundColor: isPositive ? "var(--color-emerald-500)" : "var(--color-red-500)",
                    opacity: 0.8
                  }}
                />
                
                {/* Tooltip */}
                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform bg-slate-800 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                  {item.label}: {item.value >= 0 ? '+' : ''}{item.value}¢
                </div>
                
                <span className="text-[10px] text-slate-500 mt-2 truncate w-full text-center">
                  {item.label.split(" ")[1]}
                </span>
              </div>
            );
          })}
        </div>
        <div className="text-center text-xs text-slate-500 mt-2">Valores en centavos. Gráfico de las últimas 50 manos (simulado para UI).</div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub, icon, valueColor = "text-white" }: any) {
  return (
    <div className="bg-slate-900/50 rounded-2xl p-5 border border-slate-800 shadow-sm flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm font-semibold text-slate-400">{title}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-black mt-auto ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 font-medium mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ label, count, total, color }: any) {
  const percentage = total > 0 ? Math.min(100, (count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-semibold text-slate-300">{label}</span>
        <span className="text-slate-400 font-mono">{count}</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
