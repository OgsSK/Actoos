/**
 * ACTOOS ONE - TouchPay Integration Service
 * 
 * Intégration du paiement mobile via TouchPay (Orange Money, Moov, etc.)
 * 
 * Documentation: https://touchpay.gm/api-documentation (ou votre provider)
 * 
 * CONFIGURATION REQUISE:
 * - REACT_APP_TOUCHPAY_API_KEY: Votre clé API TouchPay
 * - REACT_APP_TOUCHPAY_MERCHANT_ID: Votre ID marchand
 * - REACT_APP_TOUCHPAY_API_URL: URL de l'API (sandbox ou production)
 */

const TOUCHPAY_CONFIG = {
  apiKey: process.env.REACT_APP_TOUCHPAY_API_KEY || '',
  merchantId: process.env.REACT_APP_TOUCHPAY_MERCHANT_ID || '',
  apiUrl: process.env.REACT_APP_TOUCHPAY_API_URL || 'https://api.touchpay.com/v1',
  callbackUrl: process.env.REACT_APP_TOUCHPAY_CALLBACK_URL || `${window.location.origin}/api/payment/callback`,
  currency: 'XOF', // Franc CFA
};

// Vérifier si TouchPay est configuré
export const isTouchPayConfigured = () => {
  return TOUCHPAY_CONFIG.apiKey && TOUCHPAY_CONFIG.merchantId;
};

/**
 * Types de paiement supportés
 */
export const PAYMENT_METHODS = {
  ORANGE_MONEY: {
    id: 'orange_money',
    name: 'Orange Money',
    icon: '🟠',
    color: '#FF6600',
    prefixes: ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79'],
    countryCode: '+223'
  },
  MOOV_MONEY: {
    id: 'moov_money', 
    name: 'Moov Money',
    icon: '🔵',
    color: '#0066CC',
    prefixes: ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69'],
    countryCode: '+223'
  },
  SAMA_MONEY: {
    id: 'sama_money',
    name: 'Sama Money',
    icon: '🟢',
    color: '#00AA00',
    prefixes: ['80', '81', '82', '83', '84', '85'],
    countryCode: '+223'
  }
};

/**
 * Détecter le type de mobile money à partir du numéro
 */
export function detectPaymentMethod(phoneNumber) {
  // Nettoyer le numéro
  const cleaned = phoneNumber.replace(/\D/g, '');
  const lastDigits = cleaned.slice(-8);
  const prefix = lastDigits.slice(0, 2);

  for (const [key, method] of Object.entries(PAYMENT_METHODS)) {
    if (method.prefixes.includes(prefix)) {
      return method;
    }
  }

  return null;
}

/**
 * Formater un numéro de téléphone malien
 */
export function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  
  // Si le numéro commence par 223, le garder tel quel
  if (cleaned.startsWith('223')) {
    return '+' + cleaned;
  }
  
  // Sinon ajouter le préfixe Mali
  if (cleaned.length === 8) {
    return '+223' + cleaned;
  }
  
  return '+223' + cleaned.slice(-8);
}

/**
 * Initier un paiement TouchPay
 */
