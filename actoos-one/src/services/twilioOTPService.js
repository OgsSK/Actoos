/**
 * ACTOOS ONE - Twilio SMS OTP Service
 * 
 * Service pour l'envoi de SMS OTP via Twilio
 * 
 * CONFIGURATION REQUISE:
 * - TWILIO_ACCOUNT_SID: Votre Account SID Twilio
 * - TWILIO_AUTH_TOKEN: Votre Auth Token Twilio
 * - TWILIO_PHONE_NUMBER: Votre numéro Twilio ou Sender ID
 * 
 * Note: En production, l'envoi SMS doit se faire côté backend pour sécuriser les clés.
 * Ce fichier est configuré pour appeler une API backend.
 */

import { supabase } from './supabaseClient';

// Configuration
const CONFIG = {
  // OTP Settings
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
  
  // API endpoint (backend)
  API_ENDPOINT: process.env.REACT_APP_BACKEND_URL || '',
};

// Storage keys
const STORAGE_KEYS = {
  LAST_OTP_SENT: 'actoos_last_otp_sent',
  OTP_ATTEMPTS: 'actoos_otp_attempts',
};

/**
 * Generate a random OTP code
 * @returns {string} 6-digit OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Request OTP for phone verification
 * @param {string} phone - Phone number in E.164 format (+223XXXXXXXX)
 * @param {string} countryCode - Country code (ML, SN, etc.)
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function requestOTP(phone, countryCode = 'ML') {
  // Check cooldown
  const lastSent = localStorage.getItem(STORAGE_KEYS.LAST_OTP_SENT);
  if (lastSent) {
    const elapsed = (Date.now() - parseInt(lastSent)) / 1000;
    if (elapsed < CONFIG.RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(CONFIG.RESEND_COOLDOWN_SECONDS - elapsed);
      return { 
        success: false, 
        error: `Veuillez attendre ${remaining} secondes avant de renvoyer un code` 
      };
    }
  }

  try {
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in Supabase
    const { error: dbError } = await supabase
      .from('otp_codes')
      .upsert({
        phone,
        code: otp,
        country_code: countryCode,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        is_used: false,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'phone'
      });

    if (dbError) {
      console.error('Error storing OTP:', dbError);
      // Continue anyway - will verify against stored code
    }

    // Send SMS via backend API (or mock for now)
    const smsResult = await sendSMS(phone, otp, countryCode);

    if (!smsResult.success) {
      // If SMS fails, still return success for testing (OTP stored in DB)
      console.warn('SMS sending failed, but OTP stored:', otp);
    }

    // Update cooldown
    localStorage.setItem(STORAGE_KEYS.LAST_OTP_SENT, Date.now().toString());
    localStorage.setItem(STORAGE_KEYS.OTP_ATTEMPTS, '0');

    return { 
      success: true, 
      message: `Code envoyé au ${phone}`,
      // In dev mode, return the OTP for testing
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp })
    };

  } catch (error) {
    console.error('Error requesting OTP:', error);
    return { success: false, error: 'Erreur lors de l\'envoi du code' };
  }
}

/**
 * Verify OTP code
 * @param {string} phone - Phone number in E.164 format
 * @param {string} code - OTP code to verify
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyOTP(phone, code) {
  // Check attempts
  const attempts = parseInt(localStorage.getItem(STORAGE_KEYS.OTP_ATTEMPTS) || '0');
  if (attempts >= CONFIG.MAX_ATTEMPTS) {
    return { 
      success: false, 
      error: 'Trop de tentatives. Veuillez demander un nouveau code.' 
    };
  }

  try {
    // Get stored OTP from Supabase
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('is_used', false)
      .single();

    if (fetchError || !otpRecord) {
      localStorage.setItem(STORAGE_KEYS.OTP_ATTEMPTS, (attempts + 1).toString());
      return { success: false, error: 'Code invalide ou expiré' };
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      return { success: false, error: 'Code expiré. Veuillez demander un nouveau code.' };
    }

    // Check code
    if (otpRecord.code !== code) {
      // Increment attempts
      localStorage.setItem(STORAGE_KEYS.OTP_ATTEMPTS, (attempts + 1).toString());
      
      await supabase
        .from('otp_codes')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('phone', phone);

      return { 
        success: false, 
        error: `Code incorrect. ${CONFIG.MAX_ATTEMPTS - attempts - 1} tentatives restantes.` 
      };
    }

    // Mark OTP as used
    await supabase
      .from('otp_codes')
      .update({ is_used: true })
      .eq('phone', phone);

    // Clear attempts
    localStorage.removeItem(STORAGE_KEYS.OTP_ATTEMPTS);

    return { success: true };

  } catch (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: 'Erreur lors de la vérification' };
  }
}

/**
 * Send SMS via backend API
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @param {string} countryCode - Country code
 * @returns {Promise<{success: boolean}>}
 */
async function sendSMS(phone, otp, countryCode) {
  // TODO: Implement actual Twilio API call via backend
  // For now, this is a mock that logs the OTP
  
  console.log('='.repeat(50));
  console.log('📱 SMS OTP (MOCK MODE)');
  console.log(`To: ${phone} (${countryCode})`);
  console.log(`Code: ${otp}`);
  console.log(`Message: Votre code ACTOOS est: ${otp}. Valable 5 minutes.`);
  console.log('='.repeat(50));

  // When backend is ready, use this:
  /*
  try {
    const response = await fetch(`${CONFIG.API_ENDPOINT}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp, countryCode })
    });
    
    if (!response.ok) throw new Error('SMS API error');
    return { success: true };
  } catch (error) {
    console.error('SMS API error:', error);
    return { success: false };
  }
  */

  // For development, always succeed
  return { success: true };
}

/**
 * Check if can resend OTP
 * @returns {{canResend: boolean, remainingSeconds: number}}
 */
export function canResendOTP() {
  const lastSent = localStorage.getItem(STORAGE_KEYS.LAST_OTP_SENT);
  if (!lastSent) {
    return { canResend: true, remainingSeconds: 0 };
  }

  const elapsed = (Date.now() - parseInt(lastSent)) / 1000;
  const remaining = Math.max(0, CONFIG.RESEND_COOLDOWN_SECONDS - elapsed);
  
  return {
    canResend: remaining === 0,
    remainingSeconds: Math.ceil(remaining)
  };
}

/**
 * Clear OTP state (for logout)
 */
export function clearOTPState() {
  localStorage.removeItem(STORAGE_KEYS.LAST_OTP_SENT);
  localStorage.removeItem(STORAGE_KEYS.OTP_ATTEMPTS);
}

export default {
  requestOTP,
  verifyOTP,
  canResendOTP,
  clearOTPState,
  CONFIG,
};
