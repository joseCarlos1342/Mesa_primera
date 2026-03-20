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
    <div className="min-h-screen bg-table pb-32 pt-10 md:pt-16 px-4 sm:px-6 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <header className="flex items-center justify-center relative max-w-4xl mx-auto">
        <div className="absolute left-0">
          <button 
            onClick={() => router.back()}
            className="group p-5 bg-slate-900/60 backdrop-blur-xl border-2 border-accent-gold/30 rounded-[1.2rem] hover:bg-accent-gold hover:border-accent-gold transition-all duration-500 shadow-premium active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-accent-gold group-hover:text-amber-950 transition-colors" />
          </button>
        </div>
        
        <div className="text-center space-y-2 px-14 overflow-visible">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black italic text-accent-gold-shimmer bg-clip-text text-transparent uppercase tracking-tighter leading-none pr-2 drop-shadow-premium">
            Mi Perfil
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] opacity-80">
            Sede Central • Private Member
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto grid lg:grid-cols-12 gap-12">
        {/* Left Column: Avatar & Loyalty */}
        <aside className="lg:col-span-5 space-y-10">
          <div className="relative bg-bg-poker/30 backdrop-blur-2xl border-brass border-2 rounded-[3.5rem] p-12 flex flex-col items-center text-center shadow-premium overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent-gold/5 rounded-full blur-3xl -mr-24 -mt-24 group-hover:bg-accent-gold/10 transition-colors duration-1000" />
            
            <div className="relative w-48 h-48 mb-8">
              {/* Outer Ring */}
              <div className="absolute inset-[-14px] border-2 border-accent-gold/20 rounded-full" />
              <motion.div 
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-14px] border-2 border-transparent border-t-accent-gold rounded-full opacity-60 shadow-[0_0_20px_rgba(197,160,89,0.4)]" 
              />
              
              <div className="relative w-full h-full rounded-full bg-slate-950 border-4 border-white/10 flex items-center justify-center overflow-hidden shadow-premium">
                {formData.avatar_url ? (
                  getAvatarSvg(formData.avatar_url) ? (
                    <div className="w-full h-full scale-[1.4]">
                      {getAvatarSvg(formData.avatar_url)}
                    </div>
                  ) : (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  )
                ) : (
                  <span className="text-6xl font-display font-black text-accent-gold">
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
                      <Loader2 className="w-12 h-12 text-accent-gold animate-spin" />
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
                className="absolute bottom-2 right-2 p-4 bg-accent-gold-shimmer rounded-2xl border-4 border-slate-950 text-slate-950 hover:scale-110 transition-all shadow-premium active:scale-90"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={saving}
              >
                <Camera className="w-7 h-7" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <ShieldCheck className="w-5 h-5 text-accent-gold" />
                <span className="text-[10px] font-black text-accent-gold uppercase tracking-[0.4em]">Nivel {stats?.level || 1}</span>
              </div>
              <h3 className="text-4xl font-display font-black text-white italic uppercase tracking-tight">
                {formData.username || 'Miembro'}
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Socio Fundador • Elite Club</p>
            </div>

            {/* Loyalty Bar */}
            <div className="w-full mt-10 space-y-3">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-2">
                <span>Prestigio</span>
                <span>Ascenso</span>
              </div>
              <div className="h-3 w-full bg-slate-950/60 rounded-full overflow-hidden p-[2px] border-2 border-white/5 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-accent-gold-shimmer rounded-full shadow-[0_0_15px_rgba(197,160,89,0.7)]" 
                />
              </div>
            </div>
          </div>

          {/* Mini Stats Card */}
          <div className="bg-bg-poker/20 backdrop-blur-2xl border-2 border-white/5 rounded-[3rem] p-10 grid grid-cols-3 gap-6 shadow-premium">
             <div className="text-center space-y-2">
               <Trophy className="w-6 h-6 text-accent-gold mx-auto opacity-40" />
               <p className="text-2xl font-display font-black text-white">{stats?.games_played || 0}</p>
               <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Mesas</p>
             </div>
             <div className="text-center space-y-2 border-x border-white/10">
               <Medal className="w-6 h-6 text-accent-gold mx-auto opacity-40" />
               <p className="text-2xl font-display font-black text-accent-gold">{stats?.games_won || 0}</p>
               <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Victorias</p>
             </div>
             <div className="text-center space-y-2">
               <Star className="w-6 h-6 text-accent-gold mx-auto opacity-40" />
               <p className="text-2xl font-display font-black text-white">{stats?.primeras_count || 0}</p>
               <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Primeras</p>
             </div>
          </div>
        </aside>

        {/* Right Column: Settings Form */}
        <main className="lg:col-span-7">
          <div className="bg-bg-poker/30 backdrop-blur-2xl border-brass border-2 rounded-[4rem] p-10 md:p-14 shadow-premium relative h-full">
            <header className="mb-12 flex items-center gap-6">
               <div className="p-4 bg-accent-gold/10 border border-accent-gold/20 rounded-[1.5rem] shadow-premium">
                 <Tag className="w-7 h-7 text-accent-gold" />
               </div>
               <div>
                  <h4 className="text-2xl font-display font-black text-white uppercase italic tracking-tighter">Credenciales de Élite</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Firma tu identidad en el club</p>
               </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid sm:grid-cols-2 gap-10">
                {/* Username */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-gold/60 ml-3">Alias de Jugador</label>
                  <div className="relative group">
                    <Tag className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-600 group-focus-within:text-accent-gold transition-colors" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-slate-950/60 border-2 border-white/5 rounded-[1.8rem] py-6 pl-16 pr-8 text-xl font-bold text-white focus:outline-none focus:border-accent-gold/40 transition-all placeholder:text-slate-800 shadow-inner"
                      placeholder="Identidad"
                    />
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-gold/60 ml-3">Nombre Real</label>
                  <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-600 group-focus-within:text-accent-gold transition-colors" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-slate-950/60 border-2 border-white/5 rounded-[1.8rem] py-6 pl-16 pr-8 text-xl font-bold text-white focus:outline-none focus:border-accent-gold/40 transition-all placeholder:text-slate-800 shadow-inner"
                      placeholder="Nombre completo"
                    />
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-accent-gold/60 ml-3">Directorio Seguro (Teléfono)</label>
                <div className="relative group">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-600 group-focus-within:text-accent-gold transition-colors" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-950/60 border-2 border-white/5 rounded-[1.8rem] py-6 pl-16 pr-8 text-xl font-bold text-white focus:outline-none focus:border-accent-gold/40 transition-all placeholder:text-slate-800 shadow-inner"
                    placeholder="+57 3..."
                  />
                </div>
              </div>

              {/* Email (Disabled) */}
              <div className="space-y-4 border-t border-white/5 pt-10 opacity-40 pointer-events-none">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 ml-3">Enlace de Bóveda (Email)</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-700" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-slate-950/40 border-2 border-white/5 rounded-[1.8rem] py-6 pl-16 pr-8 text-xl font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="group relative flex-[2] h-24 bg-accent-gold-shimmer rounded-[2rem] font-display font-black text-xl uppercase italic tracking-[0.4em] text-slate-950 shadow-premium transition-all duration-500 disabled:opacity-50 overflow-hidden active:translate-y-1 active:border-b-2 border-t-2 border-white/20 border-b-4 border-black/40 hover:scale-[1.02]"
                >
                  {saving ? (
                    <Loader2 className="w-10 h-10 animate-spin mx-auto" />
                  ) : (
                    <span className="flex items-center justify-center gap-5">
                      <Save className="w-8 h-8 group-hover:rotate-12 transition-transform" />
                      Guardar Cambios
                    </span>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex-1 h-24 bg-red-950/20 hover:bg-red-950/40 border-2 border-red-500/20 hover:border-red-500/40 rounded-[2rem] font-display font-black text-red-500 uppercase italic tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-4 group"
                >
                  <LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                  Salir
                </button>
              </div>
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
