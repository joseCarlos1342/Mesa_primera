import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { ledgerQueue } from "../workers/index";

// Basic Supabase Service Role client to bypass RLS for internal tasks
const supabase = createClient(
  process.env.SUPABASE_URL || "http://localhost:54321",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy"
);

export function startIntegrityCron() {
  console.log("🕰️ Inciando CronJobs internos: Verificación de Integridad de la Bóveda...");

  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    try {
      console.log("[CRON] Ejecutando: Verificación de Integridad del Ledger");

      // We simulate the integrity check by calling the DB RPCs
      const { data: totalUsersBalance } = await supabase.rpc("get_total_users_balance");
      const { data: ledgerNetBalance } = await supabase.rpc("get_ledger_net_balance");

      const diff = (ledgerNetBalance || 0) - (totalUsersBalance || 0);

      // Si el balance total de usuarios es mayor al dinero respaldado, hay problema crítico
      const status = diff < 0 ? "CRÍTICO (Descuadre negativo)" : diff > 0 ? "ALERTA (Sobrante)" : "OPERATIVO (Cuadre perfecto)";

      if (diff !== 0) {
        // Log to database audit system for admins
        await supabase.from("audit_logs").insert({
          admin_id: "00000000-0000-0000-0000-000000000000", // System UUID ideally
          action: "SYSTEM_INTEGRITY_ALERT",
          details: {
            message: `Descuadre financiero detectado: ${status}`,
            discrepancy_cents: diff,
          }
        });
        console.warn(`[CRON ALERT] Discrepancia detectada: ${diff} centavos.`);
      } else {
        console.log("[CRON] Verificación exitosa. Bóveda cuadrada al milímetro.");
      }

    } catch (e) {
      console.error("[CRON ERROR] Fallo al verificar integridad:", e);
    }
  });

  // Run wallet-vs-ledger reconciliation every 2 hours via BullMQ worker
  cron.schedule("0 */2 * * *", async () => {
    try {
      console.log("[CRON] Encolando reconciliación de billeteras...");
      await ledgerQueue.add("reconcile", {}, { removeOnComplete: 10, removeOnFail: 5 });
    } catch (e) {
      console.error("[CRON ERROR] Fallo al encolar reconciliación:", e);
    }
  });
}
