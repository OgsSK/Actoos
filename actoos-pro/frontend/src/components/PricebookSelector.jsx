/**
 * PricebookSelector - Composant de sélection d'articles du catalogue
 * Pour intégration dans les devis (mode standard et multi-options)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pricebookApi, pricebookCategoriesApi } from '../lib/supabaseApi';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from './ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Search, Package, Plus, Check, Loader2, Wrench, Box, Truck, Clock, Tag } from 'lucide-react';

// Category icon mapping
const CategoryIcon = ({ icone, className }) => {
  const icons = {
    wrench: Wrench,
    box: Box,
    package: Package,
    truck: Truck,
    clock: Clock,
    tag: Tag,
  };
  const Icon = icons[icone] || Package;
  return <Icon className={className} />;
};

// Units label mapping
const UNIT_LABELS = {
  unite: 'Unité',
  heure: 'Heure',
  forfait: 'Forfait',
  piece: 'Pièce',
  m2: 'm²',
  ml: 'ml',
  kg: 'kg',
  jour: 'Jour',
};

const PricebookSelector = ({ 
  open, 
  onClose, 
  onSelect, 
  multiSelect = false,
  title = 'Ajouter depuis le catalogue'
}) => {
  const { user, formatAmount } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);

  // Fetch data on open
  useEffect(() => {
    if (open && user?.entreprise_id) {
      fetchData();
    }
  }, [open, user?.entreprise_id]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedItems([]);
      setSearchQuery('');
      setSelectedCategory('all');
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsData, categoriesData] = await Promise.all([
        pricebookApi.list(user.entreprise_id),
        pricebookCategoriesApi.list(user.entreprise_id),
      ]);
      setItems(itemsData || []);
      setCategories(categoriesData || []);
    } catch (error) {
      console.error('Error fetching pricebook:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!item.actif) return false;
      
      const matchesSearch = !searchQuery || 
        item.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.categorie_id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped = {};
    filteredItems.forEach(item => {
      const catId = item.categorie_id || 'uncategorized';
      if (!grouped[catId]) {
        grouped[catId] = [];
      }
      grouped[catId].push(item);
    });
    return grouped;
  }, [filteredItems]);

  // Get category info
  const getCategoryInfo = (categoryId) => {
    return categories.find(c => c.id === categoryId) || { nom: 'Sans catégorie', couleur: '#94A3B8' };
  };

  // Toggle item selection (for multi-select mode)
  const toggleItem = (item) => {
    if (multiSelect) {
      setSelectedItems(prev => {
        const isSelected = prev.some(i => i.id === item.id);
        if (isSelected) {
          return prev.filter(i => i.id !== item.id);
        } else {
          return [...prev, item];
        }
      });
    } else {
      // Single select - immediately add
      handleAddItems([item]);
    }
  };

  // Check if item is selected
  const isItemSelected = (itemId) => {
    return selectedItems.some(i => i.id === itemId);
  };

  // Add selected items
  const handleAddItems = (itemsToAdd) => {
    const lignes = itemsToAdd.map(item => ({
      description: item.nom,
      quantite: 1,
      prix_unitaire: item.prix_ht,
      tva: item.tva,
      // Additional metadata
      pricebook_item_id: item.id,
      reference: item.reference,
      unite: item.unite,
    }));
    
    onSelect(lignes);
    onClose();
  };

  // Confirm multi-select
  const handleConfirmSelection = () => {
    if (selectedItems.length > 0) {
      handleAddItems(selectedItems);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez des articles à ajouter à votre devis
          </DialogDescription>
        </DialogHeader>
        
        {/* Search and Filter */}
        <div className="flex gap-3 py-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="pricebook-selector-search"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: cat.couleur }}
                    />
                    {cat.nom}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Items List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>Aucun article trouvé</p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Essayez une autre recherche' : 'Ajoutez des articles dans votre catalogue'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {Object.entries(itemsByCategory).map(([categoryId, categoryItems]) => {
                const category = getCategoryInfo(categoryId);
                
                return (
                  <div key={categoryId}>
                    {/* Category header */}
                    <div className="flex items-center gap-2 mb-2 sticky top-0 bg-white py-1">
                      <div 
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${category.couleur}20` }}
                      >
                        <CategoryIcon 
                          icone={category.icone} 
                          className="w-3.5 h-3.5"
                          style={{ color: category.couleur }}
                        />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{category.nom}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categoryItems.length}
                      </Badge>
                    </div>
                    
                    {/* Items */}
                    <div className="space-y-1">
                      {categoryItems.map(item => {
                        const selected = isItemSelected(item.id);
                        const prixTTC = item.prix_ht * (1 + item.tva / 100);
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => toggleItem(item)}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                              selected 
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                            data-testid={`pricebook-selector-item-${item.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900 truncate">
                                  {item.nom}
                                </span>
                                {item.reference && (
                                  <span className="text-xs text-slate-400">
                                    {item.reference}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-slate-500 truncate mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4 ml-4">
                              <div className="text-right">
                                <p className="font-semibold text-slate-900">
                                  {formatAmount(item.prix_ht)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {UNIT_LABELS[item.unite] || item.unite} • {item.tva}% TVA
                                </p>
                              </div>
                              
                              {multiSelect ? (
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  selected 
                                    ? 'border-blue-500 bg-blue-500' 
                                    : 'border-slate-300'
                                }`}>
                                  {selected && <Check className="w-4 h-4 text-white" />}
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-100 transition-colors">
                                  <Plus className="w-4 h-4 text-slate-600" />
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer with selection summary (multi-select mode) */}
        {multiSelect && selectedItems.length > 0 && (
          <div className="border-t pt-4 mt-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{selectedItems.length}</span> article(s) sélectionné(s)
              <span className="mx-2">•</span>
              Total: <span className="font-medium">
                {formatAmount(selectedItems.reduce((sum, i) => sum + i.prix_ht, 0))}
              </span> HT
            </div>
            <Button onClick={handleConfirmSelection} data-testid="pricebook-selector-confirm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter ({selectedItems.length})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PricebookSelector;
