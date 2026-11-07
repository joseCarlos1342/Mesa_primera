'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Wrench, HelpCircle, CheckCircle2, Send } from 'lucide-react';
import { PlayerSheet } from '@/components/player/PlayerSheet';
import { Skeleton, TextareaField } from '@/components/player/PlayerUI';
import { AuthButton } from '@/components/auth/AuthForm';
import { createClient } from '@/utils/supabase/client';

interface TableHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  userId: string;
}

const REASONS = [
  { value: 'dispute', label: 'Disputa en la mesa', icon: AlertTriangle, description: 'Desacuerdo con otro jugador o resultado' },
  { value: 'unfair_play', label: 'Juego desleal', icon: ShieldAlert, description: 'Sospecha de trampa o colusión' },
  { value: 'technical', label: 'Problema técnico', icon: Wrench, description: 'Error del sistema o fallo visual' },
  { value: 'other', label: 'Otro motivo', icon: HelpCircle, description: 'Cualquier otra situación' },
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

  const footer =
    loading ? undefined : sent || pendingRequest ? (
      <AuthButton variant="secondary" onClick={onClose}>
        Volver a la mesa
      </AuthButton>
    ) : (
      <AuthButton onClick={handleSubmit} disabled={!reason} pending={sending} icon={!sending ? <Send className="h-5 w-5" aria-hidden="true" /> : undefined}>
        {sending ? 'Enviando…' : 'Enviar solicitud'}
      </AuthButton>
    );

  return (
    <PlayerSheet
      open={isOpen}
      onClose={onClose}
      title="Llamar al admin"
      description="Un administrador atenderá tu solicitud en esta mesa."
      closeLabel="Cerrar"
      footer={footer}
    >
      {loading && (
        <div className="space-y-3 pt-1" aria-busy="true" aria-label="Revisando solicitudes">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {!loading && pendingRequest && !sent && (
        <div role="status" className="rounded-lg border border-[#8b6b2e]/60 bg-[#0a2c20]/70 px-4 py-4">
          <p className="flex items-center gap-2 text-base font-semibold text-brand-gold-light">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${pendingRequest.status === 'attending' ? 'bg-[#2ecc71]' : 'bg-brand-gold'}`} />
            {statusLabel[pendingRequest.status] || pendingRequest.status}
          </p>
          <p className="mt-2 text-lg leading-relaxed text-[#d9d3bf]">
            Ya tienes una solicitud activa.{' '}
            {pendingRequest.status === 'attending' ? 'Un administrador está revisando tu mesa.' : 'Un administrador la atenderá pronto.'}
          </p>
          <p className="mt-2 text-base text-[#bdb7a6]">
            Motivo: {REASONS.find((r) => r.value === pendingRequest.reason)?.label || pendingRequest.reason}
          </p>
        </div>
      )}

      {!loading && sent && (
        <div role="status" className="flex flex-col items-center py-4 text-center">
          <span aria-hidden="true" className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#2ecc71]/50 bg-[#0a2c20] text-[#5fd38d]">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <p className="font-display text-[1.625rem] font-bold text-text-premium">Solicitud enviada</p>
          <p className="mt-2 max-w-[34ch] text-lg leading-relaxed text-[#d9d3bf]">Un administrador será notificado y atenderá tu mesa lo antes posible.</p>
        </div>
      )}

      {!loading && !pendingRequest && !sent && (
        <div className="space-y-6 pt-1">
          <fieldset>
            <legend className="mb-2 text-base font-semibold text-text-premium">Motivo</legend>
            <div className="space-y-2">
              {REASONS.map((r) => {
                const Icon = r.icon;
                const selected = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReason(r.value)}
                    aria-pressed={selected}
                    className={`flex min-h-16 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-light ${
                      selected ? 'border-brand-gold bg-[#0a2c20]' : 'border-[#8b6b2e]/50 hover:border-[#c5a059]'
                    }`}
                  >
                    <Icon className={`h-6 w-6 shrink-0 ${selected ? 'text-brand-gold-light' : 'text-[#c5a059]'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-lg font-semibold ${selected ? 'text-brand-gold-light' : 'text-text-premium'}`}>{r.label}</span>
                      <span className="block text-base leading-snug text-[#bdb7a6]">{r.description}</span>
                    </span>
                    {selected && <CheckCircle2 className="h-6 w-6 shrink-0 text-brand-gold" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <TextareaField
            label="Descripción (opcional)"
            labelAside={<span className="font-mono text-sm tabular-nums text-[#bdb7a6]">{message.length}/500</span>}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            placeholder="Describe brevemente la situación..."
            rows={3}
            error={error || null}
          />
        </div>
      )}
    </PlayerSheet>
  );
}
