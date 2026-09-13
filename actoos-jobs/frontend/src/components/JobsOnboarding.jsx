import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const JobsOnboarding = ({ onComplete }) => {
  const { t } = useTranslation();
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const handleChoose = async (role) => {
    setSelectedRole(role);
    setLoading(true);
    try {
      const { error } = await supabase.rpc('complete_jobs_onboarding', {
        p_role: role,
      });
      if (error) throw error;

      // Rafraîchir le profil pour refléter le nouveau role + jobs_onboarded
      if (refreshProfile) await refreshProfile();

      if (onComplete) onComplete();

      // Rediriger vers le bon dashboard
      if (role === 'company') {
        navigate('/dashboard/entreprise/creer');
      } else {
        navigate('/dashboard/candidat');
      }
    } catch (err) {
      console.error('[JobsOnboarding]', err);
      toast.error(
        t('jobs_onboarding.error', {
          defaultValue: 'Une erreur est survenue. Veuillez réessayer.',
        })
      );
      setLoading(false);
      setSelectedRole(null);
    }
  };

  const firstName = user?.user_metadata?.first_name || '';

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {t('jobs_onboarding.welcome', {
              name: firstName || '',
              defaultValue: `Bienvenue ${firstName} 👋`,
            })}
          </h2>
          <p className="text-slate-500 text-sm">
            {t('jobs_onboarding.question', {
              defaultValue: 'Vous venez sur Actoos Jobs pour :',
            })}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleChoose('candidate')}
            disabled={loading}
            className="w-full p-5 rounded-xl border-2 border-slate-200 text-left transition-all hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 flex items-start gap-4"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
              {loading && selectedRole === 'candidate' ? (
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              ) : (
                <User className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {t('jobs_onboarding.candidate', { defaultValue: 'Chercher un emploi' })}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {t('jobs_onboarding.candidateDesc', {
                  defaultValue: 'Trouver des missions, postuler, suivre mes candidatures.',
                })}
              </p>
            </div>
          </button>

          <button
            onClick={() => handleChoose('company')}
            disabled={loading}
            className="w-full p-5 rounded-xl border-2 border-slate-200 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50 disabled:opacity-50 flex items-start gap-4"
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              {loading && selectedRole === 'company' ? (
                <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
              ) : (
                <Building2 className="w-6 h-6 text-emerald-600" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {t('jobs_onboarding.company', { defaultValue: 'Recruter' })}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {t('jobs_onboarding.companyDesc', {
                  defaultValue: 'Publier des offres et gérer mon équipe.',
                })}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobsOnboarding;