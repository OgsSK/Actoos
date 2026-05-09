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
  X,
  Users,
  Store,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  Search,
  Filter
} from 'lucide-react';
import { 
  getAllPromotions,
  createPlatformPromo,
  updatePromotion,
  deactivatePromotion,
  updateReferralConfig,
  getTopReferrers,
  getReferralStats,
  platformPromotions,
  partnerPromotions,
  referralConfig,
  PROMO_TYPES,
  PROMO_LEVELS
} from '../data/promotionsData';

export function AdminPromotionsManager() {
  const [activeSubTab, setActiveSubTab] = useState('platform'); // platform, partner, referral
  const [allPromos, setAllPromos] = useState({ platform: [], partner: [], referral: [] });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [referralSettings, setReferralSettings] = useState(referralConfig);
  const [referralStats, setReferralStats] = useState(null);
  const [topReferrers, setTopReferrers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const promos = getAllPromotions();
    setAllPromos(promos);
    setReferralStats(getReferralStats());
    setTopReferrers(getTopReferrers(10));
    setReferralSettings({ ...referralConfig });
  };

  const handleToggleActive = (promoId) => {
    const promo = [...allPromos.platform, ...allPromos.partner].find(p => p.id === promoId);
    if (promo) {
      updatePromotion(promoId, { is_active: !promo.is_active });
      loadData();
    }
  };

  const handleDelete = (promoId) => {
    if (window.confirm('Désactiver cette promotion ?')) {
      deactivatePromotion(promoId);
      loadData();
    }
  };

  const handleSaveReferralConfig = () => {
    updateReferralConfig(referralSettings);
    loadData();
    alert('Configuration parrainage mise à jour !');
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
      case PROMO_TYPES.FLASH_DEAL:
        return <Zap className="w-5 h-5" />;
      default:
        return <Tag className="w-5 h-5" />;
    }
  };

  const filteredPlatformPromos = allPromos.platform.filter(p =>
    !searchQuery || 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPartnerPromos = allPromos.partner.filter(p =>
    !searchQuery || 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-2">
        <button
          onClick={() => setActiveSubTab('platform')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === 'platform' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
          }`}
          data-testid="tab-platform-promos"
        >
          <Zap className="w-4 h-4" />
          Plateforme
        </button>
        <button
          onClick={() => setActiveSubTab('partner')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === 'partner' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
          }`}
          data-testid="tab-partner-promos"
        >
          <Store className="w-4 h-4" />
          Partenaires
        </button>
        <button
          onClick={() => setActiveSubTab('referral')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === 'referral' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
          }`}
          data-testid="tab-referral"
        >
          <Users className="w-4 h-4" />
          Parrainage
        </button>
      </div>

      {/* Platform Promos Tab */}
      {activeSubTab === 'platform' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Promotions Plateforme</h2>
              <p className="text-sm text-gray-500">
                Créées par vous, s'appliquent partout
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPromo(null);
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF5A00] text-white rounded-xl font-medium"
              data-testid="create-platform-promo-btn"
            >
              <Plus className="w-5 h-5" />
              Nouvelle
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre ou code..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#FF5A00] outline-none"
            />
          </div>

          {/* List */}
          <div className="space-y-3">
            {filteredPlatformPromos.map((promo) => (
              <PromoCard
                key={promo.id}
                promo={promo}
                onToggle={() => handleToggleActive(promo.id)}
                onEdit={() => {
                  setEditingPromo(promo);
                  setShowCreateModal(true);
                }}
                onDelete={() => handleDelete(promo.id)}
                getIcon={getPromoIcon}
                showLevel={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Partner Promos Tab */}
      {activeSubTab === 'partner' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Promotions Partenaires</h2>
              <p className="text-sm text-gray-500">
                Créées par les restaurants/pharmacies - vous avez le contrôle total
              </p>
            </div>
          </div>

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">Contrôle GOD MODE</p>
              <p className="text-xs text-blue-600">
                Vous pouvez désactiver ou modifier n'importe quelle promotion partenaire.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par titre, code ou partenaire..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-[#FF5A00] outline-none"
            />
          </div>

          {/* List */}
          <div className="space-y-3">
            {filteredPartnerPromos.map((promo) => (
              <PromoCard
                key={promo.id}
                promo={promo}
                onToggle={() => handleToggleActive(promo.id)}
                onEdit={() => {
                  setEditingPromo(promo);
                  setShowCreateModal(true);
                }}
                onDelete={() => handleDelete(promo.id)}
                getIcon={getPromoIcon}
                showLevel={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Referral Tab */}
      {activeSubTab === 'referral' && (
        <div className="space-y-4">
          {/* Stats */}
          {referralStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4">
                <p className="text-2xl font-bold text-gray-900">{referralStats.total_codes}</p>
                <p className="text-sm text-gray-500">Codes actifs</p>
              </div>
              <div className="bg-white rounded-2xl p-4">
                <p className="text-2xl font-bold text-green-600">{referralStats.total_successful_referrals}</p>
                <p className="text-sm text-gray-500">Parrainages réussis</p>
              </div>
              <div className="bg-white rounded-2xl p-4 col-span-2">
                <p className="text-2xl font-bold text-[#FF5A00]">{referralStats.total_bonus_paid.toLocaleString()} FCFA</p>
                <p className="text-sm text-gray-500">Total bonus versés</p>
              </div>
            </div>
          )}

          {/* Configuration */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Configuration Parrainage</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {referralSettings.is_enabled ? 'Activé' : 'Désactivé'}
                </span>
                <button
                  onClick={() => setReferralSettings(prev => ({ ...prev, is_enabled: !prev.is_enabled }))}
                  className={`p-1 rounded-lg ${
                    referralSettings.is_enabled ? 'text-green-600' : 'text-gray-400'
                  }`}
                  data-testid="toggle-referral-system"
                >
                  {referralSettings.is_enabled ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Bonus Filleul (1ère commande)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={referralSettings.referee_bonus}
                    onChange={(e) => setReferralSettings(prev => ({ 
                      ...prev, 
                      referee_bonus: parseInt(e.target.value) || 0 
                    }))}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                    data-testid="referee-bonus-input"
                  />
                  <span className="text-gray-500">FCFA</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Bonus Parrain (en wallet)</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={referralSettings.referrer_bonus}
                    onChange={(e) => setReferralSettings(prev => ({ 
                      ...prev, 
                      referrer_bonus: parseInt(e.target.value) || 0 
                    }))}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                    data-testid="referrer-bonus-input"
                  />
                  <span className="text-gray-500">FCFA</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-600">Commande minimum</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={referralSettings.min_order_amount}
                    onChange={(e) => setReferralSettings(prev => ({ 
                      ...prev, 
                      min_order_amount: parseInt(e.target.value) || 0 
                    }))}
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-[#FF5A00]"
                  />
                  <span className="text-gray-500">FCFA</span>
                </div>
              </div>

              <button
                onClick={handleSaveReferralConfig}
                className="w-full py-3 bg-[#FF5A00] text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                data-testid="save-referral-config-btn"
              >
                <CheckCircle className="w-5 h-5" />
                Enregistrer
              </button>
            </div>
          </div>

          {/* Top Referrers */}
          <div className="bg-white rounded-2xl p-4">
            <h3 className="font-bold text-gray-900 mb-4">🏆 Top Parrains</h3>
            <div className="space-y-3">
              {topReferrers.map((referrer, index) => (
                <div key={referrer.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{referrer.user_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{referrer.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#FF5A00]">{referrer.successful_referrals}</p>
                    <p className="text-xs text-gray-500">parrainages</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <PlatformPromoModal
          editingPromo={editingPromo}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPromo(null);
          }}
          onSave={() => {
            loadData();
            setShowCreateModal(false);
            setEditingPromo(null);
          }}
        />
      )}
    </div>
  );
}

// Promo Card Component
function PromoCard({ promo, onToggle, onEdit, onDelete, getIcon, showLevel }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden ${
        promo.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              promo.is_active ? 'bg-[#FF5A00]/10 text-[#FF5A00]' : 'bg-gray-100 text-gray-400'
            }`}>
              {getIcon(promo.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900 truncate">{promo.title}</h3>
                {promo.is_flash && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Flash</span>
                )}
              </div>
              <p className="text-sm text-gray-500 line-clamp-1">{promo.description}</p>
              
              {showLevel && promo.partner_name && (
                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {promo.partner_name}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 flex-wrap">
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

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={onToggle}
              className={`p-2 rounded-lg ${
                promo.is_active ? 'text-green-600 bg-green-50' : 'text-gray-400 bg-gray-50'
              }`}
            >
              {promo.is_active ? (
                <ToggleRight className="w-5 h-5" />
              ) : (
                <ToggleLeft className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-lg text-gray-400 bg-gray-50"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Min commande:</span>
              <span className="ml-2 font-medium">{promo.min_order?.toLocaleString() || 0} FCFA</span>
            </div>
            {promo.max_discount && (
              <div>
                <span className="text-gray-500">Max réduction:</span>
                <span className="ml-2 font-medium">{promo.max_discount.toLocaleString()} FCFA</span>
              </div>
            )}
            {promo.valid_from && (
              <div>
                <span className="text-gray-500">Début:</span>
                <span className="ml-2 font-medium">{new Date(promo.valid_from).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
            {promo.valid_until && (
              <div>
                <span className="text-gray-500">Fin:</span>
                <span className="ml-2 font-medium">{new Date(promo.valid_until).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onEdit}
              className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Modifier
            </button>
            <button
              onClick={onDelete}
              className="py-2 px-4 bg-red-100 text-red-600 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Platform Promo Creation Modal
function PlatformPromoModal({ editingPromo, onClose, onSave }) {
  const [formData, setFormData] = useState({
    type: editingPromo?.type || PROMO_TYPES.PERCENTAGE,
    title: editingPromo?.title || '',
    description: editingPromo?.description || '',
    discount_value: editingPromo?.discount_value || 10,
    discount_type: editingPromo?.discount_type || 'percentage',
    code: editingPromo?.code || '',
    min_order: editingPromo?.min_order || 0,
    max_discount: editingPromo?.max_discount || null,
    valid_from: editingPromo?.valid_from?.split('T')[0] || '',
    valid_until: editingPromo?.valid_until?.split('T')[0] || '',
    is_active: editingPromo?.is_active ?? true,
    is_featured: editingPromo?.is_featured ?? false,
    is_flash: editingPromo?.is_flash ?? false,
  });
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (editingPromo) {
      updatePromotion(editingPromo.id, formData);
    } else {
      createPlatformPromo(formData);
    }

    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      
      <div className="relative bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {editingPromo ? 'Modifier la promotion' : 'Nouvelle promotion plateforme'}
          </h2>
          <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] outline-none"
            >
              <option value={PROMO_TYPES.PERCENTAGE}>Pourcentage</option>
              <option value={PROMO_TYPES.FIXED_AMOUNT}>Montant fixe</option>
              <option value={PROMO_TYPES.FREE_DELIVERY}>Livraison gratuite</option>
              <option value={PROMO_TYPES.FIRST_ORDER}>Première commande</option>
              <option value={PROMO_TYPES.FLASH_DEAL}>Flash Deal</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Titre</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: -20% sur tout"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] outline-none resize-none"
            />
          </div>

          {/* Value */}
          {formData.type !== PROMO_TYPES.FREE_DELIVERY && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {formData.type === PROMO_TYPES.PERCENTAGE ? 'Pourcentage (%)' : 'Montant (FCFA)'}
              </label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseInt(e.target.value) || 0 }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] outline-none"
              />
            </div>
          )}

          {/* Code */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Code promo</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="ACTOOS20"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] outline-none uppercase font-mono"
            />
          </div>

          {/* Min order */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Commande minimum (FCFA)</label>
            <input
              type="number"
              value={formData.min_order}
              onChange={(e) => setFormData(prev => ({ ...prev, min_order: parseInt(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] outline-none"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date début</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date fin</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5A00] outline-none"
              />
            </div>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-[#FF5A00] focus:ring-[#FF5A00]"
              />
              <span className="text-sm text-gray-700">Afficher en bannière</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_flash}
                onChange={(e) => setFormData(prev => ({ ...prev, is_flash: e.target.checked }))}
                className="w-5 h-5 rounded border-gray-300 text-[#FF5A00] focus:ring-[#FF5A00]"
              />
              <span className="text-sm text-gray-700">Flash Deal</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-2xl flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {editingPromo ? 'Enregistrer' : 'Créer la promotion'}
          </button>
        </div>
      </div>
    </div>
  );
}
