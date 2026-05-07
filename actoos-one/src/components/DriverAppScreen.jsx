import { useState } from 'react';
import { 
  ArrowLeft,
  Power,
  MapPin,
  Navigation,
  Phone,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bike,
  User,
  X,
  Wallet,
  Banknote,
  AlertTriangle
} from 'lucide-react';
import { mockCurrentMission } from '../data/driverData';

// Configuration des commissions Driver
const DRIVER_COMMISSION_RATE = 0.15; // 15% de commission sur les courses

export function DriverAppScreen({ onBack }) {
  const [isOnline, setIsOnline] = useState(true);
  const [currentMission, setCurrentMission] = useState(mockCurrentMission);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [handshakeCode, setHandshakeCode] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [deliveryComplete, setDeliveryComplete] = useState(false);
  
  // Wallet driver (mock)
  const [driverWallet, setDriverWallet] = useState({
    balance: 12500,
    pending_cash: 0, // Cash collecté non encore reversé
  });

  // Toggle online/offline
  const handleToggleOnline = () => {
    if (currentMission) {
      alert('Impossible de passer hors ligne pendant une mission !');
      return;
    }
    setIsOnline(!isOnline);
  };

  // Ouvrir modal OTP pour confirmer livraison
  const handleConfirmDelivery = () => {
    setShowOTPModal(true);
    setHandshakeCode('');
    setOtpError(false);
  };

  // Gestion de l'entrée du code Handshake
  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase();
    // Format #A42 - max 4 caractères
    if (value.length <= 4) {
      setHandshakeCode(value);
    }
    setOtpError(false);
  };

  // Valider le code Handshake
  const handleValidateCode = () => {
    const expectedCode = currentMission?.dropoff?.delivery_code;
    if (handshakeCode === expectedCode) {
      // Si paiement cash: calculer et débiter la commission automatiquement
      if (currentMission?.payment_method === 'cash') {
        const commission = Math.round(currentMission.total_amount * DRIVER_COMMISSION_RATE);
        setDriverWallet(prev => ({
          balance: prev.balance - commission, // Débit automatique commission
          pending_cash: currentMission.total_amount, // Cash collecté
        }));
      }
      
      setDeliveryComplete(true);
      setShowOTPModal(false);
      setTimeout(() => {
        setCurrentMission(null);
        setDeliveryComplete(false);
        setDriverWallet(prev => ({ ...prev, pending_cash: 0 }));
      }, 4000);
    } else {
      setOtpError(true);
      setHandshakeCode('');
    }
  };

  const isCodeValid = handshakeCode.length >= 3; // #A42 format

  // Calcul du temps écoulé
  const getElapsedTime = (dateStr) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - created) / 60000);
    return `${diffMins} min`;
  };

  return (
    <div className="min-h-screen bg-white" data-testid="driver-app-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
              data-testid="driver-back-btn"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Mode Livreur</h1>
              <p className="text-xs text-gray-500">Moussa Diallo</p>
            </div>
          </div>

          {/* Toggle Online/Offline */}
          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${
              isOnline
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
            data-testid="online-toggle"
          >
            <Power className="w-5 h-5" />
            {isOnline ? 'EN LIGNE' : 'HORS LIGNE'}
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Driver Wallet Bar */}
        <div className="bg-gray-50 rounded-2xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-[#FF5A00]" />
            <span className="text-sm text-gray-600">Mon Wallet</span>
          </div>
          <span className="font-bold text-gray-900">{driverWallet.balance.toLocaleString()} FCFA</span>
        </div>

        {/* Delivery Complete Message */}
        {deliveryComplete && (
          <div className="bg-green-50 border-2 border-green-500 rounded-3xl p-6 text-center mb-6" data-testid="delivery-complete">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700">Livraison Confirmée !</h2>
            <p className="text-green-600 mt-2">+{currentMission?.delivery_fee || 500} FCFA crédités sur votre wallet</p>
            {driverWallet.pending_cash > 0 && (
              <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-xl p-3">
                <p className="text-sm text-yellow-800">
                  💵 Cash collecté: <strong>{driverWallet.pending_cash.toLocaleString()} FCFA</strong>
                </p>
                <p className="text-xs text-yellow-600 mt-1">À reverser au prochain dépôt</p>
              </div>
            )}
          </div>
        )}

        {/* No Mission State */}
        {!currentMission && !deliveryComplete && (
          <div className="text-center py-16">
            {isOnline ? (
              <>
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Bike className="w-12 h-12 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">En attente de mission</h2>
                <p className="text-gray-500">Vous recevrez une notification dès qu'une commande sera disponible</p>
                <div className="mt-8 flex items-center justify-center gap-2 text-green-600">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  Recherche en cours...
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Power className="w-12 h-12 text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Vous êtes hors ligne</h2>
                <p className="text-gray-500">Passez en ligne pour recevoir des missions</p>
              </>
            )}
          </div>
        )}

        {/* Current Mission */}
        {currentMission && !deliveryComplete && (
          <div className="space-y-4">
            {/* Mission Header */}
            <div className="bg-primary text-white rounded-3xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Mission en cours</p>
                  <p className="text-2xl font-bold">{currentMission.orderNumber}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{getElapsedTime(currentMission.created_at)}</span>
                  </div>
                  <p className="text-lg font-bold mt-1">{currentMission.delivery_fee} FCFA</p>
                </div>
              </div>
            </div>

            {/* Point A - Pickup */}
            <div className="bg-gray-50 border-2 border-gray-200 rounded-3xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">A</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Point de retrait</p>
                  <p className="text-lg font-bold text-gray-900">{currentMission.pickup.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{currentMission.pickup.address}</p>
                  <a
                    href={`tel:${currentMission.pickup.phone}`}
                    className="inline-flex items-center gap-2 mt-2 text-blue-600 text-sm font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    Appeler le restaurant
                  </a>
                </div>
                <button className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-blue-600" />
                </button>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-1 h-8 bg-gray-300 rounded-full"></div>
            </div>

            {/* Point B - Dropoff */}
            <div className="bg-green-50 border-2 border-green-500 rounded-3xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">B</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-green-600 font-semibold uppercase">Point de livraison</p>
                  <p className="text-lg font-bold text-gray-900">{currentMission.dropoff.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{currentMission.dropoff.address}</p>
                  <a
                    href={`tel:${currentMission.dropoff.phone}`}
                    className="inline-flex items-center gap-2 mt-2 text-green-600 text-sm font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    Appeler le client
                  </a>
                </div>
                <button className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-green-600" />
                </button>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-gray-500" />
                <span className="font-semibold text-gray-900">Contenu de la commande</span>
              </div>
              <p className="text-gray-600">{currentMission.items_summary}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-gray-500">Total commande</span>
                <span className="font-bold text-gray-900">{currentMission.total_amount.toLocaleString()} FCFA</span>
              </div>
            </div>

            {/* Caution Zero-Loss - Affiché si paiement Cash */}
            {currentMission.payment_method === 'cash' && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-4" data-testid="cash-caution">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-yellow-800 mb-2">Paiement en Cash</p>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-yellow-700">Vous recevrez</span>
                        <span className="font-semibold text-gray-900">{currentMission.total_amount.toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-700">Commission (15%)</span>
                        <span className="font-semibold text-red-600">-{Math.round(currentMission.total_amount * DRIVER_COMMISSION_RATE).toLocaleString()} FCFA</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-yellow-300">
                        <span className="text-yellow-800 font-medium">Débit auto wallet</span>
                        <span className="font-bold text-red-600">-{Math.round(currentMission.total_amount * DRIVER_COMMISSION_RATE).toLocaleString()} FCFA</span>
                      </div>
                    </div>
                    <p className="text-xs text-yellow-600 mt-3">
                      💡 La commission est automatiquement débitée de votre wallet à la confirmation.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Big Orange Button */}
            <button
              onClick={handleConfirmDelivery}
              className="w-full bg-primary text-white font-bold py-6 rounded-3xl flex items-center justify-center gap-3 active:bg-primary/80 transition-colors text-xl shadow-lg shadow-primary/30"
              data-testid="confirm-delivery-btn"
            >
              <CheckCircle2 className="w-8 h-8" />
              CONFIRMER LIVRAISON
            </button>

            <p className="text-center text-sm text-gray-500">
              Demandez le code Handshake au client (ex: #A42)
            </p>
          </div>
        )}
      </div>

      {/* Handshake Code Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" data-testid="otp-modal">
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Code Handshake</h2>
              <button
                onClick={() => setShowOTPModal(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <p className="text-gray-600 text-center mb-6">
              Entrez le code dicté par le client (format: #A42)
            </p>

            {/* Handshake Code Input */}
            <div className="flex justify-center mb-6">
              <input
                type="text"
                value={handshakeCode}
                onChange={handleCodeChange}
                placeholder="#A42"
                maxLength={4}
                className={`w-40 h-20 text-center text-4xl font-bold tracking-widest rounded-2xl border-2 outline-none transition-colors ${
                  otpError
                    ? 'border-red-500 bg-red-50 text-red-600 placeholder-red-300'
                    : handshakeCode
                    ? 'border-[#FF5A00] bg-[#FF5A00]/5 text-gray-900 placeholder-gray-400'
                    : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400'
                }`}
                data-testid="handshake-code-input"
                autoFocus
              />
            </div>

            {/* Error Message */}
            {otpError && (
              <div className="flex items-center justify-center gap-2 text-red-600 mb-4">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Code incorrect, réessayez</span>
              </div>
            )}

            {/* Cash Warning in Modal */}
            {currentMission?.payment_method === 'cash' && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 mb-4">
                <p className="text-sm text-yellow-800 text-center">
                  <Banknote className="w-4 h-4 inline mr-1" />
                  Collectez <strong>{currentMission.total_amount.toLocaleString()} FCFA</strong> en cash
                </p>
              </div>
            )}

            {/* Validate Button */}
            <button
              onClick={handleValidateCode}
              disabled={!isCodeValid}
              className={`w-full py-5 rounded-2xl font-bold text-lg transition-colors ${
                isCodeValid
                  ? 'bg-primary text-white active:bg-primary/80'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="validate-otp-btn"
            >
              VALIDER LE CODE
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
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
