// Service OTP - Structure prête pour Supabase
// Pour l'instant mocké, sera connecté au backend plus tard

// Simuler le stockage OTP (en production: Supabase + hash)
const otpStore = new Map();

// Générer un OTP de 4 chiffres
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Hash simple pour la démo (en production: bcrypt côté serveur)
function hashOTP(otp) {
  return btoa(otp + '_actoos_salt');
}

// Envoyer OTP (mocké - en production: SMS via Twilio/Orange API)
export async function sendOTP(phoneNumber) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const otp = generateOTP();
      const hashedOtp = hashOTP(otp);
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
      
      // Stocker le hash (pas l'OTP brut)
      otpStore.set(phoneNumber, {
        hash: hashedOtp,
        expiresAt,
        attempts: 0,
      });

      // En développement: afficher l'OTP dans la console
      console.log(`📱 OTP pour ${phoneNumber}: ${otp}`);
      
      // Simuler l'envoi SMS
      resolve({
        success: true,
        message: 'OTP envoyé par SMS',
        // En dev uniquement - ne jamais faire ça en prod!
        _devOtp: otp,
      });
    }, 1000);
  });
}

// Vérifier OTP
export async function verifyOTP(phoneNumber, inputOtp) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const stored = otpStore.get(phoneNumber);
      
      if (!stored) {
        resolve({ success: false, error: 'Aucun OTP demandé pour ce numéro' });
        return;
      }

      // Vérifier expiration
      if (Date.now() > stored.expiresAt) {
        otpStore.delete(phoneNumber);
        resolve({ success: false, error: 'OTP expiré. Veuillez en demander un nouveau.' });
        return;
      }

      // Vérifier tentatives (max 3)
      if (stored.attempts >= 3) {
        otpStore.delete(phoneNumber);
        resolve({ success: false, error: 'Trop de tentatives. Veuillez en demander un nouveau.' });
        return;
      }

      // Vérifier le hash
      const inputHash = hashOTP(inputOtp);
      if (inputHash !== stored.hash) {
        stored.attempts += 1;
        resolve({ success: false, error: 'Code incorrect. Veuillez réessayer.' });
        return;
      }

      // OTP valide - supprimer après utilisation
      otpStore.delete(phoneNumber);
      
      resolve({
        success: true,
        message: 'Numéro vérifié avec succès',
      });
    }, 500);
  });
}

// Invalider OTP (après livraison)
export function invalidateOTP(phoneNumber) {
  otpStore.delete(phoneNumber);
}
