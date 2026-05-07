/**
 * ACTOOS ONE - KDS Menu Manager
 * 
 * Gestionnaire de menu pour les partenaires.
 * PRODUCTION MODE - Connecté à Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Minus, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  PlusCircle,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Save
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { BottomSheet } from './BottomSheet';

export function KDSMenuManager({ partnerId }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [savingId, setSavingId] = useState(null);

  // Charger les articles du menu depuis Supabase
  const fetchMenuItems = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase non configuré');
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      // Filter by partner if provided
      if (partnerId) {
        query = query.eq('partner_id', partnerId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setItems(data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur fetchMenuItems:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  // Toggle disponibilité d'un article
  const toggleAvailability = async (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    setSavingId(itemId);
    
    try {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ 
          is_available: !item.is_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      // Update local state
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, is_available: !i.is_available } : i
      ));
    } catch (err) {
      console.error('Erreur toggle:', err);
      alert('Erreur: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // Update max par commande
  const updateMaxPerOrder = async (itemId, newMax) => {
    if (newMax < 1 || newMax > 99) return;

    setSavingId(itemId);

    try {
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ 
          max_per_order: newMax,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (updateError) throw updateError;

      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, max_per_order: newMax } : i
      ));
    } catch (err) {
      console.error('Erreur updateMax:', err);
      alert('Erreur: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // Supprimer un article
  const deleteItem = async (itemId) => {
    if (!window.confirm('Supprimer cet article définitivement ?')) return;

    setSavingId(itemId);

    try {
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      console.error('Erreur delete:', err);
      alert('Erreur: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // Grouper par catégorie
  const groupedItems = items.reduce((acc, item) => {
    const cat = item.category || 'Autres';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Stats
  const availableCount = items.filter(i => i.is_available).length;
  const unavailableCount = items.filter(i => !i.is_available).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#FF5A00] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-200">{error}</p>
        <button
          onClick={fetchMenuItems}
          className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24" data-testid="kds-menu-manager">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">Gestion du Menu</h2>
            <p className="text-gray-400 text-sm mt-1">
              {items.length} article{items.length > 1 ? 's' : ''} au total
            </p>
          </div>
          <button
            onClick={() => {
              setEditingItem(null);
              setShowAddSheet(true);
            }}
            className="bg-[#FF5A00] text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2"
            data-testid="add-menu-item-btn"
          >
            <PlusCircle className="w-5 h-5" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-green-900/50 border border-green-700 rounded-2xl p-4">
          <p className="text-2xl font-bold text-green-400">{availableCount}</p>
          <p className="text-xs text-green-300">Articles disponibles</p>
        </div>
        <div className="bg-red-900/50 border border-red-700 rounded-2xl p-4">
          <p className="text-2xl font-bold text-red-400">{unavailableCount}</p>
          <p className="text-xs text-red-300">En rupture</p>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-16">
          <ImageIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">Aucun article dans le menu</p>
          <p className="text-gray-500 text-sm mt-1">Ajoutez votre premier article</p>
          <button
            onClick={() => setShowAddSheet(true)}
            className="mt-4 bg-[#FF5A00] text-white px-6 py-3 rounded-xl font-medium"
          >
            Ajouter un article
          </button>
        </div>
      )}

      {/* Liste par catégorie */}
      <div className="space-y-6">
        {Object.entries(groupedItems).map(([category, categoryItems]) => (
          <div key={category}>
            <h3 className="text-gray-400 font-semibold text-sm uppercase tracking-wider mb-3">
              {category} ({categoryItems.length})
            </h3>
            <div className="space-y-3">
              {categoryItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-gray-800 rounded-2xl p-4 border border-gray-700 ${
                    !item.is_available ? 'opacity-60' : ''
                  } ${savingId === item.id ? 'animate-pulse' : ''}`}
                  data-testid={`menu-item-row-${item.id}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Image */}
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-700 rounded-xl flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-gray-500" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-semibold truncate">{item.name}</p>
                        {!item.is_available && (
                          <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                            <AlertCircle className="w-3 h-3" />
                            Rupture
                          </span>
                        )}
                      </div>
                      <p className="text-[#FF5A00] font-bold mt-0.5">
                        {(item.price || 0).toLocaleString()} FCFA
                      </p>
                      {item.description && (
                        <p className="text-gray-500 text-xs mt-1 line-clamp-1">{item.description}</p>
                      )}
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => toggleAvailability(item.id)}
                      disabled={savingId === item.id}
                      className={`w-14 h-8 rounded-full flex items-center transition-colors flex-shrink-0 ${
                        item.is_available ? 'bg-green-500 justify-end' : 'bg-gray-600 justify-start'
                      }`}
                      data-testid={`toggle-${item.id}`}
                    >
                      <div className="w-6 h-6 bg-white rounded-full mx-1 flex items-center justify-center shadow">
                        {item.is_available ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Actions row */}
                  <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                    {/* Max par commande */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Max/cmd:</span>
                      <button
                        onClick={() => updateMaxPerOrder(item.id, (item.max_per_order || 10) - 1)}
                        disabled={(item.max_per_order || 10) <= 1 || savingId === item.id}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          (item.max_per_order || 10) <= 1
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                        }`}
                        data-testid={`max-minus-${item.id}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-white font-bold w-6 text-center">
                        {item.max_per_order || 10}
                      </span>
                      <button
                        onClick={() => updateMaxPerOrder(item.id, (item.max_per_order || 10) + 1)}
                        disabled={savingId === item.id}
                        className="w-7 h-7 rounded-lg bg-gray-700 text-gray-300 flex items-center justify-center active:bg-gray-600"
                        data-testid={`max-plus-${item.id}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Edit/Delete */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowAddSheet(true);
                        }}
                        className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-lg flex items-center justify-center"
                        data-testid={`edit-${item.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        disabled={savingId === item.id}
                        className="w-8 h-8 bg-red-600/20 text-red-400 rounded-lg flex items-center justify-center"
                        data-testid={`delete-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Sheet */}
      <AddEditMenuItemSheet
        isOpen={showAddSheet}
        onClose={() => {
          setShowAddSheet(false);
          setEditingItem(null);
        }}
        partnerId={partnerId}
        editingItem={editingItem}
        onSuccess={() => {
          setShowAddSheet(false);
          setEditingItem(null);
          fetchMenuItems();
        }}
      />
    </div>
  );
}

// Composant pour ajouter/modifier un article
function AddEditMenuItemSheet({ isOpen, onClose, partnerId, editingItem, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    preparation_time: '15',
    max_per_order: '10',
    is_available: true,
    is_popular: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Categories prédéfinies
  const categories = ['Plats', 'Entrées', 'Desserts', 'Boissons', 'Accompagnements', 'Snacks', 'Petit-déjeuner'];

  // Reset form when sheet opens/closes or editingItem changes
  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name || '',
        description: editingItem.description || '',
        price: String(editingItem.price || ''),
        category: editingItem.category || '',
        image_url: editingItem.image_url || '',
        preparation_time: String(editingItem.preparation_time || 15),
        max_per_order: String(editingItem.max_per_order || 10),
        is_available: editingItem.is_available ?? true,
        is_popular: editingItem.is_popular ?? false,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        image_url: '',
        preparation_time: '15',
        max_per_order: '10',
        is_available: true,
        is_popular: false,
      });
    }
    setError(null);
  }, [editingItem, isOpen]);

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Le nom est requis');
      return;
    }
    if (!formData.price || parseInt(formData.price) <= 0) {
      setError('Le prix doit être supérieur à 0');
      return;
    }
    if (!formData.category) {
      setError('La catégorie est requise');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseInt(formData.price),
        category: formData.category,
        image_url: formData.image_url.trim() || null,
        preparation_time: parseInt(formData.preparation_time) || 15,
        max_per_order: parseInt(formData.max_per_order) || 10,
        is_available: formData.is_available,
        is_popular: formData.is_popular,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('menu_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (updateError) throw updateError;
      } else {
        // Create new item
        if (!partnerId) {
          throw new Error('Partner ID requis pour créer un article');
        }

        const { error: insertError } = await supabase
          .from('menu_items')
          .insert({
            ...itemData,
            partner_id: partnerId,
          });

        if (insertError) throw insertError;
      }

      onSuccess();
    } catch (err) {
      console.error('Erreur save item:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={editingItem ? 'Modifier l\'article' : 'Nouvel article'}
    >
      <div className="py-4 space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Nom */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Nom de l'article *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Poulet Yassa"
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
            data-testid="item-name-input"
          />
        </div>

        {/* Prix */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Prix (FCFA) *</label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="3500"
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
            data-testid="item-price-input"
          />
        </div>

        {/* Catégorie */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Catégorie *</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat })}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.category === cat
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Description (optionnel)</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Décrivez votre plat..."
            rows={2}
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00] resize-none"
          />
        </div>

        {/* URL Image */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">URL de l'image (optionnel)</label>
          <input
            type="url"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            placeholder="https://..."
            className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
          />
          {formData.image_url && (
            <img 
              src={formData.image_url} 
              alt="Preview" 
              className="mt-2 w-20 h-20 rounded-lg object-cover"
              onError={(e) => e.target.style.display = 'none'}
            />
          )}
        </div>

        {/* Temps de préparation */}
        <div>
          <label className="text-sm text-gray-500 mb-1 block">Temps de préparation (min)</label>
          <div className="flex gap-2">
            {[10, 15, 20, 30, 45].map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setFormData({ ...formData, preparation_time: String(time) })}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                  formData.preparation_time === String(time)
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between py-2">
          <span className="text-gray-700">Disponible maintenant</span>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_available: !formData.is_available })}
            className={`w-12 h-7 rounded-full transition-colors ${
              formData.is_available ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow mx-1 transition-transform ${
              formData.is_available ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <span className="text-gray-700">Marquer comme populaire</span>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_popular: !formData.is_popular })}
            className={`w-12 h-7 rounded-full transition-colors ${
              formData.is_popular ? 'bg-[#FF5A00]' : 'bg-gray-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow mx-1 transition-transform ${
              formData.is_popular ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          data-testid="save-item-btn"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {editingItem ? 'Modifier' : 'Ajouter au menu'}
            </>
          )}
        </button>
      </div>
    </BottomSheet>
  );
}

export default KDSMenuManager;
