'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Tag, Camera, Save, ArrowLeft, Loader2, Trophy, Medal, Star, ShieldCheck, LogOut } from 'lucide-react';
import { getAvatarSvg } from '@/utils/avatars';
import { motion, AnimatePresence } from 'framer-motion';
import { getMyStats, PlayerStats } from '@/app/actions/stats';
import { Toast, ToastType } from '@/components/ui/Toast';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
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
        setFormData({
          username: profileRes.data.username || '',
          full_name: profileRes.data.full_name || '',
          phone: profileRes.data.phone || '',
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
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: formData.username,
        full_name: formData.full_name,
        phone: formData.phone,
        avatar_url: formData.avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      showToast('Error al actualizar: ' + error.message, 'error');
    } else {
      showToast('¡Perfil actualizado con éxito!', 'success');
      router.refresh();
    }
    setSaving(false);
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
    <div className="max-w-4xl mx-auto pb-24 pt-6 md:pt-12 px-4 sm:px-6 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <header className="flex items-center justify-center relative">
        <div className="absolute left-0">
          <button 
            onClick={() => router.back()}
            className="group p-4 bg-white/5 border border-white/10 rounded-[1.5rem] hover:bg-brand-gold hover:border-brand-gold transition-all duration-500 shadow-xl active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-slate-300 group-hover:text-black transition-colors" />
          </button>
        </div>
        
        <div className="text-center space-y-1 px-14 overflow-visible">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black italic text-white uppercase tracking-tighter leading-none pr-2">
            Mi Perfil
          </h1>
          <p className="text-[10px] font-black text-text-secondary uppercase tracking-[0.4em] opacity-60">
            Sede Central • Elite Member
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Left Column: Avatar & Loyalty */}
        <aside className="lg:col-span-5 space-y-8">
          <div className="relative bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-gold/10 transition-colors duration-1000" />
            
            <div className="relative w-40 h-40 mb-6">
              {/* Outer Ring */}
              <div className="absolute inset-[-12px] border-2 border-brand-gold/20 rounded-full" />
              <motion.div 
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-12px] border-2 border-transparent border-t-brand-gold rounded-full opacity-40 shadow-[0_0_15px_rgba(226,176,68,0.3)]" 
              />
              
              <div className="relative w-full h-full rounded-full bg-slate-900 border-4 border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                {formData.avatar_url ? (
                  getAvatarSvg(formData.avatar_url) ? (
                    <div className="w-full h-full scale-[1.3]">
                      {getAvatarSvg(formData.avatar_url)}
                    </div>
                  ) : (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  )
                ) : (
                  <span className="text-5xl font-display font-black text-brand-gold">
                    {formData.username?.[0]?.toUpperCase() || 'P'}
                  </span>
                )}
                
                <AnimatePresence>
                  {saving && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-950/70 flex items-center justify-center z-10"
                    >
                      <Loader2 className="w-10 h-10 text-brand-gold animate-spin" />
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
                className="absolute bottom-2 right-2 p-3 bg-brand-gold rounded-2xl border-4 border-slate-950 text-black hover:bg-brand-gold-light transition-all shadow-2xl active:scale-90"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={saving}
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-gold" />
                <span className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">Nivel {stats?.level || 1}</span>
              </div>
              <h3 className="text-3xl font-display font-black text-white italic uppercase tracking-tight">
                {formData.username || 'Jugador'}
              </h3>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Prestigio Elite • Miembro desde 2024</p>
            </div>

            {/* Loyalty Bar Mock */}
            <div className="w-full mt-8 space-y-2">
              <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">
                <span>XP Actual</span>
                <span>Prox. Nivel</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  className="h-full bg-gradient-to-r from-brand-gold to-brand-gold-light rounded-full shadow-[0_0_10px_rgba(226,176,68,0.5)]" 
                />
              </div>
            </div>
          </div>

          {/* Mini Stats Card */}
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 grid grid-cols-3 gap-4 shadow-xl">
             <div className="text-center space-y-1">
               <Trophy className="w-5 h-5 text-brand-gold mx-auto opacity-40" />
               <p className="text-xl font-display font-black text-white">{stats?.games_played || 0}</p>
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Partidas</p>
             </div>
             <div className="text-center space-y-1 border-x border-white/5">
               <Medal className="w-5 h-5 text-brand-gold mx-auto opacity-40" />
               <p className="text-xl font-display font-black text-brand-gold">{stats?.games_won || 0}</p>
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Victorias</p>
             </div>
             <div className="text-center space-y-1">
               <Star className="w-5 h-5 text-brand-gold mx-auto opacity-40" />
               <p className="text-xl font-display font-black text-white">{stats?.primeras_count || 0}</p>
               <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Primeras</p>
             </div>
          </div>
        </aside>

        {/* Right Column: Settings Form */}
        <main className="lg:col-span-7">
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl relative">
            <header className="mb-10 flex items-center gap-4">
               <div className="p-3 bg-brand-gold/10 border border-brand-gold/20 rounded-2xl">
                 <Tag className="w-6 h-6 text-brand-gold" />
               </div>
               <div>
                  <h4 className="text-xl font-display font-black text-white uppercase italic tracking-tighter">Ajustes de Cuenta</h4>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Personaliza tu identidad en la mesa</p>
               </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-8">
                {/* Username */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Nombre de Usuario</label>
                  <div className="relative group">
                    <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-gold transition-colors" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-lg font-black text-white focus:outline-none focus:border-brand-gold/50 transition-all placeholder:text-slate-700 shadow-inner"
                      placeholder="Identidad"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Nombre Real</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-gold transition-colors" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-lg font-black text-white focus:outline-none focus:border-brand-gold/50 transition-all placeholder:text-slate-700 shadow-inner"
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-3 text-center sm:text-left">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Directorio (Teléfono)</label>
                <div className="relative group">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-brand-gold transition-colors" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-5 pl-14 pr-6 text-lg font-black text-white focus:outline-none focus:border-brand-gold/50 transition-all placeholder:text-slate-700 shadow-inner"
                    placeholder="+57 3..."
                  />
                </div>
              </div>

              {/* Email (Disabled) */}
              <div className="space-y-3 border-t border-white/5 pt-8 opacity-40 pointer-events-none">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 ml-2">Enlace de Bóveda (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-lg font-black text-slate-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="group relative w-full h-20 bg-brand-gold rounded-[2rem] font-black text-lg uppercase tracking-[0.3em] text-black shadow-[0_20px_40px_rgba(226,176,68,0.15)] hover:shadow-[0_20px_50px_rgba(226,176,68,0.25)] active:scale-95 transition-all overflow-hidden disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  <span className="flex items-center justify-center gap-4">
                    <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    Guardar Cambios
                  </span>
                )}
                {/* Decoration */}
                <motion.div 
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '1000%' }}
                  className="absolute inset-0 bg-white/20 -skew-x-12" 
                />
              </button>
            </form>
          </div>
        </main>
      </div>

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
