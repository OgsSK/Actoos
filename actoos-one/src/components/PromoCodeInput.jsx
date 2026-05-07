import { useState } from 'react';
import { Tag, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { validatePromoCode, markPromoCodeUsed } from '../data/promotionsData';

export function PromoCodeInput({ 
  orderTotal, 
  isFirstOrder = false,
  appliedPromo,
  onApplyPromo,
  onRemovePromo 
}) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;
    
    setIsValidating(true);
    setError('');
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 800));
    
    const result = validatePromoCode(code, orderTotal, isFirstOrder);
    
    if (result.valid) {
      markPromoCodeUsed(code.toUpperCase());
      onApplyPromo?.(result);
      setCode('');
      setIsExpanded(false);
    } else {
      setError(result.error);
    }
    
    setIsValidating(false);
  };

  if (appliedPromo) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">{appliedPromo.promo.code || 'Promotion'}</p>
              <p className="text-sm text-green-600">{appliedPromo.message}</p>
            </div>
          </div>
          <button
            onClick={onRemovePromo}
            className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center active:bg-green-200"
          >
            <X className="w-4 h-4 text-green-700" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-4 flex items-center justify-between active:bg-gray-50"
        data-testid="promo-code-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-xl flex items-center justify-center">
            <Tag className="w-5 h-5 text-[#FF5A00]" />
          </div>
          <span className="font-medium text-gray-900">Ajouter un code promo</span>
        </div>
        <span className="text-[#FF5A00] font-medium text-sm">
          {isExpanded ? 'Fermer' : 'Ajouter'}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <div className="flex gap-2 mt-4">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Entrez votre code"
              className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#FF5A00] uppercase"
              data-testid="promo-code-input"
            />
            <button
              onClick={handleApply}
              disabled={!code.trim() || isValidating}
              className={`px-6 py-3 rounded-xl font-semibold transition-colors ${
                code.trim() && !isValidating
                  ? 'bg-[#FF5A00] text-white active:bg-[#FF5A00]/80'
                  : 'bg-gray-200 text-gray-400'
              }`}
              data-testid="apply-promo-btn"
            >
              {isValidating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'OK'
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 mt-3 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Suggestion codes */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Codes suggérés :</p>
            <div className="flex flex-wrap gap-2">
              {['BIENVENUE', 'ACTOOS20'].map((suggestedCode) => (
                <button
                  key={suggestedCode}
                  onClick={() => setCode(suggestedCode)}
                  className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700 active:bg-gray-200"
                >
                  {suggestedCode}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
