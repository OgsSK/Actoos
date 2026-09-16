'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Camera, Save, Loader2, User as UserIcon,
  X, AlertCircle, CheckCircle2, Plus, Trash2, ChevronDown,
  Pencil, MapPin, School,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

// ⏱ Au bout de ce délai, on n'attend plus authLoading
const AUTH_FORM_TIMEOUT_MS = 800;

// ============================================================
// TYPES
// ============================================================
interface Level {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
  category: string;
  system: string;
}

interface Child {
  id: string | null;
  first_name: string;
  birth_date: string;
  level_id: string | null;
  level_custom: string | null;
  school_name: string;
  preferred_schedule: string;
  notes: string;
}

const EMPTY_CHILD: Child = {
  id: null,
  first_name: '',
  birth_date: '',
  level_id: null,
  level_custom: null,
  school_name: '',
  preferred_schedule: '',
  notes: '',
};

const REF_PREFIX = 'ref:';
const MIN_AGE = 3;
const MAX_AGE = 25;

// ============================================================
// HELPERS
// ============================================================
function maxBirthDateISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MIN_AGE);
  return d.toISOString().split('T')[0];
}

function minBirthDateISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - MAX_AGE);
  return d.toISOString().split('T')[0];
}

function calcAge(birthDate: string): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function validateChild(c: Child, isFr: boolean): string | null {
  const name = c.first_name.trim() || (isFr ? 'Enfant' : 'Child');

  if (!c.first_name.trim()) {
    return isFr ? 'Le prénom est obligatoire.' : 'First name is required.';
  }

  if (c.birth_date) {
    const age = calcAge(c.birth_date);
    if (age === null) {
      return isFr ? `Date de naissance invalide pour ${name}.` : `Invalid birth date for ${name}.`;
    }
    if (age < MIN_AGE) {
      return isFr ? `${name} doit avoir au moins ${MIN_AGE} ans.` : `${name} must be at least ${MIN_AGE} years old.`;
    }
    if (age > MAX_AGE) {
      return isFr ? `${name} ne peut pas avoir plus de ${MAX_AGE} ans.` : `${name} cannot be older than ${MAX_AGE}.`;
    }
  }

  return null;
}

function levelLabel(child: Child, levels: Level[], isFr: boolean): string | null {
  if (child.level_custom) return child.level_custom;
  if (child.level_id) {
    const id = child.level_id.startsWith(REF_PREFIX) ? child.level_id.slice(REF_PREFIX.length) : child.level_id;
    const found = levels.find(l => l.id === id);
    if (found) return isFr ? found.name_fr : found.name_en;
  }
  return null;
}

// ============================================================
// PRIMITIVES
// ============================================================
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 sm:p-6 lg:p-8 ${className}`}>{children}</div>;
}

function PrimaryButton({
  children, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-wait ${className}`}
    >
      {children}
    </button>
  );
}

