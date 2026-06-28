import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useTranslation } from 'react-i18next';
import useAllowedCountries from '../hooks/useAllowedCountries';
import { Loader2 } from 'lucide-react';

const CountryGate = ({ children }) => {
  const { prefs } = usePreferencesContext();
  const { t } = useTranslation();
  const { allowed, isRestricted, loading } = useAllowedCountries();

  // Pendant le chargement du fichier JSON, on affiche un spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Si la restriction est désactivée → tout le monde peut accéder
  if (!isRestricted) return children;

  // ✅ Si aucun pays n’est défini (option "Tous les pays"), on autorise l’accès
  if (!prefs.country) return children;

  // Si le pays de l’utilisateur est dans la liste → accès autorisé
  if (allowed.includes(prefs.country)) return children;

  // Sinon → écran d’indisponibilité
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">
          {t('countryGate.title', 'Bientôt disponible')}
        </h1>
        <p className="text-slate-600 mb-6">
          {t('countryGate.message', 'Notre service n’est pas encore disponible dans votre pays. Revenez bientôt !')}
        </p>
      </div>
    </div>
  );
};

export default CountryGate;