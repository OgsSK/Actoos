'use client';

import { useState, useEffect } from 'react';
import { X, Flag, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { supabase } from '@/lib/supabase';

// ─── Catégories ───
type ProfileCategory = 'harassment' | 'fake_profile' | 'inappropriate' | 'spam' | 'other';
type ReviewCategory = 'spam' | 'offensive' | 'fake_review' | 'harassment' | 'other';
type Category = ProfileCategory | ReviewCategory;

const PROFILE_CATEGORIES: { value: ProfileCategory; labelFr: string; labelEn: string }[] = [
  { value: 'harassment',     labelFr: 'Harcèlement',              labelEn: 'Harassment' },
  { value: 'fake_profile',   labelFr: 'Faux profil',              labelEn: 'Fake profile' },
  { value: 'inappropriate',  labelFr: 'Comportement inapproprié', labelEn: 'Inappropriate behavior' },
  { value: 'spam',           labelFr: 'Spam',                     labelEn: 'Spam' },
  { value: 'other',          labelFr: 'Autre',                    labelEn: 'Other' },
];

const REVIEW_CATEGORIES: { value: ReviewCategory; labelFr: string; labelEn: string }[] = [
  { value: 'spam',        labelFr: 'Spam',              labelEn: 'Spam' },
  { value: 'offensive',   labelFr: 'Contenu offensant', labelEn: 'Offensive content' },
  { value: 'fake_review', labelFr: 'Faux avis',         labelEn: 'Fake review' },
  { value: 'harassment',  labelFr: 'Harcèlement',       labelEn: 'Harassment' },
  { value: 'other',       labelFr: 'Autre',             labelEn: 'Other' },
];

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Cible = profil utilisateur (parents, profs…)
  reportedUserId?: string;
  reportedUserName?: string;
  // Cible = avis/commentaire
  reviewId?: string;
  // Contexte
  context?: 'profile' | 'message' | 'request' | 'review';
  contextId?: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  reportedUserName,
  reviewId,
  context = 'profile',
  contextId,
}: ReportModalProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isFr = language === 'fr';

  const isReview = context === 'review';
  const categories = isReview ? REVIEW_CATEGORIES : PROFILE_CATEGORIES;
  const defaultCategory: Category = isReview ? 'spam' : 'inappropriate';

  const [category, setCategory] = useState<Category>(defaultCategory);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setDescription('');
      setError('');
      setSuccess(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, context]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError(isFr ? 'Vous devez être connecté.' : 'You must be logged in.');
      return;
    }

    if (!isReview && reportedUserId && user.id === reportedUserId) {
      setError(isFr ? 'Vous ne pouvez pas vous signaler vous-même.' : 'You cannot report yourself.');
      return;
    }

    if (!isReview && !reportedUserId) {
      setError(isFr ? 'Utilisateur cible manquant.' : 'Target user missing.');
      return;
    }

    if (isReview && !reviewId) {
      setError(isFr ? 'Avis cible manquant.' : 'Target review missing.');
      return;
    }

    if (!description.trim()) {
      setError(isFr ? 'Merci de décrire le problème.' : 'Please describe the issue.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('moderation_reports')
        .insert({
          reporter_id: user.id,
          reported_id: isReview ? reportedUserId : reportedUserId,
          category,
          description: description.trim(),
          context,
          context_id: isReview ? reviewId : (contextId || null),
          status: 'new',
        });

      if (insertError) {
        if (insertError.code === '23505') {
          setError(
            isReview
              ? (isFr
                  ? 'Vous avez déjà signalé cet avis. Attendez qu\'il soit traité.'
                  : 'You already reported this review. Wait for it to be processed.')
              : (isFr
                  ? 'Vous avez déjà un signalement actif contre cette personne.'
                  : 'You already have an active report against this person.')
          );
        } else {
          throw insertError;
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error('[ReportModal]', err);
      setError(
        err?.message ||
          (isFr ? 'Erreur lors de l\'envoi. Réessayez.' : 'Error sending. Please retry.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Flag size={18} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isReview
                  ? (isFr ? 'Signaler cet avis' : 'Report this review')
                  : (isFr ? 'Signaler' : 'Report')}
              </h2>
              {reportedUserName && (
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[240px]">
                  {reportedUserName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={26} className="text-red-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              {isFr ? 'Signalement envoyé' : 'Report sent'}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {isFr
                ? 'Merci. Notre équipe va examiner ce signalement dans les plus brefs délais.'
                : 'Thank you. Our team will review this report as soon as possible.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">
                {isFr
                  ? 'Les signalements abusifs peuvent entraîner la suspension de votre propre compte.'
                  : 'Abusive reports can lead to the suspension of your own account.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                {isFr ? 'Catégorie' : 'Category'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="space-y-1.5">
                {categories.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      category === cat.value
                        ? 'border-red-300 bg-red-50 text-red-700 font-medium'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isFr ? cat.labelFr : cat.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {isFr ? 'Description' : 'Description'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                required
                maxLength={1000}
                placeholder={isFr
                  ? 'Décrivez précisément ce qui s\'est passé…'
                  : 'Describe precisely what happened…'}
                className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 resize-none transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                {description.length} / 1000
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 bg-white text-slate-700 border border-slate-200 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={submitting || !description.trim()}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {isFr ? 'Envoyer le signalement' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}