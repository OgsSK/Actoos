'use client';

import { useState, useEffect } from 'react';
import { X, User, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

const T = {
  fr: {
    title: 'Modifier mon profil',
    subtitle: 'Votre nom apparaît sur vos projets et candidatures.',
    firstName: 'Prénom',
    lastName: 'Nom',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    success: 'Profil mis à jour.',
    errMissing: 'Veuillez remplir tous les champs.',
    errGeneric: 'Une erreur est survenue. Veuillez réessayer.',
  },
  en: {
    title: 'Edit profile',
    subtitle: 'Your name appears on your projects and applications.',
    firstName: 'First name',
    lastName: 'Last name',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    success: 'Profile updated.',
    errMissing: 'Please fill in all fields.',
    errGeneric: 'Something went wrong. Please try again.',
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export default function ChangeNameModal({ isOpen, onClose, language }: Props) {
  const { profile, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = T[language];

  // Charger les valeurs actuelles à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setFirstName(profile?.first_name || '');
      setLastName(profile?.last_name || '');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, profile]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError(t.errMissing);
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('[ChangeNameModal]', err);
      setError(err?.message || t.errGeneric);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <User size={18} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={26} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">{t.success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t.firstName}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  {t.lastName}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 bg-white text-slate-700 border border-slate-200 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? t.saving : t.save}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}