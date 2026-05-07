import { useState } from 'react';
import { 
  X, 
  Users, 
  Phone, 
  Clock, 
  Tag,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const CATEGORY_OPTIONS = [
  { id: 'restaurant', name: 'Restaurants', emoji: '🍽️' },
  { id: 'commerce', name: 'Commerces', emoji: '🛍️' },
];

export function CreateSubWalletSheet({ isOpen, onClose }) {
  const { createSubWallet, isLoading } = useWallet();
  const [step, setStep] = useState('info'); // info, rules, success
  const [error, setError] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+223 ');
  const [dailyLimit, setDailyLimit] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // Result
  const [createdWallet, setCreatedWallet] = useState(null);

  const handleReset = () => {
    setStep('info');
    setName('');
    setPhone('+223 ');
    setDailyLimit('');
    setTimeStart('');
    setTimeEnd('');
    setSelectedCategories([]);
    setError('');
    setCreatedWallet(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(handleReset, 300);
  };

  const handleInfoSubmit = () => {
    if (!name.trim()) {
      setError('Veuillez entrer un nom pour le sous-compte');
      return;
    }
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length < 12) {
      setError('Numéro de téléphone invalide');
      return;
    }
    setError('');
    setStep('rules');
  };

  const toggleCategory = (catId) => {
    setSelectedCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(c => c !== catId)
        : [...prev, catId]
    );
  };

  const handleCreateSubWallet = async () => {
    try {
      const config = {
        name: name.trim(),
        phone: phone.replace(/\s/g, ''),
        dailyLimit: dailyLimit ? parseInt(dailyLimit, 10) : null,
        timeStart: timeStart || null,
        timeEnd: timeEnd || null,
        categories: selectedCategories.length > 0 ? selectedCategories : null,
      };

      const result = await createSubWallet(config);
      setCreatedWallet(result);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-purple-600 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Nouveau sous-compte</h2>
                <p className="text-sm text-white/80">Famille ou Entreprise</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Step: Info */}
          {step === 'info' && (
            <>
              <p className="text-gray-500 text-sm mb-6">
                Créez un sous-wallet pour un enfant ou un employé. Vous pourrez définir des règles de dépense.
              </p>

              {/* Nom */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Nom du sous-compte
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cantine Karim"
                  className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                  data-testid="subwallet-name"
                />
              </div>

              {/* Téléphone */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Numéro de téléphone lié
                </label>
                <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-4">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+223 XX XX XX XX"
                    className="flex-1 bg-transparent outline-none text-gray-900"
                    data-testid="subwallet-phone"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Cette personne pourra utiliser ce wallet pour payer.
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}

              <button
                onClick={handleInfoSubmit}
                className="w-full bg-purple-600 text-white font-semibold py-4 rounded-2xl"
                data-testid="continue-to-rules"
              >
                Continuer
              </button>
            </>
          )}

          {/* Step: Rules (Smart Rules) */}
          {step === 'rules' && (
            <>
              <p className="text-gray-500 text-sm mb-6">
                Définissez les règles de dépense pour <strong>{name}</strong>.
                Tous les champs sont optionnels.
              </p>

              {/* Limite journalière */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  Limite journalière (FCFA)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 3000"
                  className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                  data-testid="subwallet-daily-limit"
                />
              </div>

              {/* Heures autorisées */}
              <div className="mb-5">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  Heures autorisées
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={timeStart}
                    onChange={(e) => setTimeStart(e.target.value)}
                    className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                    data-testid="subwallet-time-start"
                  />
                  <span className="text-gray-400">à</span>
                  <input
                    type="time"
                    value={timeEnd}
                    onChange={(e) => setTimeEnd(e.target.value)}
                    className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-purple-500"
                    data-testid="subwallet-time-end"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Ex: 11:00 à 15:00 pour les pauses déjeuner
                </p>
              </div>

              {/* Catégories autorisées */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  Catégories autorisées
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-4 py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                        selectedCategories.includes(cat.id)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                      data-testid={`category-${cat.id}`}
                    >
                      <span>{cat.emoji}</span>
                      {cat.name}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Si aucune sélection, toutes les catégories seront autorisées.
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm mb-4 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 bg-gray-100 text-gray-700 font-semibold py-4 rounded-2xl"
                >
                  Retour
                </button>
                <button
                  onClick={handleCreateSubWallet}
                  disabled={isLoading}
                  className="flex-1 bg-purple-600 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2"
                  data-testid="create-subwallet-btn"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Création...
                    </>
                  ) : (
                    'Créer le sous-compte'
                  )}
                </button>
              </div>
            </>
          )}

          {/* Step: Success */}
          {step === 'success' && createdWallet && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">Sous-compte créé !</h3>
              <p className="text-gray-500 mb-6">
                <strong>{createdWallet.wallet_name}</strong> peut maintenant utiliser ACTOOS Pay.
              </p>

              <div className="bg-gray-50 rounded-2xl p-4 text-left mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nom</span>
                    <span className="font-medium">{createdWallet.wallet_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Téléphone</span>
                    <span className="font-medium">{createdWallet.linked_phone}</span>
                  </div>
                  {createdWallet.daily_spend_limit && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Limite/jour</span>
                      <span className="font-medium">{createdWallet.daily_spend_limit.toLocaleString()} F</span>
                    </div>
                  )}
                  {createdWallet.allowed_time_start && createdWallet.allowed_time_end && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Heures</span>
                      <span className="font-medium">{createdWallet.allowed_time_start} - {createdWallet.allowed_time_end}</span>
                    </div>
                  )}
                  {createdWallet.allowed_categories && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Catégories</span>
                      <span className="font-medium capitalize">{createdWallet.allowed_categories.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-purple-600 text-white font-semibold py-4 rounded-2xl"
              >
                Terminé
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
