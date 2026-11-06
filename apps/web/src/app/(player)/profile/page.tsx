'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { LogOut } from 'lucide-react';
import { getMyStats, PlayerStats } from '@/app/actions/stats';
import { Toast, ToastType } from '@/components/ui/Toast';
import { useAppLock } from '@/components/providers/AppLockProvider';
import { clearSessionValidated } from '@/lib/app-lock-session';
import { normalizePhone } from '@/lib/phone';
import { logoutOneSignalUser } from '@/components/OneSignalPushOptIn';
import { AuthButton, AuthField } from '@/components/auth/AuthForm';
import { CodeInput } from '@/components/auth/CodeInput';
import { PlayerSheet } from '@/components/player/PlayerSheet';
import { Section, Skeleton, playerButton } from '@/components/player/PlayerUI';
import { LockToggle, ProfileHelp, ProfileIdentity, ProfileStats } from './_components/ProfileSections';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const { isEnabled: lockEnabled, isSupported: lockSupported, enroll: enrollLock, disable: disableLock } = useAppLock();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const originalPhone = useRef('');
  const avatarInput = useRef<HTMLInputElement>(null);
  const [otpModal, setOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    phone: '',
    avatar_url: '',
  });

  const showToast = (message: string, type: ToastType) => {
    setToast(null);
    setTimeout(() => setToast({ message, type }), 10);
  };

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login/player');
        return;
      }
      setUser(user);

      const [profileRes, statsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        getMyStats(),
      ]);

      if (profileRes.data) {
        const loadedPhone = profileRes.data.phone || '';
        originalPhone.current = loadedPhone;
        setFormData({
          username: profileRes.data.username || '',
          full_name: profileRes.data.full_name || '',
          phone: loadedPhone,
          avatar_url: profileRes.data.avatar_url || '',
        });
      }
      setStats(statsRes);
      setLoading(false);
    }

    loadData();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const phoneChanged = formData.phone.trim() !== originalPhone.current.trim();

    if (phoneChanged) {
      // El cambio de celular exige confirmar el nuevo número con un código SMS.
      const newPhone = normalizePhone(formData.phone);
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ phone: newPhone });
      setSaving(false);
      if (error) {
        showToast('No pudimos enviar el código. Verifica el teléfono e intenta de nuevo.', 'error');
        return;
      }
      setPendingPhone(newPhone);
      setOtpCode('');
      setOtpModal(true);
      return;
    }

    await saveProfile();
  };

  const saveProfile = async (phoneOverride?: string) => {
    if (!user) return;
    setSaving(true);

    const { updateMyProfile } = await import('@/app/actions/profile');
    const result = await updateMyProfile({
      username: formData.username,
      full_name: formData.full_name,
    });

    if (result.error) {
      showToast(result.error, 'error');
      setSaving(false);
      return;
    }

    if (phoneOverride) {
      const { error: phoneError } = await supabase
        .from('profiles')
        .update({
          phone: phoneOverride,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (phoneError) {
        showToast('No pudimos actualizar el teléfono. Intenta de nuevo.', 'error');
        setSaving(false);
        return;
      }
      originalPhone.current = phoneOverride;
      setFormData((prev) => ({ ...prev, phone: phoneOverride }));
    } else {
      const { error: avatarError } = await supabase
        .from('profiles')
        .update({
          phone: formData.phone,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (avatarError) {
        showToast('No pudimos actualizar el perfil. Intenta de nuevo.', 'error');
        setSaving(false);
        return;
      }
    }

    showToast('¡Perfil actualizado con éxito!', 'success');
    router.refresh();
    setSaving(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setOtpLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: pendingPhone,
      token: otpCode,
      type: 'phone_change',
    });
    if (error) {
      setOtpLoading(false);
      showToast('Código incorrecto. Intenta de nuevo.', 'error');
      return;
    }
    setOtpModal(false);
    setOtpLoading(false);
    await saveProfile(pendingPhone);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const ALLOWED_MIME: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      showToast('Solo se aceptan imágenes JPG, PNG o WebP', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen supera el límite de 2MB', 'error');
      return;
    }

    setSaving(true);
    const filePath = `${user.id}/avatar-${Math.random().toString(36).substring(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

    if (uploadError) {
      showToast('No pudimos subir la imagen. Intenta de nuevo.', 'error');
      setSaving(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

    setFormData({ ...formData, avatar_url: publicUrl });
    showToast('Imagen cargada. Toca “Guardar cambios” para conservarla.', 'success');
    setSaving(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutOneSignalUser();
    clearSessionValidated();
    await supabase.auth.signOut();
    router.push('/login/player');
  };

  const handleToggleLock = async () => {
    if (lockEnabled) {
      disableLock();
      showToast('Bloqueo biométrico desactivado', 'success');
      return;
    }
    const result = await enrollLock();
    if (result.ok) {
      showToast('¡Bloqueo biométrico activado!', 'success');
    } else {
      showToast('No se pudo activar el bloqueo biométrico. Intenta de nuevo.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-8" aria-busy="true" aria-label="Cargando tu perfil">
        <div className="flex items-center gap-5">
          <Skeleton className="h-24 w-24 rounded-full!" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14">
        <div className="min-w-0 space-y-12">
          <ProfileIdentity
            username={formData.username}
            phone={formData.phone}
            avatarUrl={formData.avatar_url}
            busy={saving}
            onPickAvatar={() => avatarInput.current?.click()}
          />
          <input
            ref={avatarInput}
            type="file"
            id="avatar-upload"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            disabled={saving}
          />
          <ProfileStats stats={stats} />
        </div>

        <div className="min-w-0 space-y-12">
          <Section id="perfil-datos" title="Tus datos">
            <form onSubmit={handleSubmit} className="mt-5 space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <AuthField
                  label="Alias de jugador"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Tu alias en la mesa"
                  autoComplete="nickname"
                />
                <AuthField
                  label="Nombre completo"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Nombre y apellido"
                  autoComplete="name"
                />
              </div>
              <AuthField
                label="Celular"
                type="tel"
                inputMode="tel"
                mono
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+57 3..."
                hint="Si lo cambias, te enviaremos un código por SMS para confirmarlo."
                autoComplete="tel"
              />
              <AuthField
                label="Correo"
                type="email"
                value={user?.email || ''}
                disabled
                hint={user?.email ? 'El correo no se puede cambiar desde aquí.' : 'Tu cuenta no tiene correo asociado.'}
              />
              <AuthButton type="submit" pending={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </AuthButton>
            </form>
          </Section>

          {lockSupported && (
            <Section id="perfil-seguridad" title="Seguridad">
              <LockToggle enabled={lockEnabled} onToggle={handleToggleLock} />
            </Section>
          )}

          <ProfileHelp />

          <button type="button" onClick={() => setConfirmLogout(true)} className={`${playerButton.danger} w-full`}>
            <LogOut className="h-5 w-5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </div>

      <PlayerSheet
        open={otpModal}
        onClose={() => {
          setOtpModal(false);
          setOtpCode('');
        }}
        title="Verificar número"
        description={
          <>
            Enviamos un código de 6 dígitos a <span className="font-mono text-text-premium">{pendingPhone}</span>
          </>
        }
        closeLabel="Cerrar verificación"
        footer={
          <AuthButton onClick={handleVerifyOtp} disabled={otpCode.length !== 6} pending={otpLoading}>
            {otpLoading ? 'Verificando…' : 'Verificar código'}
          </AuthButton>
        }
      >
        <div className="pt-2">
          <CodeInput
            name="token"
            label="Código del SMS"
            value={otpCode}
            onChange={setOtpCode}
            oneTimeCode
            autoFocus
            hint="Si no te llega, revisa que el número sea correcto e inténtalo de nuevo."
          />
        </div>
      </PlayerSheet>

      <PlayerSheet
        open={confirmLogout}
        onClose={() => !loggingOut && setConfirmLogout(false)}
        title="¿Cerrar sesión?"
        description="Tendrás que entrar de nuevo con tu celular y tu clave."
        closeLabel="Cancelar"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <AuthButton variant="secondary" onClick={() => setConfirmLogout(false)} disabled={loggingOut}>
              Cancelar
            </AuthButton>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              aria-busy={loggingOut || undefined}
              className={`${playerButton.dangerSolid} disabled:opacity-60`}
            >
              {loggingOut ? 'Saliendo…' : 'Sí, salir'}
            </button>
          </div>
        }
      >
        <span className="sr-only">Confirma para cerrar tu sesión en este dispositivo.</span>
      </PlayerSheet>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