function OutlineButton({
  children, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

// ============================================================
// SKELETON
// ============================================================
function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

function ProfileEditSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <SkeletonLine className="h-4 w-20 shrink-0" />
          <div className="flex items-center gap-4">
            <SkeletonLine className="hidden lg:block h-4 w-32" />
            <SkeletonLine className="h-8 w-12 rounded-lg" />
          </div>
          <SkeletonLine className="h-11 w-32 rounded-xl shrink-0" />
        </div>
        <div className="h-1 bg-slate-100" />
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="space-y-2">
          <SkeletonLine className="h-8 w-64" />
          <SkeletonLine className="h-4 w-80 max-w-full" />
        </div>

        <Card>
          <CardContent>
            <SkeletonLine className="h-5 w-24 mb-5" />
            <div className="flex items-center gap-6">
              <SkeletonLine className="w-24 h-24 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLine className="h-4 w-32" />
                <SkeletonLine className="h-3 w-64 max-w-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SkeletonLine className="h-5 w-24 mb-5" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[0, 1].map(i => (
                <div key={i} className="space-y-2">
                  <SkeletonLine className="h-4 w-20" />
                  <SkeletonLine className="h-11 w-full rounded-xl" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              {[0, 1].map(i => (
                <div key={i} className="space-y-2">
                  <SkeletonLine className="h-4 w-24" />
                  <SkeletonLine className="h-11 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SkeletonLine className="h-5 w-32 mb-5" />
            <SkeletonLine className="h-24 w-full rounded-xl" />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SkeletonLine className="h-5 w-32 mb-3" />
            <SkeletonLine className="h-4 w-full max-w-md mb-6" />
            <div className="space-y-3">
              {[0, 1].map(i => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200">
                  <SkeletonLine className="w-12 h-12 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <SkeletonLine className="h-4 w-32" />
                    <SkeletonLine className="h-3 w-48" />
                  </div>
                  <SkeletonLine className="w-9 h-9 rounded-lg shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ParentProfileEditPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const isFr = language === 'fr';

  const [levels, setLevels] = useState<Level[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [children, setChildren] = useState<Child[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Child>({ ...EMPTY_CHILD });
  const [draftError, setDraftError] = useState('');

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ⏱ Timeout local : on n'attend pas authLoading indéfiniment
  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [modalOpen]);

  // ============================================================
  // LOAD
  // ============================================================
  // ✅ FIX : on n'attend plus authLoading seul
  useEffect(() => {
    if (authLoading && !authTimeoutExpired) return;

    if (!user?.id) {
      if (!authLoading || authTimeoutExpired) {
        window.location.href = '/login';
      }
      return;
    }

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, authTimeoutExpired]);

  async function loadAll() {
    if (!hasLoadedOnce) setLoading(true);
    try {
      const { data: levelsData } = await supabase
        .from('levels')
        .select('*')
        .order('order_index');
      setLevels(levelsData || []);

      const { data: profile } = await supabase
        .from('parent_profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (profile) {
        setPhone(profile.phone || '');
        setCity(profile.city || '');
        setBio(profile.bio || '');
        setPhotoUrl(profile.profile_photo_url || '');
      }

      const { data: childrenData } = await supabase
        .from('children')
        .select('*')
        .eq('parent_id', user!.id)
        .order('created_at');

      setChildren(
        (childrenData || []).map(c => ({
          id: c.id,
          first_name: c.first_name || '',
          birth_date: c.birth_date || '',
          level_id: c.level_id ? `${REF_PREFIX}${c.level_id}` : null,
          level_custom: c.level_custom || null,
          school_name: c.school_name || '',
          preferred_schedule: c.preferred_schedule || '',
          notes: c.notes || '',
        }))
      );

      const meta = user!.user_metadata || {};
      setFirstName((meta.first_name as string) || '');
      setLastName((meta.last_name as string) || '');
    } catch (err) {
      console.error('[ParentProfile] load error', err);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  // ============================================================
  // UPLOAD PHOTO
  // ============================================================
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError(isFr ? 'Format image requis' : 'Image format required');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(isFr ? 'Image trop lourde (max 5 MB)' : 'Image too large (max 5 MB)');
      e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    setError('');

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user!.id}/parent-profile-${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type,
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setPhotoUrl(data.publicUrl);

      await supabase
        .from('parent_profiles')
        .update({ profile_photo_url: data.publicUrl })
        .eq('id', user!.id);

      setSuccess(isFr ? 'Photo mise à jour.' : 'Photo updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ParentProfile] upload error', err);
      setError(
        isFr
          ? `Erreur upload photo : ${err?.message || ''}`
          : `Photo upload error: ${err?.message || ''}`
      );
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  // ============================================================
  // REMOVE PHOTO
  // ============================================================
  async function handleRemovePhoto() {
    if (!photoUrl) return;

    if (!confirm(
      isFr
        ? 'Supprimer votre photo de profil ?'
        : 'Remove your profile photo?'
    )) return;

    setRemovingPhoto(true);
    setError('');

    try {
      const storagePath = photoUrl.split('/avatars/').pop() || '';

      if (storagePath) {
        await supabase.storage.from('avatars').remove([storagePath]);
      }

      const { error: upErr } = await supabase
        .from('parent_profiles')
        .update({ profile_photo_url: null })
        .eq('id', user!.id);

      if (upErr) throw upErr;

      setPhotoUrl('');
      setSuccess(isFr ? 'Photo supprimée.' : 'Photo removed.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('[ParentProfile] remove photo error', err);
      setError(
        isFr
          ? `Erreur suppression photo : ${err?.message || ''}`
          : `Remove photo error: ${err?.message || ''}`
      );
    } finally {
      setRemovingPhoto(false);
    }
  }

  // ============================================================
  // MODAL — ENFANTS
  // ============================================================
  function openAddChild() {
    setEditingIndex(null);
    setDraft({ ...EMPTY_CHILD });
    setDraftError('');
    setModalOpen(true);
  }

  function openEditChild(index: number) {
    setEditingIndex(index);
    setDraft({ ...children[index] });
    setDraftError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingIndex(null);
    setDraft({ ...EMPTY_CHILD });
    setDraftError('');
  }

  function validateDraftAndConfirm() {
    const err = validateChild(draft, isFr);
    if (err) {
      setDraftError(err);
      return;
    }

    if (editingIndex === null) {
      setChildren(prev => [...prev, { ...draft }]);
    } else {
      setChildren(prev =>
        prev.map((c, i) => (i === editingIndex ? { ...draft } : c))
      );
    }

    closeModal();
  }

  function removeChild(index: number) {
    if (!confirm(
      isFr
        ? 'Supprimer cet enfant de votre profil ?'
        : 'Remove this child from your profile?'
    )) return;
    setChildren(prev => prev.filter((_, i) => i !== index));
  }

  function updateDraft(patch: Partial<Child>) {
    setDraft(prev => ({ ...prev, ...patch }));
    if (draftError) setDraftError('');
  }

  // ============================================================
  // SAVE
  // ============================================================
  async function handleSave() {
    setError('');
    setSuccess('');

    for (const c of children) {
      const err = validateChild(c, isFr);
      if (err) {
        setError(err);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setSaving(true);

    try {
      const { error: profErr } = await supabase.from('parent_profiles').upsert(
        {
          id: user!.id,
          phone: phone.trim() || null,
          city: city.trim() || null,
          bio: bio.trim() || null,
          profile_photo_url: photoUrl || null,
        },
        { onConflict: 'id' }
      );
      if (profErr) throw new Error('parent_profiles: ' + profErr.message);

      await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName },
      });
      await supabase
        .from('users')
        .update({ first_name: firstName, last_name: lastName })
        .eq('id', user!.id);

      const { error: delErr } = await supabase
        .from('children')
        .delete()
        .eq('parent_id', user!.id);
      if (delErr) throw new Error('children delete: ' + delErr.message);

      let savedCount = 0;

      if (children.length > 0) {
        const rows = children.map(c => {
          const isRef = c.level_id && c.level_id.startsWith(REF_PREFIX);
          const level_id = isRef ? c.level_id!.slice(REF_PREFIX.length) : null;
          const level_custom = isRef ? null : c.level_custom;

          return {
            parent_id: user!.id,
            first_name: c.first_name.trim(),
            birth_date: c.birth_date || null,
            level_id,
            level_custom,
            school_name: c.school_name.trim() || null,
            preferred_schedule: c.preferred_schedule.trim() || null,
            notes: c.notes.trim() || null,
          };
        });

        const { error: insErr, data: insData } = await supabase
          .from('children')
          .insert(rows)
          .select('id');

        if (insErr) throw new Error('children insert: ' + insErr.message);
        savedCount = insData?.length || 0;
      }

      setSuccess(
        children.length > 0
          ? isFr
            ? `Profil enregistré. ${savedCount} enfant${savedCount > 1 ? 's' : ''} sauvegardé${savedCount > 1 ? 's' : ''}.`
            : `Profile saved. ${savedCount} child${savedCount !== 1 ? 'ren' : ''} saved.`
          : isFr
          ? 'Profil enregistré.'
          : 'Profile saved.'
      );

      await loadAll();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      console.error('[ParentProfile] save error', err);
      setError(err?.message || (isFr ? 'Erreur lors de la sauvegarde' : 'Save error'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // LOADING
  // ============================================================
  // ✅ FIX : on ne bloque plus sur authLoading
  if (loading && !hasLoadedOnce) {
    return <ProfileEditSkeleton />;
  }
  if (!user) return null;

  const profileCompletion = (() => {
    let s = 0;
    if (firstName && lastName) s += 20;
    if (phone) s += 15;
    if (city) s += 20;
    if (bio) s += 15;
    if (photoUrl) s += 15;
    if (children.length > 0) s += 15;
    return Math.min(s, 100);
  })();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">{isFr ? 'Retour' : 'Back'}</span>
          </button>

          <div className="flex items-center gap-4">
            <p className="hidden lg:block text-sm text-slate-500">
              {isFr ? 'Édition du profil' : 'Edit profile'}
            </p>
            <LanguageSwitcher />
          </div>

          <PrimaryButton onClick={handleSave} disabled={saving} className="shrink-0">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isFr ? 'Enregistrer' : 'Save'}
          </PrimaryButton>
        </div>

        <div className="h-1 bg-slate-100">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              profileCompletion >= 80
                ? 'bg-emerald-500'
                : profileCompletion >= 50
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
            }`}
            style={{ width: `${profileCompletion}%` }}
          />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isFr ? 'Modifier mon profil' : 'Edit my profile'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isFr
              ? 'Complétez vos informations pour aider les profs à mieux vous connaître.'
              : 'Complete your information to help teachers know you better.'}
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-red-800 leading-relaxed">{error}</p>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 transition-colors shrink-0 p-1 -m-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="flex-1 text-sm text-emerald-800 leading-relaxed">{success}</p>
          </div>
        )}

        <Card>
          <CardContent>
            <SectionTitle
              title={isFr ? 'Photo' : 'Photo'}
              hint={isFr ? 'Facultatif' : 'Optional'}
            />

            <div className="flex items-start gap-6">
              <div
                className="relative shrink-0 cursor-pointer group"
                onClick={() => photoInputRef.current?.click()}
              >
                <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-emerald-400 group-hover:bg-emerald-50/40">
                  {photoUrl ? (
                    <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-7 h-7 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  )}
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 group-hover:border-emerald-500 group-hover:text-emerald-600 transition-colors">
                  <Camera className="w-4 h-4" />
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  {isFr ? 'Photo de profil' : 'Profile photo'}
                </p>
                <p className="text-sm text-slate-500 leading-relaxed mb-4 max-w-xs">
                  {isFr
                    ? 'Aide les profs à vous reconnaître quand vous les contactez.'
                    : 'Helps teachers recognize you when you contact them.'}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {photoUrl
                      ? isFr ? 'Changer' : 'Change'
                      : isFr ? 'Ajouter' : 'Add'}
                  </button>

                  {photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={removingPhoto}
                      className="inline-flex items-center gap-2 px-3.5 h-9 rounded-lg text-xs font-medium text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 hover:border-red-200 transition-colors disabled:opacity-50"
                    >
                      {removingPhoto ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      {isFr ? 'Supprimer' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionTitle title={isFr ? 'Identité' : 'Identity'} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label={isFr ? 'Prénom' : 'First name'}>
                <Input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                />
              </Field>
              <Field label={isFr ? 'Nom' : 'Last name'}>
                <Input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              <Field label={isFr ? 'Téléphone' : 'Phone'}>
                <Input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+000 00 00 00 00"
                />
              </Field>
              <Field
                label={isFr ? 'Ville / Quartier' : 'City / Area'}
                hint={isFr ? 'Texte libre' : 'Free text'}
              >
                <Input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder={isFr ? 'Votre ville ou quartier' : 'Your city or area'}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionTitle
              title={isFr ? 'Présentation' : 'Presentation'}
              hint={`${(bio || '').length}/400`}
            />

            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={4}
              maxLength={400}
              placeholder={
                isFr
                  ? 'Ex : Parent de deux enfants, je cherche un prof de maths pour ma fille.'
                  : 'Ex: Parent of two, looking for a math tutor for my daughter.'
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none transition-all"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <SectionTitle
              title={isFr ? 'Mes enfants' : 'My children'}
              hint={
                children.length > 0
                  ? isFr
                    ? `${children.length} ajouté${children.length > 1 ? 's' : ''}`
                    : `${children.length} added`
                  : undefined
              }
            />

            <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-[60ch]">
              {isFr
                ? 'Ces informations aident les profs à comprendre vos besoins avant de vous répondre.'
                : 'This information helps teachers understand your needs before they reply.'}
            </p>

            {children.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
                <p className="text-sm text-slate-500 mb-4 leading-relaxed max-w-md mx-auto">
                  {isFr
                    ? 'Ajoutez vos enfants pour aider les profs à comprendre vos besoins.'
                    : 'Add your children to help teachers understand your needs.'}
                </p>
                <PrimaryButton type="button" onClick={openAddChild}>
                  <Plus className="w-4 h-4" />
                  {isFr ? 'Ajouter un enfant' : 'Add a child'}
                </PrimaryButton>
              </div>
            ) : (
              <div className="space-y-3">
                {children.map((child, index) => (
                  <ChildListItem
                    key={index}
                    child={child}
                    index={index}
                    levels={levels}
                    isFr={isFr}
                    onEdit={() => openEditChild(index)}
                    onRemove={() => removeChild(index)}
                  />
                ))}

                <button
                  type="button"
                  onClick={openAddChild}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl border-2 border-dashed border-slate-300 text-slate-600 text-sm font-medium hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/40 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  {isFr ? 'Ajouter un autre enfant' : 'Add another child'}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            {isFr ? 'Annuler' : 'Cancel'}
          </button>
          <PrimaryButton onClick={handleSave} disabled={saving} className="px-6">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isFr ? 'Enregistrer les modifications' : 'Save changes'}
          </PrimaryButton>
        </div>
      </div>

      {modalOpen && (
        <ChildModal
          draft={draft}
          draftError={draftError}
          editingIndex={editingIndex}
          levels={levels}
          isFr={isFr}
          onChange={updateDraft}
          onConfirm={validateDraftAndConfirm}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}

/* ═══════════ SOUS-COMPOSANTS ═══════════ */

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-5">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {hint && <span className="text-sm text-slate-400 font-medium">{hint}</span>}
    </div>
  );
}

function Field({
  label, hint, error, children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint && !error && <span className="text-xs text-slate-400">{hint}</span>}
        {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
      </div>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
    />
  );
}

function ChildListItem({
  child,
  index,
  levels,
  isFr,
  onEdit,
  onRemove,
}: {
  child: Child;
  index: number;
  levels: Level[];
  isFr: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const age = calcAge(child.birth_date);
  const level = levelLabel(child, levels, isFr);

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-200 hover:shadow-sm transition-all">
      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
        <span className="text-emerald-700 text-base font-bold">
          {child.first_name.charAt(0).toUpperCase() || '?'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <p className="font-semibold text-slate-900 truncate">
            {child.first_name || (isFr ? 'Enfant' : 'Child')}
          </p>
          {age !== null && (
            <span className="text-xs text-slate-400 shrink-0">
              {age} {isFr ? 'ans' : 'yrs'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {level && (
            <span className="inline-flex items-center gap-1">
              <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
              {level}
            </span>
          )}
          {child.school_name && (
            <span className="inline-flex items-center gap-1 truncate">
              <School className="w-3 h-3" />
              {child.school_name}
            </span>
          )}
          {child.preferred_schedule && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {child.preferred_schedule}
            </span>
          )}
        </div>

        {child.notes && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic">
            "{child.notes}"
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          aria-label="Modifier"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          aria-label="Supprimer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const items = value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  function removeItem(indexToRemove: number) {
    const next = items.filter((_, i) => i !== indexToRemove);
    onChange(next.join(', '));
  }

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
      />

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {items.map((item, i) => (
            <button
              key={`${item}-${i}`}
              type="button"
              onClick={() => removeItem(i)}
              className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-medium hover:bg-emerald-100 transition-colors"
            >
              <span>{item}</span>
              <X className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChildModal({
  draft,
  draftError,
  editingIndex,
  levels,
  isFr,
  onChange,
  onConfirm,
  onCancel,
}: {
  draft: Child;
  draftError: string;
  editingIndex: number | null;
  levels: Level[];
  isFr: boolean;
  onChange: (patch: Partial<Child>) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [showCustomLevel, setShowCustomLevel] = useState(false);
  const [customLevelText, setCustomLevelText] = useState('');

  const malian = levels.filter(l => l.system === 'malian');
  const french = levels.filter(l => l.system === 'french');
  const universal = levels.filter(l => l.system === 'universal');

  const selectValue = draft.level_custom ? 'custom' : draft.level_id || '';

  const age = calcAge(draft.birth_date);
  const ageError =
    draft.birth_date && age !== null
      ? age < MIN_AGE
        ? isFr
          ? `Trop jeune (min ${MIN_AGE} ans)`
          : `Too young (min ${MIN_AGE} yrs)`
        : age > MAX_AGE
        ? isFr
          ? `Trop âgé (max ${MAX_AGE} ans)`
          : `Too old (max ${MAX_AGE} yrs)`
        : undefined
      : undefined;

  function handleSelectChange(v: string) {
    if (v === 'custom') {
      setShowCustomLevel(true);
      onChange({ level_id: null, level_custom: '' });
    } else {
      setShowCustomLevel(false);
      onChange({ level_id: v || null, level_custom: null });
    }
  }

  function handleCustomValidate() {
    const text = customLevelText.trim();
    if (!text) return;
    onChange({ level_id: null, level_custom: text });
    setShowCustomLevel(false);
  }

  const isEditing = editingIndex !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      <div className="relative w-full sm:max-w-lg sm:mx-4 bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-base font-semibold text-slate-900">
            {isEditing
              ? isFr
                ? `Modifier l'enfant ${editingIndex + 1}`
                : `Edit child ${editingIndex + 1}`
              : isFr
              ? 'Ajouter un enfant'
              : 'Add a child'}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {draftError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="flex-1 text-sm text-red-800 leading-relaxed">
                {draftError}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={isFr ? 'Prénom *' : 'First name *'}>
              <Input
                type="text"
                autoFocus
                value={draft.first_name}
                onChange={e => onChange({ first_name: e.target.value })}
                placeholder={isFr ? 'Prénom de l\'enfant' : 'Child\'s first name'}
              />
            </Field>
            <Field
              label={isFr ? 'Date de naissance' : 'Birth date'}
              hint={
                age !== null && !ageError
                  ? isFr
                    ? `${age} ans`
                    : `${age} yrs`
                  : isFr
                  ? `${MIN_AGE}-${MAX_AGE} ans`
                  : `${MIN_AGE}-${MAX_AGE} yrs`
              }
              error={ageError}
            >
              <input
                type="date"
                value={draft.birth_date}
                min={minBirthDateISO()}
                max={maxBirthDateISO()}
                onChange={e => onChange({ birth_date: e.target.value })}
                className={`w-full h-11 rounded-xl border bg-white px-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 transition-all ${
                  ageError
                    ? 'border-red-400 focus:border-red-600 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20'
                }`}
              />
            </Field>
          </div>

          <Field label={isFr ? 'Niveau scolaire' : 'School level'}>
            {!showCustomLevel ? (
              <div className="relative">
                <select
                  value={selectValue}
                  onChange={e => handleSelectChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm text-slate-900 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 appearance-none cursor-pointer transition-all"
                >
                  <option value="">{isFr ? 'Sélectionner…' : 'Select…'}</option>

                  {malian.length > 0 && (
                    <optgroup label={isFr ? 'Système local' : 'Local system'}>
                      {malian.map(level => (
                        <option key={level.id} value={`${REF_PREFIX}${level.id}`}>
                          {isFr ? level.name_fr : level.name_en}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {french.length > 0 && (
                    <optgroup label={isFr ? 'Système francophone' : 'Francophone system'}>
                      {french.map(level => (
                        <option key={level.id} value={`${REF_PREFIX}${level.id}`}>
                          {isFr ? level.name_fr : level.name_en}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {universal.length > 0 && (
                    <optgroup label={isFr ? 'Autres' : 'Other'}>
                      {universal.map(level => (
                        <option key={level.id} value={`${REF_PREFIX}${level.id}`}>
                          {isFr ? level.name_fr : level.name_en}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  <option value="custom">
                    {isFr ? '+ Autre (personnalisé)' : '+ Other (custom)'}
                  </option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={customLevelText}
                  onChange={e => setCustomLevelText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCustomValidate();
                    }
                    if (e.key === 'Escape') {
                      setShowCustomLevel(false);
                      setCustomLevelText('');
                      onChange({ level_id: null, level_custom: null });
                    }
                  }}
                  placeholder={
                    isFr ? 'Saisir un niveau…' : 'Enter a level…'
                  }
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
                <PrimaryButton
                  type="button"
                  onClick={handleCustomValidate}
                  disabled={!customLevelText.trim()}
                >
                  OK
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomLevel(false);
                    setCustomLevelText('');
                    onChange({ level_id: null, level_custom: null });
                  }}
                  className="w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:border-slate-400 flex items-center justify-center transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </Field>

          {draft.level_custom && !showCustomLevel && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ level_id: null, level_custom: null })}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-xs text-emerald-700 font-medium hover:bg-emerald-100 transition-colors"
              >
                <span>{draft.level_custom}</span>
                <X className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={isFr ? 'École' : 'School'}>
              <Input
                type="text"
                value={draft.school_name}
                onChange={e => onChange({ school_name: e.target.value })}
                placeholder={isFr ? "Nom de l'école" : 'School name'}
              />
            </Field>
            <Field
              label={isFr ? 'Horaire souhaité' : 'Preferred schedule'}
              hint={isFr ? 'Séparés par virgules' : 'Comma separated'}
            >
              <TagsInput
                value={draft.preferred_schedule}
                onChange={v => onChange({ preferred_schedule: v })}
                placeholder={
                  isFr
                    ? 'Ex : Jeudi matin, Vendredi soir'
                    : 'Ex: Thursday morning, Friday evening'
                }
              />
            </Field>
          </div>

          <Field
            label={isFr ? 'Notes' : 'Notes'}
            hint={`${(draft.notes || '').length}/200`}
          >
            <textarea
              value={draft.notes}
              onChange={e => onChange({ notes: e.target.value })}
              rows={3}
              maxLength={200}
              placeholder={
                isFr
                  ? 'Ex : A des difficultés en géométrie'
                  : 'Ex: Struggles with geometry'
              }
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none transition-all"
            />
          </Field>
        </div>

        <div className="border-t border-slate-200 p-4 sm:p-5 flex items-center justify-end gap-3 shrink-0 bg-white rounded-b-3xl sm:rounded-b-2xl">
          <OutlineButton type="button" onClick={onCancel}>
            {isFr ? 'Annuler' : 'Cancel'}
          </OutlineButton>
          <PrimaryButton type="button" onClick={onConfirm}>
            <CheckCircle2 className="w-4 h-4" />
            {isEditing
              ? isFr
                ? 'Enregistrer'
                : 'Save'
              : isFr
              ? 'Ajouter'
              : 'Add'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}