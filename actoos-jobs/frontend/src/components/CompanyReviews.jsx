import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { StarRating } from './ui/StarRating';
import { toast } from 'sonner';
import { User, MessageSquare, Loader2, Trash2, Edit, X, Check } from 'lucide-react';
import { formatRelative } from '../lib/utils';

export const CompanyReviews = ({ companyId, isOwner }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // État des avis
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviewsCount, setTotalReviewsCount] = useState(0);
  
  // Pagination & tri
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const PER_PAGE = 10;
  
  // Formulaire de création
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showName, setShowName] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modification de l'avis
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editShowName, setEditShowName] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  
  // Modification de la réponse
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [submittingReplyEdit, setSubmittingReplyEdit] = useState(false);
  
  // Réponse du recruteur
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  
  // Droits
  const [canReview, setCanReview] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [expandedReviews, setExpandedReviews] = useState(new Set());

  // ✅ Vérifie si un avis peut encore être modifié (7 jours max)
  const canEditReview = (review) => {
    if (!user || user.id !== review.user_id) return false;
    const diffInDays = (new Date() - new Date(review.created_at)) / (1000 * 60 * 60 * 24);
    return diffInDays <= 7;
  };

  const toggleExpand = (reviewId) => {
    const newSet = new Set(expandedReviews);
    if (newSet.has(reviewId)) {
      newSet.delete(reviewId);
    } else {
      newSet.add(reviewId);
    }
    setExpandedReviews(newSet);
  };

  // ✅ Réinitialisation quand companyId change
  useEffect(() => {
    if (companyId) {
      setPage(1);
      setSortBy('newest');
      fetchReviews();
      if (user) {
        checkCanReview();
        checkHasReviewed();
      }
    }
  }, [companyId, user]);

  // ✅ Rafraîchissement quand page ou tri change
  useEffect(() => {
    if (companyId) {
      fetchReviews();
    }
  }, [page, sortBy]);

  // ✅ Récupération des avis avec pagination et tri
  const fetchReviews = async () => {
    setLoading(true);
    try {
      // 1. Compter le nombre total d'avis
      const { count, error: countError } = await supabase
        .from('company_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_visible', true);

      if (countError) throw countError;
      setTotalReviewsCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / PER_PAGE));

      // Si la page actuelle est supérieure au nombre total de pages, on la corrige
      if (page > Math.ceil((count || 0) / PER_PAGE) && count > 0) {
        setPage(Math.ceil((count || 0) / PER_PAGE));
        setLoading(false);
        return;
      }

      // 2. Récupérer les avis avec pagination
      const from = (page - 1) * PER_PAGE;
      const to = from + PER_PAGE - 1;

      let query = supabase
        .from('company_reviews')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_visible', true)
        .range(from, to);

      // Tri
      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sortBy === 'highest') {
        query = query.order('rating', { ascending: false });
      } else if (sortBy === 'lowest') {
        query = query.order('rating', { ascending: true });
      }

      const { data: reviewsData, error: reviewsError } = await query;

      if (reviewsError) throw reviewsError;

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setLoading(false);
        return;
      }

      // 3. Récupération des utilisateurs depuis la table `users`
      const userIds = reviewsData.map(r => r.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);

      let userMap = {};
      if (!usersError && usersData) {
        userMap = usersData.reduce((acc, u) => {
          acc[u.id] = u;
          return acc;
        }, {});
      } else {
        // Fallback : utilisateurs anonymes
        userIds.forEach(id => {
          userMap[id] = { first_name: 'Utilisateur', last_name: '', avatar_url: null };
        });
      }

      const enrichedReviews = reviewsData.map(review => ({
        ...review,
        user: userMap[review.user_id] || { first_name: 'Utilisateur', last_name: '', avatar_url: null }
      }));

      setReviews(enrichedReviews);

      // 4. Calcul de la note moyenne (sur tous les avis)
      const { data: allReviews, error: allError } = await supabase
        .from('company_reviews')
        .select('rating')
        .eq('company_id', companyId)
        .eq('is_visible', true);

      if (!allError && allReviews && allReviews.length > 0) {
        const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
        setAvgRating(sum / allReviews.length);
      } else {
        setAvgRating(0);
      }

    } catch (err) {
      console.error(err);
      toast.error(t('reviews.loadError', 'Erreur de chargement des avis'));
    } finally {
      setLoading(false);
    }
  };

  // Vérification si le candidat peut déposer un avis
  const checkCanReview = async () => {
    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId);

      if (!jobs || jobs.length === 0) {
        setCanReview(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      const { data, error } = await supabase
        .from('applications')
        .select('id')
        .eq('candidate_id', user.id)
        .in('status', ['interview', 'accepted', 'completed'])
        .in('job_id', jobIds);

      if (!error && data && data.length > 0) {
        setCanReview(true);
      } else {
        setCanReview(false);
      }
    } catch (err) {
      setCanReview(false);
    }
  };

  const checkHasReviewed = async () => {
    const { data, error } = await supabase
      .from('company_reviews')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setHasReviewed(true);
    } else {
      setHasReviewed(false);
    }
  };

  // -------- Création d'un avis --------
  const handleSubmitReview = async () => {
    if (!rating || !comment.trim()) {
      toast.error(t('reviews.fillAllFields'));
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('company_reviews').insert({
        company_id: companyId,
        user_id: user.id,
        rating,
        comment: comment.trim(),
        show_name: showName,
      });

      if (error) throw error;
      toast.success(t('reviews.reviewSubmitted'));
      setShowForm(false);
      setRating(0);
      setComment('');
      setShowName(true);
      setHasReviewed(true);
      // Reste sur la page en cours pour voir le nouvel avis en haut (si tri newest)
      await fetchReviews();
    } catch (err) {
      toast.error(err.message || t('reviews.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  // -------- Suppression d'un avis --------
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm(t('reviews.deleteConfirm'))) return;
    try {
      const { error } = await supabase
        .from('company_reviews')
        .delete()
        .eq('id', reviewId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(t('reviews.deleted'));
      setHasReviewed(false);
      await fetchReviews();
    } catch (err) {
      toast.error(err.message || t('reviews.deleteError'));
    }
  };

  // -------- MODIFICATION d'un avis --------
  const handleEditReview = (review) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditShowName(review.show_name);
  };

  const handleUpdateReview = async () => {
    if (!editRating || !editComment.trim()) {
      toast.error(t('reviews.fillAllFields'));
      return;
    }
    setSubmittingEdit(true);
    try {
      const { error } = await supabase
        .from('company_reviews')
        .update({
          rating: editRating,
          comment: editComment.trim(),
          show_name: editShowName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingReviewId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success(t('reviews.reviewUpdated'));
      setEditingReviewId(null);
      await fetchReviews();
    } catch (err) {
      toast.error(err.message || t('reviews.updateError'));
    } finally {
      setSubmittingEdit(false);
    }
  };

  const cancelEdit = () => {
    setEditingReviewId(null);
  };

  // -------- Réponse du recruteur (création) --------
  const handleSubmitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const { error } = await supabase
        .from('company_reviews')
        .update({
          reply: replyText.trim(),
          reply_at: new Date().toISOString(),
          replied_by: user.id,
        })
        .eq('id', reviewId);

      if (error) throw error;
      toast.success(t('reviews.replySubmitted'));
      setReplyingTo(null);
      setReplyText('');
      await fetchReviews();
    } catch (err) {
      toast.error(err.message || t('reviews.replyError'));
    } finally {
      setSubmittingReply(false);
    }
  };

  // -------- MODIFICATION de la réponse --------
  const handleEditReply = (review) => {
    setEditingReplyId(review.id);
    setEditReplyText(review.reply);
  };

  const handleUpdateReply = async (reviewId) => {
    if (!editReplyText.trim()) {
      toast.error(t('reviews.replyRequired'));
      return;
    }
    setSubmittingReplyEdit(true);
    try {
      const { error } = await supabase
        .from('company_reviews')
        .update({
          reply: editReplyText.trim(),
          reply_at: new Date().toISOString(),
          replied_by: user.id,
        })
        .eq('id', reviewId);

      if (error) throw error;
      toast.success(t('reviews.replyUpdated'));
      setEditingReplyId(null);
      setEditReplyText('');
      await fetchReviews();
    } catch (err) {
      toast.error(err.message || t('reviews.replyUpdateError'));
    } finally {
      setSubmittingReplyEdit(false);
    }
  };

  const cancelEditReply = () => {
    setEditingReplyId(null);
    setEditReplyText('');
  };

  // -------- SUPPRESSION de la réponse --------
  const handleDeleteReply = async (reviewId) => {
    if (!window.confirm(t('reviews.deleteReplyConfirm'))) return;
    try {
      const { error } = await supabase
        .from('company_reviews')
        .update({ reply: null, reply_at: null, replied_by: null })
        .eq('id', reviewId);

      if (error) throw error;
      toast.success(t('reviews.replyDeleted'));
      await fetchReviews();
    } catch (err) {
      toast.error(err.message || t('reviews.replyDeleteError'));
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;
  }

  const canShowForm = user && canReview && !hasReviewed && !showForm;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold text-slate-900">{avgRating.toFixed(1)}</div>
          <div>
            <StarRating rating={Math.round(avgRating)} />
            <span className="text-sm text-slate-500 ml-2">({totalReviewsCount} {t('reviews.reviews', 'Reviews')})</span>
          </div>
        </div>
        {canShowForm && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 text-white">
            {t('reviews.writeReview')}
          </Button>
        )}
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
          <h3 className="font-semibold text-slate-900 mb-4">{t('reviews.writeReview')}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('reviews.rating')}</label>
              <StarRating
                rating={rating}
                interactive
                onChange={(value) => setRating(value || 0)}
                size="w-6 h-6"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t('reviews.comment')}</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={t('reviews.commentPlaceholder')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              <label className="text-sm text-slate-700">{t('reviews.showName')}</label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmitReview} disabled={submitting} className="bg-blue-600 text-white">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {t('reviews.submit')}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>{t('common.cancel')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Contrôles de pagination et tri */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">
            {totalReviewsCount > 0 ? (
              t('reviews.showing', {
                from: (page - 1) * PER_PAGE + 1,
                to: Math.min(page * PER_PAGE, totalReviewsCount),
                total: totalReviewsCount
              })
            ) : (
              t('reviews.noReviews')
            )}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">{t('reviews.sort.newest')}</option>
            <option value="oldest">{t('reviews.sort.oldest')}</option>
            <option value="highest">{t('reviews.sort.highest')}</option>
            <option value="lowest">{t('reviews.sort.lowest')}</option>
          </select>
          {totalPages > 1 && (
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                {t('common.previous')}
              </button>
              <span className="px-3 py-1.5 text-sm text-slate-600 min-w-[3rem] text-center">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Liste des avis */}
      {reviews.length === 0 ? (
        <p className="text-slate-500 text-center py-8">{t('reviews.noReviews')}</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const isExpanded = expandedReviews.has(review.id);
            const hasLongComment = review.comment.length > 300;
            const displayComment = isExpanded ? review.comment : review.comment.slice(0, 300) + (hasLongComment ? '...' : '');
            const displayName = review.show_name
              ? `${review.user.first_name} ${review.user.last_name}`
              : t('reviews.anonymous');
            const isMyReview = user && user.id === review.user_id;
            const canEdit = canEditReview(review);

            return (
              <div key={review.id} className="bg-white border border-slate-200 rounded-xl p-5">
                {editingReviewId === review.id ? (
                  // Formulaire de modification de l'avis
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3">{t('reviews.editReview')}</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('reviews.rating')}</label>
                        <StarRating
                          rating={editRating}
                          interactive
                          onChange={(value) => setEditRating(value || 0)}
                          size="w-6 h-6"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">{t('reviews.comment')}</label>
                        <textarea
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          rows={3}
                          className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editShowName}
                          onChange={(e) => setEditShowName(e.target.checked)}
                          className="rounded border-slate-300 text-blue-600"
                        />
                        <label className="text-sm text-slate-700">{t('reviews.showName')}</label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleUpdateReview}
                          disabled={submittingEdit}
                          className="bg-blue-600 text-white"
                        >
                          {submittingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-1" />}
                          {t('reviews.update')}
                        </Button>
                        <Button variant="ghost" onClick={cancelEdit}>
                          <X className="w-4 h-4 mr-1" />
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {review.show_name ? (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                            {review.user.avatar_url ? (
                              <img src={review.user.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          {review.show_name ? (
                            <Link to={`/candidat/${review.user_id}`} className="font-medium text-slate-900 hover:text-blue-600">
                              {displayName}
                            </Link>
                          ) : (
                            <span className="font-medium text-slate-900">{displayName}</span>
                          )}
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} size="w-4 h-4" />
                            <span className="text-xs text-slate-400">{formatRelative(review.created_at)}</span>
                            {review.created_at !== review.updated_at && (
                              <span className="text-xs text-slate-400 italic">({t('reviews.edited')})</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Boutons d'action sur l'avis (avec limitation 7 jours) */}
                      {isMyReview && !editingReviewId && (
                        <div className="flex gap-1">
                          {canEdit ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditReview(review)}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          ) : (
                            review.created_at !== review.updated_at && (
                              <span className="text-xs text-slate-400 italic self-center">
                                {t('reviews.locked')}
                              </span>
                            )
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteReview(review.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <p className="text-slate-700 mt-3 whitespace-pre-wrap text-sm">
                      {displayComment}
                      {hasLongComment && (
                        <button
                          onClick={() => toggleExpand(review.id)}
                          className="text-blue-600 hover:underline text-sm ml-2"
                        >
                          {isExpanded ? t('reviews.showLess') : t('reviews.showMore')}
                        </button>
                      )}
                    </p>

                    {/* Réponse du recruteur (avec modification/suppression) */}
                    {review.reply && (
                      <div className="mt-4 pl-4 border-l-2 border-blue-200 bg-blue-50 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-800">{t('reviews.employerReply')}</p>
                            {editingReplyId === review.id ? (
                              // Formulaire de modification de la réponse
                              <div className="mt-2">
                                <textarea
                                  value={editReplyText}
                                  onChange={(e) => setEditReplyText(e.target.value)}
                                  rows={3}
                                  className="w-full border border-blue-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                  placeholder={t('reviews.replyPlaceholder')}
                                />
                                <div className="flex gap-2 mt-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateReply(review.id)}
                                    disabled={submittingReplyEdit}
                                    className="bg-blue-600 text-white"
                                  >
                                    {submittingReplyEdit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-1" />}
                                    {t('reviews.updateReply')}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEditReply}>
                                    <X className="w-4 h-4 mr-1" />
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-slate-700 mt-1">{review.reply}</p>
                                <p className="text-xs text-slate-400 mt-1">{formatRelative(review.reply_at)}</p>
                              </>
                            )}
                          </div>
                          {/* Boutons d'action sur la réponse (recruteur uniquement) */}
                          {isOwner && user && user.id === review.replied_by && !editingReplyId && (
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditReply(review)}
                                className="text-blue-500 hover:text-blue-700"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteReply(review.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bouton Répondre (si recruteur et pas encore de réponse) */}
                    {isOwner && !review.reply && (
                      <div className="mt-3">
                        {replyingTo === review.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              rows={3}
                              className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder={t('reviews.replyPlaceholder')}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSubmitReply(review.id)}
                                disabled={submittingReply}
                                className="bg-blue-600 text-white"
                              >
                                {submittingReply ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {t('reviews.submitReply')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                              >
                                {t('common.cancel')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyingTo(review.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            {t('reviews.reply')}
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};