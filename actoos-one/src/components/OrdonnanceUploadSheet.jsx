import { useState, useRef } from 'react';
import { 
  X,
  Upload,
  Camera,
  Image,
  FileText,
  CheckCircle,
  Loader2,
  Trash2
} from 'lucide-react';

export function OrdonnanceUploadSheet({ isOpen, onClose, onSuccess, pharmacy }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    
    // Simulate upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsUploading(false);
    setUploadComplete(true);
    
    setTimeout(() => {
      onSuccess();
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsUploading(false);
    setUploadComplete(false);
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" data-testid="ordonnance-sheet">
      <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-green-600 text-white px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Envoyer une ordonnance</h2>
                <p className="text-sm text-green-100">{pharmacy?.name}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {uploadComplete ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Ordonnance envoyée !</h3>
              <p className="text-gray-500">
                La pharmacie va analyser votre ordonnance et vous contactera sous peu.
              </p>
            </div>
          ) : isUploading ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Envoi en cours...</h3>
              <p className="text-gray-500">Veuillez patienter</p>
            </div>
          ) : (
            <>
              {/* Upload Zone */}
              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-900 font-medium mb-1">
                    Cliquez pour sélectionner une photo
                  </p>
                  <p className="text-sm text-gray-500">
                    ou glissez-déposez votre ordonnance
                  </p>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Camera className="w-4 h-4" />
                      <span>Photo</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <Image className="w-4 h-4" />
                      <span>Image</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Aperçu ordonnance"
                    className="w-full h-64 object-cover rounded-2xl"
                  />
                  <button
                    onClick={handleRemoveFile}
                    className="absolute top-3 right-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                    {selectedFile?.name}
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="ordonnance-file-input"
              />

              {/* Notes */}
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-700">
                  Notes pour le pharmacien (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Je souhaite le générique si possible..."
                  className="w-full mt-2 bg-gray-100 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  data-testid="ordonnance-notes"
                />
              </div>

              {/* Info */}
              <div className="mt-4 bg-blue-50 rounded-2xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Comment ça marche ?</strong>
                </p>
                <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
                  <li>Envoyez votre ordonnance</li>
                  <li>La pharmacie prépare votre commande</li>
                  <li>Vous recevez un devis par SMS</li>
                  <li>Confirmez et payez pour la livraison</li>
                </ol>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!selectedFile}
                className={`w-full mt-6 py-4 rounded-2xl font-bold text-lg transition-colors ${
                  selectedFile
                    ? 'bg-green-600 text-white active:bg-green-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                data-testid="submit-ordonnance-btn"
              >
                Envoyer l'ordonnance
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
