'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Tag, Camera, Save, Loader2, Trophy, Medal, Star, ShieldCheck, LogOut, X, Fingerprint } from 'lucide-react';
import { getAvatarSvg } from '@/utils/avatars';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyStats, PlayerStats } from '@/app/actions/stats';
import { Toast, ToastType } from '@/components/ui/Toast';
import { useAppLock } from '@/components/providers/AppLockProvider';
import { clearSessionValidated } from '@/lib/app-lock-session';
import { normalizePhone } from '@/lib/phone';
import { useRef } from 'react';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const { isEnabled: lockEnabled, isSupported: lockSupported, enroll: enrollLock, disable: disableLock } = useAppLock();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const originalPhone = useRef('');
  const [otpModal, setOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');
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
        getMyStats()
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
      // Start OTP flow for phone change
      const newPhone = normalizePhone(formData.phone);
      setSaving(true);
      const { error } = await supabase.auth.updateUser({ phone: newPhone });
      setSaving(false);
      if (error) {
        showToast('Error al enviar código: ' + error.message, 'error');
        return;
      }
      setPendingPhone(newPhone);
      setOtpCode('');
      setOtpModal(true);
      return;
    }

    // No phone change — save directly
    await saveProfile();
  };

  const saveProfile = async (phoneOverride?: string) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: formData.username,
        full_name: formData.full_name,
        phone: phoneOverride ?? formData.phone,
        avatar_url: formData.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      showToast('Error al actualizar: ' + error.message, 'error');
    } else {
      if (phoneOverride) {
        originalPhone.current = phoneOverride;
        setFormData((prev) => ({ ...prev, phone: phoneOverride }));
      }
      showToast('¡Perfil actualizado con éxito!', 'success');
      router.refresh();
    }
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
    // OTP verified — now save entire profile including new phone
    setOtpModal(false);
    setOtpLoading(false);
    await saveProfile(pendingPhone);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      showToast('Selecciona solo archivos de imagen', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen supera el límite de 2MB', 'error');
      return;
    }

    setSaving(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      showToast('Error al subir: ' + uploadError.message, 'error');
      setSaving(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    setFormData({ ...formData, avatar_url: publicUrl });
    showToast('Imagen cargada correctamente', 'success');
    setSaving(false);
  };

  const handleLogout = async () => {
    if (confirm("¿Seguro que deseas cerrar sesión?")) {
      clearSessionValidated();
      await supabase.auth.signOut();
      router.push('/login/player');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-16 h-16 border-4 border-brand-gold/20 border-t-brand-gold rounded-full animate-spin shadow-[0_0_15px_rgba(202,171,114,0.2)]" />
        <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em] animate-pulse">Abriendo Bóveda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-24 pt-10 md:pt-16 px-4 sm:px-6 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 overflow-x-hidden overflow-y-auto relative">
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/20 to-transparent pointer-events-none -z-10" />
      {/* Header */}
      <header className="flex flex-col items-center justify-center relative w-full max-w-4xl mx-auto space-y-4 px-2 text-center">
        <div className="overflow-visible w-full px-4">
          <h1 className="text-3xl xs:text-5xl md:text-6xl lg:text-7xl font-display font-black italic text-brand-gold uppercase tracking-tighter leading-none pr-2 drop-shadow-premium">
            Mi Perfil
          </h1>
        </div>

        {/* Decorative Divider */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 pt-2 w-full px-4">
          <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent" />
          <div className="w-2.5 h-2.5 rounded-full bg-brand-gold shadow-[0_0_15px_rgba(202,171,114,0.8)] flex-shrink-0" />
          <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent via-brand-gold/30 to-transparent" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto grid lg:grid-cols-12 gap-8 md:gap-12 w-full h-full overflow-hidden px-0">
        {/* Left Column: Avatar & Loyalty */}
        <aside className="lg:col-span-5 space-y-10 w-full overflow-hidden">
          <div className="relative bg-black/40 backdrop-blur-3xl border-brand-gold/10 border-2 rounded-3xl md:rounded-[3.5rem] p-8 md:p-12 flex flex-col items-center text-center shadow-xl overflow-hidden group hover:border-brand-gold/30 transition-all duration-500 w-full">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-brand-gold/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-brand-gold/10 transition-colors duration-1000" />
            
            <div className="relative w-40 h-40 md:w-48 md:h-48 mb-8">
              {/* Outer Ring */}
              <div className="absolute inset-[-14px] border-2 border-brand-gold/20 rounded-full" />
              <motion.div 
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-14px] border-2 border-transparent border-t-brand-gold rounded-full opacity-60 shadow-[0_0_20px_rgba(202,171,114,0.4)]" 
              />
              
              <div className="relative w-full h-full rounded-full bg-slate-950 border-4 border-brand-gold/10 flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-500 group-hover:border-brand-gold/30">
                {formData.avatar_url ? (
                  getAvatarSvg(formData.avatar_url) ? (
                    <div className="w-full h-full scale-[1.4]">
                      {getAvatarSvg(formData.avatar_url)}
                    </div>
                  ) : (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  )
                ) : (
                  <span className="text-5xl md:text-6xl font-display font-black text-brand-gold">
                    {formData.username?.[0]?.toUpperCase() || 'P'}
                  </span>
                )}
                
                <AnimatePresence>
                  {saving && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-10"
                    >
                      <Loader2 className="w-12 h-12 text-brand-gold animate-spin" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input
                type="file"
                id="avatar-upload"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                disabled={saving}
              />
              <button 
                type="button"
                aria-label="Cambiar avatar"
                className="absolute bottom-1 right-1 md:bottom-2 md:right-2 p-3 md:p-4 bg-accent-gold-shimmer rounded-2xl border-4 border-slate-950 text-slate-950 hover:scale-110 transition-all shadow-xl active:scale-95 z-20"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={saving}
              >
                <Camera className="w-6 h-6 md:w-7 md:h-7" />
              </button>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-display font-black text-[#f3edd7] italic uppercase tracking-tight">
                {formData.username || 'Miembro'}
              </h2>
            </div>
          </div>

          {/* Mini Stats Card */}
          <div className="bg-black/40 backdrop-blur-3xl border-2 border-brand-gold/10 rounded-2xl md:rounded-[3rem] p-6 sm:p-10 grid grid-cols-3 gap-4 sm:gap-6 shadow-xl hover:bg-black/60 transition-colors duration-500 w-full overflow-hidden">
             <div className="text-center space-y-2">
               <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold mx-auto opacity-40" />
               <p className="text-xl sm:text-2xl font-display font-black text-[#f3edd7] leading-none">{stats?.games_played || 0}</p>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Mesas</p>
             </div>
             <div className="text-center space-y-2">
               <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold mx-auto opacity-40" />
               <p className="text-xl sm:text-2xl font-display font-black text-brand-gold leading-none">{stats?.games_won || 0}</p>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Victorias</p>
             </div>
             <div className="text-center space-y-2">
               <Star className="w-5 h-5 sm:w-6 sm:h-6 text-brand-gold mx-auto opacity-40" />
               <p className="text-xl sm:text-2xl font-display font-black text-[#f3edd7] leading-none">{stats?.primeras_count || 0}</p>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Primeras</p>
             </div>
          </div>
        </aside>

        {/* Right Column: Settings Form */}
        <main className="lg:col-span-7 w-full">
          <div className="bg-black/40 backdrop-blur-3xl border-brand-gold/10 border-2 rounded-3xl md:rounded-[4rem] p-6 sm:p-10 lg:p-14 shadow-xl relative h-full hover:bg-black/60 transition-colors duration-500 overflow-hidden w-full">
            <header className="mb-10 sm:mb-12 flex items-center gap-6">
               <div className="p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-[1.5rem] shadow-xl flex-shrink-0">
                  <Tag className="w-6 h-6 sm:w-7 sm:h-7 text-brand-gold" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl sm:text-2xl font-display font-black text-[#f3edd7] uppercase italic tracking-tighter leading-none">Credenciales</h4>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10 w-full overflow-hidden">
              <div className="grid sm:grid-cols-2 gap-8 sm:gap-10 w-full">
                {/* Username */}
                <div className="space-y-4 w-full">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold ml-3">Alias de Jugador</label>
                  <div className="relative group w-full">
                    <Tag className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-focus-within:text-brand-gold transition-colors" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-slate-950/60 border-2 border-brand-gold/10 rounded-[1.8rem] py-5 sm:py-6 pl-14 sm:pl-16 pr-8 text-lg sm:text-xl font-bold text-white focus:outline-none focus:border-brand-gold/40 transition-all placeholder:text-slate-800"
                      placeholder="Identidad"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-4 w-full">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold ml-3">Nombre Real</label>
                  <div className="relative group w-full">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-focus-within:text-brand-gold transition-colors" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-slate-950/60 border-2 border-brand-gold/10 rounded-[1.8rem] py-5 sm:py-6 pl-14 sm:pl-16 pr-8 text-lg sm:text-xl font-bold text-white focus:outline-none focus:border-brand-gold/40 transition-all placeholder:text-slate-800"
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-4 w-full">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold ml-3">Directorio Seguro (Teléfono)</label>
                <div className="relative group w-full">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-slate-600 group-focus-within:text-brand-gold transition-colors" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950/60 border-2 border-brand-gold/10 rounded-[1.8rem] py-5 sm:py-6 pl-14 sm:pl-16 pr-8 text-lg sm:text-xl font-bold text-white focus:outline-none focus:border-brand-gold/40 transition-all placeholder:text-slate-800"
                    placeholder="+57 3..."
                  />
                </div>
              </div>

              {/* Email (Disabled) */}
              <div className="space-y-4 border-t border-brand-gold/10 pt-10 pointer-events-none w-full">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 ml-3">Enlace de Bóveda (Email)</label>
                <div className="relative w-full">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
                  <input
                    type="email"
                    aria-label="Email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-slate-950/40 border-2 border-brand-gold/10 rounded-[1.8rem] py-5 sm:py-6 pl-14 sm:pl-16 pr-8 text-lg sm:text-xl font-bold text-slate-500"
                  />
                </div>
              </div>

              {/* Biometric App Lock */}
              {lockSupported && (
                <div className="space-y-4 border-t border-brand-gold/10 pt-10 w-full">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold ml-3">
                    Seguridad Biométrica
                  </label>
                  <div className="flex items-center justify-between bg-slate-950/60 border-2 border-brand-gold/10 rounded-[1.8rem] py-5 sm:py-6 px-6 sm:px-8 w-full">
                    <div className="flex items-center gap-4">
                      <Fingerprint className="w-6 h-6 text-brand-gold" />
                      <div>
                        <p className="text-sm sm:text-base font-bold text-white">
                          Bloqueo con Huella / Face ID
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Pide verificación al abrir la app
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Activar bloqueo biométrico"
                      onClick={async () => {
                        if (lockEnabled) {
                          disableLock();
                          showToast('Bloqueo biométrico desactivado', 'success');
                        } else {
                          const result = await enrollLock();
                          if (result.ok) {
                            showToast('¡Bloqueo biométrico activado!', 'success');
                          } else {
                            showToast(result.error || 'No se pudo activar. Intenta de nuevo.', 'error');
                          }
                        }
                      }}
                      className={`relative w-14 h-8 rounded-full transition-colors duration-300 shrink-0 ${
                        lockEnabled
                          ? 'bg-brand-gold shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                          : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
                          lockEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-row gap-4 pt-10 w-full max-w-md mx-auto sm:max-w-none">
                <button
                  type="submit"
                  disabled={saving}
                  className="group relative flex-1 h-14 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all duration-200 border-b-4 border-brand-gold-dark active:border-b-0 active:translate-y-1 shadow-lg disabled:opacity-50 overflow-hidden flex items-center justify-center gap-2"
                >
                  <div className="absolute inset-x-[-20%] inset-y-0 translate-x-[-120%] skew-x-[-25deg] group-hover:translate-x-[120%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                  ) : (
                    <>
                      <Save className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10" />
                      <span className="relative z-10 italic">Guardar</span>
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="group relative flex-1 h-14 bg-red-950/20 hover:bg-red-500/10 border-2 border-red-500/30 rounded-xl text-red-500 font-display font-black text-xs uppercase italic tracking-widest transition-all duration-200 active:translate-y-1 active:border-b-0 border-b-4 border-black/20 shadow-lg flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform opacity-70" />
                  <span className="relative z-10 text-red-500">Salir</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {otpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-950 border-2 border-brand-gold/30 rounded-3xl p-8 sm:p-10 w-full max-w-md shadow-2xl space-y-6"
            >
              <button
                type="button"
                onClick={() => { setOtpModal(false); setOtpCode(''); }}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-brand-gold/10 border-2 border-brand-gold/20 rounded-2xl flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-7 h-7 text-brand-gold" />
                </div>
                <h3 className="text-xl font-display font-black text-[#f3edd7] uppercase italic tracking-tight">Verificar Número</h3>
                <p className="text-sm text-[#f3edd7]/50">
                  Enviamos un código de 6 dígitos a <span className="text-brand-gold font-bold">{pendingPhone}</span>
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full h-16 bg-black/60 border-2 border-brand-gold/20 rounded-2xl text-center text-3xl font-display font-black text-[#f3edd7] tracking-[0.5em] placeholder:text-slate-800 focus:outline-none focus:border-brand-gold/50 transition-all"
                  autoFocus
                />

                <button
                  type="button"
                  disabled={otpCode.length !== 6 || otpLoading}
                  onClick={handleVerifyOtp}
                  className="w-full h-14 bg-gradient-to-b from-brand-gold-light via-brand-gold to-brand-gold-dark text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all duration-200 border-b-4 border-brand-gold-dark active:border-b-0 active:translate-y-1 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {otpLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-black" />
                  ) : (
                    <span className="italic">Verificar Código</span>
                  )}
                </button>

                <p className="text-[10px] text-center text-[#f3edd7]/30 font-medium">
                  Si no recibes el código, revisa que el número sea correcto e intenta de nuevo.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
