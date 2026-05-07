import { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Edit2, 
  ToggleLeft, 
  ToggleRight,
  Percent,
  Gift,
  Truck,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  X
} from 'lucide-react';
import { 
  getPartnerPromotions, 
  createPartnerPromo, 
  updatePartnerPromo,
  getAvailablePromoTypes,
  PROMO_TYPES,
  PARTNER_TYPES,
  canOfferFreeDelivery
} from '../data/promotionsData';

export function PartnerPromotionsManager({ 
  partnerId, 
  partnerName, 
  partnerType = PARTNER_TYPES.RESTAURANT 
}) {
  const [promotions, setPromotions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [availableTypes, setAvailableTypes] = useState([]);
  const canFreeDelivery = canOfferFreeDelivery(partnerId);

  useEffect(() => {
    loadPromotions();
    setAvailableTypes(getAvailablePromoTypes(partnerId, partnerType));
  }, [partnerId, partnerType]);

  const loadPromotions = () => {
    const promos = getPartnerPromotions(partnerId);
    setPromotions(promos);
  };

  const handleToggleActive = (promoId) => {
    const promo = promotions.find(p => p.id === promoId);
    if (promo) {
      updatePartnerPromo(partnerId, promoId, { is_active: !promo.is_active });
      loadPromotions();
    }
  };

  const handleDelete = (promoId) => {
    if (window.confirm('Supprimer cette promotion ?')) {
      updatePartnerPromo(partnerId, promoId, { is_active: false, deleted: true });
      loadPromotions();
    }
  };

  const getPromoIcon = (type) => {
    switch (type) {
      case PROMO_TYPES.PERCENTAGE:
        return <Percent className="w-5 h-5" />;
      case PROMO_TYPES.FREE_DELIVERY:
        return <Truck className="w-5 h-5" />;
      case PROMO_TYPES.BOGO:
      case PROMO_TYPES.FREE_ITEM:
        return <Gift className="w-5 h-5" />;
      default:
        return <Tag className="w-5 h-5" />;
    }
  };

  const getPromoTypeLabel = (type) => {
    switch (type) {
      case PROMO_TYPES.PERCENTAGE:
        return 'Pourcentage';
      case PROMO_TYPES.FIXED_AMOUNT:
        return 'Montant fixe';
      case PROMO_TYPES.FREE_DELIVERY:
        return 'Livraison gratuite';
      case PROMO_TYPES.BOGO:
        return '1+1 Gratuit';
      case PROMO_TYPES.FREE_ITEM:
        return 'Article gratuit';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Mes Promotions</h2>
          <p className="text-sm text-gray-500">
            {promotions.filter(p => p.is_active).length} active(s) sur {promotions.length}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF5A00] text-white rounded-xl font-medium active:bg-[#E55100]"
          data-testid="create-promo-btn"
        >
          <Plus className="w-5 h-5" />
          Créer
        </button>
      </div>

      {/* Delivery Mode Warning */}
      {!canFreeDelivery && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Mode Livraison ACTOOS</p>
            <p className="text-xs text-amber-600">
              La livraison étant gérée par ACTOOS, vous ne pouvez pas offrir de livraison gratuite.
            </p>
          </div>
        </div>
      )}

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-8 text-center">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune promotion créée</p>
          <p className="text-sm text-gray-400 mt-1">
            Créez votre première promotion pour attirer plus de clients !
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.filter(p => !p.deleted).map((promo) => (
            <div
              key={promo.id}
              className={`bg-white border rounded-2xl p-4 ${
                promo.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
              }`}
              data-testid={`promo-card-${promo.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    promo.is_active ? 'bg-[#FF5A00]/10 text-[#FF5A00]' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {getPromoIcon(promo.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{promo.title}</h3>
                    <p className="text-sm text-gray-500">{promo.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                        {getPromoTypeLabel(promo.type)}
                      </span>
                      {promo.code && (
                        <span className="text-xs px-2 py-1 bg-[#FF5A00]/10 rounded-full text-[#FF5A00] font-mono">
                          {promo.code}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {promo.used_count || 0} utilisations
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(promo.id)}
                    className={`p-2 rounded-lg ${
                      promo.is_active 
                        ? 'text-green-600 bg-green-50' 
                        : 'text-gray-400 bg-gray-50'
                    }`}
                    data-testid={`toggle-promo-${promo.id}`}
                  >
                    {promo.is_active ? (
                      <ToggleRight className="w-6 h-6" />
                    ) : (
                      <ToggleLeft className="w-6 h-6" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingPromo(promo)}
                    className="p-2 rounded-lg text-gray-400 bg-gray-50 hover:bg-gray-100"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="p-2 rounded-lg text-red-400 bg-red-50 hover:bg-red-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Validity dates */}
              {(promo.valid_from || promo.valid_until) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-4 h-4" />
                  {promo.valid_from && <span>Du {new Date(promo.valid_from).toLocaleDateString('fr-FR')}</span>}
                  {promo.valid_until && <span>au {new Date(promo.valid_until).toLocaleDateString('fr-FR')}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingPromo) && (
        <PromoFormModal
          partnerId={partnerId}
          partnerName={partnerName}
          partnerType={partnerType}
          availableTypes={availableTypes}
          editingPromo={editingPromo}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPromo(null);
          }}
          onSave={() => {
            loadPromotions();
            setShowCreateModal(false);
            setEditingPromo(null);
          }}
        />
      )}
    </div>
  );
}

// Modal de création/édition de promo
function PromoFormModal({ 
  partnerId, 
  partnerName, 
  partnerType, 
  availableTypes, 
  editingPromo, 
  onClose, 
  onSave 
}) {
  const [formData, setFormData] = useState({
    type: editingPromo?.type || PROMO_TYPES.PERCENTAGE,
    title: editingPromo?.title || '',
    description: editingPromo?.description || '',
    discount_value: editingPromo?.discount_value || 10,
    discount_type: editingPromo?.discount_type || 'percentage',
    code: editingPromo?.code || '',
    min_order: editingPromo?.min_order || 0,
    max_discount: editingPromo?.max_discount || null,
    max_uses_per_user: editingPromo?.max_uses_per_user || null,
    valid_from: editingPromo?.valid_from?.split('T')[0] || '',
    valid_until: editingPromo?.valid_until?.split('T')[0] || '',
    is_active: editingPromo?.is_active ?? true,
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTypeChange = (type) => {
    const typeConfig = availableTypes.find(t => t.type === type);
    if (!typeConfig?.enabled) return;

    let discountType = 'percentage';
    if (type === PROMO_TYPES.FIXED_AMOUNT) discountType = 'fixed';
    if (type === PROMO_TYPES.FREE_DELIVERY) discountType = 'free_delivery';

    setFormData(prev => ({
      ...prev,
      type,
      discount_type: discountType,
      discount_value: type === PROMO_TYPES.FREE_DELIVERY ? 0 : prev.discount_value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (!formData.code.trim()) {
      setError('Le code promo est requis');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingPromo) {
        const result = updatePartnerPromo(partnerId, editingPromo.id, {
          ...formData,
          badge: formData.type === PROMO_TYPES.PERCENTAGE 
            ? `-${formData.discount_value}%` 
            : formData.type === PROMO_TYPES.FIXED_AMOUNT 
              ? `-${formData.discount_value}F`
              : formData.type === PROMO_TYPES.BOGO ? '1+1' : null,
          badge_color: 'orange',
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = createPartnerPromo(partnerId, partnerName, partnerType, {
          ...formData,
          badge: formData.type === PROMO_TYPES.PERCENTAGE 
            ? `-${formData.discount_value}%` 
            : formData.type === PROMO_TYPES.FIXED_AMOUNT 
              ? `-${formData.discount_value}F`
              : formData.type === PROMO_TYPES.BOGO ? '1+1' : null,
          badge_color: 'orange',
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
      }

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <div className="relative bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {editingPromo ? 'Modifier la promotion' : 'Nouvelle promotion'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Type de promo */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Type de promotion
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableTypes.map((typeConfig) => (
                <button
                  key={typeConfig.type}
                  onClick={() => handleTypeChange(typeConfig.type)}
                  disabled={!typeConfig.enabled}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    formData.type === typeConfig.type
                      ? 'border-[#FF5A00] bg-[#FF5A00]/5'
                      : typeConfig.enabled
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{typeConfig.icon}</span>
                    <span className={`text-sm font-medium ${
                      formData.type === typeConfig.type ? 'text-[#FF5A00]' : 'text-gray-700'
                    }`}>
                      {typeConfig.label}
                    </span>
                  </div>
                  {!typeConfig.enabled && (
                    <p className="text-xs text-red-500 mt-1">{typeConfig.reason}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Titre de la promotion
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: -20% sur tout le menu"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/20 outline-none"
              data-testid="promo-title-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez votre promotion..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/20 outline-none resize-none"
            />
          </div>

          {/* Valeur de réduction */}
          {formData.type !== PROMO_TYPES.FREE_DELIVERY && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {formData.type === PROMO_TYPES.PERCENTAGE ? 'Pourcentage (%)' : 'Montant (FCFA)'}
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  discount_value: parseInt(e.target.value) || 0 
                }))}
                min={1}
                max={formData.type === PROMO_TYPES.PERCENTAGE ? 100 : 100000}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/20 outline-none"
                data-testid="promo-value-input"
              />
            </div>
          )}

          {/* Code promo */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Code promo
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') 
              }))}
              placeholder="Ex: RESTO20"
              maxLength={15}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/20 outline-none uppercase font-mono"
              data-testid="promo-code-input"
            />
          </div>

          {/* Commande minimum */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Commande minimum (FCFA)
            </label>
            <input
              type="number"
              value={formData.min_order}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                min_order: parseInt(e.target.value) || 0 
              }))}
              min={0}
              step={500}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/20 outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">0 = pas de minimum</p>
          </div>

          {/* Dates de validité */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Date début
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/20 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Date fin
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] focus:ring-2 focus:ring-[#FF5A00]/20 outline-none"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-2xl active:bg-[#E55100] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="save-promo-btn"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {editingPromo ? 'Enregistrer les modifications' : 'Créer la promotion'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
