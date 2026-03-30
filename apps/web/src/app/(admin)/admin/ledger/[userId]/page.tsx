import { getUserLedger, getUserProfile } from "@/app/actions/admin-ledger";
import { BookOpen, ArrowLeft, ArrowUpRight, ArrowDownLeft, Wallet, Hash, Gamepad2, Users } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import Link from "next/link";

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

  const typeLabel = (type: string) => {
    switch (type) {
      case 'deposit': return 'Depósito';
      case 'withdrawal': return 'Retiro';
      case 'win': return 'Ganancia';
      case 'bet': return 'Apuesta';
      case 'rake': return 'Comisión';
      case 'refund': return 'Reembolso';
      case 'adjustment': return 'Ajuste';
      default: return type;
    }
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="pb-6 border-b border-white/5">
        <Link
          href="/admin/ledger"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Ledger
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter bg-linear-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
              <BookOpen className="w-8 h-8 text-emerald-400" />
              DESGLOSE: {profile?.full_name || profile?.username || 'Desconocido'}
            </h1>
            <p className="text-slate-500 font-medium mt-2 font-mono text-xs">
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

      {/* Full Ledger Table */}
      <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 bg-slate-950/50">
          <h3 className="font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            Historial Completo ({entries.length} registros)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs uppercase bg-slate-950/80 text-slate-500 font-black tracking-widest border-b border-white/5">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Concepto</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Sala / Ref</th>
                <th className="px-6 py-4 text-right">Débito</th>
                <th className="px-6 py-4 text-right">Crédito</th>
                <th className="px-6 py-4 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map(entry => {
                const meta = entry.metadata || {};
                const isGame = ['win', 'bet', 'rake'].includes(entry.type);
                return (
                  <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                      <br />
                      <span className="text-slate-600">{new Date(entry.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isGame ? (
                          <Gamepad2 className="w-4 h-4 text-purple-400 shrink-0" />
                        ) : entry.direction === 'credit' ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className="font-bold text-white uppercase text-xs tracking-wider">
                          {typeLabel(entry.type)}
                        </span>
                      </div>
                      <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded mt-1 inline-block ${
                        entry.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        entry.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 max-w-50">
                      <span className="truncate block">{entry.description || '—'}</span>
                      {meta.players_present && meta.players_present.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3 text-purple-400" />
                          <span className="text-[9px] text-purple-300">
                            {meta.players_present.map((p: any) => p.odisplayName || p.nickname).join(', ')}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-500">
                      {meta.room_id ? (
                        <div>
                          <span className="text-purple-300">{String(meta.room_id).slice(0, 8)}...</span>
                          {meta.table_name && <span className="block text-[9px] text-slate-600">{meta.table_name}</span>}
                        </div>
                      ) : entry.reference_id ? (
                        <span>{String(entry.reference_id).slice(0, 12)}...</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-red-400">
                      {entry.direction === 'debit' ? formatCurrency(entry.amount_cents) : ''}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-emerald-400">
                      {entry.direction === 'credit' ? formatCurrency(entry.amount_cents) : ''}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-300 font-bold">
                      {formatCurrency(entry.balance_after_cents)}
                    </td>
                  </tr>
                );
              })}

              {entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 font-medium">
                    Este usuario no tiene registros en el libro mayor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
