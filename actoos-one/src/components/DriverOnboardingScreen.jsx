import { useState } from 'react';
import { ArrowLeft, Bike, CheckCircle, Loader2 } from 'lucide-react';

const vehicleOptions = [
  { id: 'moto', label: 'Moto (Djakarta)', icon: '🏍️' },
  { id: 'velo', label: 'Vélo', icon: '🚲' },
  { id: 'voiture', label: 'Voiture', icon: '🚗' },
  { id: 'autre', label: 'Autre', icon: '📦' },
];

export function DriverOnboardingScreen({ onBack, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '+223 ',
    vehicle: '',
    idNumber: '',
    neighborhood: '',
    consentCaution: false,
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const isFormValid = () => {
    return (
      formData.fullName.trim() &&
      formData.phone.length >= 12 &&
      formData.vehicle &&
      formData.neighborhood.trim() &&
      formData.consentCaution
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
      // Simuler l'envoi à onboarding_requests
      const payload = {
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        vehicle_type: formData.vehicle,
        id_number: formData.idNumber.trim() || null,
        neighborhood: formData.neighborhood.trim(),
        consent_caution: formData.consentCaution,
        submitted_at: new Date().toISOString(),
      };

      // Simuler API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('📦 Onboarding Driver Request:', {
        type: 'driver',
        payload,
        status: 'pending',
      });

      setIsSuccess(true);
    } catch (err) {
      setError('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white p-4" data-testid="driver-onboarding-success">
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Dossier enregistré</h2>
          <p className="text-gray-500 mb-8 max-w-xs">
            Préparez votre pièce d'identité, votre photo de véhicule et votre permis (si voiture) pour la validation finale.
          </p>
          <button
            onClick={onSuccess || onBack}
            className="w-full max-w-xs bg-primary text-white font-semibold py-4 rounded-2xl active:bg-primary/90 transition-colors"
            data-testid="driver-success-btn"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="driver-onboarding-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
            data-testid="driver-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Devenir Livreur</h1>
            <p className="text-xs text-gray-500">Rejoignez la flotte ACTOOS</p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Bike className="w-6 h-6 text-primary" />
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="p-4 space-y-5">
        {/* Nom complet */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Nom complet <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => updateField('fullName', e.target.value)}
            placeholder="Ex: Amadou Traoré"
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="driver-name-input"
          />
        </div>

        {/* Téléphone */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Téléphone actif <span className="text-danger">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+223 XX XX XX XX"
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="driver-phone-input"
          />
        </div>

        {/* Véhicule */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Véhicule <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {vehicleOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => updateField('vehicle', option.id)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  formData.vehicle === option.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white active:bg-gray-50'
                }`}
                data-testid={`driver-vehicle-${option.id}`}
              >
                <span className="text-2xl">{option.icon}</span>
                <p className={`text-sm font-medium mt-1 ${
                  formData.vehicle === option.id ? 'text-primary' : 'text-gray-700'
                }`}>
                  {option.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Numéro pièce d'identité */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Numéro de Pièce d'Identité <span className="text-gray-400">(optionnel)</span>
          </label>
          <input
            type="text"
            value={formData.idNumber}
            onChange={(e) => updateField('idNumber', e.target.value)}
            placeholder="Carte d'identité ou passeport"
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="driver-id-input"
          />
        </div>

        {/* Quartier */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            Quartier de résidence <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.neighborhood}
            onChange={(e) => updateField('neighborhood', e.target.value)}
            placeholder="Ex: Hamdallaye, ACI 2000..."
            className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-base outline-none focus:ring-2 focus:ring-primary"
            data-testid="driver-neighborhood-input"
          />
        </div>

        {/* Texte caution */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm text-amber-800">
            <strong>💡 Information sur la caution :</strong><br />
            Pour traiter des commandes payées en espèces, un dépôt de caution virtuelle peut être nécessaire. 
            Cette caution sert à garantir le reversement au restaurant.
          </p>
        </div>

        {/* Consentement */}
        <label className="flex items-start gap-3 cursor-pointer" data-testid="driver-consent-label">
          <input
            type="checkbox"
            checked={formData.consentCaution}
            onChange={(e) => updateField('consentCaution', e.target.checked)}
            className="w-5 h-5 mt-0.5 accent-primary"
            data-testid="driver-consent-checkbox"
          />
          <span className="text-sm text-gray-600">
            Je comprends qu'un dépôt de caution virtuelle peut être nécessaire pour traiter des commandes en espèces.
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
          data-testid="driver-submit-btn"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            'REJOINDRE LA FLOTTE'
          )}
        </button>
      </div>
    </div>
  );
}
