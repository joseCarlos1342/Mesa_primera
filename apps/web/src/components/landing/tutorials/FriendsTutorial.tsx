'use client'

import {
  Users, UserPlus, Search, Check, X, MessageCircle, Gamepad2,
  Trash2, Send, ChevronLeft,
} from 'lucide-react'
import { useState } from 'react'
import type { TutorialStep } from './TutorialWalkthrough'

/* ── Helper: Online status dot ────────────────────────────────── */
function StatusDot({ status }: { status: 'online' | 'ingame' | 'offline' }) {
  const colors = {
    online: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]',
    ingame: 'bg-[#d4af37] shadow-[0_0_6px_rgba(212,175,55,0.6)]',
    offline: 'bg-gray-500',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status]} absolute bottom-0 right-0 ring-1 ring-black`} />
}

/* ── Screen 1: Friends Page ───────────────────────────────────── */
function FriendsPageScreen() {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')

  const friends = [
    { name: 'Carlos', level: 8, status: 'online' as const },
    { name: 'Maria', level: 12, status: 'ingame' as const },
    { name: 'Pedro', level: 5, status: 'offline' as const },
  ]

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full mb-2">
          <Users className="w-2.5 h-2.5 text-brand-gold" />
          <span className="text-[6px] font-black text-brand-gold uppercase tracking-[0.2em]">Social Club</span>
        </div>
        <h1 className="text-2xl font-display font-black italic text-brand-gold uppercase tracking-tighter">AMIGOS</h1>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-2 mb-3">
        <div
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-1.5 rounded-xl text-center text-[8px] font-bold uppercase tracking-wider transition-all ${
            activeTab === 'friends'
              ? 'bg-brand-gold text-black'
              : 'bg-white/5 text-text-secondary border border-white/10'
          }`}
        >
          Mis Amigos (3)
        </div>
        <div
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-1.5 rounded-xl text-center text-[8px] font-bold uppercase tracking-wider transition-all ${
            activeTab === 'requests'
              ? 'bg-brand-gold text-black'
              : 'bg-white/5 text-text-secondary border border-white/10'
          }`}
        >
          Solicitudes
          <span className="ml-1 bg-red-500 text-white text-[5px] px-1 py-0.5 rounded-full">1</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {activeTab === 'friends' ? (
          friends.map((f) => (
            <div key={f.name} className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] p-[1px]">
                <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                  <span className="text-[8px] text-[#f3edd7] font-bold">{f.name[0]}</span>
                </div>
                <StatusDot status={f.status} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] text-[#f3edd7] font-bold truncate">{f.name}</p>
                <p className="text-[6px] text-text-secondary">Nivel {f.level}</p>
              </div>
              <div className="flex gap-1">
                <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <MessageCircle className="w-3 h-3 text-brand-gold/60" />
                </div>
                <div className="w-6 h-6 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
                  <Gamepad2 className="w-3 h-3 text-brand-gold" />
                </div>
                <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Trash2 className="w-3 h-3 text-red-400" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-black/40 border border-brand-gold/20 rounded-xl p-3 flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] p-[1px]">
              <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5 text-brand-gold" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-[#f3edd7] font-bold">AnaGamer</p>
              <p className="text-[6px] text-text-secondary">Nivel 7</p>
            </div>
            <div className="flex gap-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 text-emerald-400" />
              </div>
              <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <X className="w-3 h-3 text-text-secondary" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add friend button */}
      <div className="absolute top-6 right-4 w-8 h-8 rounded-full bg-gradient-to-b from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] flex items-center justify-center shadow-lg" style={{ borderBottom: '2px solid #5c4613' }}>
        <UserPlus className="w-4 h-4 text-[#2a1b04]" />
      </div>
    </div>
  )
}

/* ── Screen 2: Add Friend ─────────────────────────────────────── */
function AddFriendScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-hidden">
      <div className="absolute inset-0 bg-black/80 z-10 flex items-start justify-center pt-16 px-4">
        <div className="w-full max-w-[260px] bg-[#0d211a]/95 backdrop-blur-xl border border-[#c0a060]/30 rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
          <h3 className="text-xs font-black text-[#f3edd7] mb-2 text-center uppercase tracking-wider">Añadir Amigo</h3>
          <p className="text-[7px] text-text-secondary text-center mb-3">Localiza a tus conocidos</p>

          <div className="w-full h-9 pl-8 pr-2 bg-black/50 border-2 border-brand-gold/20 rounded-2xl flex items-center shadow-inner mb-3 relative">
            <Search className="w-3 h-3 text-brand-gold/50 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <span className="text-[8px] text-[#f3edd7]/40 pl-1">Nombre, apodo o teléfono...</span>
          </div>

          <div className="space-y-2">
            {[
              { name: 'AnaGamer', level: 7, phone: '300 *** 4567' },
              { name: 'LuisKing', level: 15, phone: '310 *** 8899' },
            ].map((u) => (
              <div key={u.name} className="flex items-center gap-2 bg-black/30 rounded-xl p-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] p-[1px]">
                  <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
                    <span className="text-[7px] text-[#f3edd7] font-bold">{u.name[0]}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] text-[#f3edd7] font-bold truncate">{u.name}</p>
                  <p className="text-[5px] text-text-secondary">Nivel {u.level} · {u.phone}</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
                  <UserPlus className="w-3 h-3 text-brand-gold" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Screen 3: Chat ───────────────────────────────────────────── */
function ChatScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 bg-black/20">
        <ChevronLeft className="w-4 h-4 text-text-secondary" />
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] p-[1px]">
          <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
            <span className="text-[6px] text-[#f3edd7] font-bold">C</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] text-[#f3edd7] font-bold">Carlos</p>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            <span className="text-[5px] text-emerald-400">En línea</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        <div className="flex justify-start">
          <div className="bg-black/40 border border-white/5 rounded-xl rounded-tl-none px-2.5 py-1.5 max-w-[70%]">
            <p className="text-[8px] text-[#f3edd7]">¿Jugamos una partida hoy?</p>
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-brand-gold/10 border border-brand-gold/20 rounded-xl rounded-tr-none px-2.5 py-1.5 max-w-[70%]">
            <p className="text-[8px] text-brand-gold">¡Claro! Te invito en 5 min</p>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="bg-black/40 border border-white/5 rounded-xl rounded-tl-none px-2.5 py-1.5 max-w-[70%]">
            <p className="text-[8px] text-[#f3edd7]">Perfecto, voy calentando</p>
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-white/5 flex items-center gap-2">
        <div className="flex-1 h-8 bg-black/40 border border-white/10 rounded-xl px-2 flex items-center">
          <span className="text-[8px] text-[#f3edd7]/30">Escribe un mensaje...</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center shrink-0">
          <Send className="w-3.5 h-3.5 text-[#2a1b04]" />
        </div>
      </div>
    </div>
  )
}

/* ── Screen 4: Invite to Play ─────────────────────────────────── */
function InviteScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-4">
      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#fdf0a6] via-[#d4af37] to-[#8a6d1c] p-[2px] mb-3">
        <div className="w-full h-full rounded-full bg-[#111] flex items-center justify-center">
          <Gamepad2 className="w-6 h-6 text-brand-gold" />
        </div>
      </div>
      <h3 className="text-sm font-bold text-[#f3edd7] mb-1">Invitar a Jugar</h3>
      <p className="text-[8px] text-text-secondary text-center max-w-[200px] mb-4">
        Enviarás una invitación a <span className="text-brand-gold font-bold">Maria</span> para que se una a una mesa.
      </p>
      <div className="w-full max-w-[200px] h-10 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-widest text-[9px] rounded-2xl flex items-center justify-center gap-2 border-b-4 border-brand-gold-dark shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
        <Gamepad2 className="w-4 h-4" />
        ENVIAR INVITACIÓN
      </div>
    </div>
  )
}

/* ── Screen 5: Remove Friend ──────────────────────────────────── */
function RemoveFriendScreen() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0a2a1f] to-slate-950 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[240px] bg-[#0d211a] border-2 border-red-500/20 rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3 border border-red-500/20">
          <Trash2 className="w-6 h-6 text-red-400" />
        </div>
        <h3 className="text-base font-black text-[#f3edd7] mb-1 uppercase tracking-wider">Eliminar Amigo?</h3>
        <p className="text-[7px] text-red-400/80 mb-3 uppercase tracking-wider">Acción irreversible</p>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1 mb-3">
          <span className="text-[9px] text-red-300 font-bold">Pedro será eliminado</span>
        </div>
        <p className="text-[8px] text-[#f3edd7]/40 mb-4">
          Se eliminará de tu lista de amigos y no podrás ver su estado ni enviarle mensajes.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-text-secondary text-[8px] font-semibold">
            Cancelar
          </div>
          <div className="flex-1 h-9 bg-gradient-to-r from-red-600 to-red-800 rounded-xl flex items-center justify-center text-white font-bold text-[8px] uppercase tracking-wider border border-red-500/40">
            Sí, Eliminar
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Exported tutorial steps ──────────────────────────────────── */
export const friendsSteps: TutorialStep[] = [
  { label: 'Tu lista de amigos y solicitudes', screen: <FriendsPageScreen /> },
  { label: 'Busca y añade nuevos amigos', screen: <AddFriendScreen /> },
  { label: 'Chat directo en tiempo real', screen: <ChatScreen /> },
  { label: 'Invita a jugar una partida', screen: <InviteScreen /> },
  { label: 'Eliminar un amigo', screen: <RemoveFriendScreen /> },
]
