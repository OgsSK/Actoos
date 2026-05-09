/**
 * ACTOOS ONE - Storage Service
 * 
 * Service pour l'upload et la gestion des fichiers sur Supabase Storage.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';

// Buckets disponibles
export const STORAGE_BUCKETS = {
  MENU_IMAGES: 'menu-images',
  PARTNER_BANNERS: 'partner-banners',
  PROFILE_PHOTOS: 'profile-photos',
  DOCUMENTS: 'documents',
};

/**
 * Compresser une image avant upload
 * @param {File} file - Fichier image
 * @param {number} maxWidth - Largeur max (default: 800)
 * @param {number} quality - Qualité JPEG (default: 0.8)
 * @returns {Promise<Blob>} - Image compressée
 */
export async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionner si nécessaire
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Erreur de compression'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Erreur de chargement image'));
    };
    reader.onerror = () => reject(new Error('Erreur de lecture fichier'));
  });
}

/**
 * Générer un nom de fichier unique
 * @param {string} originalName - Nom original du fichier
 * @param {string} prefix - Préfixe optionnel
 * @returns {string} - Nom unique
 */
export function generateFileName(originalName, prefix = '') {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const baseName = prefix ? `${prefix}_` : '';
  return `${baseName}${timestamp}_${randomStr}.${extension}`;
}

/**
 * Upload un fichier vers Supabase Storage
 * @param {File|Blob} file - Fichier à uploader
 * @param {string} bucket - Nom du bucket
 * @param {string} path - Chemin dans le bucket
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<{url: string, path: string, error: Error|null}>}
 */
export async function uploadFile(file, bucket, path, options = {}) {
  if (!isSupabaseConfigured()) {
    return { url: null, path: null, error: new Error('Supabase non configuré') };
  }

  const { compress = true, maxWidth = 800, quality = 0.8 } = options;

  try {
    let fileToUpload = file;

    // Compresser si c'est une image
    if (compress && file.type?.startsWith('image/')) {
      fileToUpload = await compressImage(file, maxWidth, quality);
    }

    // Upload vers Supabase
    const { data, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, fileToUpload, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return { url: null, path: null, error: uploadError };
    }

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    console.log('✅ Upload réussi:', publicUrl);
    return { url: publicUrl, path: data.path, error: null };
  } catch (error) {
    console.error('Upload exception:', error);
    return { url: null, path: null, error };
  }
}

/**
 * Upload une image de menu
 * @param {File} file - Fichier image
 * @param {string} partnerId - ID du partenaire
 * @param {string} itemName - Nom de l'article (pour le préfixe)
 * @returns {Promise<{url: string, error: Error|null}>}
 */
export async function uploadMenuImage(file, partnerId, itemName = '') {
  const fileName = generateFileName(file.name, itemName.replace(/\s+/g, '_').toLowerCase());
  const path = `${partnerId || 'general'}/${fileName}`;
  return uploadFile(file, STORAGE_BUCKETS.MENU_IMAGES, path);
}

/**
 * Upload une bannière de partenaire
 * @param {File} file - Fichier image
 * @param {string} partnerId - ID du partenaire
 * @returns {Promise<{url: string, error: Error|null}>}
 */
export async function uploadPartnerBanner(file, partnerId) {
  const fileName = generateFileName(file.name, 'banner');
  const path = `${partnerId}/${fileName}`;
  return uploadFile(file, STORAGE_BUCKETS.PARTNER_BANNERS, path, { maxWidth: 1200 });
}

/**
 * Upload une photo de profil
 * @param {File} file - Fichier image
 * @param {string} userId - ID de l'utilisateur
 * @returns {Promise<{url: string, error: Error|null}>}
 */
export async function uploadProfilePhoto(file, userId) {
  const fileName = generateFileName(file.name, 'avatar');
  const path = `${userId}/${fileName}`;
  return uploadFile(file, STORAGE_BUCKETS.PROFILE_PHOTOS, path, { maxWidth: 400 });
}

/**
 * Supprimer un fichier de Supabase Storage
 * @param {string} bucket - Nom du bucket
 * @param {string} path - Chemin du fichier
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function deleteFile(bucket, path) {
  if (!isSupabaseConfigured()) {
    return { success: false, error: new Error('Supabase non configuré') };
  }

  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      return { success: false, error };
    }
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error };
  }
}

/**
 * Obtenir l'URL publique d'un fichier
 * @param {string} bucket - Nom du bucket
 * @param {string} path - Chemin du fichier
 * @returns {string} - URL publique
 */
export function getPublicUrl(bucket, path) {
  if (!isSupabaseConfigured() || !path) return '';
  
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
}

export default {
  uploadFile,
  uploadMenuImage,
  uploadPartnerBanner,
  uploadProfilePhoto,
  deleteFile,
  getPublicUrl,
  compressImage,
  generateFileName,
  STORAGE_BUCKETS,
};
