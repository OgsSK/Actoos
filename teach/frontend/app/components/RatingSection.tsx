'use client';

import { useEffect, useState } from 'react';
import { Star, ShieldCheck, MessageCircle, Flag, Loader2, Pencil, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';

interface Rating {
  id: string;
  parent_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  teacher_reply: string | null;
  teacher_reply_at: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            width={28}
            height={28}
            className={(hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
          />
        </button>
      ))}
    </div>
  );
}

export default function RatingSection({
  teacherId, isFr,
}: { teacherId: string; isFr: boolean }) {
  const { user } = useAuth();
  const { isParent } = useTeachRole();
  const isOwnProfile = user?.id === teacherId;

  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [myRating, setMyRating] = useState<Rating | null>(null);

  const [editing, setEditing] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  // ✅ FIX : ajoute isParent dans les deps pour que load() se relance
  // dès que useTeachRole() a hydraté le rôle.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, user?.id, isParent]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('teacher_ratings')
        .select('id, parent_id, rating, comment, created_at, updated_at, teacher_reply, teacher_reply_at, users:parent_id(first_name, last_name)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      const list: Rating[] = (data || []).map((r: any) => ({
        ...r,
        parent_first_name: r.users?.first_name ?? null,
        parent_last_name: r.users?.last_name ?? null,
      }));
      setRatings(list);

      // ✅ FIX : calcule myRating et eligible dès que user?.id existe,
      // SANS dépendre de isParent (le rendu fera le tri après).
      if (user?.id && !isOwnProfile) {
        const mine = list.find(r => r.parent_id === user.id) || null;
        setMyRating(mine);
        if (mine) {
          setFormRating(mine.rating);
          setFormComment(mine.comment || '');
        } else {
          setFormRating(0);
          setFormComment('');
        }

        const { data: completedReq } = await supabase
          .from('lesson_requests')
          .select('id')
          .eq('parent_id', user.id)
          .eq('teacher_id', teacherId)
          .eq('status', 'completed')
          .eq('used_for_rating', false)
          .limit(1)
          .maybeSingle();
        setEligible(Boolean(completedReq));
      } else {
        setEligible(false);
        setMyRating(null);
      }
    } finally {
      setLoading(false);
    }
  }

  const canEditMyRating =
    myRating && (Date.now() - new Date(myRating.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;

  async function handleSubmit() {
    if (formRating < 1) {
      setError(isFr ? 'Choisissez une note.' : 'Choose a rating.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.rpc('upsert_parent_rating', {
        p_teacher_id: teacherId,
        p_rating: formRating,
        p_comment: formComment.trim() || null,
      });
      if (err) throw err;
      setEditing(false);
      await load();
    } catch (err: any) {
      const code = err?.message || '';
      if (code.includes('edit_window_expired')) {
        setError(isFr ? "Le délai de modification (7 jours) est dépassé." : 'The 7-day edit window has passed.');
      } else if (code.includes('not_eligible')) {
        setError(isFr ? "Vous devez avoir suivi un cours terminé avec ce prof." : 'You must have a completed lesson with this teacher.');
      } else {
        setError(isFr ? "Une erreur est survenue." : 'Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMine() {
    if (!myRating) return;
    const msg = isFr ? 'Supprimer votre avis ?' : 'Delete your review?';
    if (!confirm(msg)) return;
    await supabase.from('teacher_ratings').delete().eq('id', myRating.id);
    setMyRating(null);
    setFormRating(0);
    setFormComment('');
    await load();
  }

  async function handleSaveReply(ratingId: string) {
    setSavingReply(true);
    try {
      await supabase.rpc('submit_teacher_reply', {
        p_rating_id: ratingId,
        p_reply: replyText.trim() || null,
      });
      setReplyingId(null);
      setReplyText('');
      await load();
    } finally {
      setSavingReply(false);
    }
  }

  async function handleDeleteReply(ratingId: string) {
    await supabase.rpc('submit_teacher_reply', { p_rating_id: ratingId, p_reply: null });
    await load();
  }

  async function handleReport(ratingId: string) {
    const reason = prompt(isFr ? 'Pourquoi signalez-vous cet avis ? (optionnel)' : 'Why are you reporting this review? (optional)');
    if (reason === null) return;
    if (!user?.id) return;
    await supabase.from('rating_reports').insert({ rating_id: ratingId, reported_by: user.id, reason: reason || null });
    alert(isFr ? 'Merci, votre signalement a été envoyé.' : 'Thanks, your report was sent.');
  }

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length)
    : 0;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) return <div className="py-6 text-center text-sm text-slate-400">{isFr ? 'Chargement…' : 'Loading…'}</div>;

  return (
    <div className="space-y-6">
      {/* Résumé */}
      <div className="flex items-center gap-3">
        {ratings.length > 0 ? (
          <>
            <Stars value={Math.round(avg)} size={20} />
            <span className="text-sm font-semibold text-slate-900">{avg.toFixed(1)}</span>
            <span className="text-sm text-slate-500">
              ({ratings.length} {isFr ? 'avis' : 'review'}{ratings.length > 1 ? (isFr ? '' : 's') : ''})
            </span>
          </>
        ) : (
          <p className="text-sm text-slate-500">{isFr ? 'Aucun avis pour le moment.' : 'No reviews yet.'}</p>
        )}
      </div>

      {/* Formulaire parent éligible */}
      {user && isParent && !isOwnProfile && eligible && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {!myRating || editing ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                {myRating ? (isFr ? 'Modifier mon avis' : 'Edit my review') : (isFr ? 'Laisser un avis' : 'Leave a review')}
              </p>
              <StarPicker value={formRating} onChange={setFormRating} />
              <textarea
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={isFr ? 'Votre expérience avec ce prof (optionnel)' : 'Your experience with this teacher (optional)'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:border-emerald-500"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {isFr ? 'Publier' : 'Submit'}
                </button>
                {myRating && (
                  <button
                    onClick={() => { setEditing(false); setFormRating(myRating.rating); setFormComment(myRating.comment || ''); }}
                    className="text-sm text-slate-500 hover:text-slate-800"
                  >
                    {isFr ? 'Annuler' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">{isFr ? 'Votre avis' : 'Your review'}</p>
                <Stars value={myRating.rating} />
                {myRating.comment && <p className="text-sm text-slate-700 mt-2">{myRating.comment}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEditMyRating && (
                  <button onClick={() => setEditing(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-white transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button onClick={handleDeleteMine} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-white transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message d'aide quand le parent n'est pas éligible */}
      {user && isParent && !isOwnProfile && !eligible && !myRating && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {isFr
            ? 'Vous pourrez laisser un avis après avoir terminé un cours avec ce prof.'
            : 'You can leave a review after completing a lesson with this teacher.'}
        </div>
      )}

      {/* Liste des avis */}
      <div className="space-y-4">
        {ratings.map(r => {
          const name = [r.parent_first_name, r.parent_last_name?.charAt(0)].filter(Boolean).join(' ') || (isFr ? 'Parent' : 'Parent');
          const isMine = r.parent_id === user?.id;
          return (
            <div key={r.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{name}{isMine ? (isFr ? ' (vous)' : ' (you)') : ''}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      {isFr ? 'Avis vérifié' : 'Verified review'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Stars value={r.rating} />
                    <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                  </div>
                </div>

                {user && !isMine && (
                  <button
                    onClick={() => handleReport(r.id)}
                    aria-label={isFr ? 'Signaler' : 'Report'}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Flag className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {r.comment && <p className="text-sm text-slate-700 mt-3 leading-relaxed">{r.comment}</p>}

              {/* Réponse du prof */}
              {r.teacher_reply && replyingId !== r.id && (
                <div className="mt-3 ml-4 pl-3 border-l-2 border-emerald-200">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-medium text-emerald-700">{isFr ? 'Réponse du prof' : "Teacher's reply"}</p>
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{r.teacher_reply}</p>
                  {isOwnProfile && (
                    <div className="flex items-center gap-3 mt-1.5">
                      <button onClick={() => { setReplyingId(r.id); setReplyText(r.teacher_reply || ''); }} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                        {isFr ? 'Modifier' : 'Edit'}
                      </button>
                      <button onClick={() => handleDeleteReply(r.id)} className="text-xs text-slate-400 hover:text-red-600 font-medium">
                        {isFr ? 'Supprimer' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bouton pour répondre (prof, pas encore de réponse) */}
              {isOwnProfile && !r.teacher_reply && replyingId !== r.id && (
                <button
                  onClick={() => { setReplyingId(r.id); setReplyText(''); }}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {isFr ? 'Répondre' : 'Reply'}
                </button>
              )}

              {/* Formulaire de réponse */}
              {isOwnProfile && replyingId === r.id && (
                <div className="mt-3 ml-4 pl-3 border-l-2 border-emerald-200 space-y-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder={isFr ? 'Votre réponse…' : 'Your reply…'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSaveReply(r.id)}
                      disabled={savingReply}
                      className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50"
                    >
                      {savingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      {isFr ? 'Envoyer' : 'Send'}
                    </button>
                    <button onClick={() => setReplyingId(null)} className="text-xs text-slate-500 hover:text-slate-800">
                      {isFr ? 'Annuler' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}