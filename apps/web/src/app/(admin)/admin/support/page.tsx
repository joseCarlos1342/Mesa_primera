import { createClient } from "@/utils/supabase/server";
import { MessageSquare, User, Clock, CheckCircle, Reply } from "lucide-react";
import Link from "next/link";

export default async function AdminSupportPage() {
  const supabase = await createClient();

  // Fetch pending messages (those with at least one message not followed by an admin reply, or just all for now)
  // Logic: Group by user_id, get latest message
  // For MVP: Fetch last 100 messages and group in memory
  const { data: messages, error } = await supabase
    .from("support_messages")
    .select(`
      *,
      user:profiles(username, full_name, avatar_url)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return <div className="p-8 text-red-500">Error: {error.message}</div>;

  // Group by user
  const userConversations = new Map<string, any[]>();
  messages?.forEach((msg) => {
    if (!userConversations.has(msg.user_id)) {
      userConversations.set(msg.user_id, []);
    }
    userConversations.get(msg.user_id)?.push(msg);
  });

  const conversations = Array.from(userConversations.entries()).map(([userId, msgs]) => ({
    userId,
    latestMessage: msgs[0],
    messages: msgs.reverse(),
    user: msgs[0].user,
    pending: !msgs[0].from_admin
  }));

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-700">
      <div className="pb-6 border-b border-white/5 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent flex items-center gap-4">
            <MessageSquare className="w-10 h-10 text-indigo-400" />
            SOPORTE TÉCNICO
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Gestión de consultas y chat de ayuda al usuario.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List of Conversations */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Conversaciones</h3>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div key={conv.userId} className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                conv.pending ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/40 border-white/5 hover:border-white/10'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                      {conv.user?.username?.[0].toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{conv.user?.full_name || conv.user?.username || 'Usuario'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{conv.userId.slice(0, 8)}</p>
                    </div>
                  </div>
                  {conv.pending && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                </div>
                <p className="text-xs text-slate-400 line-clamp-1 italic">"{conv.latestMessage.message}"</p>
                <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {new Date(conv.latestMessage.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="text-center py-12 bg-slate-900/20 rounded-2xl border border-dashed border-white/5 text-slate-600 italic text-sm">
                No hay solicitudes de soporte
              </div>
            )}
          </div>
        </div>

        {/* Chat View Placeholder (for MVP) */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] flex flex-col min-h-[600px] shadow-2xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-950/30">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20">
                  <User className="w-5 h-5 text-indigo-400" />
               </div>
               <div>
                  <h3 className="font-bold text-white uppercase tracking-tight">Centro de Ayuda</h3>
                  <p className="text-[10px] font-black text-emerald-400 tracking-widest uppercase">Sistema Operativo Conectado</p>
               </div>
            </div>
          </div>
          
          <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-4">
             <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center border border-white/5">
                <Reply className="w-10 h-10 text-slate-700" />
             </div>
             <div className="max-w-xs">
                <h4 className="text-lg font-bold text-white/50">Selecciona una conversación</h4>
                <p className="text-sm text-slate-600 mt-2">Próximamente: Chat interactivo en tiempo real para el administrador.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
