import { getLeaderboard } from "@/app/actions/social-actions";
import { LeaderboardTable } from "./_components/leaderboard-table";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const category = searchParams.category || "top_ganadores"; // top_ganadores, mejor_racha, maestro_primera

  // Defaulting to "all-time" for period in this sprint
  const data = await getLeaderboard("all-time", category);

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 animate-in fade-in zoom-in duration-300">
      <div className="text-center md:text-left">
        <h1 className="text-5xl md:text-6xl font-black bg-linear-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-sm mb-4">
          Salón de la Fama
        </h1>
        <p className="text-slate-400 text-xl md:text-2xl">Consulta los mejores jugadores de Primera.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-8">
        <LeaderboardTabs currentCategory={category} />
      </div>

      <div className="bg-slate-900/50 rounded-2xl p-1 md:p-6 border border-slate-800 shadow-xl">
        <LeaderboardTable data={data} category={category} />
      </div>
    </div>
  );
}

// Inline simple component for tabs navigation. In a larger app, this might be a separate client component or use next/link.
import Link from "next/link";

function LeaderboardTabs({ currentCategory }: { currentCategory: string }) {
  const tabs = [
    { id: "top_ganadores", label: "Mejores Ganancias", icon: "💰" },
    { id: "mejor_racha", label: "Mejor Racha", icon: "🔥" },
    { id: "maestro_primera", label: "Maestro de Primera", icon: "🃏" },
  ];

  return (
    <>
      {tabs.map((tab) => (
        <Link 
          key={tab.id} 
          href={`/leaderboard?category=${tab.id}`}
          className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg md:text-xl transition-all duration-300 ${
            currentCategory === tab.id 
              ? "bg-emerald-600 text-white shadow-[0_10px_20px_rgba(5,150,105,0.4)] scale-105" 
              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
          }`}
        >
          <span className="text-2xl">{tab.icon}</span>
          <span>{tab.label}</span>
        </Link>
      ))}
    </>
  );
}