export async function initiatePayment(paymentData) {
  if (!isTouchPayConfigured()) {
    // Mode démo - simuler un paiement
    return simulatePayment(paymentData);
  }

  const {
    orderId,
    amount,
    phoneNumber,
    description,
    customerEmail,
    customerName
  } = paymentData;

  try {
    const response = await fetch(`${TOUCHPAY_CONFIG.apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOUCHPAY_CONFIG.apiKey}`,
        'X-Merchant-ID': TOUCHPAY_CONFIG.merchantId
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        currency: TOUCHPAY_CONFIG.currency,
        phone_number: formatPhoneNumber(phoneNumber),
        order_id: orderId,
        description: description || `Commande ACTOOS #${orderId}`,
        customer_email: customerEmail,
        customer_name: customerName,
        callback_url: TOUCHPAY_CONFIG.callbackUrl,
        return_url: `${window.location.origin}/order/${orderId}`,
        metadata: {
          order_id: orderId,
          source: 'actoos_one'
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erreur de paiement');
    }

    const result = await response.json();

    return {
      success: true,
      transactionId: result.transaction_id,
      status: result.status,
      paymentUrl: result.payment_url, // URL pour USSD push ou redirect
      message: result.message
    };

  } catch (error) {
    console.error('Erreur initiation paiement:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors du paiement'
    };
  }
}

/**
 * Vérifier le statut d'un paiement
 */
export async function checkPaymentStatus(transactionId) {
  if (!isTouchPayConfigured()) {
    // Mode démo
    return { status: 'completed', message: 'Paiement simulé réussi' };
  }

  try {
    const response = await fetch(
      `${TOUCHPAY_CONFIG.apiUrl}/payments/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${TOUCHPAY_CONFIG.apiKey}`,
          'X-Merchant-ID': TOUCHPAY_CONFIG.merchantId
        }
      }
    );

    if (!response.ok) {
      throw new Error('Erreur vérification paiement');
    }

    const result = await response.json();

    return {
      status: result.status, // pending, completed, failed, cancelled
      amount: result.amount,
      transactionId: result.transaction_id,
      paidAt: result.paid_at,
      message: result.status_message
    };

  } catch (error) {
    console.error('Erreur vérification paiement:', error);
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Annuler un paiement en attente
 */
export async function cancelPayment(transactionId) {
  if (!isTouchPayConfigured()) {
    return { success: true, message: 'Paiement annulé (simulation)' };
  }

  try {
    const response = await fetch(
      `${TOUCHPAY_CONFIG.apiUrl}/payments/${transactionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TOUCHPAY_CONFIG.apiKey}`,
          'X-Merchant-ID': TOUCHPAY_CONFIG.merchantId
        }
      }
    );

    if (!response.ok) {
      throw new Error('Erreur annulation paiement');
    }

    return { success: true, message: 'Paiement annulé' };

  } catch (error) {
    console.error('Erreur annulation paiement:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Simuler un paiement (mode démo sans clés API)
 */
async function simulatePayment(paymentData) {
  // Simuler un délai réseau
  await new Promise(resolve => setTimeout(resolve, 1500));

  const transactionId = `DEMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log('💳 [DEMO MODE] Paiement simulé:', {
    transactionId,
    amount: paymentData.amount,
    phone: paymentData.phoneNumber
  });

  return {
    success: true,
    transactionId,
    status: 'pending',
    message: 'Confirmez le paiement sur votre téléphone',
    isDemo: true
  };
}

/**
 * Simuler la confirmation d'un paiement (mode démo)
 */
export async function simulatePaymentConfirmation(transactionId) {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    status: 'completed',
    transactionId,
    message: 'Paiement confirmé (simulation)',
    isDemo: true
  };
}

/**
 * Obtenir les frais de transaction
 */
export function getTransactionFees(amount, method) {
  // Frais typiques (à ajuster selon votre contrat TouchPay)
  const feeRates = {
    orange_money: 0.015, // 1.5%
    moov_money: 0.015,
    sama_money: 0.02,
    default: 0.02
  };

  const rate = feeRates[method?.id] || feeRates.default;
  const fee = Math.ceil(amount * rate);
  
  return {
    fee,
    total: amount + fee,
    rate: rate * 100
  };
}

/**
 * Valider un numéro de téléphone mobile money
 */
export function validateMobileMoneyNumber(phoneNumber) {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Vérifier la longueur (8 chiffres pour Mali)
  if (cleaned.length !== 8 && cleaned.length !== 11) {
    return { valid: false, error: 'Numéro invalide' };
  }

  const method = detectPaymentMethod(phoneNumber);
  
  if (!method) {
    return { valid: false, error: 'Opérateur non supporté' };
  }

  return { valid: true, method };
}

export default {
  initiatePayment,
  checkPaymentStatus,
  cancelPayment,
  detectPaymentMethod,
  formatPhoneNumber,
  validateMobileMoneyNumber,
  getTransactionFees,
  isTouchPayConfigured,
  simulatePaymentConfirmation,
  PAYMENT_METHODS
};
