'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert, Wrench, HelpCircle, Loader2, CheckCircle2, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

interface TableHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userId: string;
}

const REASONS = [
  { value: 'dispute', label: 'Disputa en la Mesa', icon: AlertTriangle, description: 'Desacuerdo con otro jugador o resultado' },
  { value: 'unfair_play', label: 'Juego Desleal', icon: ShieldAlert, description: 'Sospecha de trampa o colusión' },
  { value: 'technical', label: 'Problema Técnico', icon: Wrench, description: 'Error del sistema o fallo visual' },
  { value: 'other', label: 'Otro Motivo', icon: HelpCircle, description: 'Cualquier otra situación' },
] as const;

type Reason = typeof REASONS[number]['value'];

export function TableHelpModal({ isOpen, onClose, roomId, userId }: TableHelpModalProps) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [pendingRequest, setPendingRequest] = useState<{ id: string; reason: string; status: string; created_at: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing pending request when modal opens
  useEffect(() => {
    if (!isOpen || !userId || !roomId) return;

    let cancelled = false;
    async function checkExisting() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('table_help_requests')
        .select('id, reason, status, created_at')
        .eq('user_id', userId)
        .eq('room_id', roomId)
        .in('status', ['pending', 'attending'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (!cancelled) {
        setPendingRequest(data && data.length > 0 ? data[0] : null);
        setLoading(false);
      }
    }

    checkExisting();
    return () => { cancelled = true; };
  }, [isOpen, userId, roomId]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setReason(null);
      setMessage('');
      setSending(false);
      setSent(false);
      setError('');
    }
  }, [isOpen]);

  async function handleSubmit() {
    if (!reason) return;
    setSending(true);
    setError('');

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from('table_help_requests')
      .insert({
        user_id: userId,
        room_id: roomId,
        reason,
        message: message.trim() || null,
      });

    if (insertError) {
      setError('No se pudo enviar la solicitud. Intenta de nuevo.');
      setSending(false);
      return;
    }

    setSending(false);
    setSent(true);
  }

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente',
    attending: 'Admin en camino',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-[#0d211a] border-2 border-[#c0a060]/25 rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(192,160,96,0.1)] relative overflow-y-auto max-h-[95vh] landscape:max-h-[90vh]"
          >
            {/* Gold accent line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c0a060] to-transparent opacity-40" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-[#f3edd7]/40" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#c0a060]/10 flex items-center justify-center border border-[#c0a060]/20 shadow-[0_0_15px_rgba(192,160,96,0.15)]">
                <ShieldAlert className="w-6 h-6 text-[#c0a060]" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-black text-[#f3edd7] uppercase tracking-widest font-display">
                  Llamar al Admin
                </h2>
                <p className="text-[#f3edd7]/40 text-xs tracking-wide">Un administrador atenderá tu solicitud</p>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#c0a060] animate-spin" />
              </div>
            )}

            {/* Existing pending request */}
            {!loading && pendingRequest && !sent && (
              <div className="space-y-4">
                <div className="rounded-xl bg-[#1b4d3e]/40 border border-[#c0a060]/20 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${pendingRequest.status === 'attending' ? 'bg-green-400 animate-pulse' : 'bg-[#c0a060] animate-pulse'}`} />
                    <span className="text-[#c0a060] font-bold text-sm uppercase tracking-widest">
                      {statusLabel[pendingRequest.status] || pendingRequest.status}
                    </span>
                  </div>
                  <p className="text-[#f3edd7]/70 text-sm leading-relaxed">
                    Ya tienes una solicitud activa. {pendingRequest.status === 'attending'
                      ? 'Un administrador está revisando tu mesa.'
                      : 'Un administrador la atenderá pronto.'}
                  </p>
                  <p className="text-[#f3edd7]/30 text-xs mt-3">
                    Motivo: {REASONS.find(r => r.value === pendingRequest.reason)?.label || pendingRequest.reason}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-[#1b4d3e]/40 hover:bg-[#1b4d3e]/70 border border-[#c0a060]/15 text-[#f3edd7] font-bold text-sm uppercase tracking-widest transition-colors min-h-[48px] tactile-button"
                >
                  Entendido
                </button>
              </div>
            )}

            {/* Success state */}
            {!loading && sent && (
              <div className="flex flex-col items-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.15)]">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-black text-[#f3edd7] uppercase tracking-widest">Solicitud Enviada</h3>
                <p className="text-[#f3edd7]/50 text-sm text-center leading-relaxed">
                  Un administrador será notificado y atenderá tu mesa lo antes posible.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-gradient-to-b from-[#1b4d3e] to-[#0e2a22] hover:from-[#2a6b54] hover:to-[#1b4d3e] border border-[#c0a060]/20 text-[#f3edd7] font-bold text-sm uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(0,0,0,0.3)] min-h-[48px] tactile-button"
                >
                  Volver a la Mesa
                </button>
              </div>
            )}

            {/* New request form */}
            {!loading && !pendingRequest && !sent && (
              <div className="space-y-5">
                {/* Reason selection */}
                <div className="space-y-2">
                  <label className="text-[#c0a060]/70 text-xs font-black tracking-widest uppercase">Motivo</label>
                  <div className="grid grid-cols-1 gap-2">
                    {REASONS.map((r) => {
                      const Icon = r.icon;
                      const selected = reason === r.value;
                      return (
                        <button
                          key={r.value}
                          onClick={() => setReason(r.value)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all min-h-[48px] tactile-button ${
                            selected
                              ? 'bg-[#c0a060]/10 border-[#c0a060]/40 shadow-[0_0_10px_rgba(192,160,96,0.1)]'
                              : 'bg-black/20 border-white/5 hover:border-[#c0a060]/15 hover:bg-[#1b4d3e]/20'
                          }`}
                        >
                          <Icon className={`w-5 h-5 flex-shrink-0 ${selected ? 'text-[#c0a060]' : 'text-[#f3edd7]/30'}`} />
                          <div className="flex-1 min-w-0">
                            <span className={`block text-sm font-bold ${selected ? 'text-[#f3edd7]' : 'text-[#f3edd7]/60'}`}>
                              {r.label}
                            </span>
                            <span className="block text-[10px] text-[#f3edd7]/30 truncate">{r.description}</span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            selected ? 'border-[#c0a060] bg-[#c0a060]' : 'border-white/15'
                          }`}>
                            {selected && <div className="w-1.5 h-1.5 rounded-full bg-[#0d211a]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional message */}
                <div className="space-y-2">
                  <label className="text-[#c0a060]/70 text-xs font-black tracking-widest uppercase">
                    Descripción <span className="text-[#f3edd7]/20 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                    placeholder="Describe brevemente la situación..."
                    rows={3}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-[#f3edd7] text-sm placeholder:text-[#f3edd7]/20 focus:outline-none focus:border-[#c0a060]/30 focus:ring-1 focus:ring-[#c0a060]/20 resize-none transition-colors"
                  />
                  <p className="text-right text-[10px] text-[#f3edd7]/20">{message.length}/500</p>
                </div>

                {error && (
                  <p className="text-red-400 text-xs text-center">{error}</p>
                )}

                {/* Submit button */}
                <button
                  onClick={handleSubmit}
                  disabled={!reason || sending}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#c0a060] to-[#d4af37] hover:from-[#d4af37] hover:to-[#e2b044] disabled:from-[#555] disabled:to-[#444] disabled:cursor-not-allowed text-[#0d211a] font-black text-sm uppercase tracking-widest transition-all shadow-[0_5px_15px_rgba(192,160,96,0.25)] hover:shadow-[0_8px_25px_rgba(192,160,96,0.4)] hover:-translate-y-0.5 active:translate-y-0.5 disabled:shadow-none min-h-[48px] flex items-center justify-center gap-2 tactile-button"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Solicitud
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
