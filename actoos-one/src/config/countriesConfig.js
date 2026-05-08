/**
 * ACTOOS ONE - Configuration Multi-Pays Afrique de l'Ouest
 * 
 * Ce fichier centralise toutes les données des pays supportés.
 * Prêt pour l'expansion: ajouter un pays = ajouter une entrée ici.
 */

// Statuts de lancement
export const LAUNCH_STATUS = {
  LAUNCHED: 'launched',      // Pays actif, restaurants disponibles
  COMING_SOON: 'coming_soon', // Visible mais pas encore lancé
  HIDDEN: 'hidden',          // Pas encore visible
};

// Configuration complète des pays Afrique de l'Ouest
export const COUNTRIES = [
  {
    code: 'ML',
    name: 'Mali',
    nameLocal: 'Mali',
    phoneCode: '+223',
    flag: '🇲🇱',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    capital: 'Bamako',
    cities: ['Bamako', 'Sikasso', 'Ségou', 'Mopti', 'Kayes', 'Koutiala', 'Gao'],
    phoneLength: 8, // Nombre de chiffres après le code pays
    phoneRegex: /^[5-9]\d{7}$/, // Validation: commence par 5-9, 8 chiffres
    phonePlaceholder: '70 00 00 00',
    phoneFormat: 'XX XX XX XX',
    operators: ['Orange', 'Malitel', 'Telecel'],
    status: LAUNCH_STATUS.LAUNCHED, // 🚀 LANCÉ
    launchedAt: '2026-05-01',
    timezone: 'Africa/Bamako',
    languages: ['fr', 'bm'], // Français, Bambara
  },
  {
    code: 'SN',
    name: 'Sénégal',
    nameLocal: 'Sénégal',
    phoneCode: '+221',
    flag: '🇸🇳',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    capital: 'Dakar',
    cities: ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack', 'Mbour'],
    phoneLength: 9,
    phoneRegex: /^[7]\d{8}$/, // Commence par 7, 9 chiffres
    phonePlaceholder: '77 000 00 00',
    phoneFormat: 'XX XXX XX XX',
    operators: ['Orange', 'Free', 'Expresso'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Dakar',
    languages: ['fr', 'wo'], // Français, Wolof
  },
  {
    code: 'CI',
    name: 'Côte d\'Ivoire',
    nameLocal: 'Côte d\'Ivoire',
    phoneCode: '+225',
    flag: '🇨🇮',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    capital: 'Abidjan',
    cities: ['Abidjan', 'Bouaké', 'Yamoussoukro', 'Korhogo', 'San-Pédro', 'Daloa'],
    phoneLength: 10,
    phoneRegex: /^[0-9]\d{9}$/, // 10 chiffres
    phonePlaceholder: '07 00 00 00 00',
    phoneFormat: 'XX XX XX XX XX',
    operators: ['Orange', 'MTN', 'Moov'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Abidjan',
    languages: ['fr'],
  },
  {
    code: 'BF',
    name: 'Burkina Faso',
    nameLocal: 'Burkina Faso',
    phoneCode: '+226',
    flag: '🇧🇫',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    capital: 'Ouagadougou',
    cities: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya'],
    phoneLength: 8,
    phoneRegex: /^[5-7]\d{7}$/, // Commence par 5-7, 8 chiffres
    phonePlaceholder: '70 00 00 00',
    phoneFormat: 'XX XX XX XX',
    operators: ['Orange', 'Moov', 'Telecel'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Ouagadougou',
    languages: ['fr'],
  },
  {
    code: 'GN',
    name: 'Guinée',
    nameLocal: 'Guinée',
    phoneCode: '+224',
    flag: '🇬🇳',
    currency: 'GNF',
    currencySymbol: 'GNF',
    capital: 'Conakry',
    cities: ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia', 'Labé'],
    phoneLength: 9,
    phoneRegex: /^[6]\d{8}$/, // Commence par 6, 9 chiffres
    phonePlaceholder: '620 00 00 00',
    phoneFormat: 'XXX XX XX XX',
    operators: ['Orange', 'MTN', 'Cellcom'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Conakry',
    languages: ['fr'],
  },
  {
    code: 'NE',
    name: 'Niger',
    nameLocal: 'Niger',
    phoneCode: '+227',
    flag: '🇳🇪',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    capital: 'Niamey',
    cities: ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua'],
    phoneLength: 8,
    phoneRegex: /^[89]\d{7}$/, // Commence par 8-9, 8 chiffres
    phonePlaceholder: '90 00 00 00',
    phoneFormat: 'XX XX XX XX',
    operators: ['Airtel', 'Orange', 'Moov'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Niamey',
    languages: ['fr'],
  },
  {
    code: 'TG',
    name: 'Togo',
    nameLocal: 'Togo',
    phoneCode: '+228',
    flag: '🇹🇬',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    capital: 'Lomé',
    cities: ['Lomé', 'Sokodé', 'Kara', 'Kpalimé', 'Atakpamé'],
    phoneLength: 8,
    phoneRegex: /^[9]\d{7}$/, // Commence par 9, 8 chiffres
    phonePlaceholder: '90 00 00 00',
    phoneFormat: 'XX XX XX XX',
    operators: ['Togocel', 'Moov'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Lome',
    languages: ['fr'],
  },
  {
    code: 'BJ',
    name: 'Bénin',
    nameLocal: 'Bénin',
    phoneCode: '+229',
    flag: '🇧🇯',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    capital: 'Porto-Novo',
    cities: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Djougou'],
    phoneLength: 8,
    phoneRegex: /^[9]\d{7}$/, // Commence par 9, 8 chiffres
    phonePlaceholder: '97 00 00 00',
    phoneFormat: 'XX XX XX XX',
    operators: ['MTN', 'Moov'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Porto-Novo',
    languages: ['fr'],
  },
  {
    code: 'GW',
    name: 'Guinée-Bissau',
    nameLocal: 'Guiné-Bissau',
    phoneCode: '+245',
    flag: '🇬🇼',
    currency: 'XOF',
    currencySymbol: 'FCFA',
    capital: 'Bissau',
    cities: ['Bissau', 'Bafatá', 'Gabú', 'Bissorã'],
    phoneLength: 7,
    phoneRegex: /^[5-7]\d{6}$/, // 7 chiffres
    phonePlaceholder: '500 00 00',
    phoneFormat: 'XXX XX XX',
    operators: ['Orange', 'MTN'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Bissau',
    languages: ['pt', 'fr'], // Portugais, Français
  },
  {
    code: 'MR',
    name: 'Mauritanie',
    nameLocal: 'موريتانيا',
    phoneCode: '+222',
    flag: '🇲🇷',
    currency: 'MRU',
    currencySymbol: 'MRU',
    capital: 'Nouakchott',
    cities: ['Nouakchott', 'Nouadhibou', 'Kaédi', 'Zouérat'],
    phoneLength: 8,
    phoneRegex: /^[234]\d{7}$/, // Commence par 2-4, 8 chiffres
    phonePlaceholder: '20 00 00 00',
    phoneFormat: 'XX XX XX XX',
    operators: ['Mauritel', 'Mattel', 'Chinguitel'],
    status: LAUNCH_STATUS.COMING_SOON,
    launchedAt: null,
    timezone: 'Africa/Nouakchott',
    languages: ['ar', 'fr'], // Arabe, Français
  },
];

// ============ HELPER FUNCTIONS ============

/**
 * Obtenir un pays par son code ISO
 */
export function getCountryByCode(code) {
  return COUNTRIES.find(c => c.code === code) || null;
}

/**
 * Obtenir un pays par son code téléphonique
 */
export function getCountryByPhoneCode(phoneCode) {
  const normalized = phoneCode.startsWith('+') ? phoneCode : `+${phoneCode}`;
  return COUNTRIES.find(c => c.phoneCode === normalized) || null;
}

/**
 * Obtenir le pays par défaut (Mali)
 */
export function getDefaultCountry() {
  return COUNTRIES.find(c => c.code === 'ML') || COUNTRIES[0];
}

/**
 * Obtenir tous les pays actifs (lancés ou bientôt)
 */
export function getActiveCountries() {
  return COUNTRIES.filter(c => c.status !== LAUNCH_STATUS.HIDDEN);
}

/**
 * Obtenir les pays lancés uniquement
 */
export function getLaunchedCountries() {
  return COUNTRIES.filter(c => c.status === LAUNCH_STATUS.LAUNCHED);
}

/**
 * Vérifier si un pays est lancé
 */
export function isCountryLaunched(countryCode) {
  const country = getCountryByCode(countryCode);
  return country?.status === LAUNCH_STATUS.LAUNCHED;
}

/**
 * Valider un numéro de téléphone pour un pays donné
 */
export function validatePhoneForCountry(phone, countryCode) {
  const country = getCountryByCode(countryCode);
  if (!country) {
    return { valid: false, error: 'Pays non reconnu' };
  }

  // Nettoyer le numéro (enlever espaces, tirets, etc.)
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  
  // Vérifier la longueur
  if (cleaned.length !== country.phoneLength) {
    return { 
      valid: false, 
      error: `Le numéro doit contenir ${country.phoneLength} chiffres`,
      expected: country.phoneLength,
      actual: cleaned.length,
    };
  }

  // Vérifier le format avec regex
  if (!country.phoneRegex.test(cleaned)) {
    return { 
      valid: false, 
      error: `Format invalide. Exemple: ${country.phonePlaceholder}`,
    };
  }

  // Numéro valide - retourner le format normalisé
  const normalized = `${country.phoneCode}${cleaned}`;
  
  return {
    valid: true,
    normalized,
    formatted: formatPhoneDisplay(cleaned, country),
    country,
  };
}

/**
 * Formater un numéro pour l'affichage
 */
export function formatPhoneDisplay(phone, country) {
  const cleaned = phone.replace(/\D/g, '');
  const format = country.phoneFormat;
  
  let result = '';
  let phoneIndex = 0;
  
  for (let i = 0; i < format.length && phoneIndex < cleaned.length; i++) {
    if (format[i] === 'X') {
      result += cleaned[phoneIndex];
      phoneIndex++;
    } else {
      result += format[i];
    }
  }
  
  return result;
}

/**
 * Formater le numéro pendant la saisie
 */
export function formatPhoneInput(value, country) {
  // Garder seulement les chiffres
  const digits = value.replace(/\D/g, '').slice(0, country.phoneLength);
  return formatPhoneDisplay(digits, country);
}

/**
 * Détecter le pays à partir d'un numéro complet (avec code pays)
 */
export function detectCountryFromPhone(fullPhone) {
  // Nettoyer
  let cleaned = fullPhone.replace(/[\s\-\.\(\)]/g, '');
  
  // Ajouter + si manquant
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2);
    } else {
      cleaned = '+' + cleaned;
    }
  }

  // Chercher le pays correspondant
  for (const country of COUNTRIES) {
    if (cleaned.startsWith(country.phoneCode)) {
      const localNumber = cleaned.slice(country.phoneCode.length);
      return {
        country,
        localNumber,
        fullNumber: cleaned,
      };
    }
  }

  return null;
}

/**
 * Obtenir les villes d'un pays
 */
export function getCitiesForCountry(countryCode) {
  const country = getCountryByCode(countryCode);
  return country?.cities || [];
}

/**
 * Formater le prix selon la devise du pays
 */
export function formatPrice(amount, countryCode) {
  const country = getCountryByCode(countryCode);
  if (!country) return `${amount} FCFA`;

  // Pour les devises FCFA, pas de décimales
  if (country.currency === 'XOF') {
    return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`;
  }
  
  // Pour les autres devises
  return `${Math.round(amount).toLocaleString('fr-FR')} ${country.currencySymbol}`;
}

// Export par défaut
export default {
  COUNTRIES,
  LAUNCH_STATUS,
  getCountryByCode,
  getCountryByPhoneCode,
  getDefaultCountry,
  getActiveCountries,
  getLaunchedCountries,
  isCountryLaunched,
  validatePhoneForCountry,
  formatPhoneDisplay,
  formatPhoneInput,
  detectCountryFromPhone,
  getCitiesForCountry,
  formatPrice,
};
