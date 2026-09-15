'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Camera, Save, Loader2, User as UserIcon,
  X, Check, AlertCircle, CheckCircle2, Image as ImageIcon,
  ChevronDown, Plus, Phone, Mail, MessageCircle, Trash2,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { toXOF, fromXOF } from '@/lib/currency';
import {
  TEACHING_MODES,
  MAX_SUBJECTS_PER_TEACHER,
  RATE_PERIODS,
  type RatePeriod,
} from '@/lib/constants';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';
import AvailabilityPicker, {
  type Availability,
} from '@/app/components/AvailabilityPicker';

// ⏱ Au bout de ce délai, on n'attend plus authLoading
const AUTH_FORM_TIMEOUT_MS = 800;

// ============================================================
// TYPES
// ============================================================
interface Subject {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
  category: string;
}
interface Level {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string;
  category: string;
}
interface City {
  id: string;
  name: string;
}

const REF_PREFIX = 'ref:';
const CUSTOM_PREFIX = 'custom:';

// ============================================================
// SKELETON
// ============================================================
function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

function ProfileEditSkeleton() {
  return (
    <>
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <SkeletonLine className="h-4 w-20 shrink-0" />
          <div className="flex items-center gap-4">
            <SkeletonLine className="hidden lg:block h-4 w-32" />
            <SkeletonLine className="h-8 w-12 rounded-lg" />
          </div>
          <SkeletonLine className="h-11 w-32 rounded-xl shrink-0" />
        </div>
        <div className="h-1 bg-slate-100" />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <SkeletonLine className="h-5 w-24 mb-6" />
          <SkeletonLine className="w-full aspect-[3/1] rounded-xl mb-6" />
          <div className="flex items-center gap-6">
            <SkeletonLine className="w-24 h-24 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-3 w-64 max-w-full" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <SkeletonLine className="h-5 w-24 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[0, 1].map(i => (
              <div key={i} className="space-y-2">
                <SkeletonLine className="h-4 w-20" />
                <SkeletonLine className="h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <SkeletonLine className="h-5 w-32 mb-6" />
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-20" />
            <SkeletonLine className="h-11 w-full max-w-md rounded-xl" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <SkeletonLine className="h-5 w-40 mb-6" />
          <div className="space-y-5">
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-16" />
              <SkeletonLine className="h-11 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-12" />
              <SkeletonLine className="h-32 w-full rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[0, 1].map(i => (
                <div key={i} className="space-y-2">
                  <SkeletonLine className="h-4 w-24" />
                  <SkeletonLine className="h-11 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <SkeletonLine className="h-5 w-28 mb-6" />
          <div className="space-y-5">
            {[0, 1, 2].map(i => (
              <div key={i} className="space-y-2">
                <SkeletonLine className="h-4 w-24" />
                <SkeletonLine className="h-11 w-full max-w-md rounded-xl" />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <SkeletonLine className="h-5 w-32 mb-6" />
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
              {[0, 1, 2, 3].map(i => (
                <SkeletonLine key={i} className="h-11 w-full rounded-xl" />
              ))}
            </div>
            <div className="space-y-2">
              <SkeletonLine className="h-4 w-20" />
              <SkeletonLine className="h-11 w-40 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function TeacherProfileEditPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isFr = language === 'fr';

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [rateAmount, setRateAmount] = useState('');
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>('hourly');
  const [teachingMode, setTeachingMode] = useState<'online' | 'home' | 'both'>('both');
  const [freeTrial, setFreeTrial] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [availability, setAvailability] = useState<Availability>({});
  const [cityId, setCityId] = useState('');
  const [diploma, setDiploma] = useState('');
  const [university, setUniversity] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [languagesText, setLanguagesText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNote, setContactNote] = useState('');

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const [removingCover, setRemovingCover] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // ⏱ Timeout local : on n'attend pas authLoading indéfiniment
  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const currentPeriod =
    RATE_PERIODS.find(p => p.value === ratePeriod) || RATE_PERIODS[0];
  const rateSuffix = isFr ? currentPeriod.suffixFr : currentPeriod.suffixEn;

  // ============================================================
  // LOAD
  // ============================================================
  useEffect(() => {
    // Attendre soit que l'auth se résolve, soit le timeout
    if (authLoading && !authTimeoutExpired) return;

    if (!user?.id) {
      // Auth terminée (ou timeout) et pas d'user → login
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
      const [subjectsRes, levelsRes, citiesRes] = await Promise.all([
        supabase.from('subjects').select('*').order('order_index'),
        supabase.from('levels').select('*').order('order_index'),
        supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
      ]);
      setSubjects(subjectsRes.data || []);
      setLevels(levelsRes.data || []);
      setCities(citiesRes.data || []);

      const { data: profile } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (profile) {
        setHeadline(profile.headline || '');
        setBio(profile.bio || '');
        setExperienceYears(profile.experience_years || 0);
        setRateAmount(profile.hourly_rate ? fromXOF(profile.hourly_rate, 'XOF') : '');
        setRatePeriod((profile.rate_period as RatePeriod) || 'hourly');
        setTeachingMode((profile.teaching_mode as any) || 'both');
        setFreeTrial(profile.free_trial ?? false);
        setIsAvailable(profile.is_available ?? true);
        setAvailability((profile.availability as Availability) || {});
        setCityId(profile.city_id || '');
        setPhotoUrl(profile.profile_photo_url || '');
        setCoverUrl(profile.cover_url || '');
        setDiploma(profile.diploma || '');
        setUniversity(profile.university || '');

        setContactPhone(profile.contact_phone || '');
        setContactWhatsapp(profile.contact_whatsapp || '');
        setContactEmail(profile.contact_email || '');
        setContactNote(profile.contact_note || '');

        const langs = profile.languages;
        if (Array.isArray(langs)) {
          setLanguagesText(langs.join(', '));
        } else if (typeof langs === 'string') {
          setLanguagesText(langs);
        } else {
          setLanguagesText('');
        }
      }

      const [tsRes, tlRes] = await Promise.all([
        supabase.from('teacher_subjects').select('subject_id, custom_name').eq('teacher_id', user!.id),
        supabase.from('teacher_levels').select('level_id, custom_name').eq('teacher_id', user!.id),
      ]);

      setSelectedSubjects(
        (tsRes.data || []).map(t =>
          t.subject_id ? `${REF_PREFIX}${t.subject_id}` : `${CUSTOM_PREFIX}${t.custom_name}`
        )
      );
      setSelectedLevels(
        (tlRes.data || []).map(l =>
          l.level_id ? `${REF_PREFIX}${l.level_id}` : `${CUSTOM_PREFIX}${l.custom_name}`
        )
      );

      const meta = user!.user_metadata || {};
      setFirstName((meta.first_name as string) || '');
      setLastName((meta.last_name as string) || '');
    } catch (err) {
      console.error('[TeacherProfile] load error', err);
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
      const fileName = `${user!.id}/profile-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('teacher-covers')
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type,
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('teacher-covers').getPublicUrl(fileName);
      setPhotoUrl(data.publicUrl);
      await supabase
        .from('teacher_profiles')
        .update({ profile_photo_url: data.publicUrl })
        .eq('id', user!.id);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(isFr ? `Erreur upload photo : ${err?.message || ''}` : `Photo upload error: ${err?.message || ''}`);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

  async function handleRemovePhoto() {
    if (!photoUrl) return;
    if (!confirm(isFr ? 'Supprimer votre photo de profil ?' : 'Remove your profile photo?')) return;

    setRemovingPhoto(true);
    setError('');
    try {
      const storagePath = photoUrl.split('/teacher-covers/').pop() || '';
      if (storagePath) {
        await supabase.storage.from('teacher-covers').remove([storagePath]);
      }
      const { error: upErr } = await supabase
        .from('teacher_profiles')
        .update({ profile_photo_url: null })
        .eq('id', user!.id);
      if (upErr) throw upErr;
      setPhotoUrl('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('[TeacherProfile] remove photo error', err);
      setError(isFr ? `Erreur suppression : ${err?.message || ''}` : `Remove error: ${err?.message || ''}`);
    } finally {
      setRemovingPhoto(false);
    }
  }

  // ============================================================
  // UPLOAD COVER
  // ============================================================
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
    setUploadingCover(true);
    setError('');
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user!.id}/cover-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('teacher-covers')
        .upload(fileName, file, {
          upsert: true,
          cacheControl: '3600',
          contentType: file.type,
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('teacher-covers').getPublicUrl(fileName);
      setCoverUrl(data.publicUrl);
      await supabase
        .from('teacher_profiles')
        .update({ cover_url: data.publicUrl })
        .eq('id', user!.id);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(isFr ? `Erreur upload couverture : ${err?.message || ''}` : `Cover upload error: ${err?.message || ''}`);
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  }

  async function handleRemoveCover() {
    if (!coverUrl) return;
    if (!confirm(isFr ? 'Supprimer votre couverture ?' : 'Remove your cover?')) return;

    setRemovingCover(true);
    setError('');
    try {
      const storagePath = coverUrl.split('/teacher-covers/').pop() || '';
      if (storagePath) {
        await supabase.storage.from('teacher-covers').remove([storagePath]);
      }
      const { error: upErr } = await supabase
        .from('teacher_profiles')
        .update({ cover_url: null })
        .eq('id', user!.id);
      if (upErr) throw upErr;
      setCoverUrl('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('[TeacherProfile] remove cover error', err);
      setError(isFr ? `Erreur suppression : ${err?.message || ''}` : `Remove error: ${err?.message || ''}`);
    } finally {
      setRemovingCover(false);
    }
  }

  // ============================================================
  // TOGGLES
  // ============================================================
  function toggleSubject(key: string) {
    setSelectedSubjects(prev => {
      if (prev.includes(key)) return prev.filter(s => s !== key);
      const refCount = prev.filter(s => s.startsWith(REF_PREFIX)).length;
      if (key.startsWith(REF_PREFIX) && refCount >= MAX_SUBJECTS_PER_TEACHER) {
        return prev;
      }
      return [...prev, key];
    });
  }

  function toggleLevel(key: string) {
    setSelectedLevels(prev =>
      prev.includes(key) ? prev.filter(l => l !== key) : [...prev, key]
    );
  }

  // ============================================================
  // SAVE
  // ============================================================
  async function handleSave() {
    setError('');
    setSuccess(false);

    if (!headline.trim()) {
      setError(isFr ? 'Le titre est obligatoire' : 'Headline is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!cityId) {
      setError(isFr ? 'La ville est obligatoire' : 'City is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!rateAmount || parseInt(rateAmount) <= 0) {
      setError(isFr ? 'Le tarif est obligatoire' : 'Rate is required');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (selectedSubjects.length === 0) {
      setError(isFr ? 'Sélectionnez au moins une matière' : 'Select at least one subject');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (selectedLevels.length === 0) {
      setError(isFr ? 'Sélectionnez au moins un niveau' : 'Select at least one level');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!contactPhone.trim() && !contactWhatsapp.trim() && !contactEmail.trim()) {
      setError(
        isFr
          ? 'Ajoutez au moins un moyen de contact (téléphone, WhatsApp ou email)'
          : 'Add at least one contact method (phone, WhatsApp or email)'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const rateXOF = toXOF(rateAmount, 'XOF') || parseInt(rateAmount);
      const languagesArray = languagesText
        .split(',')
        .map(l => l.trim())
        .filter(Boolean);

      const { error: profErr } = await supabase.from('teacher_profiles').upsert(
        {
          id: user!.id,
          headline: headline.trim(),
          bio: bio.trim() || null,
          experience_years: experienceYears,
          hourly_rate: rateXOF,
          rate_period: ratePeriod,
          teaching_mode: teachingMode,
          free_trial: freeTrial,
          is_available: isAvailable,
          availability: availability,
          city_id: cityId,
          profile_photo_url: photoUrl || null,
          cover_url: coverUrl || null,
          diploma: diploma.trim() || null,
          university: university.trim() || null,
          languages: languagesArray,
          contact_phone: contactPhone.trim() || null,
          contact_whatsapp: contactWhatsapp.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_note: contactNote.trim() || null,
        },
        { onConflict: 'id' }
      );
      if (profErr) throw profErr;

      await supabase.from('teacher_subjects').delete().eq('teacher_id', user!.id);
      if (selectedSubjects.length > 0) {
        const rows = selectedSubjects.map(key => {
          if (key.startsWith(REF_PREFIX)) {
            return { teacher_id: user!.id, subject_id: key.slice(REF_PREFIX.length), custom_name: null };
          }
          return { teacher_id: user!.id, subject_id: null, custom_name: key.slice(CUSTOM_PREFIX.length) };
        });
        const { error: insErr } = await supabase.from('teacher_subjects').insert(rows);
        if (insErr) throw insErr;
      }

      await supabase.from('teacher_levels').delete().eq('teacher_id', user!.id);
      if (selectedLevels.length > 0) {
        const rows = selectedLevels.map(key => {
          if (key.startsWith(REF_PREFIX)) {
            return { teacher_id: user!.id, level_id: key.slice(REF_PREFIX.length), custom_name: null };
          }
          return { teacher_id: user!.id, level_id: null, custom_name: key.slice(CUSTOM_PREFIX.length) };
        });
        const { error: insErr } = await supabase.from('teacher_levels').insert(rows);
        if (insErr) throw insErr;
      }

      await supabase.auth.updateUser({
        data: { first_name: firstName, last_name: lastName },
      });
      await supabase
        .from('users')
        .update({ first_name: firstName, last_name: lastName })
        .eq('id', user!.id);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('[TeacherProfile] save error', err);
      setError(err?.message || (isFr ? 'Erreur lors de la sauvegarde' : 'Save error'));
    } finally {
      setSaving(false);
    }
  }

  // ✅ FIX : on n'attend plus authLoading (qui peut être bloqué)
  if (loading && !hasLoadedOnce) {
    return <ProfileEditSkeleton />;
  }
  if (!user) return null;

  const profileCompletion = (() => {
    let s = 0;
    if (headline) s += 12;
    if (bio) s += 8;
    if (rateAmount) s += 12;
    if (cityId) s += 12;
    if (selectedSubjects.length > 0) s += 12;
    if (selectedLevels.length > 0) s += 12;
    if (photoUrl) s += 8;
    if (diploma) s += 4;
    if (contactPhone || contactWhatsapp || contactEmail) s += 20;
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

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-wait shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isFr ? 'Enregistrer' : 'Save'}
          </button>
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
            <p className="flex-1 text-sm text-emerald-800 leading-relaxed">
              {isFr ? 'Profil enregistré' : 'Profile saved'}
            </p>
          </div>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle
            tag={isFr ? 'Photos' : 'Photos'}
            hint={isFr ? 'Recommandé' : 'Recommended'}
          />

          <div className="relative aspect-[3/1] rounded-xl bg-slate-100 overflow-hidden border-2 border-dashed border-slate-200 group">
            {coverUrl ? (
              <>
                <img
                  src={coverUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium bg-white/95 backdrop-blur-sm text-slate-700 border border-white/40 shadow-sm hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isFr ? 'Changer' : 'Change'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    disabled={removingCover}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium bg-white/95 backdrop-blur-sm text-red-600 border border-red-100 shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {removingCover ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">{isFr ? 'Supprimer' : 'Remove'}</span>
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="w-full h-full flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50"
              >
                <ImageIcon className="w-6 h-6 mb-2" />
                <p className="text-sm">
                  {isFr ? 'Ajouter une couverture' : 'Add a cover'}
                </p>
              </button>
            )}

            {uploadingCover && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
          </div>

          <div className="flex items-start gap-5 mt-6">
            <div className="relative shrink-0">
              <div
                className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden cursor-pointer group/photo hover:border-blue-400 hover:bg-blue-50/40 transition-all"
                onClick={() => photoInputRef.current?.click()}
              >
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-7 h-7 text-slate-300 group-hover/photo:text-blue-500 transition-colors" />
                )}
              </div>
              <div
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-600 cursor-pointer hover:border-blue-500 hover:text-blue-600 transition-colors"
                onClick={() => photoInputRef.current?.click()}
              >
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
                  ? 'Visible par les parents. Format carré recommandé.'
                  : 'Visible by parents. Square format recommended.'}
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
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
          />
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle tag={isFr ? 'Identité' : 'Identity'} />

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
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle
            tag={isFr ? 'Localisation *' : 'Location *'}
            hint={isFr ? 'Obligatoire' : 'Required'}
          />

          <Field label={isFr ? 'Ville *' : 'City *'}>
            <div className="relative max-w-md">
              <select
                value={cityId}
                onChange={e => setCityId(e.target.value)}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm text-slate-900 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer transition-all"
              >
                <option value="">
                  {isFr ? 'Sélectionner votre ville…' : 'Select your city…'}
                </option>
                {cities.map(city => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </Field>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle tag={isFr ? 'Profil professionnel' : 'Professional profile'} />

          <div className="space-y-5">
            <Field label={isFr ? 'Titre *' : 'Headline *'} hint={`${headline.length}/120`}>
              <Input
                type="text"
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder={
                  isFr
                    ? 'Ex : Prof de maths, spécialisé en préparation bac'
                    : 'Ex: Math tutor, exam prep specialist'
                }
                maxLength={120}
              />
            </Field>

            <Field label="Bio" hint={`${bio.length}/800`}>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={5}
                maxLength={800}
                placeholder={
                  isFr
                    ? 'Décrivez votre parcours, votre méthode, ce qui vous distingue.'
                    : 'Describe your background and method.'
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label={isFr ? "Années d'expérience" : 'Years of experience'}>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={experienceYears}
                  onChange={e => setExperienceYears(parseInt(e.target.value) || 0)}
                />
              </Field>
              <Field label={isFr ? 'Diplôme' : 'Diploma'}>
                <Input
                  type="text"
                  value={diploma}
                  onChange={e => setDiploma(e.target.value)}
                  placeholder={isFr ? 'Ex : Master en Mathématiques' : 'Ex: Master in Mathematics'}
                />
              </Field>
            </div>

            <Field label={isFr ? 'Université / École' : 'University / School'}>
              <Input
                type="text"
                value={university}
                onChange={e => setUniversity(e.target.value)}
                placeholder={isFr ? 'Ex : Université de Bamako' : 'Ex: University of Bamako'}
              />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle
            tag={isFr ? 'Coordonnées *' : 'Contact *'}
            hint={isFr ? 'Au moins 1 obligatoire' : 'At least 1 required'}
          />

          <p className="text-sm text-slate-500 leading-relaxed mb-6 max-w-[60ch]">
            {isFr
              ? 'Ces informations apparaîtront sur votre profil public. Les parents vous contacteront directement par ces moyens.'
              : 'This information will appear on your public profile. Parents will contact you directly through these means.'}
          </p>

          <div className="space-y-5">
            <Field
              label={isFr ? 'Téléphone' : 'Phone'}
              hint={isFr ? 'Ex : +223 66 12 34 56' : 'Ex: +223 66 12 34 56'}
            >
              <div className="relative max-w-md group">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-blue-500" />
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+223 66 12 34 56"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </Field>

            <Field
              label="WhatsApp"
              hint={isFr ? 'Même numéro ou différent' : 'Same or different number'}
            >
              <div className="relative max-w-md group">
                <MessageCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-blue-500" />
                <input
                  type="tel"
                  value={contactWhatsapp}
                  onChange={e => setContactWhatsapp(e.target.value)}
                  placeholder="+223 66 12 34 56"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </Field>

            <Field label="Email">
              <div className="relative max-w-md group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none transition-colors group-focus-within:text-blue-500" />
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </Field>

            <Field
              label={isFr ? 'Note (optionnel)' : 'Note (optional)'}
              hint={`${contactNote.length}/200`}
            >
              <textarea
                value={contactNote}
                onChange={e => setContactNote(e.target.value)}
                rows={2}
                maxLength={200}
                placeholder={
                  isFr
                    ? "Ex : Merci de m'appeler après 18h, ou d'envoyer un message WhatsApp en journée."
                    : 'Ex: Please call after 6pm, or send a WhatsApp message during the day.'
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
              />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle tag={isFr ? 'Tarif & modalité' : 'Rate & mode'} />

          <div className="space-y-6">
            <Field label={isFr ? 'Période de tarif *' : 'Rate period *'}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl">
                {RATE_PERIODS.map(period => {
                  const active = ratePeriod === period.value;
                  return (
                    <button
                      key={period.value}
                      type="button"
                      onClick={() => setRatePeriod(period.value as RatePeriod)}
                      className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      {isFr ? period.labelFr : period.labelEn}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={isFr ? 'Montant *' : 'Amount *'}>
              <div className="relative max-w-xs">
                <input
                  type="number"
                  value={rateAmount}
                  onChange={e => setRateAmount(e.target.value)}
                  placeholder="5000"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white pl-4 pr-32 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                  {rateSuffix}
                </span>
              </div>
            </Field>

            <label className="flex items-start gap-3 cursor-pointer max-w-md">
              <input
                type="checkbox"
                checked={freeTrial}
                onChange={e => setFreeTrial(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {isFr ? 'Proposer un premier cours gratuit' : 'Offer a free first lesson'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isFr ? 'Attire plus de parents — recommandé' : 'Attracts more parents'}
                </p>
              </div>
            </label>

            <Field label={isFr ? 'Disponibilité *' : 'Availability *'}>
              <div className="grid grid-cols-2 gap-2 max-w-md">
                <button
                  type="button"
                  onClick={() => setIsAvailable(true)}
                  className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                    isAvailable
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'
                  }`}
                >
                  {isFr ? 'Disponible' : 'Available'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvailable(false)}
                  className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                    !isAvailable
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {isFr ? 'Indisponible' : 'Unavailable'}
                </button>
              </div>
            </Field>

            <Field label={isFr ? "Mode d'enseignement *" : 'Teaching mode *'}>
              <div className="grid grid-cols-3 gap-2 max-w-md">
                {TEACHING_MODES.map(mode => {
                  const active = teachingMode === mode.value;
                  return (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => setTeachingMode(mode.value as any)}
                      className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      {isFr ? mode.labelFr : mode.labelEn}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle
            tag={isFr ? 'Mes disponibilités' : 'My availability'}
            hint={
              isAvailable
                ? isFr
                  ? 'Cochez vos créneaux habituels'
                  : 'Check your usual slots'
                : isFr
                ? 'Vous êtes marqué indisponible'
                : 'You are marked unavailable'
            }
          />

          <div className={isAvailable ? '' : 'opacity-50 pointer-events-none select-none'}>
            <AvailabilityPicker
              value={availability}
              onChange={setAvailability}
              isFr={isFr}
            />
            <p className="text-sm text-slate-500 mt-4 leading-relaxed max-w-[60ch]">
              {isFr
                ? 'Ces horaires sont indicatifs. Vous pourrez les ajuster avec chaque parent selon vos cours.'
                : 'These times are indicative. You can adjust them with each parent depending on your lessons.'}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle tag={isFr ? 'Matières enseignées *' : 'Subjects taught *'} />
          <MultiSelect
            label={isFr ? 'Sélectionnez vos matières' : 'Select your subjects'}
            placeholder={isFr ? 'Choisir des matières…' : 'Choose subjects…'}
            options={subjects}
            selected={selectedSubjects}
            onToggle={toggleSubject}
            max={MAX_SUBJECTS_PER_TEACHER}
            isFr={isFr}
            customLabel={isFr ? 'Ajouter une autre matière' : 'Add another subject'}
            customPlaceholder={
              isFr ? 'Ex : Coran, Couture, Bambara…' : 'Ex: Quran, Sewing, Bambara…'
            }
            accent="blue"
          />
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle tag={isFr ? 'Niveaux enseignés *' : 'Levels taught *'} />
          <MultiSelect
            label={isFr ? 'Sélectionnez vos niveaux' : 'Select your levels'}
            placeholder={isFr ? 'Choisir des niveaux…' : 'Choose levels…'}
            options={levels}
            selected={selectedLevels}
            onToggle={toggleLevel}
            isFr={isFr}
            customLabel={isFr ? 'Ajouter un autre niveau' : 'Add another level'}
            customPlaceholder={
              isFr
                ? 'Ex : 3ème année primaire, Classe préparatoire…'
                : 'Ex: Primary 3rd year…'
            }
            accent="blue"
          />
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-sm">
          <SectionTitle tag={isFr ? "Langues d'enseignement" : 'Teaching languages'} />

          <Field
            label={isFr ? 'Langues' : 'Languages'}
            hint={isFr ? 'Séparées par des virgules' : 'Separated by commas'}
          >
            <Input
              type="text"
              value={languagesText}
              onChange={e => setLanguagesText(e.target.value)}
              placeholder={
                isFr
                  ? 'Ex : Français, Anglais, Bambara'
                  : 'Ex: French, English, Bambara'
              }
            />
          </Field>

          {languagesText.trim() && (
            <div className="flex flex-wrap gap-2 mt-4">
              {languagesText
                .split(',')
                .map(l => l.trim())
                .filter(Boolean)
                .map((lang, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs text-blue-700 font-medium"
                  >
                    {lang}
                  </span>
                ))}
            </div>
          )}
        </section>

        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            {isFr ? 'Annuler' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isFr ? 'Enregistrer les modifications' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════

function SectionTitle({ tag, hint }: { tag: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-5">
      <h2 className="text-lg font-semibold text-slate-900">{tag}</h2>
      {hint && <span className="text-sm text-slate-400 font-medium">{hint}</span>}
    </div>
  );
}

function Field({
  label, hint, children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
    />
  );
}

function MultiSelect({
  label, placeholder, options, selected, onToggle, max, isFr,
  customLabel, customPlaceholder, accent = 'blue',
}: {
  label: string;
  placeholder: string;
  options: { id: string; name_fr: string; name_en: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  max?: number;
  isFr: boolean;
  customLabel: string;
  customPlaceholder: string;
  accent?: 'blue' | 'emerald';
}) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCustom(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectedRefs = selected.filter(s => s.startsWith(REF_PREFIX));
  const selectedCustoms = selected.filter(s => s.startsWith(CUSTOM_PREFIX));
  const refCount = selectedRefs.length;
  const refIds = selectedRefs.map(s => s.slice(REF_PREFIX.length));
  const selectedRefOptions = options.filter(o => refIds.includes(o.id));

  function handleAddCustom() {
    const text = customText.trim();
    if (!text) return;
    const key = `${CUSTOM_PREFIX}${text}`;
    if (!selected.includes(key)) onToggle(key);
    setCustomText('');
    setShowCustom(false);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        {max !== undefined && (
          <span className="text-xs text-slate-400">{refCount}/{max}</span>
        )}
      </div>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-left flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors"
        >
          <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-900 font-medium'}>
            {selected.length === 0
              ? placeholder
              : isFr
              ? `${selected.length} sélectionné${selected.length > 1 ? 's' : ''}`
              : `${selected.length} selected`}
          </span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-xl bg-white border border-slate-200 max-h-80 overflow-y-auto shadow-lg">
            {options.map(option => {
              const key = `${REF_PREFIX}${option.id}`;
              const isSelected = selected.includes(key);
              const isDisabled = !isSelected && max !== undefined && refCount >= max;
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onToggle(key)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-left border-b border-slate-100 last:border-b-0 transition-colors ${
                    isDisabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : isSelected
                      ? 'bg-slate-50 text-slate-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{isFr ? option.name_fr : option.name_en}</span>
                </button>
              );
            })}

            {!showCustom && (
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-left border-t-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <Plus className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-medium text-slate-900">{customLabel}</span>
              </button>
            )}

            {showCustom && (
              <div className="p-3 border-t-2 border-slate-200 bg-slate-50 flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustom();
                    }
                    if (e.key === 'Escape') {
                      setShowCustom(false);
                      setCustomText('');
                    }
                  }}
                  placeholder={customPlaceholder}
                  className="flex-1 h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!customText.trim()}
                  className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isFr ? 'Ajouter' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false);
                    setCustomText('');
                  }}
                  className="h-10 w-10 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-400 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {(selectedRefOptions.length > 0 || selectedCustoms.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedRefOptions.map(option => {
            const key = `${REF_PREFIX}${option.id}`;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onToggle(key)}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs text-blue-700 font-medium hover:bg-blue-100 transition-colors"
              >
                <span>{isFr ? option.name_fr : option.name_en}</span>
                <X className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}

          {selectedCustoms.map(key => {
            const text = key.slice(CUSTOM_PREFIX.length);
            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggle(key)}
                className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 border border-blue-600 text-xs text-white font-medium hover:bg-blue-700 transition-colors"
              >
                <span>{text}</span>
                <X className="w-3 h-3 text-white/70 group-hover:text-white transition-colors" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}