import { useState } from 'react';
import { ArrowLeft, Store, CheckCircle, Loader2, Check } from 'lucide-react';
import { submitPartnerOnboarding } from '../services/onboardingService';

const categoryOptions = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'fast-food', label: 'Fast-Food' },
  { id: 'superette', label: 'Superette' },
  { id: 'commerce', label: 'Commerce' },
  { id: 'autre', label: 'Autre' },
];

const deliveryModels = [
  {
    id: 'actoos_delivery',
    name: 'Actoos Delivery',
    commission: '15%',
    description: 'Nous gérons la flotte et la livraison GPS.',
  },
  {
    id: 'self_delivery',
    name: 'Self Delivery',
    commission: '10%',
    description: 'Vous utilisez vos propres livreurs.',
  },
];

export function PartnerOnboardingScreen({ onBack, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    establishmentName: '',
    category: '',
    cityNeighborhood: '',
    managerName: '',
    phone: '+223 ',
    legalId: '',
    deliveryModel: 'actoos_delivery',
    consentRepresentative: false,
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const isFormValid = () => {
    return (
      formData.establishmentName.trim() &&
      formData.category &&
      formData.cityNeighborhood.trim() &&
      formData.managerName.trim() &&
      formData.phone.length >= 12 &&
      formData.deliveryModel &&
      formData.consentRepresentative
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Envoyer à Supabase via le service
      const { data, error: submitError } = await submitPartnerOnboarding({
        establishmentName: formData.establishmentName.trim(),
        category: formData.category,
        cityNeighborhood: formData.cityNeighborhood.trim(),
        managerName: formData.managerName.trim(),
        phone: formData.phone.trim(),
        legalId: formData.legalId.trim() || null,
        deliveryModel: formData.deliveryModel,
        consentRepresentative: formData.consentRepresentative,
      });

      if (submitError) {
        throw new Error(submitError.message || 'Erreur lors de l\'envoi');
      }

      console.log('✅ Demande partenaire enregistrée:', data);
      setIsSuccess(true);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white p-4" data-testid="partner-onboarding-success">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Demande reçue</h2>
          <p className="text-gray-500 mb-8 max-w-xs">
            Notre équipe vous contactera sous 24h pour validation et activation.
          </p>
          <button
            onClick={onSuccess || onBack}
            className="w-full max-w-xs bg-primary text-white font-semibold py-4 rounded-2xl active:bg-primary/90 transition-colors"
            data-testid="partner-success-btn"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="partner-onboarding-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
            data-testid="partner-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Devenir Partenaire</h1>
            <p className="text-xs text-gray-500">Inscrivez votre établissement</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Store className="w-6 h-6 text-primary" />
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="p-4 space-y-5 pb-8">
        {/* Nom établissement */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Nom de l'Établissement <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.establishmentName}
            onChange={(e) => updateField('establishmentName', e.target.value)}
            placeholder="Ex: Restaurant Le Djoliba"
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="partner-name-input"
          />
        </div>

        {/* Catégorie */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Catégorie principale <span className="text-danger">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full mt-2 bg-gray-100 text-gray-900 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="partner-category-select"
          >
            <option value="">Sélectionner une catégorie</option>
            {categoryOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Ville / Quartier */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Ville / Quartier <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.cityNeighborhood}
            onChange={(e) => updateField('cityNeighborhood', e.target.value)}
            placeholder="Ex: Bamako, Hamdallaye"
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="partner-city-input"
          />
        </div>

        {/* Nom gérant */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Nom et Prénom du Gérant <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.managerName}
            onChange={(e) => updateField('managerName', e.target.value)}
            placeholder="Ex: Moussa Keita"
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="partner-manager-input"
          />
        </div>

        {/* Téléphone WhatsApp */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Numéro de Téléphone (WhatsApp) <span className="text-danger">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+223 XX XX XX XX"
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="partner-phone-input"
          />
        </div>

        {/* Identifiant légal */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Identifiant Légal <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            type="text"
            value={formData.legalId}
            onChange={(e) => updateField('legalId', e.target.value)}
            placeholder="NINA / RCCM / NINEA"
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="partner-legal-input"
          />
          <p className="text-xs text-gray-400 mt-1">
            Requis avant activation finale
          </p>
        </div>

        {/* Modèle de livraison */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Modèle de Livraison <span className="text-danger">*</span>
          </label>
          <div className="space-y-3 mt-2">
            {deliveryModels.map((model) => (
              <button
                key={model.id}
                onClick={() => updateField('deliveryModel', model.id)}
                className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                  formData.deliveryModel === model.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white active:bg-gray-50'
                }`}
                data-testid={`partner-delivery-${model.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold ${
                      formData.deliveryModel === model.id ? 'text-primary' : 'text-gray-900'
                    }`}>
                      {model.name} <span className="text-sm font-normal">({model.commission})</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                  </div>
                  {formData.deliveryModel === model.id && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Consentement */}
        <label className="flex items-start gap-3 cursor-pointer" data-testid="partner-consent-label">
          <input
            type="checkbox"
            checked={formData.consentRepresentative}
            onChange={(e) => updateField('consentRepresentative', e.target.checked)}
            className="w-5 h-5 mt-0.5 accent-primary"
            data-testid="partner-consent-checkbox"
          />
          <span className="text-sm text-gray-600">
            Je confirme être autorisé à représenter cet établissement.
            <span className="text-danger"> *</span>
          </span>
        </label>

        {/* Error */}
        {error && (
          <p className="text-danger text-sm text-center">{error}</p>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !isFormValid()}
          className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors ${
            isFormValid() && !isLoading
              ? 'bg-primary text-white active:bg-primary/90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          data-testid="partner-submit-btn"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            'SOUMETTRE MA DEMANDE'
          )}
        </button>
      </div>
    </div>
  );
}
