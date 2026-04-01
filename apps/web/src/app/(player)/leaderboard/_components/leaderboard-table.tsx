"use client";

import { getAvatarSvg } from "@/utils/avatars";
import { User } from "lucide-react";

interface LeaderboardUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
  score: number;
}

export function LeaderboardTable({ data, category }: { data: LeaderboardUser[], category: string }) {
  const getFormatForCategory = (score: number) => {
    switch (category) {
      case "top_ganadores":
        // Format as money (assuming cents)
        return new Intl.NumberFormat("es-VE", { style: "currency", currency: "USD" }).format(score / 100);
      case "mejor_racha":
        return `${score} victorias seguidas`;
      case "maestro_primera":
        return `${score} cantos especiales`;
      default:
        return score.toString();
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p>Aún no hay suficientes datos para esta categoría.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
            <th className="py-4 px-6 font-semibold w-16 text-center">Rango</th>
            <th className="py-4 px-6 font-semibold">Jugador</th>
            <th className="py-4 px-6 font-semibold text-right">Puntuación</th>
          </tr>
        </thead>
        <tbody>
          {data.map((user, index) => {
            const isTop3 = index < 3;
            return (
              <tr 
                key={user.user_id} 
                className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                  index === 0 ? "bg-amber-900/10" : 
                  index === 1 ? "bg-slate-800/20" : 
                  index === 2 ? "bg-orange-900/10" : ""
                }`}
              >
                <td className="py-4 px-6 text-center">
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                    index === 0 ? "bg-yellow-500 text-yellow-950 shadow-[0_0_15px_rgba(234,179,8,0.5)]" :
                    index === 1 ? "bg-slate-300 text-slate-900" :
                    index === 2 ? "bg-orange-600 text-orange-50" :
                    "bg-slate-800 text-slate-400"
                  }`}>
                    {index + 1}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex items-center justify-center bg-slate-900 ${
                      index === 0 ? "border-yellow-500" :
                      index === 1 ? "border-slate-300" :
                      index === 2 ? "border-orange-600" :
                      "border-slate-700"
                    }`}>
                      {user.avatar_url && getAvatarSvg(user.avatar_url) ? (
                        <div className="w-full h-full scale-[1.2]">
                          {getAvatarSvg(user.avatar_url)}
                        </div>
                      ) : (
                        <User className="w-6 h-6 text-slate-600" />
                      )}
                    </div>
                    <span className={`font-bold ${isTop3 ? "text-lg text-white" : "text-slate-300"}`}>
                      {user.username}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className={`font-mono font-bold ${
                    category === "top_ganadores" ? "text-emerald-400" : "text-slate-200"
                  }`}>
                    {getFormatForCategory(user.score)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
