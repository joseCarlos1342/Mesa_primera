'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Tag, Camera, Save, ArrowLeft, Loader2 } from 'lucide-react';
import { getAvatarSvg } from '@/utils/avatars';

export default function ProfilePage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    phone: '',
    avatar_url: '',
  });

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login/player');
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setFormData({
          username: profile.username || '',
          full_name: profile.full_name || '',
          phone: profile.phone || '',
          avatar_url: profile.avatar_url || '',
        });
      }
      setLoading(false);
    }

    getProfile();
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
      alert('Error al actualizar el perfil: ' + error.message);
    } else {
      router.refresh();
      const btn = document.getElementById('save-button');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '¡Guardado!';
        btn.classList.add('bg-green-500/20', 'border-green-500/50', 'text-green-400');
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.classList.remove('bg-green-500/20', 'border-green-500/50', 'text-green-400');
        }, 2000);
      }
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona solo archivos de imagen (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es demasiado grande. El límite es de 2MB.');
      return;
    }

    setSaving(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatar-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert('Error al subir la imagen: ' + uploadError.message);
      setSaving(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    setFormData({ ...formData, avatar_url: publicUrl });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-slate-300" />
        </button>
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Mi Perfil</h1>
          <p className="text-slate-400 font-bold uppercase text-xs tracking-[0.2em]">Configuración de tu cuenta</p>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
          <User className="w-32 h-32 text-indigo-500" />
        </div>

        <form onSubmit={handleSubmit} className="relative space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full blur opacity-20 animate-pulse"></div>
              <div className="relative w-full h-full rounded-full bg-slate-800 border-4 border-white/10 flex items-center justify-center overflow-hidden">
                {formData.avatar_url ? (
                  getAvatarSvg(formData.avatar_url) ? (
                    <div className="w-full h-full scale-[1.2]">
                      {getAvatarSvg(formData.avatar_url)}
                    </div>
                  ) : (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  )
                ) : (
                  <span className="text-4xl font-black text-white">
                    {formData.username?.[0]?.toUpperCase() || 'P'}
                  </span>
                )}
                {saving && (
                  <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                )}
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
                className="absolute bottom-1 right-1 p-2 bg-indigo-600 rounded-xl border-2 border-slate-900 text-white hover:bg-indigo-500 transition-colors shadow-xl disabled:opacity-50"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={saving}
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Toca la cámara para subir imagen</p>
          </div>

          <div className="grid gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Nombre de Usuario</label>
              <div className="relative group">
                <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Tu nombre de usuario"
                  className="w-full bg-slate-950/50 border-2 border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xl font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Nombre Completo</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Tu nombre real"
                  className="w-full bg-slate-950/50 border-2 border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xl font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Teléfono</label>
              <div className="relative group">
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Número de teléfono"
                  className="w-full bg-slate-950/50 border-2 border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xl font-bold text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-2 opacity-50">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 ml-4">Email (No Editable)</label>
              <div className="relative group grayscale">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full bg-slate-950/50 border-2 border-white/5 rounded-2xl py-4 pl-14 pr-6 text-xl font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <button
            id="save-button"
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 md:py-6 rounded-2xl md:rounded-3xl font-black text-lg md:text-2xl uppercase tracking-widest text-white shadow-xl shadow-indigo-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 mt-8 md:mt-12 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-6 h-6 md:w-8 h-8 animate-spin" />
            ) : (
              <>
                <Save className="w-6 h-6 md:w-8 h-8" />
                Guardar Cambios
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
