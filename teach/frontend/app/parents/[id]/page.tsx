'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Baby, GraduationCap,
  CheckCircle2, Pencil, Calendar, User as UserIcon, Clock, Eye, StickyNote,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';

// ⏱ Au bout de ce délai, on n'attend plus authLoading
const AUTH_FORM_TIMEOUT_MS = 800;

// ============================================================
// TYPES
// ============================================================
interface PublicChild {
  id: string;
  first_name: string;
  birth_date: string | null;
  level_name: string | null;
  preferred_schedule: string | null;
  notes: string | null;
}

interface PublicParentProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  member_since: string | null;
  children: PublicChild[];
}

// ============================================================
// HELPERS
// ============================================================
function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatMonthYear(iso: string | null, isFr: boolean): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function initialsFromNames(first: string | null, last: string | null, fallback: string): string {
  const f = (first || '').trim();
  const l = (last || '').trim();
  const fromNames = ((f[0] ?? '') + (l[0] ?? '')).toUpperCase();
  if (fromNames) return fromNames;
  return fallback.slice(0, 2).toUpperCase() || '?';
}

// ============================================================
// PRIMITIVES
// ============================================================
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
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

function ParentProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
      <SkeletonLine className="h-4 w-32 mb-5" />
      <Card>
        <SkeletonLine className="w-full aspect-[3/1] rounded-none" />
        <div className="px-5 sm:px-6 lg:px-8 pb-6">
          <div className="-mt-14 relative z-10">
            <div className="w-24 h-24 rounded-2xl border-4 border-white bg-slate-100 animate-pulse shadow-md" />
          </div>
          <div className="mt-5 space-y-2">
            <SkeletonLine className="h-7 w-56" />
            <div className="flex gap-2">
              <SkeletonLine className="h-6 w-24 rounded-full" />
              <SkeletonLine className="h-6 w-32 rounded-full" />
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 px-2 py-3 flex gap-2">
          <SkeletonLine className="h-8 w-24 rounded-lg" />
          <SkeletonLine className="h-8 w-28 rounded-lg" />
        </div>
        <div className="p-5 sm:p-6 lg:p-8 space-y-4">
          <SkeletonLine className="h-4 w-full" />
          <SkeletonLine className="h-4 w-5/6" />
          <SkeletonLine className="h-4 w-4/6" />
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ParentPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const parentId = params?.id as string;

  const [profile, setProfile] = useState<PublicParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'children'>('about');

  // ⏱ Timeout local : on n'attend pas authLoading indéfiniment
  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  // ✅ FIX : on ne bloque plus sur authLoading seul
  useEffect(() => {
    if (!parentId) return;
    if (authLoading && !authTimeoutExpired) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId, authLoading, authTimeoutExpired, user?.id]);

  async function load() {
    if (!hasLoadedOnce) setLoading(true);
    setNotFound(false);
    setForbidden(false);

    try {
      const { data, error } = await supabase.rpc('get_parent_public_profile', {
        p_parent_id: parentId,
      });

      if (error) {
        console.error('[ParentPublicProfile] RPC error', error);
        setNotFound(true);
        return;
      }

      if (!data || data.error === 'not_found') {
        setNotFound(true);
        return;
      }

      if (data.error === 'forbidden') {
        setForbidden(true);
        return;
      }

      setProfile({
        id: data.id,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        city: data.city || null,
        bio: data.bio || null,
        profile_photo_url: data.profile_photo_url || null,
        member_since: data.member_since || null,
        children: Array.isArray(data.children) ? data.children : [],
      });
    } catch (err) {
      console.error('[ParentPublicProfile] load', err);
      setNotFound(true);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  // ✅ FIX : on ne bloque plus sur authLoading
  if (loading && !hasLoadedOnce) {
    return <ParentProfileSkeleton />;
  }

  if (forbidden) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-5">
              <Eye className="w-7 h-7 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-3">
              {isFr ? 'Profil privé' : 'Private profile'}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              {isFr
                ? "Vous n'avez pas accès à ce profil. Seuls les enseignants contactés par ce parent peuvent le voir."
                : 'You do not have access to this profile. Only teachers contacted by this parent can see it.'}
            </p>
            <PrimaryButton onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
              {isFr ? 'Retour' : 'Back'}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
              <UserIcon className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-3">
              {isFr ? 'Profil introuvable' : 'Profile not found'}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              {isFr
                ? "Ce profil n'existe pas ou n'est plus disponible."
                : 'This profile does not exist or is no longer available.'}
            </p>
            <PrimaryButton onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4" />
              {isFr ? "Retour à l'accueil" : 'Back to home'}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  const isOwnProfile = Boolean(user?.id && user.id === profile.id);

  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() ||
    (isFr ? 'Parent' : 'Parent');

  const initials = initialsFromNames(profile.first_name, profile.last_name, displayName);
  const memberSince = formatMonthYear(profile.member_since, isFr);

  const hasAbout = Boolean(profile.bio);
  const hasChildren = profile.children.length > 0;

  const tabs: Array<{ key: 'about' | 'children'; label: string; icon: React.ElementType }> = [];
  if (hasAbout) tabs.push({ key: 'about', label: isFr ? 'À propos' : 'About', icon: UserIcon });
  if (hasChildren) {
    tabs.push({
      key: 'children',
      label: isFr
        ? `Enfants (${profile.children.length})`
        : `Children (${profile.children.length})`,
      icon: Baby,
    });
  }

  const activeTabSafe = tabs.find(t => t.key === activeTab) ? activeTab : tabs[0]?.key || 'about';

  const subtitle = isOwnProfile
    ? isFr ? 'Ainsi les enseignants vous voient' : 'This is how teachers see you'
    : isFr
      ? 'Parent à la recherche de cours pour ses enfants'
      : 'Parent looking for lessons for their children';

  const childrenDescription = isOwnProfile
    ? isFr
      ? 'Ces informations aident les enseignants à comprendre vos besoins.'
      : 'This information helps teachers understand your needs.'
    : isFr
      ? "Ces informations vous aident à mieux comprendre les besoins du parent."
      : 'This information helps you better understand the parent’s needs.';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
      <button
        onClick={() => router.back()}
        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {isFr ? 'Retour' : 'Back'}
      </button>

      {isOwnProfile && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 shadow-sm mb-5">
          <div className="w-9 h-9 rounded-xl bg-white border border-emerald-100 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              {isFr ? 'Vous consultez votre profil public' : 'You’re viewing your public profile'}
            </p>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              {isFr
                ? 'Voici ce que les enseignants voient quand vous les contactez.'
                : 'This is what teachers see when you contact them.'}
            </p>
          </div>
        </div>
      )}

      <Card>
        <div className="relative aspect-[3/1] bg-gradient-to-br from-emerald-100 via-slate-100 to-emerald-50 overflow-hidden">
          {profile.profile_photo_url && (
            <>
              <img
                src={profile.profile_photo_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover blur-sm scale-110"
              />
              <div className="absolute inset-0 bg-slate-900/20" />
            </>
          )}

          {isOwnProfile && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <span className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-sm border border-emerald-100 px-2.5 py-1 rounded-full shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] text-emerald-700 font-medium">
                  {isFr ? 'Vous' : 'You'}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 lg:px-8 pb-6">
          <div className="-mt-14 relative z-10">
            <div className="w-24 h-24 rounded-2xl border-4 border-white bg-slate-100 overflow-hidden shadow-md flex items-center justify-center">
              {profile.profile_photo_url ? (
                <img
                  src={profile.profile_photo_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {displayName}
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">{subtitle}</p>
            </div>

            {isOwnProfile && (
              <Link href="/parent/profile/edit" prefetch className="shrink-0">
                <PrimaryButton>
                  <Pencil className="w-4 h-4" />
                  {isFr ? 'Modifier mon profil' : 'Edit my profile'}
                </PrimaryButton>
              </Link>
            )}
          </div>

          {(profile.city || profile.children.length > 0 || memberSince) && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {profile.city && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3 h-3" />
                  {profile.city}
                </span>
              )}
              {profile.children.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
                  <Baby className="w-3 h-3" />
                  {profile.children.length}{' '}
                  {isFr
                    ? `enfant${profile.children.length > 1 ? 's' : ''}`
                    : `child${profile.children.length > 1 ? 'ren' : ''}`}
                </span>
              )}
              {memberSince && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  {isFr ? `Membre depuis ${memberSince}` : `Member since ${memberSince}`}
                </span>
              )}
            </div>
          )}
        </div>

        {tabs.length > 0 && (
          <div className="border-t border-slate-200 bg-white overflow-x-auto">
            <div className="flex min-w-max px-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTabSafe === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      active
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 lg:p-8">
          {activeTabSafe === 'about' && hasAbout && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                {isOwnProfile
                  ? isFr ? 'Ma présentation' : 'My presentation'
                  : isFr ? 'Présentation' : 'Presentation'}
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            </div>
          )}

          {activeTabSafe === 'children' && hasChildren && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-5">
                {isOwnProfile
                  ? isFr ? 'Mes enfants' : 'My children'
                  : isFr ? 'Enfants du parent' : 'Parent’s children'}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.children.map(child => (
                  <ChildPublicCard key={child.id} child={child} isFr={isFr} />
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-5 leading-relaxed max-w-[60ch]">
                {childrenDescription}
              </p>
            </div>
          )}

          {tabs.length === 0 && (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
                <UserIcon className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 mb-5">
                {isOwnProfile
                  ? isFr
                    ? "Votre profil public n'a pas encore été complété."
                    : 'Your public profile has not been completed yet.'
                  : isFr
                    ? "Ce profil n'a pas encore été complété."
                    : 'This profile has not been completed yet.'}
              </p>
              {isOwnProfile && (
                <Link href="/parent/profile/edit" prefetch className="inline-block">
                  <PrimaryButton>
                    <Pencil className="w-4 h-4" />
                    {isFr ? 'Compléter mon profil' : 'Complete my profile'}
                  </PrimaryButton>
                </Link>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANT — Carte enfant
// ============================================================
function ChildPublicCard({ child, isFr }: { child: PublicChild; isFr: boolean }) {
  const age = calcAge(child.birth_date);

  const scheduleSlots = child.preferred_schedule
    ? child.preferred_schedule.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
          <span className="text-emerald-700 text-base font-bold">
            {child.first_name.charAt(0).toUpperCase() || '?'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-1">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {child.first_name || (isFr ? 'Enfant' : 'Child')}
            </p>
            {age !== null && (
              <span className="text-xs text-slate-400 shrink-0">
                {age} {isFr ? 'ans' : 'yrs'}
              </span>
            )}
          </div>

          {child.level_name && (
            <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
              <GraduationCap className="w-3 h-3 shrink-0" />
              {child.level_name}
            </p>
          )}
        </div>
      </div>

      {scheduleSlots.length > 0 && (
        <div className="flex items-start gap-2 pl-3 border-l-2 border-emerald-200">
          <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold mb-1.5">
              {isFr ? 'Horaires souhaités' : 'Preferred schedule'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {scheduleSlots.map((slot, i) => (
                <span
                  key={i}
                  className="inline-flex items-center text-xs text-emerald-700 bg-white border border-emerald-100 px-2.5 py-1 rounded-lg font-medium"
                >
                  {slot}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {child.notes && (
        <div className="flex items-start gap-2 pl-3 border-l-2 border-slate-200">
          <StickyNote className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold mb-1">
              {isFr ? 'Notes' : 'Notes'}
            </p>
            <p className="text-xs text-slate-600 leading-relaxed italic whitespace-pre-line">
              {child.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}