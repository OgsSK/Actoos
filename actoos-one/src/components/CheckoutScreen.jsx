import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  CheckCircle, 
  Loader2, 
  Wallet, 
  AlertCircle, 
  Building2, 
  ShoppingBag,
  Truck,
  Navigation,
  Clock,
  Calendar
} from 'lucide-react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { TouchPaySheet } from './TouchPaySheet';
import { PromoCodeInput } from './PromoCodeInput';
import { TimeSlotPicker, SelectedTimeSlotBadge } from './TimeSlotPicker';
import { useCart } from '../context/CartContext';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { calculateOrderTotal, createOrder } from '../services/orderService';
import { getNeighborhoodsByCommune } from '../data/locationData';

const STEPS = {
  DELIVERY_MODE: 'delivery_mode',
  SCHEDULE: 'schedule',
  ADDRESS: 'address',
  PHONE: 'phone',
  PAYMENT: 'payment',
  CONFIRM: 'confirm',
  SUCCESS: 'success',
};

export function CheckoutScreen({ restaurant, onBack, onOrderComplete, onLoginRequired }) {
  const { cartItems, getTotal, clearCart } = useCart();
  const { balance, pay, hasEnoughBalance, checkCorporateLimit, walletType, dailySpendLimit, getTodaySpending } = useWallet();
  const { user, profile, isAuthenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(STEPS.DELIVERY_MODE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  // Delivery mode: 'delivery' ou 'pickup'
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  
  // Form data - pré-rempli avec les données du profil si connecté
  const [address, setAddress] = useState(profile?.address || '');
  const [addressDetails, setAddressDetails] = useState(profile?.address_details || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || '+223 ');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // Order result
  const [orderResult, setOrderResult] = useState(null);
  
  // TopUp sheet for insufficient balance
  const [showTopUp, setShowTopUp] = useState(false);
  
  // Promo code
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Scheduled ordering
  const [isAsap, setIsAsap] = useState(true);
  const [scheduledSlot, setScheduledSlot] = useState(null);
  
  // Track si on attendait une connexion pour continuer
  const [pendingAuthAction, setPendingAuthAction] = useState(false);

  // STANDARD UX: Continuer automatiquement le checkout après connexion
  useEffect(() => {
    if (isAuthenticated && pendingAuthAction && currentStep === STEPS.DELIVERY_MODE) {
      setPendingAuthAction(false);
      // Continuer le flux avec le mode de livraison sélectionné
      if (restaurant?.allowScheduledOrders) {
        setCurrentStep(STEPS.SCHEDULE);
      } else if (deliveryMode === 'pickup') {
        setCurrentStep(STEPS.PHONE);
      } else {
        setCurrentStep(STEPS.ADDRESS);
      }
    }
  }, [isAuthenticated, pendingAuthAction, currentStep, deliveryMode, restaurant?.allowScheduledOrders]);

  // Pré-remplir les données du profil quand l'utilisateur se connecte
  useEffect(() => {
    if (profile) {
      if (profile.address && !address) setAddress(profile.address);
      if (profile.address_details && !addressDetails) setAddressDetails(profile.address_details);
      if (profile.phone && phoneNumber === '+223 ') setPhoneNumber(profile.phone);
    }
  }, [profile, address, addressDetails, phoneNumber]);

  // Vérifier si l'utilisateur est connecté quand il veut passer commande
  const checkAuthAndProceed = (nextStep) => {
    if (!isAuthenticated) {
      // Demander connexion
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }
    setCurrentStep(nextStep);
  };

  // Géolocalisation réelle
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setIsLocating(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocoding avec Nominatim (gratuit)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          
          if (data && data.address) {
            const addr = data.address;
            const formattedAddress = `Bamako, ${addr.suburb || addr.neighbourhood || addr.city_district || 'Position actuelle'}`;
            setAddress(formattedAddress);
            setAddressDetails(`Coordonnées: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          } else {
            setAddress('Bamako, Position actuelle');
            setAddressDetails(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch (err) {
          // Fallback si reverse geocoding échoue
          setAddress('Bamako, Position actuelle');
          setAddressDetails(`GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            setError('Vous avez refusé l\'accès à votre position. Veuillez l\'activer dans les paramètres.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Position indisponible. Vérifiez votre GPS.');
            break;
          case error.TIMEOUT:
            setError('Délai d\'attente dépassé. Réessayez.');
            break;
          default:
            setError('Erreur de géolocalisation. Sélectionnez manuellement.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Calculer le total - frais de livraison = 0 si pickup
  const deliveryFee = deliveryMode === 'pickup' ? 0 : (restaurant?.deliveryFee || 500);
  
  // Apply promo discount
  const promoDiscount = appliedPromo?.discount || 0;
  const freeDelivery = appliedPromo?.promo?.discount_type === 'free_delivery';
  const finalDeliveryFee = freeDelivery ? 0 : deliveryFee;
  
  const orderTotals = calculateOrderTotal(cartItems, finalDeliveryFee);
  const finalTotal = Math.max(0, orderTotals.total - promoDiscount);

  const handleSelectDeliveryMode = (mode) => {
    // STANDARD UX: Vérifier l'authentification AVANT de continuer le checkout
    if (!isAuthenticated) {
      // Sauvegarder le mode choisi pour après connexion
      setDeliveryMode(mode);
      setPendingAuthAction(true); // Marquer qu'on attend une connexion
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }
    
    setDeliveryMode(mode);
    // Si le restaurant permet les commandes programmées, aller à l'étape SCHEDULE
    if (restaurant?.allowScheduledOrders) {
      setCurrentStep(STEPS.SCHEDULE);
    } else if (mode === 'pickup') {
      // Skip address step for pickup
      setCurrentStep(STEPS.PHONE);
    } else {
      setCurrentStep(STEPS.ADDRESS);
    }
  };

  const handleScheduleSelection = () => {
    if (deliveryMode === 'pickup') {
      setCurrentStep(STEPS.PHONE);
    } else {
      setCurrentStep(STEPS.ADDRESS);
    }
  };

  // Simplified phone validation - no OTP needed since user is already authenticated
  const handlePhoneSubmit = () => {
    if (!phoneNumber || phoneNumber.replace(/\s/g, '').length < 11) {
      setError('Veuillez entrer un numéro valide');
      return;
    }
    setError('');
    setCurrentStep(STEPS.PAYMENT);
  };

  const handlePlaceOrder = async () => {
    // Vérifier limite corporate si applicable
    if (walletType === 'employee' && dailySpendLimit) {
      const limitCheck = checkCorporateLimit(finalTotal);
      if (!limitCheck.allowed) {
        setError(`Limite journalière atteinte. Reste: ${limitCheck.remaining.toLocaleString()} FCFA`);
        return;
      }
    }

    // Vérifier le solde si paiement wallet
    if (paymentMethod === 'wallet') {
      if (!hasEnoughBalance(finalTotal)) {
        setError('Solde insuffisant');
        setShowTopUp(true);
        return;
      }
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Si paiement wallet, débiter d'abord
      if (paymentMethod === 'wallet') {
        await pay(
          finalTotal,
          `ORD-${Date.now()}`,
          `Commande - ${restaurant.name}`
        );
      }
      
      // Préparer les items pour la vraie commande Supabase
      const orderItems = cartItems.map(item => ({
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price_at_time || item.price,
        special_instructions: item.instructions || null,
      }));

      const orderData = {
        userId: user?.id || null, // Peut être null pour commande guest
        partnerId: restaurant.id,
        items: orderItems,
        deliveryType: deliveryMode,
        paymentMethod: paymentMethod,
        deliveryAddress: deliveryMode === 'delivery' ? `${address} - ${addressDetails}` : null,
        deliveryInstructions: addressDetails || null,
      };
      
      const { data: createdOrder, error: orderError } = await createOrder(orderData);
      
      if (orderError) {
        throw new Error(orderError.message || 'Erreur lors de la commande');
      }

      setOrderResult(createdOrder);
      setCurrentStep(STEPS.SUCCESS);
      clearCart();
    } catch (err) {
      console.error('Erreur commande:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Callback après recharge réussie
  const handleTopUpSuccess = (amount) => {
    setShowTopUp(false);
    setError('');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.DELIVERY_MODE:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Mode de récupération</h2>
              <p className="text-sm text-gray-500 mt-1">Comment souhaitez-vous récupérer votre commande ?</p>
            </div>

            {/* Bandeau connexion requise pour les non-connectés */}
            {!isAuthenticated && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Connexion requise</p>
                  <p className="text-xs text-blue-700">Connectez-vous pour passer commande</p>
                </div>
              </div>
            )}

            {/* Livraison */}
            <button
              onClick={() => handleSelectDeliveryMode('delivery')}
              className="w-full bg-white border-2 border-gray-200 rounded-3xl p-5 flex items-center gap-4 hover:border-[#FF5A00] transition-colors active:bg-gray-50"
              data-testid="select-delivery"
            >
              <div className="w-14 h-14 bg-[#FF5A00]/10 rounded-2xl flex items-center justify-center">
                <Truck className="w-7 h-7 text-[#FF5A00]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900 text-lg">Livraison</p>
                <p className="text-sm text-gray-500">Livré à votre adresse</p>
                <p className="text-[#FF5A00] font-semibold mt-1">
                  +{(restaurant?.deliveryFee || 500).toLocaleString()} FCFA
                </p>
              </div>
            </button>

            {/* Pickup (À emporter) */}
            <button
              onClick={() => handleSelectDeliveryMode('pickup')}
              className="w-full bg-white border-2 border-gray-200 rounded-3xl p-5 flex items-center gap-4 hover:border-[#FF5A00] transition-colors active:bg-gray-50"
              data-testid="select-pickup"
            >
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                <ShoppingBag className="w-7 h-7 text-purple-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-gray-900 text-lg">À emporter</p>
                <p className="text-sm text-gray-500">Récupérer au restaurant</p>
                <p className="text-green-600 font-semibold mt-1">Gratuit</p>
              </div>
            </button>

            {/* Restaurant Info pour Pickup */}
            <div className="bg-gray-50 rounded-2xl p-4 mt-4">
              <p className="text-sm text-gray-500 mb-2">Adresse du restaurant</p>
              <p className="font-medium text-gray-900">{restaurant?.name}</p>
              <p className="text-sm text-gray-600">Bamako, Mali</p>
            </div>
          </div>
        );

      case STEPS.SCHEDULE:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="w-8 h-8 text-[#FF5A00]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Quand souhaitez-vous recevoir ?</h2>
              <p className="text-sm text-gray-500 mt-1">
                {deliveryMode === 'delivery' ? 'Livraison' : 'Retrait'} chez {restaurant?.name}
              </p>
            </div>

            {restaurant?.openingHours && (
              <TimeSlotPicker
                openingHours={restaurant.openingHours}
                selectedSlot={scheduledSlot}
                isAsap={isAsap}
                maxDays={restaurant.maxScheduleDays || 7}
                onSelectAsap={() => {
                  setIsAsap(true);
                  setScheduledSlot(null);
                }}
                onSelectSlot={(day, slot) => {
                  setIsAsap(false);
                  setScheduledSlot({ day, slot });
                }}
              />
            )}

            <button
              onClick={handleScheduleSelection}
              className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-2xl active:bg-[#E55100]"
              data-testid="continue-from-schedule"
            >
              Continuer
            </button>
          </div>
        );

      case STEPS.ADDRESS:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-[#FF5A00]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Adresse de livraison</h2>
              <p className="text-sm text-gray-500 mt-1">Où devons-nous livrer ?</p>
            </div>

            {/* Option pour utiliser la position */}
            <button
              onClick={handleUseLocation}
              disabled={isLocating}
              className={`w-full border rounded-2xl p-4 flex items-center gap-3 transition-colors mb-4 ${
                isLocating 
                  ? 'bg-blue-100 border-blue-300' 
                  : 'bg-blue-50 border-blue-200 active:bg-blue-100'
              }`}
              data-testid="use-location-btn"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                {isLocating ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-blue-900">
                  {isLocating ? 'Localisation en cours...' : 'Utiliser ma position'}
                </p>
                <p className="text-xs text-blue-600">
                  {isLocating ? 'Veuillez patienter' : 'Détection automatique'}
                </p>
              </div>
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="relative flex items-center my-4">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-sm">ou</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Quartier / Zone</label>
              <select
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full mt-2 bg-gray-100 text-gray-900 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                data-testid="address-select"
              >
                <option value="">Sélectionner un quartier</option>
                {Object.entries(getNeighborhoodsByCommune()).map(([commune, neighborhoods]) => (
                  <optgroup key={commune} label={commune}>
                    {neighborhoods.map((n) => (
                      <option key={n.id} value={`Bamako, ${n.name}`}>
                        {n.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Détails (rue, bâtiment, étage)</label>
              <textarea
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                placeholder="Ex: Près du marché, portail bleu..."
                className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#FF5A00] resize-none"
                rows={3}
                data-testid="address-details"
              />
            </div>

            <button
              onClick={() => setCurrentStep(STEPS.PHONE)}
              disabled={!address}
              className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
                address
                  ? 'bg-[#FF5A00] text-white active:bg-[#E55100]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="continue-to-phone"
            >
              Continuer
            </button>
          </div>
        );

      case STEPS.PHONE:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-8 h-8 text-[#FF5A00]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Votre numéro</h2>
              <p className="text-sm text-gray-500 mt-1">
                {deliveryMode === 'pickup' 
                  ? 'Pour vous notifier quand la commande est prête'
                  : 'Pour vous contacter lors de la livraison'
                }
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Numéro de téléphone</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+223 XX XX XX XX"
                className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-[#FF5A00]"
                data-testid="phone-input"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              onClick={handlePhoneSubmit}
              disabled={isLoading || phoneNumber.replace(/\s/g, '').length < 11}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                phoneNumber.replace(/\s/g, '').length >= 11
                  ? 'bg-[#FF5A00] text-white active:bg-[#E55100]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="continue-to-payment"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Chargement...
                </>
              ) : (
                'Continuer'
              )}
            </button>
          </div>
        );

      case STEPS.PAYMENT:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-8 h-8 text-[#FF5A00]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Paiement</h2>
              <p className="text-sm text-gray-500 mt-1">Comment souhaitez-vous payer ?</p>
            </div>

            {/* Corporate Wallet Info */}
            {walletType === 'employee' && dailySpendLimit && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Wallet Entreprise</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Dépensé aujourd'hui</span>
                  <span className="font-medium text-blue-900">
                    {getTodaySpending().toLocaleString()} / {dailySpendLimit.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${Math.min((getTodaySpending() / dailySpendLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            <PaymentMethodSelector
              selected={paymentMethod}
              onChange={setPaymentMethod}
              walletBalance={balance}
              orderTotal={orderTotals.total}
              acceptsCash={restaurant?.accepts_cash !== false}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={() => setCurrentStep(STEPS.CONFIRM)}
              className="w-full py-4 rounded-2xl font-semibold bg-[#FF5A00] text-white active:bg-[#E55100] transition-colors"
              data-testid="continue-to-confirm"
            >
              Continuer
            </button>
          </div>
        );

      case STEPS.CONFIRM:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 text-center">Récapitulatif</h2>

            {/* Restaurant */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500">Restaurant</p>
              <p className="font-semibold text-gray-900">{restaurant?.name}</p>
            </div>

            {/* Mode */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500">Mode</p>
              <div className="flex items-center gap-2 mt-1">
                {deliveryMode === 'pickup' ? (
                  <>
                    <ShoppingBag className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-gray-900">À emporter</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-5 h-5 text-[#FF5A00]" />
                    <span className="font-semibold text-gray-900">Livraison</span>
                  </>
                )}
              </div>
              {deliveryMode === 'delivery' && address && (
                <p className="text-sm text-gray-600 mt-1">{address}</p>
              )}
            </div>

            {/* Créneau horaire */}
            {restaurant?.allowScheduledOrders && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200">
                <p className="text-sm text-gray-500">Heure de livraison</p>
                <div className="mt-1">
                  <SelectedTimeSlotBadge isAsap={isAsap} selectedSlot={scheduledSlot} />
                </div>
              </div>
            )}

            {/* Items */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500 mb-3">Articles ({cartItems.length})</p>
              <div className="space-y-2">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-gray-900">{item.quantity}x {item.name}</p>
                      {item.instructions && (
                        <p className="text-xs text-orange-600">⚠️ {item.instructions}</p>
                      )}
                    </div>
                    <p className="text-gray-600">{(item.price_at_time * item.quantity).toLocaleString()} F</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Promo Code */}
            <PromoCodeInput
              orderTotal={orderTotals.subtotal}
              isFirstOrder={true}
              appliedPromo={appliedPromo}
              onApplyPromo={setAppliedPromo}
              onRemovePromo={() => setAppliedPromo(null)}
            />

            {/* Totals */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span>{orderTotals.subtotal.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Livraison</span>
                  <span className={deliveryMode === 'pickup' || freeDelivery ? 'text-green-600' : ''}>
                    {deliveryMode === 'pickup' ? 'Gratuit (À emporter)' : 
                     freeDelivery ? 'Gratuit (Promo)' : 
                     `${(orderTotals.deliveryFee || 0).toLocaleString()} FCFA`}
                  </span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Réduction ({appliedPromo?.promo?.code})</span>
                    <span>-{promoDiscount.toLocaleString()} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t">
                  <span>Total</span>
                  <span className="text-[#FF5A00]">{finalTotal.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500">Paiement</p>
              <p className="font-semibold text-gray-900">
                {paymentMethod === 'wallet' ? '💳 Wallet Actoos' : '💵 Cash à la livraison'}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={isLoading}
              className="w-full py-5 rounded-2xl font-bold text-lg bg-[#FF5A00] text-white active:bg-[#E55100] transition-colors flex items-center justify-center gap-2"
              data-testid="place-order-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Traitement...
                </>
              ) : (
                `Commander • ${finalTotal.toLocaleString()} FCFA`
              )}
            </button>
          </div>
        );

      case STEPS.SUCCESS:
        // Build order data for tracking
        const trackingOrderData = {
          id: orderResult?.id || `ORD-${Date.now().toString(36).toUpperCase()}`,
          status: 'confirmed',
          restaurant: {
            id: restaurant?.id,
            name: restaurant?.name,
            address: restaurant?.address || 'Bamako',
            phone: restaurant?.phone || '+223 70 00 00 01',
          },
          delivery_address: address || 'Adresse non spécifiée',
          delivery_mode: deliveryMode,
          items: cartItems.map(item => ({
            name: item.name,
            quantity: item.quantity,
          })),
          total: orderResult?.final_total || finalTotal,
          handshake_code: orderResult?.delivery_code || '#A42',
          estimated_arrival: new Date(Date.now() + 35 * 60000).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          created_at: new Date().toISOString(),
          scheduled_time: !isAsap && scheduledSlot ? {
            day: scheduledSlot.day.dayLabel,
            time: scheduledSlot.slot.time,
          } : null,
          timeline: [
            { status: 'confirmed', time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), completed: true },
            { status: 'preparing', time: null, completed: false },
            { status: 'ready', time: null, completed: false },
            { status: 'picked_up', time: null, completed: false },
            { status: 'arriving', time: null, completed: false },
            { status: 'delivered', time: null, completed: false },
          ],
        };

        return (
          <div className="text-center py-8">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Commande confirmée !</h2>
            <p className="text-gray-500 mb-6">
              {deliveryMode === 'pickup' 
                ? 'Présentez ce code au restaurant'
                : 'Dictez ce code au livreur'
              }
            </p>

            {/* Code Handshake #A42 */}
            <div className="bg-[#FF5A00] rounded-3xl p-6 mb-6">
              <p className="text-white/80 text-sm mb-2">Code Handshake</p>
              <p className="text-white text-5xl font-bold tracking-widest" data-testid="handshake-code">
                {orderResult?.delivery_code || '#A42'}
              </p>
            </div>

            {/* Order Info */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Commande</span>
                <span className="font-semibold">{trackingOrderData.id}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-500">Restaurant</span>
                <span className="font-semibold">{restaurant?.name}</span>
              </div>
              {/* Scheduled time */}
              {!isAsap && scheduledSlot && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-500">Heure prévue</span>
                  <span className="font-semibold text-[#FF5A00] flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {scheduledSlot.day.dayLabel} à {scheduledSlot.slot.time}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Total payé</span>
                <span className="font-bold text-[#FF5A00]">{(orderResult?.total_amount || finalTotal).toLocaleString()} FCFA</span>
              </div>
            </div>

            {/* Pickup Map Placeholder */}
            {deliveryMode === 'pickup' && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Navigation className="w-6 h-6 text-blue-600" />
                  <div className="text-left">
                    <p className="font-semibold text-blue-900">Itinéraire vers le restaurant</p>
                    <p className="text-sm text-blue-700">{restaurant?.name} - Bamako</p>
                  </div>
                </div>
              </div>
            )}

            {/* Track Order Button - Only for delivery */}
            {deliveryMode === 'delivery' && (
              <button
                onClick={() => onOrderComplete(trackingOrderData)}
                className="w-full py-4 rounded-2xl font-semibold bg-[#FF5A00] text-white active:bg-[#E55100] transition-colors mb-3 flex items-center justify-center gap-2"
                data-testid="track-order-btn"
              >
                <Truck className="w-5 h-5" />
                Suivre ma commande
              </button>
            )}

            <button
              onClick={() => onOrderComplete(null)}
              className="w-full py-4 rounded-2xl font-semibold bg-gray-100 text-gray-900 active:bg-gray-200 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Progress indicator
  const getProgress = () => {
    let steps;
    if (deliveryMode === 'pickup') {
      steps = restaurant?.allowScheduledOrders 
        ? [STEPS.DELIVERY_MODE, STEPS.SCHEDULE, STEPS.PHONE, STEPS.PAYMENT, STEPS.CONFIRM, STEPS.SUCCESS]
        : [STEPS.DELIVERY_MODE, STEPS.PHONE, STEPS.PAYMENT, STEPS.CONFIRM, STEPS.SUCCESS];
    } else {
      steps = restaurant?.allowScheduledOrders 
        ? [STEPS.DELIVERY_MODE, STEPS.SCHEDULE, STEPS.ADDRESS, STEPS.PHONE, STEPS.PAYMENT, STEPS.CONFIRM, STEPS.SUCCESS]
        : [STEPS.DELIVERY_MODE, STEPS.ADDRESS, STEPS.PHONE, STEPS.PAYMENT, STEPS.CONFIRM, STEPS.SUCCESS];
    }
    
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="checkout-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentStep === STEPS.SUCCESS) {
                onOrderComplete();
              } else if (currentStep === STEPS.DELIVERY_MODE) {
                onBack();
              } else if (currentStep === STEPS.SCHEDULE) {
                setCurrentStep(STEPS.DELIVERY_MODE);
              } else if (currentStep === STEPS.PHONE && deliveryMode === 'pickup' && !restaurant?.allowScheduledOrders) {
                setCurrentStep(STEPS.DELIVERY_MODE);
              } else if (currentStep === STEPS.PHONE && deliveryMode === 'pickup' && restaurant?.allowScheduledOrders) {
                setCurrentStep(STEPS.SCHEDULE);
              } else if (currentStep === STEPS.ADDRESS && restaurant?.allowScheduledOrders) {
                setCurrentStep(STEPS.SCHEDULE);
              } else {
                // Go back one step
                const steps = restaurant?.allowScheduledOrders 
                  ? [STEPS.DELIVERY_MODE, STEPS.SCHEDULE, STEPS.ADDRESS, STEPS.PHONE, STEPS.PAYMENT, STEPS.CONFIRM]
                  : [STEPS.DELIVERY_MODE, STEPS.ADDRESS, STEPS.PHONE, STEPS.PAYMENT, STEPS.CONFIRM];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1]);
                }
              }
            }}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            data-testid="checkout-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Checkout</h1>
            <p className="text-xs text-gray-500">{restaurant?.name}</p>
          </div>
        </div>

        {/* Progress bar */}
        {currentStep !== STEPS.SUCCESS && (
          <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#FF5A00] rounded-full transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4 pb-8">
        {renderStepContent()}
      </div>

      {/* TopUp Sheet */}
      <TouchPaySheet
        isOpen={showTopUp}
        onClose={() => setShowTopUp(false)}
        onSuccess={handleTopUpSuccess}
        requiredAmount={orderTotals.total - balance}
      />
    </div>
  );
}
