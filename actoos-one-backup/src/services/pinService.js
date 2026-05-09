/**
 * ACTOOS ONE - PIN Service
 * 
 * Gestion des PINs utilisateurs pour les paiements P2P.
 * PRODUCTION MODE
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

/**
 * Vérifier si l'utilisateur a un PIN défini
 */
export async function hasPin(userId) {
  if (!isSupabaseConfigured() || !userId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('user_pins')
      .select('id')
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Définir ou mettre à jour le PIN d'un utilisateur
 */
export async function setPin(userId, pin) {
  if (!isSupabaseConfigured() || !userId) {
    return { success: false, error: 'Configuration invalide' };
  }

  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return { success: false, error: 'Le PIN doit être composé de 4 chiffres' };
  }

  try {
    // Utiliser la fonction RPC sécurisée pour hasher le PIN
    const { data, error } = await supabase.rpc('set_user_pin', {
      p_user_id: userId,
      p_pin: pin
    });

    if (error) {
      // Fallback: insertion directe (moins sécurisé mais fonctionne sans pgcrypto)
      console.warn('RPC set_user_pin non disponible, utilisation du fallback');
      
      const { error: insertError } = await supabase
        .from('user_pins')
        .upsert({
          user_id: userId,
          pin_hash: await hashPin(pin),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur setPin:', error);
    return { success: false, error: 'Erreur lors de la définition du PIN' };
  }
}

/**
 * Vérifier le PIN d'un utilisateur
 */
export async function verifyPin(userId, pin) {
  if (!isSupabaseConfigured() || !userId) {
    return { valid: false, error: 'Configuration invalide' };
  }

  if (!pin || pin.length !== 4) {
    return { valid: false, error: 'PIN invalide' };
  }

  try {
    // Essayer d'abord avec la fonction RPC
    const { data, error } = await supabase.rpc('verify_user_pin', {
      p_user_id: userId,
      p_pin: pin
    });

    if (!error) {
      return { valid: !!data, error: data ? null : 'PIN incorrect' };
    }

    // Fallback: vérification manuelle
    console.warn('RPC verify_user_pin non disponible, utilisation du fallback');
    
    const { data: pinRecord, error: fetchError } = await supabase
      .from('user_pins')
      .select('pin_hash, failed_attempts, locked_until')
      .eq('user_id', userId)
      .single();

    if (fetchError || !pinRecord) {
      return { valid: false, error: 'PIN non configuré' };
    }

    // Vérifier si le compte est bloqué
    if (pinRecord.locked_until && new Date(pinRecord.locked_until) > new Date()) {
      const minutes = Math.ceil((new Date(pinRecord.locked_until) - new Date()) / 60000);
      return { valid: false, error: `Compte bloqué. Réessayez dans ${minutes} minute(s)` };
    }

    // Vérifier le PIN (fallback simple - en production utiliser bcrypt côté serveur)
    const isValid = await verifyHashedPin(pin, pinRecord.pin_hash);

    if (isValid) {
      // Reset des tentatives échouées
      await supabase
        .from('user_pins')
        .update({ failed_attempts: 0, locked_until: null })
        .eq('user_id', userId);
    } else {
      // Incrémenter les tentatives échouées
      const newAttempts = (pinRecord.failed_attempts || 0) + 1;
      const lockUntil = newAttempts >= 5 
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString() 
        : null;

      await supabase
        .from('user_pins')
        .update({ 
          failed_attempts: newAttempts, 
          locked_until: lockUntil 
        })
        .eq('user_id', userId);

      if (newAttempts >= 5) {
        return { valid: false, error: 'Trop de tentatives. Compte bloqué 15 minutes' };
      }
    }

    return { valid: isValid, error: isValid ? null : 'PIN incorrect' };
  } catch (error) {
    console.error('Erreur verifyPin:', error);
    return { valid: false, error: 'Erreur de vérification' };
  }
}

/**
 * Hash simple du PIN (fallback si pgcrypto non disponible)
 * En production, utiliser bcrypt côté serveur
 */
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'actoos_salt_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vérifier un PIN hashé (fallback)
 */
async function verifyHashedPin(pin, hash) {
  const pinHash = await hashPin(pin);
  return pinHash === hash;
}

export default {
  hasPin,
  setPin,
  verifyPin
};
