/**
 * ACTOOS ONE - Image Uploader Component
 * 
 * Composant réutilisable pour l'upload d'images avec:
 * - Sélection depuis galerie/appareil photo
 * - Preview avant upload
 * - Compression automatique
 * - Progress indicator
 */

import { useState, useRef, useCallback } from 'react';
import { 
  Camera, 
  Image as ImageIcon, 
  Upload, 
  X, 
  Loader2, 
  AlertCircle,
  Check
} from 'lucide-react';

export function ImageUploader({
  onUpload,
  currentImageUrl,
  onRemove,
  placeholder = 'Ajouter une photo',
  accept = 'image/*',
  maxSizeMB = 5,
  aspectRatio = null, // '1:1', '16:9', '4:3', null for any
  className = '',
  disabled = false,
  showPreview = true,
  variant = 'default', // 'default', 'compact', 'banner'
}) {
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Gérer la sélection de fichier
  const handleFileSelect = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadSuccess(false);

    // Validation de taille
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`Fichier trop volumineux (max ${maxSizeMB}MB)`);
      return;
    }

    // Validation de type
    if (!file.type.startsWith('image/')) {
      setError('Seules les images sont acceptées');
      return;
    }

    // Preview locale immédiate
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload
    if (onUpload) {
      setIsUploading(true);
      try {
        const result = await onUpload(file);
        if (result?.error) {
          setError(result.error.message || 'Erreur d\'upload');
          setPreview(currentImageUrl || null);
        } else if (result?.url) {
          setPreview(result.url);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 2000);
        }
      } catch (err) {
        setError(err.message || 'Erreur d\'upload');
        setPreview(currentImageUrl || null);
      } finally {
        setIsUploading(false);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload, maxSizeMB, currentImageUrl]);

  // Supprimer l'image
  const handleRemove = useCallback(() => {
    setPreview(null);
    setError(null);
    if (onRemove) {
      onRemove();
    }
  }, [onRemove]);

  // Ouvrir le sélecteur
  const openFilePicker = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Classes selon le variant
  const getContainerClasses = () => {
    const base = 'relative overflow-hidden transition-all';
    switch (variant) {
      case 'banner':
        return `${base} w-full aspect-[3/1] rounded-2xl`;
      case 'compact':
        return `${base} w-20 h-20 rounded-xl`;
      default:
        return `${base} w-full aspect-square rounded-2xl max-w-[200px]`;
    }
  };

  return (
    <div className={`${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <div className={getContainerClasses()}>
        {/* Image prévisualisée */}
        {preview && showPreview ? (
          <div className="relative w-full h-full group">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            
            {/* Overlay avec actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={openFilePicker}
                disabled={isUploading}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-100"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Loading overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
                  <p className="text-white text-xs mt-2">Upload...</p>
                </div>
              </div>
            )}

            {/* Success indicator */}
            {uploadSuccess && (
              <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
        ) : (
          /* Placeholder sans image */
          <button
            type="button"
            onClick={openFilePicker}
            disabled={disabled || isUploading}
            className={`w-full h-full border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
              disabled
                ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                : 'border-gray-300 bg-gray-50 hover:border-[#FF5A00] hover:bg-orange-50 cursor-pointer'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin" />
                <span className="text-xs text-gray-500">Upload en cours...</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  {variant === 'banner' ? (
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  ) : (
                    <Camera className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <span className="text-sm text-gray-500 text-center px-2">{placeholder}</span>
                <span className="text-xs text-gray-400">Max {maxSizeMB}MB</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-1 text-red-500 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Version simplifiée pour les formulaires
 */
export function SimpleImageUploader({
  value,
  onChange,
  onUpload,
  placeholder,
  className,
}) {
  const handleUpload = async (file) => {
    if (onUpload) {
      const result = await onUpload(file);
      if (result?.url && onChange) {
        onChange(result.url);
      }
      return result;
    }
    return { error: new Error('Pas de handler d\'upload') };
  };

  const handleRemove = () => {
    if (onChange) {
      onChange('');
    }
  };

  return (
    <ImageUploader
      currentImageUrl={value}
      onUpload={handleUpload}
      onRemove={handleRemove}
      placeholder={placeholder}
      className={className}
    />
  );
}

export default ImageUploader;
