import { createClient } from '@/utils/supabase/server';
import { SupportConversationList } from '@/components/admin/SupportConversationList';
import { Headphones, Shield } from 'lucide-react';

export default async function AdminSupportPage() {
  const supabase = await createClient();

  // Fetch unique users who have sent messages and their latest message
  const { data: messages, error } = await supabase
    .from('support_messages')
    .select(`
      *,
      user:profiles(username, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-red-500 bg-red-500/10 border border-red-500/20 rounded-2xl font-mono text-sm">
        Error al cargar soporte: {error.message}
      </div>
    );
  }

  // Get current admin user
  const { data: { user } } = await supabase.auth.getUser();

  // Process conversations: group by ticket_id and take the latest message
  // Each ticket_id is a unique session.
  const ticketConversations = new Map<string, any[]>();
  messages?.forEach((msg) => {
    // If ticket_id is null (legacy), we fall back to user_id for grouping
    const tid = msg.ticket_id || msg.user_id;
    if (!ticketConversations.has(tid)) {
      ticketConversations.set(tid, []);
    }
    ticketConversations.get(tid)?.push(msg);
  });

  const conversations = Array.from(ticketConversations.entries()).map(([ticketId, msgs]) => ({
    userId: msgs[0].user_id,
    ticketId,
    latestMessage: msgs[0],
    messages: msgs.reverse(),
    user: msgs[0].user,
    pending: !msgs[0].from_admin && !msgs[0].is_resolved
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-700 min-h-screen pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-600/20 rounded-lg border border-indigo-600/20">
                <Shield className="w-5 h-5 text-indigo-400" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Panel de Control</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white italic uppercase tracking-tighter flex items-center gap-4">
            <Headphones className="w-8 h-8 md:w-10 md:h-10 text-indigo-500" />
            Soporte <span className="text-indigo-500">Técnico</span>
          </h1>
          <p className="text-slate-500 font-medium max-w-xl">
            Gestiona las consultas de los jugadores en tiempo real. Responde preguntas técnicas y asiste en el flujo de juego.
          </p>
        </div>

        <div className="flex items-center gap-4">
            <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-300">Servicio En Línea</span>
            </div>
        </div>
      </div>

      <div className="bg-slate-900/20 border border-white/5 rounded-[2.5rem] p-4 lg:p-6 backdrop-blur-3xl shadow-3xl">
        <SupportConversationList initialConversations={conversations} adminId={user?.id || ''} />
      </div>
    </div>
  );
}
