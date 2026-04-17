import { getLedgerEntries, getUsersWithBalances } from "@/app/actions/admin-ledger";
import { BookOpen } from "lucide-react";
import { LedgerRealtimeRefresh } from "@/components/admin/LedgerRealtimeRefresh";
import { LedgerUsersFilter, LedgerTransactionsFilter } from "@/components/admin/LedgerFilters";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLedgerPage() {
  let entries: Awaited<ReturnType<typeof getLedgerEntries>> = [];
  let users: Awaited<ReturnType<typeof getUsersWithBalances>> = [];
  let loadError: string | null = null;

  try {
    [entries, users] = await Promise.all([
      getLedgerEntries(50),
      getUsersWithBalances()
    ]);
  } catch (err: any) {
    console.error("[AdminLedgerPage] Error cargando datos:", err);
    loadError = err?.message || "Error desconocido al cargar el libro mayor";
  }

  if (loadError) {
    return (
      <div className="min-h-full flex items-center justify-center animate-in fade-in duration-700">
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-10 max-w-lg text-center">
          <BookOpen className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-400 mb-2">Error al cargar el Libro Mayor</h2>
          <p className="text-slate-400 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <LedgerRealtimeRefresh />
      <div className="pb-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
            <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
            <BookOpen className="w-10 h-10 text-emerald-400" />
            LIBRO MAYOR
            </h1>
            <p className="text-slate-500 font-medium mt-2">
            Registro de auditoría inmutable de todas las transacciones de fichas.
            </p>
        </div>
      </div>

      {/* Users Summary Section - client with search */}
      <LedgerUsersFilter users={users} />

      {/* Recent Global Ledger - client with filters */}
      <LedgerTransactionsFilter entries={entries} />
    </div>
  );
}
