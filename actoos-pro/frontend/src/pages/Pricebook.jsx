/**
 * Pricebook - Catalogue de prestations
 * Gestion des articles, services et tarifs predéfinis
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pricebookApi, pricebookCategoriesApi } from '../lib/supabaseApi';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '../components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus, Search, Edit, Trash2, Package, Loader2, Upload, Download,
  Wrench, Box, Truck, Clock, Tag, Filter, MoreVertical, Copy
} from 'lucide-react';
import { toast } from 'sonner';

// Units of measurement
const UNITS = [
  { value: 'unite', label: 'Unité' },
  { value: 'heure', label: 'Heure' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'piece', label: 'Pièce' },
  { value: 'm2', label: 'm²' },
  { value: 'ml', label: 'ml (mètre linéaire)' },
  { value: 'kg', label: 'kg' },
  { value: 'jour', label: 'Jour' },
];

// Default categories with icons and colors
const DEFAULT_CATEGORIES = [
  { nom: 'Main d\'oeuvre', couleur: '#3B82F6', icone: 'wrench', description: 'Tarifs horaires et prestations de service' },
  { nom: 'Pièces détachées', couleur: '#10B981', icone: 'box', description: 'Composants et matériel' },
  { nom: 'Forfaits', couleur: '#8B5CF6', icone: 'package', description: 'Prestations forfaitaires' },
  { nom: 'Déplacement', couleur: '#F59E0B', icone: 'truck', description: 'Frais de déplacement et transport' },
];

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

// Item Form Modal
const ItemFormModal = ({ open, onClose, item, categories, onSave, formatAmount }) => {
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    reference: '',
    categorie_id: '',
    prix_ht: 0,
    tva: 20,
    unite: 'unite',
    actif: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        nom: item.nom || '',
        description: item.description || '',
        reference: item.reference || '',
        categorie_id: item.categorie_id || '',
        prix_ht: item.prix_ht || 0,
        tva: item.tva || 20,
        unite: item.unite || 'unite',
        actif: item.actif !== false,
      });
    } else {
      setFormData({
        nom: '',
        description: '',
        reference: '',
        categorie_id: categories[0]?.id || '',
        prix_ht: 0,
        tva: 20,
        unite: 'unite',
        actif: true,
      });
    }
  }, [item, categories, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    
    if (formData.prix_ht < 0) {
      toast.error('Le prix ne peut pas être négatif');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(formData, item?.id);
      onClose();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const prixTTC = formData.prix_ht * (1 + formData.tva / 100);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle>
          <DialogDescription>
            Ajoutez un article à votre catalogue de prestations
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input
                id="nom"
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                placeholder="Ex: Intervention standard"
                data-testid="pricebook-item-nom"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="Ex: INT-001"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="categorie">Catégorie</Label>
              <Select
                value={formData.categorie_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categorie_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.couleur }}
                        />
                        {cat.nom}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description détaillée de la prestation..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prix_ht">Prix HT</Label>
              <Input
                id="prix_ht"
                type="number"
                min="0"
                step="0.01"
                value={formData.prix_ht}
                onChange={(e) => setFormData(prev => ({ ...prev, prix_ht: parseFloat(e.target.value) || 0 }))}
                data-testid="pricebook-item-prix"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tva">TVA %</Label>
              <Select
                value={String(formData.tva)}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tva: parseFloat(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5.5">5.5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="unite">Unité</Label>
              <Select
                value={formData.unite}
                onValueChange={(value) => setFormData(prev => ({ ...prev, unite: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map(unit => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <div className="bg-slate-50 rounded-lg p-3 w-full">
                <p className="text-xs text-slate-500">Prix TTC</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatAmount ? formatAmount(prixTTC) : `${prixTTC.toFixed(2)} €`}
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving} data-testid="pricebook-item-save">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {item ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Category Form Modal
const CategoryFormModal = ({ open, onClose, category, onSave }) => {
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    couleur: '#3B82F6',
    icone: 'package',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (category) {
      setFormData({
        nom: category.nom || '',
        description: category.description || '',
        couleur: category.couleur || '#3B82F6',
        icone: category.icone || 'package',
      });
    } else {
      setFormData({
        nom: '',
        description: '',
        couleur: '#3B82F6',
        icone: 'package',
      });
    }
  }, [category, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nom.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(formData, category?.id);
      onClose();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];
  const ICONS = ['wrench', 'box', 'package', 'truck', 'clock', 'tag'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-nom">Nom *</Label>
            <Input
              id="cat-nom"
              value={formData.nom}
              onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
              placeholder="Ex: Main d'oeuvre"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea
              id="cat-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description de la catégorie..."
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full transition-all ${formData.couleur === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, couleur: color }))}
                />
              ))}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Icône</Label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map(icone => (
                <button
                  key={icone}
                  type="button"
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${formData.icone === icone ? 'bg-slate-200 ring-2 ring-slate-400' : 'bg-slate-100 hover:bg-slate-200'}`}
                  onClick={() => setFormData(prev => ({ ...prev, icone }))}
                >
                  <CategoryIcon icone={icone} className="w-5 h-5 text-slate-600" />
                </button>
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {category ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// CSV Import Modal
const ImportModal = ({ open, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Read and preview first 5 rows
    const text = await selectedFile.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
    
    const previewData = lines.slice(1, 6).map(line => {
      const values = line.split(';');
      return {
        nom: values[headers.indexOf('nom')] || values[0] || '',
        description: values[headers.indexOf('description')] || values[1] || '',
        prix_ht: parseFloat(values[headers.indexOf('prix_ht')] || values[2]) || 0,
        tva: parseFloat(values[headers.indexOf('tva')] || values[3]) || 20,
        unite: values[headers.indexOf('unite')] || values[4] || 'unite',
        reference: values[headers.indexOf('reference')] || values[5] || '',
      };
    });
    
    setPreview(previewData);
  };

  const handleImport = async () => {
    if (!file) return;
    
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
      
      const items = lines.slice(1).map(line => {
        const values = line.split(';');
        return {
          nom: values[headers.indexOf('nom')] || values[0] || '',
          description: values[headers.indexOf('description')] || values[1] || '',
          prix_ht: parseFloat(values[headers.indexOf('prix_ht')] || values[2]) || 0,
          tva: parseFloat(values[headers.indexOf('tva')] || values[3]) || 20,
          unite: values[headers.indexOf('unite')] || values[4] || 'unite',
          reference: values[headers.indexOf('reference')] || values[5] || '',
        };
      }).filter(item => item.nom);
      
      await onImport(items);
      onClose();
      setFile(null);
      setPreview([]);
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des articles (CSV)</DialogTitle>
          <DialogDescription>
            Format attendu: nom;description;prix_ht;tva;unite;reference
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                {file ? file.name : 'Cliquez pour sélectionner un fichier CSV'}
              </p>
            </label>
          </div>
          
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Aperçu ({preview.length} lignes)</p>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Nom</TableHead>
                      <TableHead>Prix HT</TableHead>
                      <TableHead>TVA</TableHead>
                      <TableHead>Unité</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.nom}</TableCell>
                        <TableCell>{item.prix_ht.toFixed(2)} €</TableCell>
                        <TableCell>{item.tva}%</TableCell>
                        <TableCell>{item.unite}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Importer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Pricebook Component
const Pricebook = () => {
  const { user, formatAmount } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('items');
  
  // Modals
  const [itemModal, setItemModal] = useState({ open: false, item: null });
  const [categoryModal, setCategoryModal] = useState({ open: false, category: null });
  const [importModal, setImportModal] = useState(false);

  // Fetch data
  useEffect(() => {
    if (user?.entreprise_id) {
      fetchData();
    }
  }, [user?.entreprise_id]);

  const fetchData = async () => {
    setLoading(true);
    setSetupRequired(false);
    try {
      const [itemsData, categoriesData] = await Promise.all([
        pricebookApi.list(user.entreprise_id),
        pricebookCategoriesApi.list(user.entreprise_id),
      ]);
      
      setItems(itemsData || []);
      
      // If no categories, create defaults
      if (!categoriesData || categoriesData.length === 0) {
        await createDefaultCategories();
      } else {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error fetching pricebook:', error);
      // Check if it's a 404 error (table doesn't exist)
      if (error.message?.includes('404') || error.code === '42P01' || error.message?.includes('does not exist')) {
        setSetupRequired(true);
      } else {
        toast.error('Erreur lors du chargement du catalogue');
      }
    } finally {
      setLoading(false);
    }
  };

  const createDefaultCategories = async () => {
    try {
      const created = [];
      for (const cat of DEFAULT_CATEGORIES) {
        const result = await pricebookCategoriesApi.create({
          ...cat,
          entreprise_id: user.entreprise_id,
        });
        created.push(result);
      }
      setCategories(created);
    } catch (error) {
      console.error('Error creating default categories:', error);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery || 
        item.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.categorie_id === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Category stats
  const categoryStats = useMemo(() => {
    const stats = { all: items.length };
    categories.forEach(cat => {
      stats[cat.id] = items.filter(i => i.categorie_id === cat.id).length;
    });
    return stats;
  }, [items, categories]);

  // Save item
  const handleSaveItem = async (data, id) => {
    try {
      if (id) {
        await pricebookApi.update(id, data);
        toast.success('Article mis à jour');
      } else {
        await pricebookApi.create({
          ...data,
          entreprise_id: user.entreprise_id,
        });
        toast.success('Article créé');
      }
      fetchData();
    } catch (error) {
      throw error;
    }
  };

  // Delete item
  const handleDeleteItem = async (id) => {
    try {
      await pricebookApi.delete(id);
      toast.success('Article supprimé');
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Duplicate item
  const handleDuplicateItem = async (item) => {
    try {
      await pricebookApi.create({
        ...item,
        id: undefined,
        nom: `${item.nom} (copie)`,
        reference: item.reference ? `${item.reference}-COPY` : '',
        entreprise_id: user.entreprise_id,
      });
      toast.success('Article dupliqué');
      fetchData();
    } catch (error) {
      console.error('Error duplicating item:', error);
      toast.error('Erreur lors de la duplication');
    }
  };

  // Save category
  const handleSaveCategory = async (data, id) => {
    try {
      if (id) {
        await pricebookCategoriesApi.update(id, data);
        toast.success('Catégorie mise à jour');
      } else {
        await pricebookCategoriesApi.create({
          ...data,
          entreprise_id: user.entreprise_id,
        });
        toast.success('Catégorie créée');
      }
      fetchData();
    } catch (error) {
      throw error;
    }
  };

  // Delete category
  const handleDeleteCategory = async (id) => {
    const itemsInCategory = items.filter(i => i.categorie_id === id).length;
    if (itemsInCategory > 0) {
      toast.error(`Impossible de supprimer: ${itemsInCategory} articles dans cette catégorie`);
      return;
    }
    
    try {
      await pricebookCategoriesApi.delete(id);
      toast.success('Catégorie supprimée');
      fetchData();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Import items
  const handleImport = async (importedItems) => {
    try {
      let created = 0;
      const defaultCategoryId = categories[0]?.id;
      
      for (const item of importedItems) {
        await pricebookApi.create({
          ...item,
          entreprise_id: user.entreprise_id,
          categorie_id: defaultCategoryId,
          actif: true,
        });
        created++;
      }
      
      toast.success(`${created} articles importés`);
      fetchData();
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = 'nom;description;prix_ht;tva;unite;reference';
    const rows = items.map(item => 
      `${item.nom};${item.description || ''};${item.prix_ht};${item.tva};${item.unite};${item.reference || ''}`
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pricebook_export.csv';
    link.click();
    
    toast.success('Export terminé');
  };

  // Get category for item
  const getCategoryForItem = (categoryId) => {
    return categories.find(c => c.id === categoryId);
  };

  // Get unit label
  const getUnitLabel = (value) => {
    return UNITS.find(u => u.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // Setup required - tables don't exist
  if (setupRequired) {
    return (
      <div className="space-y-6" data-testid="pricebook-page">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Catalogue de prestations</h1>
          <p className="text-slate-500">Gérez vos articles, services et tarifs</p>
        </div>
        
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-lg text-amber-800 mb-2">Configuration requise</CardTitle>
            <CardDescription className="text-amber-700 mb-4 max-w-md mx-auto">
              Les tables du catalogue n'existent pas encore dans votre base de données Supabase. 
              Exécutez le script SQL pour créer les tables nécessaires.
            </CardDescription>
            <div className="bg-white rounded-lg p-4 text-left max-w-lg mx-auto border border-amber-200">
              <p className="text-sm font-medium text-slate-700 mb-2">Étapes :</p>
              <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Ouvrez votre projet Supabase</li>
                <li>Allez dans SQL Editor</li>
                <li>Copiez le contenu de <code className="bg-slate-100 px-1 rounded">docs/PRICEBOOK_SCHEMA.sql</code></li>
                <li>Exécutez le script</li>
                <li>Rafraîchissez cette page</li>
              </ol>
            </div>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => fetchData()}
            >
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pricebook-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Catalogue de prestations</h1>
          <p className="text-slate-500">Gérez vos articles, services et tarifs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
          <Button variant="outline" onClick={() => setImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importer
          </Button>
          <Button onClick={() => setItemModal({ open: true, item: null })} data-testid="pricebook-add-item">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel article
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="items">
            <Package className="w-4 h-4 mr-2" />
            Articles ({items.length})
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="w-4 h-4 mr-2" />
            Catégories ({categories.length})
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          {/* Filters */}
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher un article..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="pricebook-search"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes ({categoryStats.all})</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: cat.couleur }}
                          />
                          {cat.nom} ({categoryStats[cat.id] || 0})
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card className="border-slate-200">
            <CardContent className="p-0">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>Aucun article trouvé</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setItemModal({ open: true, item: null })}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer un article
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Article</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead className="text-right">Prix HT</TableHead>
                      <TableHead className="text-right">Prix TTC</TableHead>
                      <TableHead>Unité</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map(item => {
                      const category = getCategoryForItem(item.categorie_id);
                      const prixTTC = item.prix_ht * (1 + item.tva / 100);
                      
                      return (
                        <TableRow key={item.id} data-testid={`pricebook-item-${item.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-900">{item.nom}</p>
                              {item.reference && (
                                <p className="text-xs text-slate-500">Réf: {item.reference}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {category && (
                              <Badge 
                                variant="secondary"
                                className="gap-1"
                                style={{ 
                                  backgroundColor: `${category.couleur}20`,
                                  color: category.couleur,
                                }}
                              >
                                <CategoryIcon icone={category.icone} className="w-3 h-3" />
                                {category.nom}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatAmount(item.prix_ht)}
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {formatAmount(prixTTC)}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-600">{getUnitLabel(item.unite)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicateItem(item)}
                                title="Dupliquer"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setItemModal({ open: true, item })}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer l'article ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      L'article "{item.nom}" sera définitivement supprimé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setCategoryModal({ open: true, category: null })}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle catégorie
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => (
              <Card key={category.id} className="border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${category.couleur}20` }}
                      >
                        <CategoryIcon 
                          icone={category.icone} 
                          className="w-5 h-5"
                          style={{ color: category.couleur }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-base">{category.nom}</CardTitle>
                        <p className="text-sm text-slate-500">
                          {categoryStats[category.id] || 0} articles
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCategoryModal({ open: true, category })}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer la catégorie ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {categoryStats[category.id] > 0 
                                ? `Impossible: ${categoryStats[category.id]} articles dans cette catégorie`
                                : 'Cette catégorie sera définitivement supprimée.'
                              }
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            {categoryStats[category.id] === 0 && (
                              <AlertDialogAction 
                                onClick={() => handleDeleteCategory(category.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Supprimer
                              </AlertDialogAction>
                            )}
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                {category.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-slate-500">{category.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ItemFormModal
        open={itemModal.open}
        onClose={() => setItemModal({ open: false, item: null })}
        item={itemModal.item}
        categories={categories}
        onSave={handleSaveItem}
        formatAmount={formatAmount}
      />

      <CategoryFormModal
        open={categoryModal.open}
        onClose={() => setCategoryModal({ open: false, category: null })}
        category={categoryModal.category}
        onSave={handleSaveCategory}
      />

      <ImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
        onImport={handleImport}
      />
    </div>
  );
};

export default Pricebook;
