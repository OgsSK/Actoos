import { useState } from 'react';
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
import { OTPInput } from './OTPInput';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { TouchPaySheet } from './TouchPaySheet';
import { PromoCodeInput } from './PromoCodeInput';
import { TimeSlotPicker, SelectedTimeSlotBadge } from './TimeSlotPicker';
import { useCart } from '../context/CartContext';
import { useWallet } from '../context/WalletContext';
import { sendOTP, verifyOTP } from '../services/otpService';
import { calculateOrderTotal, createOrder } from '../services/orderService';
import { getNeighborhoodsByCommune } from '../data/locationData';

const STEPS = {
  DELIVERY_MODE: 'delivery_mode',
  SCHEDULE: 'schedule',     // Nouvelle étape pour programmer la livraison
  ADDRESS: 'address',
  PHONE: 'phone',
  OTP: 'otp',
  PAYMENT: 'payment',
  CONFIRM: 'confirm',
  SUCCESS: 'success',
};

export function CheckoutScreen({ restaurant, onBack, onOrderComplete }) {
  const { cartItems, getTotal, clearCart } = useCart();
  const { balance, pay, hasEnoughBalance, checkCorporateLimit, walletType, dailySpendLimit, getTodaySpending } = useWallet();
  const [currentStep, setCurrentStep] = useState(STEPS.DELIVERY_MODE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Delivery mode: 'delivery' ou 'pickup'
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  
  // Form data
  const [address, setAddress] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+223 ');
  const [otp, setOtp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  
  // OTP dev helper
  const [devOtp, setDevOtp] = useState('');
  
  // Order result
  const [orderResult, setOrderResult] = useState(null);
  
  // TopUp sheet for insufficient balance
  const [showTopUp, setShowTopUp] = useState(false);
  
  // Promo code
  const [appliedPromo, setAppliedPromo] = useState(null);

  // Scheduled ordering
  const [isAsap, setIsAsap] = useState(true);
  const [scheduledSlot, setScheduledSlot] = useState(null);

  // Calculer le total - frais de livraison = 0 si pickup
  const deliveryFee = deliveryMode === 'pickup' ? 0 : (restaurant?.deliveryFee || 500);
  
  // Apply promo discount
  const promoDiscount = appliedPromo?.discount || 0;
  const freeDelivery = appliedPromo?.promo?.discount_type === 'free_delivery';
  const finalDeliveryFee = freeDelivery ? 0 : deliveryFee;
  
  const orderTotals = calculateOrderTotal(cartItems, finalDeliveryFee);
  const finalTotal = Math.max(0, orderTotals.total - promoDiscount);

  const handleSelectDeliveryMode = (mode) => {
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

  const handleSendOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 12) {
      setError('Veuillez entrer un numéro valide');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await sendOTP(phoneNumber);
      if (result.success) {
        setDevOtp(result._devOtp); // Dev only
        setCurrentStep(STEPS.OTP);
      } else {
        setError(result.error || 'Erreur lors de l\'envoi');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      setError('Veuillez entrer le code à 4 chiffres');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await verifyOTP(phoneNumber, otp);
      if (result.success) {
        setCurrentStep(STEPS.PAYMENT);
      } else {
        setError(result.error);
        setOtp('');
      }
    } catch (err) {
      setError('Erreur de vérification');
    } finally {
      setIsLoading(false);
    }
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
      
      const orderData = {
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
          instructions: item.instructions,
        })),
        delivery_mode: deliveryMode,
        delivery_address: deliveryMode === 'delivery' ? address : null,
        delivery_details: deliveryMode === 'delivery' ? addressDetails : null,
        phone: phoneNumber,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cash' ? 'pending' : 'paid',
        ...orderTotals,
        promo_code: appliedPromo?.promo?.code || null,
        promo_discount: promoDiscount,
        final_total: finalTotal,
        // Scheduled ordering info
        is_scheduled: !isAsap,
        scheduled_date: scheduledSlot?.day?.date?.toISOString() || null,
        scheduled_time: scheduledSlot?.slot?.time || null,
        scheduled_label: scheduledSlot ? `${scheduledSlot.day.dayLabel} à ${scheduledSlot.slot.time}` : null,
      };
      
      const result = await createOrder(orderData);
      
      if (result.success) {
        setOrderResult(result.order);
        setCurrentStep(STEPS.SUCCESS);
        clearCart();
      } else {
        setError(result.error || 'Erreur lors de la commande');
      }
    } catch (err) {
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
                placeholder="Ex: Près de la pharmacie, portail bleu..."
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
              onClick={handleSendOTP}
              disabled={isLoading || phoneNumber.length < 12}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                phoneNumber.length >= 12
                  ? 'bg-[#FF5A00] text-white active:bg-[#E55100]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="send-otp-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                'Recevoir le code'
              )}
            </button>
          </div>
        );

      case STEPS.OTP:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-8 h-8 text-[#FF5A00]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Code de vérification</h2>
              <p className="text-sm text-gray-500 mt-1">
                Entrez le code envoyé au {phoneNumber}
              </p>
            </div>

            {/* Code OTP visible en dev */}
            {devOtp && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3 text-center">
                <p className="text-xs text-yellow-700">Mode dev - Code OTP:</p>
                <p className="text-2xl font-bold text-yellow-800 tracking-widest">{devOtp}</p>
              </div>
            )}

            <OTPInput
              value={otp}
              onChange={setOtp}
              length={4}
              onComplete={handleVerifyOTP}
            />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.length !== 4}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                otp.length === 4
                  ? 'bg-[#FF5A00] text-white active:bg-[#E55100]'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="verify-otp-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Vérification...
                </>
              ) : (
                'Vérifier'
              )}
            </button>

            <button
              onClick={() => {
                setOtp('');
                setCurrentStep(STEPS.PHONE);
              }}
              className="w-full py-3 text-gray-500 text-sm"
            >
              Modifier le numéro
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
                     `${orderTotals.delivery.toLocaleString()} FCFA`}
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
                <span className="font-bold text-[#FF5A00]">{(orderResult?.final_total || finalTotal).toLocaleString()} FCFA</span>
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
        ? [STEPS.DELIVERY_MODE, STEPS.SCHEDULE, STEPS.PHONE, STEPS.OTP, STEPS.PAYMENT, STEPS.CONFIRM, STEPS.SUCCESS]
        : [STEPS.DELIVERY_MODE, STEPS.PHONE, STEPS.OTP, STEPS.PAYMENT, STEPS.CONFIRM, STEPS.SUCCESS];
    } else {
      steps = restaurant?.allowScheduledOrders 
        ? [STEPS.DELIVERY_MODE, STEPS.SCHEDULE, STEPS.ADDRESS, STEPS.PHONE, STEPS.OTP, STEPS.PAYMENT, STEPS.CONFIRM, STEPS.SUCCESS]
        : [STEPS.DELIVERY_MODE, STEPS.ADDRESS, STEPS.PHONE, STEPS.OTP, STEPS.PAYMENT, STEPS.CONFIRM, STEPS.SUCCESS];
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
                  ? [STEPS.DELIVERY_MODE, STEPS.SCHEDULE, STEPS.ADDRESS, STEPS.PHONE, STEPS.OTP, STEPS.PAYMENT, STEPS.CONFIRM]
                  : [STEPS.DELIVERY_MODE, STEPS.ADDRESS, STEPS.PHONE, STEPS.OTP, STEPS.PAYMENT, STEPS.CONFIRM];
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
