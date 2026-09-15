'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, GraduationCap, Clock, CheckCircle2, XCircle,
  Home, Monitor, ExternalLink, Send, Loader2, AlertCircle, Eye, Baby,
  Flag, Inbox, Phone, MapPin, Copy, Check, Trash2, RotateCcw,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>{children}</div>;
}

function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
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

export default function LessonRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const requestId = params?.id as string;

  const [request, setRequest] = useState<any>(null);
  const [parent, setParent] = useState<any>(null);
  const [parentProfile, setParentProfile] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [responseText, setResponseText] = useState('');
  const [responding, setResponding] = useState(false);
  const [showResponseInput, setShowResponseInput] = useState(false);
  const [nextStatus, setNextStatus] = useState<'accepted' | 'declined' | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  // ✅ FIX : on n'attend plus authLoading (qui peut être bloqué)
  useEffect(() => {
    if (!requestId) return;
    if (!user?.id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, user?.id]);

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

      if (req.teacher_id !== user!.id) {
        setNotFound(true);
        return;
      }

      setRequest(req);

      const childIds: string[] = Array.isArray(req.child_ids) && req.child_ids.length > 0
        ? req.child_ids
        : req.child_id
          ? [req.child_id]
          : [];

      const [parentRes, parentProfileRes, childrenRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, avatar_url')
          .eq('id', req.parent_id)
          .maybeSingle(),
        supabase
          .from('parent_profiles')
          .select('id, phone, city, bio, profile_photo_url')
          .eq('id', req.parent_id)
          .maybeSingle(),
        childIds.length > 0
          ? supabase
              .from('children')
              .select('id, first_name, birth_date, level_id, level_custom, school_name, notes')
              .in('id', childIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      setParent(parentRes.data || null);
      setParentProfile(parentProfileRes.data || null);

      const loaded: any[] = childrenRes.data || [];
      const ordered = childIds.map(id => loaded.find(c => c.id === id)).filter(Boolean);
      setChildren(ordered);
    } catch (err) {
      console.error('[LessonRequestDetail]', err);
      setNotFound(true);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  async function handleRespond(status: 'accepted' | 'declined') {
    if (!request) return;
    setResponding(true);
    try {
      const { error } = await supabase
        .from('lesson_requests')
        .update({
          status,
          teacher_response: responseText.trim() || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', request.id);

      if (error) throw error;

      try {
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'lesson-response',
              request_id: request.id,
              status,
              teacher_response: responseText.trim() || null,
              parent_id: request.parent_id,
              teacher_id: request.teacher_id,
            }),
          }
        ).catch((e) => console.warn('[Email] Non envoyé:', e));
      } catch (e) {
        console.warn('[Email] Non envoyé:', e);
      }

      setRequest({ ...request, status, teacher_response: responseText.trim() || null });
      setShowResponseInput(false);
      setNextStatus(null);
      setResponseText('');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setResponding(false);
    }
  }

  async function handleRemove() {
    if (!request) return;
    const msg = isFr
      ? 'Retirer cette demande de votre liste ? Le parent la verra toujours.'
      : 'Remove this request from your list? The parent will still see it.';
    if (!confirm(msg)) return;

    setRemoving(true);
    try {
      const { error } = await supabase
        .from('lesson_requests')
        .update({ deleted_by_teacher_at: new Date().toISOString() })
        .eq('id', request.id);
      if (error) throw error;
      setRequest({ ...request, deleted_by_teacher_at: new Date().toISOString() });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setRemoving(false);
    }
  }

  async function handleRestore() {
    if (!request) return;
    setRemoving(true);
    try {
      const { error } = await supabase
        .from('lesson_requests')
        .update({ deleted_by_teacher_at: null })
        .eq('id', request.id);
      if (error) throw error;
      setRequest({ ...request, deleted_by_teacher_at: null });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setRemoving(false);
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
    if (mins < 60) return isFr ? 'il y a ' + mins + ' min' : mins + ' min ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isFr ? 'il y a ' + hrs + ' h' : hrs + ' h ago';
    const days = Math.floor(hrs / 24);
    return isFr ? 'il y a ' + days + ' j' : days + ' d ago';
  }

  // ✅ FIX : on ne bloque plus sur authLoading
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
            <PrimaryButton onClick={() => router.push('/teacher/requests')}>
              <ArrowLeft className="w-4 h-4" />
              {isFr ? 'Voir mes demandes' : 'See my requests'}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    );
  }

  const parentName = [parent?.first_name, parent?.last_name].filter(Boolean).join(' ') || '—';
  const initials = parentName.split(' ').map((w: string) => w.charAt(0)).slice(0, 2).join('').toUpperCase();
  const mode = modeLabel(request.teaching_mode, isFr);
  const ModeIcon = request.teaching_mode === 'home' ? Home : request.teaching_mode === 'online' ? Monitor : Home;
  const isPending = request.status === 'pending';
  const isAccepted = request.status === 'accepted';
  const isCompleted = request.status === 'completed';
  const isDeclined = request.status === 'declined';
  const isArchived = request.status === 'archived';
  const showContacts = isAccepted || isCompleted;
  const isRemoved = Boolean(request.deleted_by_teacher_at);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <button
        onClick={() => router.push('/teacher/requests')}
        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {isFr ? 'Retour aux demandes' : 'Back to requests'}
      </button>

      <div className="space-y-6">
        {isRemoved && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-white border border-amber-100 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {isFr ? 'Retirée de votre liste' : 'Removed from your list'}
              </p>
              <p className="text-xs text-amber-800/80 leading-relaxed mt-0.5">
                {isFr
                  ? 'Cette demande est masquée côté prof. Le parent la voit toujours.'
                  : 'This request is hidden from your list. The parent can still see it.'}
              </p>
            </div>
          </div>
        )}

        <Card>
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 overflow-hidden shrink-0 flex items-center justify-center">
                {parent?.avatar_url ? (
                  <img src={parent.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-blue-700 text-lg font-bold">{initials}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold text-slate-900 truncate">{parentName}</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isFr ? 'Demande envoyée' : 'Request sent'} · {formatRelative(request.created_at)}
                </p>

                {/* ✅ FIX : Link prefetch à la place de <a> */}
                <Link
                  href={'/parents/' + parent?.id}
                  prefetch
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors mt-3"
                >
                  <Eye className="w-4 h-4" />
                  {isFr ? 'Voir le profil complet du parent' : 'See parent full profile'}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="shrink-0">
                {isPending && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                    <Clock className="w-3 h-3" />
                    {isFr ? 'Nouvelle' : 'New'}
                  </span>
                )}
                {isAccepted && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-3 h-3" />
                    {isFr ? 'Acceptée' : 'Accepted'}
                  </span>
                )}
                {isDeclined && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-red-100 text-red-700">
                    <XCircle className="w-3 h-3" />
                    {isFr ? 'Refusée' : 'Declined'}
                  </span>
                )}
                {isCompleted && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                    <Flag className="w-3 h-3" />
                    {isFr ? 'Terminée' : 'Completed'}
                  </span>
                )}
                {isArchived && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                    <Inbox className="w-3 h-3" />
                    {isFr ? 'Archivée' : 'Archived'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {showContacts && (parentProfile?.phone || parentProfile?.city) && (
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-50/40">
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-white border border-blue-100 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-blue-900">
                    {isFr ? 'Coordonnées du parent' : 'Parent contact'}
                  </h2>
                  <p className="text-xs text-blue-700">
                    {isFr ? 'Vous avez accepté la demande' : 'You accepted the request'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {parentProfile.phone && (
                  <ContactRow
                    icon={Phone}
                    label={isFr ? 'Téléphone' : 'Phone'}
                    value={parentProfile.phone}
                    href={`tel:${cleanPhoneForLink(parentProfile.phone)}`}
                    onCopy={() => copyToClipboard(parentProfile.phone, 'phone')}
                    copied={copiedField === 'phone'}
                    isFr={isFr}
                  />
                )}
                {parentProfile.city && (
                  <div className="rounded-xl border border-blue-100 bg-white p-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">{isFr ? 'Ville' : 'City'}</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">{parentProfile.city}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {isFr ? 'Demande' : 'Request'}
            </h2>

            <div className="flex flex-wrap gap-2 mb-5">
              {request.subject && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
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

            {request.teacher_response && !isPending && (
              <div className={`mt-4 rounded-xl p-4 border ${
                isAccepted
                  ? 'bg-emerald-50 border-emerald-100'
                  : isCompleted
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-red-50 border-red-100'
              }`}>
                <p className={`text-xs font-semibold mb-1 ${
                  isAccepted
                    ? 'text-emerald-700'
                    : isCompleted
                      ? 'text-slate-700'
                      : 'text-red-700'
                }`}>
                  {isFr ? 'Votre réponse' : 'Your response'}
                </p>
                <p className={`text-sm leading-relaxed whitespace-pre-line ${
                  isAccepted
                    ? 'text-emerald-900'
                    : isCompleted
                      ? 'text-slate-700'
                      : 'text-red-900'
                }`}>
                  {request.teacher_response}
                </p>
              </div>
            )}
          </div>
        </Card>

        {children.length > 0 && (
          <Card>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Baby className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  {children.length > 1
                    ? (isFr ? 'Enfants concernés (' + children.length + ')' : 'Concerned children (' + children.length + ')')
                    : (isFr ? 'Enfant concerné' : 'Concerned child')}
                </h2>
              </div>

              <div className="space-y-3">
                {children.map(child => {
                  const childAge = child.birth_date ? calcAge(child.birth_date) : null;
                  return (
                    <div key={child.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                        <span className="text-emerald-700 text-base font-bold">
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

        {isPending && !showResponseInput && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => { setNextStatus('declined'); setShowResponseInput(true); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium shadow-sm transition-colors"
            >
              <XCircle className="w-4 h-4" />
              {isFr ? 'Refuser' : 'Decline'}
            </button>
            <button
              onClick={() => { setNextStatus('accepted'); setShowResponseInput(true); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isFr ? 'Accepter' : 'Accept'}
            </button>
          </div>
        )}

        {showResponseInput && nextStatus && (
          <Card>
            <div className="p-5 sm:p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-3">
                {nextStatus === 'accepted'
                  ? isFr ? 'Accepter la demande' : 'Accept request'
                  : isFr ? 'Refuser la demande' : 'Decline request'}
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                {nextStatus === 'accepted'
                  ? isFr ? 'Vous pouvez ajouter un message (optionnel) pour donner vos disponibilités.' : 'You can add an optional message with your availability.'
                  : isFr ? 'Expliquez brièvement pourquoi (optionnel).' : 'Briefly explain why (optional).'}
              </p>

              <textarea
                value={responseText}
                onChange={e => setResponseText(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder={
                  nextStatus === 'accepted'
                    ? isFr ? 'Ex : Bonjour, je suis disponible jeudi et vendredi en fin de journée.' : 'Ex: Hello, available Thursday and Friday late afternoon.'
                    : isFr ? 'Ex : Bonjour, je suis complet en ce moment.' : 'Ex: Hello, fully booked right now.'
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{responseText.length}/500</p>

              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <button
                  onClick={() => { setShowResponseInput(false); setNextStatus(null); setResponseText(''); }}
                  disabled={responding}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleRespond(nextStatus)}
                  disabled={responding}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${
                    nextStatus === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {responding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {nextStatus === 'accepted'
                    ? isFr ? 'Envoyer la confirmation' : 'Send confirmation'
                    : isFr ? 'Envoyer le refus' : 'Send decline'}
                </button>
              </div>
            </div>
          </Card>
        )}

        {!isRemoved ? (
          <button
            onClick={handleRemove}
            disabled={removing}
            className="w-full inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {removing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {isFr ? 'Retirer de ma liste' : 'Remove from my list'}
          </button>
        ) : (
          <button
            onClick={handleRestore}
            disabled={removing}
            className="w-full inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            {removing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {isFr ? 'Restaurer dans ma liste' : 'Restore in my list'}
          </button>
        )}
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
    <div className="rounded-xl border border-blue-100 bg-white p-3.5 flex items-center gap-3 hover:border-blue-200 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <a
          href={href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate block"
        >
          {value}
        </a>
      </div>
      <button
        onClick={onCopy}
        aria-label={copied ? 'Copié' : 'Copier'}
        className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border transition-all ${
          copied
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700'
        }`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{copied ? (isFr ? 'Copié' : 'Copied') : (isFr ? 'Copier' : 'Copy')}</span>
      </button>
    </div>
  );
}