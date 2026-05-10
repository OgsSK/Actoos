// Données géographiques centralisées pour ACTOOS ONE
// Mali - Bamako (Lancement initial)

export const SUPPORTED_COUNTRIES = [
  {
    id: 'ml',
    name: 'Mali',
    code: '+223',
    flag: '🇲🇱',
    currency: 'XOF',
    currencySymbol: 'FCFA',
  },
];

export const CITIES = [
  {
    id: 'bamako',
    name: 'Bamako',
    country_id: 'ml',
    is_active: true,
  },
];

// Quartiers de Bamako par Commune
export const BAMAKO_NEIGHBORHOODS = [
  // Commune I
  { id: 'banconi', name: 'Banconi', commune: 'Commune I', city_id: 'bamako' },
  { id: 'boulkassoumbougou', name: 'Boulkassoumbougou', commune: 'Commune I', city_id: 'bamako' },
  { id: 'djelibougou', name: 'Djélibougou', commune: 'Commune I', city_id: 'bamako' },
  { id: 'doumanzana', name: 'Doumanzana', commune: 'Commune I', city_id: 'bamako' },
  { id: 'fadjiguila', name: 'Fadjiguila', commune: 'Commune I', city_id: 'bamako' },
  { id: 'korofina-nord', name: 'Korofina Nord', commune: 'Commune I', city_id: 'bamako' },
  { id: 'korofina-sud', name: 'Korofina Sud', commune: 'Commune I', city_id: 'bamako' },
  { id: 'nafadji', name: 'Nafadji', commune: 'Commune I', city_id: 'bamako' },
  { id: 'sikoroni', name: 'Sikoroni', commune: 'Commune I', city_id: 'bamako' },
  { id: 'sotuba', name: 'Sotuba', commune: 'Commune I', city_id: 'bamako' },
  
  // Commune II
  { id: 'bougouba', name: 'Bougouba', commune: 'Commune II', city_id: 'bamako' },
  { id: 'hippodrome', name: 'Hippodrome', commune: 'Commune II', city_id: 'bamako' },
  { id: 'medina-coura', name: 'Médina Coura', commune: 'Commune II', city_id: 'bamako' },
  { id: 'missira', name: 'Missira', commune: 'Commune II', city_id: 'bamako' },
  { id: 'niarela', name: 'Niarela', commune: 'Commune II', city_id: 'bamako' },
  { id: 'quinzambougou', name: 'Quinzambougou', commune: 'Commune II', city_id: 'bamako' },
  { id: 'tsf', name: 'TSF', commune: 'Commune II', city_id: 'bamako' },
  { id: 'zone-industrielle', name: 'Zone Industrielle', commune: 'Commune II', city_id: 'bamako' },
  
  // Commune III
  { id: 'bamako-coura', name: 'Bamako Coura', commune: 'Commune III', city_id: 'bamako' },
  { id: 'darsalam', name: 'Darsalam', commune: 'Commune III', city_id: 'bamako' },
  { id: 'ntomikorobougou', name: 'N\'Tomikorobougou', commune: 'Commune III', city_id: 'bamako' },
  { id: 'ouolofobougou', name: 'Ouolofobougou', commune: 'Commune III', city_id: 'bamako' },
  { id: 'point-g', name: 'Point G', commune: 'Commune III', city_id: 'bamako' },
  { id: 'same', name: 'Samé', commune: 'Commune III', city_id: 'bamako' },
  
  // Commune IV
  { id: 'djicoroni-para', name: 'Djicoroni Para', commune: 'Commune IV', city_id: 'bamako' },
  { id: 'hamdallaye', name: 'Hamdallaye', commune: 'Commune IV', city_id: 'bamako' },
  { id: 'lafiabougou', name: 'Lafiabougou', commune: 'Commune IV', city_id: 'bamako' },
  { id: 'lassa', name: 'Lassa', commune: 'Commune IV', city_id: 'bamako' },
  { id: 'sebenikoro', name: 'Sébénikoro', commune: 'Commune IV', city_id: 'bamako' },
  { id: 'taliko', name: 'Taliko', commune: 'Commune IV', city_id: 'bamako' },
  
  // Commune V
  { id: 'aci-2000', name: 'ACI 2000', commune: 'Commune V', city_id: 'bamako' },
  { id: 'badalabougou', name: 'Badalabougou', commune: 'Commune V', city_id: 'bamako' },
  { id: 'daoudabougou', name: 'Daoudabougou', commune: 'Commune V', city_id: 'bamako' },
  { id: 'kalaban-coura', name: 'Kalaban Coura', commune: 'Commune V', city_id: 'bamako' },
  { id: 'quartier-mali', name: 'Quartier Mali', commune: 'Commune V', city_id: 'bamako' },
  { id: 'sabalibougou', name: 'Sabalibougou', commune: 'Commune V', city_id: 'bamako' },
  { id: 'torokorobougou', name: 'Torokorobougou', commune: 'Commune V', city_id: 'bamako' },
  
  // Commune VI
  { id: 'banankabougou', name: 'Banankabougou', commune: 'Commune VI', city_id: 'bamako' },
  { id: 'djanekela', name: 'Djanékéla', commune: 'Commune VI', city_id: 'bamako' },
  { id: 'faladie', name: 'Faladié', commune: 'Commune VI', city_id: 'bamako' },
  { id: 'magnambougou', name: 'Magnambougou', commune: 'Commune VI', city_id: 'bamako' },
  { id: 'missabougou', name: 'Missabougou', commune: 'Commune VI', city_id: 'bamako' },
  { id: 'niamakoro', name: 'Niamakoro', commune: 'Commune VI', city_id: 'bamako' },
  { id: 'senou', name: 'Sénou', commune: 'Commune VI', city_id: 'bamako' },
  { id: 'sogoniko', name: 'Sogoniko', commune: 'Commune VI', city_id: 'bamako' },
  { id: 'yirimadio', name: 'Yirimadio', commune: 'Commune VI', city_id: 'bamako' },
];

// Helper: Obtenir les quartiers formatés pour les selects
export const getFormattedAddresses = (cityId = 'bamako') => {
  return BAMAKO_NEIGHBORHOODS
    .filter(n => n.city_id === cityId)
    .map(n => ({
      id: n.id,
      label: `Bamako, ${n.name}`,
      name: n.name,
      commune: n.commune,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

// Helper: Obtenir les quartiers groupés par commune
export const getNeighborhoodsByCommune = (cityId = 'bamako') => {
  const neighborhoods = BAMAKO_NEIGHBORHOODS.filter(n => n.city_id === cityId);
  const grouped = {};
  
  neighborhoods.forEach(n => {
    if (!grouped[n.commune]) {
      grouped[n.commune] = [];
    }
    grouped[n.commune].push(n);
  });
  
  // Trier les quartiers dans chaque commune
  Object.keys(grouped).forEach(commune => {
    grouped[commune].sort((a, b) => a.name.localeCompare(b.name));
  });
  
  return grouped;
};

// Default address
export const DEFAULT_ADDRESS = {
  id: 'hamdallaye',
  label: 'Bamako, Hamdallaye',
  name: 'Hamdallaye',
  commune: 'Commune IV',
};
