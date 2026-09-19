'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, GraduationCap, Clock, CheckCircle2, XCircle,
  Home, Monitor, ExternalLink, AlertCircle, Eye, Baby, MessageSquare,
  Phone, MessageCircle, Mail, Trash2, Flag, Copy, Check, MapPin,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';

const AUTH_FORM_TIMEOUT_MS = 800;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>{children}</div>;
}

function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

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

function modeLabel(mode: string | null, isFr: boolean) {
  if (!mode) return null;
  const map: Record<string, { fr: string; en: string }> = {
    home: { fr: 'À domicile', en: 'At home' },
    online: { fr: 'En ligne', en: 'Online' },
    both: { fr: 'Domicile & en ligne', en: 'Home & online' },
  };
  const m = map[mode];
  return m ? (isFr ? m.fr : m.en) : mode;
}

function cleanPhoneForLink(p: string) {
  return p.replace(/\s+/g, '').replace(/[^\d+]/g, '');
}

export default function ParentRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const requestId = params?.id as string;

  const [request, setRequest] = useState<any>(null);
  const [teacher, setTeacher] = useState<any>(null);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!requestId) return;
    if (authLoading && !authTimeoutExpired) return;
    if (!user?.id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, authLoading, authTimeoutExpired, user?.id]);

  async function load() {
    if (!hasLoadedOnce) setLoading(true);
    setNotFound(false);
    try {
      const { data: req, error } = await supabase
        .from('lesson_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (error || !req) {
        setNotFound(true);
        return;
      }

      if (req.parent_id !== user!.id) {
        setNotFound(true);
        return;
      }

      setRequest(req);

      const childIds: string[] = Array.isArray(req.child_ids) && req.child_ids.length > 0
        ? req.child_ids
        : req.child_id
          ? [req.child_id]
          : [];

      const [teacherRes, profileRes, childrenRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', req.teacher_id)
          .maybeSingle(),
        supabase
          .from('teacher_profiles')
          .select('headline, bio, profile_photo_url, city_id, contact_phone, contact_whatsapp, contact_email, contact_note')
          .eq('id', req.teacher_id)
          .maybeSingle(),
        childIds.length > 0
          ? supabase
              .from('children')
              .select('id, first_name, birth_date, level_id, level_custom, school_name, notes')
              .in('id', childIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      setTeacher(teacherRes.data || null);

      let teacherProfileData: any = profileRes.data || null;
      if (teacherProfileData?.city_id) {
        const { data: cityData } = await supabase
          .from('cities')
          .select('id, name')
          .eq('id', teacherProfileData.city_id)
          .maybeSingle();
        if (cityData) {
          teacherProfileData = { ...teacherProfileData, city: cityData };
        }
      }
      setTeacherProfile(teacherProfileData);

      const loaded: any[] = childrenRes.data || [];
      const ordered = childIds.map(id => loaded.find(c => c.id === id)).filter(Boolean);
      setChildren(ordered);
    } catch (err) {
      console.error('[ParentRequestDetail]', err);
      setNotFound(true);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  async function handleMarkCompleted() {
    if (!request || !confirm(isFr ? 'Marquer cette demande comme terminée ?' : 'Mark this request as completed?')) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('lesson_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      setRequest({ ...request, status: 'completed', completed_at: new Date().toISOString() });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!request || !confirm(isFr ? 'Supprimer définitivement cette demande ?' : 'Permanently delete this request?')) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('lesson_requests').delete().eq('id', request.id);
      if (error) throw error;
      router.push('/parent/requests');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setDeleting(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function formatRelative(iso: string) {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return isFr ? 'à l\'instant' : 'just now';
    if (mins < 60) return isFr ? `il y a ${mins} min` : `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isFr ? `il y a ${hrs} h` : `${hrs} h ago`;
    const days = Math.floor(hrs / 24);
    return isFr ? `il y a ${days} j` : `${days} d ago`;
  }

  if (loading && !hasLoadedOnce) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
        <SkeletonLine className="h-4 w-20" />
        <Card>
          <div className="p-6 space-y-4">
            <SkeletonLine className="h-6 w-48" />
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-5/6" />
          </div>
        </Card>
      </div>
    );
  }

  if (notFound || !request) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-4" />
            <h1 className="text-lg font-bold text-slate-900 mb-2">
              {isFr ? 'Demande introuvable' : 'Request not found'}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              {isFr ? "Cette demande n'existe pas ou n'est plus accessible." : 'This request does not exist.'}
            </p>
            <PrimaryButton onClick={() => router.push('/parent/requests')}>
              <ArrowLeft className="w-4 h-4" />
              {isFr ? 'Voir mes demandes' : 'See my requests'}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  const teacherName = [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ') || '—';
  const initials = teacherName.split(' ').map((w: string) => w.charAt(0)).slice(0, 2).join('').toUpperCase();
  const photoUrl = teacherProfile?.profile_photo_url || teacher?.avatar_url || null;
  const mode = modeLabel(request.teaching_mode, isFr);
  const ModeIcon = request.teaching_mode === 'home' ? Home : request.teaching_mode === 'online' ? Monitor : Home;

  const isAccepted = request.status === 'accepted';
  const isCompleted = request.status === 'completed';
  const showContacts = isAccepted || isCompleted;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <button
        onClick={() => router.push('/parent/requests')}
        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-500 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {isFr ? 'Retour à mes demandes' : 'Back to my requests'}
      </button>

      <div className="space-y-6">
        {/* ═══════════ CARTE PROF (enrichie) ═══════════ */}
        <Card>
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <Link
                href={`/teachers/${teacher?.id}`}
                prefetch
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-red-50 border border-red-100 overflow-hidden shrink-0 flex items-center justify-center hover:ring-2 hover:ring-red-200 transition-all"
              >
                {photoUrl ? (
                  <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-red-600 text-lg sm:text-xl font-bold">{initials}</span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                      {teacherName}
                    </h1>
                    {teacherProfile?.headline && (
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                        {teacherProfile.headline}
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {isFr ? 'Demande envoyée' : 'Request sent'} · {formatRelative(request.created_at)}
                    </p>
                  </div>

                  <div className="shrink-0">
                    {request.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                        <Clock className="w-3 h-3" />
                        {isFr ? 'En attente' : 'Pending'}
                      </span>
                    )}
                    {request.status === 'accepted' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3" />
                        {isFr ? 'Acceptée' : 'Accepted'}
                      </span>
                    )}
                    {request.status === 'declined' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                        <XCircle className="w-3 h-3" />
                        {isFr ? 'Refusée' : 'Declined'}
                      </span>
                    )}
                    {request.status === 'completed' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        <Flag className="w-3 h-3" />
                        {isFr ? 'Terminée' : 'Completed'}
                      </span>
                    )}
                  </div>
                </div>

                {(teacherProfile?.city?.name || teacherProfile?.bio) && (
                  <div className="mt-3 space-y-2">
                    {teacherProfile?.city?.name && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        <MapPin className="w-3 h-3" />
                        {teacherProfile.city.name}
                      </span>
                    )}
                    {teacherProfile?.bio && (
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                        {teacherProfile.bio}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  <Link
                    href={`/teachers/${teacher?.id}`}
                    prefetch
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                  >
                    <Eye className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">
                      {isFr ? 'Voir le profil complet' : 'See full profile'}
                    </span>
                    <span className="sm:hidden">
                      {isFr ? 'Voir le profil' : 'See profile'}
                    </span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ═══════════ RÉPONSE DU PROF ═══════════ */}
        {request.teacher_response && request.status !== 'pending' && (
          <Card className={request.status === 'accepted' ? 'border-emerald-200 bg-emerald-50' : request.status === 'completed' ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50'}>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className={`w-5 h-5 ${request.status === 'accepted' ? 'text-emerald-600' : request.status === 'completed' ? 'text-slate-600' : 'text-red-600'}`} />
                <h2 className={`text-base font-semibold ${request.status === 'accepted' ? 'text-emerald-900' : request.status === 'completed' ? 'text-slate-900' : 'text-red-900'}`}>
                  {isFr ? "Réponse de l'enseignant" : 'Teacher response'}
                </h2>
              </div>
              <p className={`text-sm leading-relaxed whitespace-pre-line ${request.status === 'accepted' ? 'text-emerald-900/90' : request.status === 'completed' ? 'text-slate-700' : 'text-red-900/90'}`}>
                {request.teacher_response}
              </p>
            </div>
          </Card>
        )}

        {/* ═══════════ CONTACTS DU PROF ═══════════ */}
        {showContacts && (teacherProfile?.contact_phone || teacherProfile?.contact_whatsapp || teacherProfile?.contact_email) && (
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-50/40">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white border border-red-100 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-red-900">
                    {isFr ? 'Coordonnées du prof' : 'Teacher contact'}
                  </h2>
                  <p className="text-xs text-red-700">
                    {isFr ? 'Le prof a accepté votre demande' : 'The teacher accepted your request'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {teacherProfile.contact_phone && (
                  <ContactRow
                    icon={Phone}
                    label={isFr ? 'Téléphone' : 'Phone'}
                    value={teacherProfile.contact_phone}
                    href={`tel:${cleanPhoneForLink(teacherProfile.contact_phone)}`}
                    onCopy={() => copyToClipboard(teacherProfile.contact_phone, 'phone')}
                    copied={copiedField === 'phone'}
                    isFr={isFr}
                  />
                )}
                {teacherProfile.contact_whatsapp && (
                  <ContactRow
                    icon={MessageCircle}
                    label="WhatsApp"
                    value={teacherProfile.contact_whatsapp}
                    href={`https://wa.me/${cleanPhoneForLink(teacherProfile.contact_whatsapp).replace(/^\+/, '')}`}
                    target="_blank"
                    onCopy={() => copyToClipboard(teacherProfile.contact_whatsapp, 'whatsapp')}
                    copied={copiedField === 'whatsapp'}
                    isFr={isFr}
                  />
                )}
                {teacherProfile.contact_email && (
                  <ContactRow
                    icon={Mail}
                    label="Email"
                    value={teacherProfile.contact_email}
                    href={`mailto:${teacherProfile.contact_email}`}
                    onCopy={() => copyToClipboard(teacherProfile.contact_email, 'email')}
                    copied={copiedField === 'email'}
                    isFr={isFr}
                  />
                )}
              </div>

              {teacherProfile.contact_note && (
                <div className="mt-3 rounded-xl border border-red-100 bg-white p-4">
                  <p className="text-xs text-red-700 leading-relaxed whitespace-pre-line">
                    {teacherProfile.contact_note}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ═══════════ VOTRE DEMANDE ═══════════ */}
        <Card>
          <div className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {isFr ? 'Votre demande' : 'Your request'}
            </h2>

            <div className="flex flex-wrap gap-2 mb-5">
              {request.subject && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                  {request.subject}
                </span>
              )}
              {request.level && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  {request.level}
                </span>
              )}
              {mode && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  <ModeIcon className="w-3 h-3" />
                  {mode}
                </span>
              )}
              {request.preferred_schedule && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  {request.preferred_schedule}
                </span>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {request.message}
              </p>
            </div>
          </div>
        </Card>

        {/* ═══════════ ENFANTS ═══════════ */}
        {children.length > 0 && (
          <Card>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Baby className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-slate-900">
                  {children.length > 1
                    ? (isFr ? `Enfants concernés (${children.length})` : `Concerned children (${children.length})`)
                    : (isFr ? 'Enfant concerné' : 'Concerned child')}
                </h2>
              </div>

              <div className="space-y-3">
                {children.map(child => {
                  const childAge = child.birth_date ? calcAge(child.birth_date) : null;
                  return (
                    <div key={child.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                        <span className="text-red-600 text-base font-bold">
                          {child.first_name.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900">{child.first_name}</p>
                          {childAge !== null && (
                            <span className="text-xs text-slate-400">
                              {childAge} {isFr ? 'ans' : 'yrs'}
                            </span>
                          )}
                        </div>
                        {(child.level_id || child.level_custom) && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" />
                            {child.level_custom || (isFr ? 'Niveau renseigné' : 'Level set')}
                          </p>
                        )}
                        {child.school_name && (
                          <p className="text-xs text-slate-500 mt-0.5">{child.school_name}</p>
                        )}
                        {child.notes && (
                          <p className="text-xs text-slate-500 mt-2 italic line-clamp-3">"{child.notes}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* ═══════════ ACTIONS ═══════════ */}
        <div className="flex flex-col sm:flex-row gap-3">
          {isAccepted && (
            <button
              onClick={handleMarkCompleted}
              disabled={updating}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {updating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Flag className="w-4 h-4" />
              )}
              {isFr ? 'Marquer comme terminée' : 'Mark as completed'}
            </button>
          )}

          {(isCompleted || request.status === 'declined' || request.status === 'archived') && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <span className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {isFr ? 'Supprimer' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon, label, value, href, target, onCopy, copied, isFr,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href: string;
  target?: string;
  onCopy: () => void;
  copied: boolean;
  isFr: boolean;
}) {
  return (
    <div className="rounded-xl border border-red-100 bg-white p-3.5 flex items-center gap-3 hover:border-red-200 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-red-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <a
          href={href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          className="text-sm font-semibold text-slate-900 hover:text-red-500 transition-colors truncate block"
        >
          {value}
        </a>
      </div>
      <button
        onClick={onCopy}
        aria-label={copied ? 'Copié' : 'Copier'}
        className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border transition-all ${
          copied
            ? 'border-red-500 bg-red-500 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-red-400 hover:text-red-500'
        }`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{copied ? (isFr ? 'Copié' : 'Copied') : (isFr ? 'Copier' : 'Copy')}</span>
      </button>
    </div>
  );
}