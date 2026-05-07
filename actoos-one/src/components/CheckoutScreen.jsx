import { useState } from 'react';
import { ArrowLeft, MapPin, Phone, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { OTPInput } from './OTPInput';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { useCart } from '../context/CartContext';
import { sendOTP, verifyOTP } from '../services/otpService';
import { calculateOrderTotal, createOrder } from '../services/orderService';
import { systemConfig } from '../data/mockData';

const STEPS = {
  ADDRESS: 'address',
  PHONE: 'phone',
  OTP: 'otp',
  PAYMENT: 'payment',
  CONFIRM: 'confirm',
  SUCCESS: 'success',
};

export function CheckoutScreen({ restaurant, onBack, onOrderComplete }) {
  const { cartItems, getTotal, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(STEPS.ADDRESS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form data
  const [address, setAddress] = useState('');
  const [addressDetails, setAddressDetails] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+223 ');
  const [otp, setOtp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mobile_money');
  
  // OTP dev helper
  const [devOtp, setDevOtp] = useState('');
  
  // Order result
  const [orderResult, setOrderResult] = useState(null);

  // Calculer le total
  const orderTotals = calculateOrderTotal(cartItems, restaurant?.deliveryFee || 500);

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
    setIsLoading(true);
    setError('');
    
    try {
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
        delivery_address: address,
        delivery_details: addressDetails,
        phone: phoneNumber,
        payment_method: paymentMethod,
        ...orderTotals,
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
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case STEPS.ADDRESS:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Adresse de livraison</h2>
              <p className="text-sm text-gray-500 mt-1">Où devons-nous livrer ?</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Quartier / Zone</label>
              <select
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full mt-2 bg-gray-100 text-gray-900 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
                data-testid="address-select"
              >
                <option value="">Sélectionner un quartier</option>
                <option value="Bamako, Hamdallaye">Hamdallaye</option>
                <option value="Bamako, ACI 2000">ACI 2000</option>
                <option value="Bamako, Badalabougou">Badalabougou</option>
                <option value="Bamako, Kalaban Coura">Kalaban Coura</option>
                <option value="Bamako, Magnambougou">Magnambougou</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Détails (rue, bâtiment, étage)</label>
              <textarea
                value={addressDetails}
                onChange={(e) => setAddressDetails(e.target.value)}
                placeholder="Ex: Près de la pharmacie, portail bleu..."
                className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
                data-testid="address-details"
              />
            </div>

            <button
              onClick={() => setCurrentStep(STEPS.PHONE)}
              disabled={!address}
              className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
                address
                  ? 'bg-primary text-white active:bg-primary/90'
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
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Votre numéro</h2>
              <p className="text-sm text-gray-500 mt-1">Pour vous contacter lors de la livraison</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Numéro de téléphone</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+223 XX XX XX XX"
                className="w-full mt-2 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-4 text-lg outline-none focus:ring-2 focus:ring-primary"
                data-testid="phone-input"
              />
            </div>

            {error && (
              <p className="text-danger text-sm text-center">{error}</p>
            )}

            <button
              onClick={handleSendOTP}
              disabled={isLoading || phoneNumber.length < 12}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                phoneNumber.length >= 12 && !isLoading
                  ? 'bg-primary text-white active:bg-primary/90'
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
                'Recevoir le code SMS'
              )}
            </button>
          </div>
        );

      case STEPS.OTP:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Vérification</h2>
              <p className="text-sm text-gray-500 mt-1">
                Code envoyé au {phoneNumber}
              </p>
            </div>

            <OTPInput
              length={4}
              value={otp}
              onChange={setOtp}
              disabled={isLoading}
            />

            {/* Dev helper - afficher le code en dev */}
            {devOtp && (
              <p className="text-xs text-center text-gray-400 bg-gray-100 py-2 rounded-lg">
                🔧 Dev: Code = <span className="font-mono font-bold text-primary">{devOtp}</span>
              </p>
            )}

            {error && (
              <p className="text-danger text-sm text-center">{error}</p>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.length !== 4}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                otp.length === 4 && !isLoading
                  ? 'bg-primary text-white active:bg-primary/90'
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
                setError('');
                handleSendOTP();
              }}
              disabled={isLoading}
              className="w-full py-3 text-primary font-medium"
            >
              Renvoyer le code
            </button>
          </div>
        );

      case STEPS.PAYMENT:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Paiement</h2>
              <p className="text-sm text-gray-500 mt-1">Comment souhaitez-vous payer ?</p>
            </div>

            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelect={setPaymentMethod}
              acceptsCash={restaurant?.accepts_cash || false}
            />

            {/* Résumé commande */}
            <div className="bg-gray-50 rounded-2xl p-4 mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">Résumé</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total</span>
                  <span>{orderTotals.subtotal.toLocaleString()} {systemConfig.currency}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Livraison</span>
                  <span>{orderTotals.deliveryFee.toLocaleString()} {systemConfig.currency}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span className="text-primary">{orderTotals.total.toLocaleString()} {systemConfig.currency}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                !isLoading
                  ? 'bg-primary text-white active:bg-primary/90'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              data-testid="place-order-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Commande en cours...
                </>
              ) : (
                'COMMANDER'
              )}
            </button>
          </div>
        );

      case STEPS.SUCCESS:
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Commande confirmée !</h2>
            <p className="text-gray-500 mb-6">
              Votre commande a été envoyée au restaurant
            </p>

            {orderResult && (
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">N° commande</span>
                    <span className="font-mono font-medium text-gray-900">{orderResult.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Code livraison</span>
                    <span className="font-mono font-bold text-2xl text-primary">{orderResult.delivery_code}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Donnez ce code au livreur pour récupérer votre commande
                </p>
              </div>
            )}

            <button
              onClick={onOrderComplete}
              className="w-full py-4 rounded-2xl font-semibold bg-primary text-white active:bg-primary/90 transition-colors"
              data-testid="back-to-home-btn"
            >
              Retour à l'accueil
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepNumber = () => {
    const steps = [STEPS.ADDRESS, STEPS.PHONE, STEPS.OTP, STEPS.PAYMENT];
    const index = steps.indexOf(currentStep);
    return index >= 0 ? index + 1 : 0;
  };

  const canGoBack = currentStep !== STEPS.SUCCESS && currentStep !== STEPS.ADDRESS;

  const handleBack = () => {
    const stepOrder = [STEPS.ADDRESS, STEPS.PHONE, STEPS.OTP, STEPS.PAYMENT];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
      setError('');
    } else {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="checkout-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
            data-testid="checkout-back-btn"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900">Checkout</h1>
            {currentStep !== STEPS.SUCCESS && (
              <p className="text-xs text-gray-500">Étape {getStepNumber()} sur 4</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {currentStep !== STEPS.SUCCESS && (
          <div className="flex gap-1 mt-3">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full ${
                  step <= getStepNumber() ? 'bg-primary' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4">
        {renderStepContent()}
      </div>
    </div>
  );
}
