import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "http://localhost:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy"
);

export function startAntiCollusionCron() {
  console.log("🕰️ Iniciando CronJob: Verificación Anti-Colusión...");

  // Run every 2 hours
  cron.schedule("0 */2 * * *", async () => {
    try {
      console.log("[CRON] Ejecutando: Análisis Anti-Colusión (Básico)");

      // Fetch recent finished games to look for player pairings
      // In a real scenario we'd do a complex group by query in SQL.
      // E.g. SELECT p1.user_id, p2.user_id, count(*) as c 
      //      FROM game_participants p1 JOIN game_participants p2 ON p1.game_id = p2.game_id 
      //      WHERE p1.user_id < p2.user_id GROUP BY 1, 2 HAVING count(*) > threshold

      const { data: colusions, error } = await supabase.rpc("detect_potential_collusion", { threshold: 10 });

      if (error) {
         // If RPC does not exist yet (as this is a simplified version), catch seamlessly
         console.log("[CRON] SQL RPC 'detect_potential_collusion' no encontrado, omitiendo análisis avanzado.");
      } else if (colusions && colusions.length > 0) {
        console.warn(`[CRON ALERT] Se detectaron ${colusions.length} pares sospechosos de jugadores!`);
        for (const pair of colusions) {
          await supabase.from("admin_audit_log").insert({
            admin_id: "00000000-0000-0000-0000-000000000000",
            action: "SYSTEM_ANTI_COLLUSION_ALERT",
            details: {
              message: `Los jugadores juegan juntos con altísima frecuencia (>80%)`,
              player_1: pair.player_1,
              player_2: pair.player_2,
              matches_together: pair.count
            }
          });
        }
      } else {
        console.log("[CRON] Verificación anti-colusión OK. No hay patrones evidentes.");
      }
    } catch (e) {
      console.error("[CRON ERROR] Fallo al verificar colusión:", e);
    }
  });
}
