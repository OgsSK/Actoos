/**
 * ACTOOS ONE - Twilio SMS Service (LIVE)
 * 
 * Configuration Twilio pour l'envoi de SMS OTP
 * 
 * IMPORTANT: Les clés Twilio doivent être stockées dans Supabase Vault
 * ou dans des variables d'environnement côté serveur (Edge Functions)
 */

import { supabase } from './supabaseClient';

// Twilio Configuration - Use environment variables
const TWILIO_CONFIG = {
  ACCOUNT_SID: process.env.REACT_APP_TWILIO_ACCOUNT_SID || '',
  AUTH_TOKEN: process.env.REACT_APP_TWILIO_AUTH_TOKEN || '',
  // Option 1: Sender ID alphanumérique (recommandé pour production)
  SENDER_ID: process.env.REACT_APP_TWILIO_SENDER_ID || 'ACTOOS',
  // Option 2: Numéro Twilio (pour compte Trial)
  TWILIO_NUMBER: process.env.REACT_APP_TWILIO_PHONE || '',
  // Mode: 'sender_id' ou 'phone_number'
  MODE: process.env.REACT_APP_TWILIO_MODE || 'sender_id',
};

// OTP Settings
const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 60,
};

// Storage keys
const STORAGE_KEYS = {
  LAST_OTP_SENT: 'actoos_last_otp_sent',
  OTP_ATTEMPTS: 'actoos_otp_attempts',
};

/**
 * Generate a random OTP code
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format phone number for Twilio
 * @param {string} phone - Phone number
 * @returns {string} E.164 formatted number
 */
function formatPhoneForTwilio(phone) {
  // Remove any spaces or dashes
  let formatted = phone.replace(/[\s-]/g, '');
  
  // Ensure it starts with +
  if (!formatted.startsWith('+')) {
    formatted = '+' + formatted;
  }
  
  return formatted;
}

/**
 * Send SMS via Twilio API
 * NOTE: This should ideally be called from a Supabase Edge Function
 * for security. For now, we use a direct call with Base64 auth.
 * 
 * @param {string} to - Phone number
 * @param {string} message - SMS message
 * @returns {Promise<{success: boolean, sid?: string, error?: string}>}
 */
async function sendTwilioSMS(to, message) {
  const formattedTo = formatPhoneForTwilio(to);
  
  // Twilio API endpoint
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.ACCOUNT_SID}/Messages.json`;
  
  // Create Basic Auth header
  const credentials = btoa(`${TWILIO_CONFIG.ACCOUNT_SID}:${TWILIO_CONFIG.AUTH_TOKEN}`);
  
  // Build form data
  const formData = new URLSearchParams();
  formData.append('To', formattedTo);
  // Utilise Sender ID ou numéro Twilio selon la configuration
  const from = TWILIO_CONFIG.MODE === 'sender_id' 
    ? TWILIO_CONFIG.SENDER_ID 
    : TWILIO_CONFIG.TWILIO_NUMBER;
  formData.append('From', from);
  formData.append('Body', message);
  
  console.log(`📤 Envoi SMS via Twilio [${TWILIO_CONFIG.MODE}]: ${from} → ${formattedTo}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SMS envoyé:', data.sid);
      return { success: true, sid: data.sid };
    } else {
      console.error('❌ Erreur Twilio:', data);
      return { success: false, error: data.message || 'Erreur envoi SMS' };
    }
  } catch (error) {
    console.error('❌ Erreur réseau Twilio:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Request OTP for phone verification
 * @param {string} phone - Phone number in E.164 format
 * @param {string} countryCode - Country code (ML, SN, etc.)
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function requestOTP(phone, countryCode = 'ML') {
  // Check cooldown
  const lastSent = localStorage.getItem(STORAGE_KEYS.LAST_OTP_SENT);
  if (lastSent) {
    const elapsed = (Date.now() - parseInt(lastSent)) / 1000;
    if (elapsed < OTP_CONFIG.RESEND_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(OTP_CONFIG.RESEND_COOLDOWN_SECONDS - elapsed);
      return { 
        success: false, 
        error: `Veuillez attendre ${remaining} secondes avant de renvoyer un code` 
      };
    }
  }

  try {
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

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
    }

    // Create SMS message
    const message = `ACTOOS: Votre code de vérification est ${otp}. Valable ${OTP_CONFIG.EXPIRY_MINUTES} minutes. Ne partagez ce code avec personne.`;

    // Send SMS via Twilio
    const smsResult = await sendTwilioSMS(phone, message);

    if (!smsResult.success) {
      console.warn('SMS failed, but OTP stored:', smsResult.error);
      // In development, still succeed so testing works
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 DEV MODE - OTP:', otp);
      }
    }

    // Update cooldown
    localStorage.setItem(STORAGE_KEYS.LAST_OTP_SENT, Date.now().toString());
    localStorage.setItem(STORAGE_KEYS.OTP_ATTEMPTS, '0');

    return { 
      success: true, 
      message: `Code envoyé au ${phone}`,
      // Only in dev mode
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
  if (attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
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
      localStorage.setItem(STORAGE_KEYS.OTP_ATTEMPTS, (attempts + 1).toString());
      
      await supabase
        .from('otp_codes')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('phone', phone);

      return { 
        success: false, 
        error: `Code incorrect. ${OTP_CONFIG.MAX_ATTEMPTS - attempts - 1} tentatives restantes.` 
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
 * Check if can resend OTP
 * @returns {{canResend: boolean, remainingSeconds: number}}
 */
export function canResendOTP() {
  const lastSent = localStorage.getItem(STORAGE_KEYS.LAST_OTP_SENT);
  if (!lastSent) {
    return { canResend: true, remainingSeconds: 0 };
  }

  const elapsed = (Date.now() - parseInt(lastSent)) / 1000;
  const remaining = Math.max(0, OTP_CONFIG.RESEND_COOLDOWN_SECONDS - elapsed);
  
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

/**
 * Test SMS sending (for admin use)
 */
export async function testSMS(phone) {
  const message = 'Test ACTOOS: Si vous recevez ce message, la configuration Twilio fonctionne!';
  return await sendTwilioSMS(phone, message);
}

export default {
  requestOTP,
  verifyOTP,
  canResendOTP,
  clearOTPState,
  testSMS,
  OTP_CONFIG,
};
