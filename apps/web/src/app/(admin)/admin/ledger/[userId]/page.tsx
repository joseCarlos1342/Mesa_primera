import { getUserLedger, getUserProfile } from "@/app/actions/admin-ledger";
import { BookOpen, ArrowUpRight, ArrowDownLeft, Wallet, Hash } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { UserLedgerTable } from "@/components/admin/UserLedgerTable";

export default async function UserLedgerDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const [entries, profile] = await Promise.all([
    getUserLedger(userId, 200),
    getUserProfile(userId)
  ]);

  const totalCredits = entries
    .filter(e => e.direction === 'credit')
    .reduce((sum, e) => sum + e.amount_cents, 0);
  const totalDebits = entries
    .filter(e => e.direction === 'debit')
    .reduce((sum, e) => sum + e.amount_cents, 0);

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="pb-6 border-b border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="min-w-0 max-w-full">
            <h1 className="flex min-w-0 max-w-full items-center gap-4 bg-linear-to-br from-white to-slate-500 bg-clip-text text-transparent">
              <BookOpen className="w-8 h-8 text-emerald-400" />
              <span className="min-w-0 flex-1 whitespace-nowrap text-[clamp(1rem,5vw,2.75rem)] font-black italic leading-none tracking-tighter">
                {profile?.full_name || profile?.username || 'Desconocido'}
              </span>
            </h1>
            <p className="mt-2 whitespace-nowrap font-mono text-xs font-medium text-slate-500">
              ID: {userId}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-brand-gold" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Saldo Actual</span>
          </div>
          <p className="text-3xl font-black text-brand-gold">{formatCurrency(profile?.balance || 0)}</p>
        </div>
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Créditos</span>
          </div>
          <p className="text-3xl font-black text-emerald-400">+{formatCurrency(totalCredits)}</p>
        </div>
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-red-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Débitos</span>
          </div>
          <p className="text-3xl font-black text-red-400">-{formatCurrency(totalDebits)}</p>
        </div>
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operaciones</span>
          </div>
          <p className="text-3xl font-black text-white">{entries.length}</p>
        </div>
      </div>

      {/* Full Ledger Table with filters */}
      <UserLedgerTable entries={entries} />
    </div>
  );
}
