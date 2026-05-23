/**
 * Multi-Options Devis Component
 * Permet de créer des devis avec plusieurs options (Good/Better/Best)
 */
import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import {
  Plus, Trash2, Copy, Star, Check, Package, Sparkles, Crown, 
  ChevronUp, ChevronDown, GripVertical, Calculator
} from 'lucide-react';
import { cn } from '../lib/utils';

// Default option templates
const DEFAULT_OPTIONS = [
  { 
    id: 'basic', 
    name: 'Essentiel', 
    description: 'Solution de base',
    icon: Package,
    color: 'slate',
    recommended: false,
    lignes: []
  },
  { 
    id: 'standard', 
    name: 'Standard', 
    description: 'Notre recommandation',
    icon: Star,
    color: 'blue',
    recommended: true,
    lignes: []
  },
  { 
    id: 'premium', 
    name: 'Premium', 
    description: 'Solution complète',
    icon: Crown,
    color: 'amber',
    recommended: false,
    lignes: []
  }
];

// Single option editor
const OptionEditor = ({ 
  option, 
  index, 
  onUpdate, 
  onRemove, 
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  formatAmount
}) => {
  const addLigne = () => {
    const newLignes = [...(option.lignes || []), { description: '', quantite: 1, prix_unitaire: 0, tva: 20 }];
    onUpdate({ ...option, lignes: newLignes });
  };

  const updateLigne = (ligneIndex, field, value) => {
    const newLignes = [...option.lignes];
    newLignes[ligneIndex] = { ...newLignes[ligneIndex], [field]: value };
    onUpdate({ ...option, lignes: newLignes });
  };

  const removeLigne = (ligneIndex) => {
    const newLignes = option.lignes.filter((_, i) => i !== ligneIndex);
    onUpdate({ ...option, lignes: newLignes });
  };

  // Calculate totals
  const totals = useMemo(() => {
    const lignes = option.lignes || [];
    const total_ht = lignes.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prix_unitaire || 0)), 0);
    const total_tva = lignes.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prix_unitaire || 0) * (l.tva || 0) / 100), 0);
    return {
      ht: total_ht,
      tva: total_tva,
      ttc: total_ht + total_tva
    };
  }, [option.lignes]);

  const Icon = option.icon || Package;
  const colorClasses = {
    slate: 'border-slate-200 bg-slate-50',
    blue: 'border-blue-200 bg-blue-50',
    amber: 'border-amber-200 bg-amber-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    purple: 'border-purple-200 bg-purple-50',
  };

  return (
    <Card className={cn("relative", option.recommended && "ring-2 ring-blue-500")}>
      {option.recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-blue-600 text-white">
            <Sparkles className="w-3 h-3 mr-1" />
            Recommandé
          </Badge>
        </div>
      )}
      
      <CardHeader className={cn("pb-4", colorClasses[option.color] || colorClasses.slate)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              option.color === 'blue' ? "bg-blue-100" : 
              option.color === 'amber' ? "bg-amber-100" : 
              option.color === 'emerald' ? "bg-emerald-100" : 
              option.color === 'purple' ? "bg-purple-100" : "bg-slate-100"
            )}>
              <Icon className={cn(
                "w-5 h-5",
                option.color === 'blue' ? "text-blue-600" : 
                option.color === 'amber' ? "text-amber-600" : 
                option.color === 'emerald' ? "text-emerald-600" : 
                option.color === 'purple' ? "text-purple-600" : "text-slate-600"
              )} />
            </div>
            <div>
              <Input
                value={option.name}
                onChange={(e) => onUpdate({ ...option, name: e.target.value })}
                className="font-semibold text-lg border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="Nom de l'option"
              />
              <Input
                value={option.description || ''}
                onChange={(e) => onUpdate({ ...option, description: e.target.value })}
                className="text-sm text-slate-500 border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                placeholder="Description courte"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveUp}
                disabled={!canMoveUp}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMoveDown}
                disabled={!canMoveDown}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDuplicate}
              className="h-8 w-8 p-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Recommended toggle */}
        <div className="flex items-center gap-2 mt-3">
          <Switch
            id={`recommended-${option.id}`}
            checked={option.recommended || false}
            onCheckedChange={(checked) => onUpdate({ ...option, recommended: checked })}
          />
          <Label htmlFor={`recommended-${option.id}`} className="text-sm cursor-pointer">
            Marquer comme recommandé
          </Label>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* Lignes */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Description</TableHead>
              <TableHead className="w-[15%] text-center">Qté</TableHead>
              <TableHead className="w-[20%] text-right">Prix unit. HT</TableHead>
              <TableHead className="w-[10%] text-center">TVA %</TableHead>
              <TableHead className="w-[15%] text-right">Total HT</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(option.lignes || []).map((ligne, ligneIndex) => (
              <TableRow key={ligneIndex}>
                <TableCell>
                  <Input
                    value={ligne.description}
                    onChange={(e) => updateLigne(ligneIndex, 'description', e.target.value)}
                    placeholder="Description du produit/service"
                    className="border-0 bg-transparent"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    value={ligne.quantite}
                    onChange={(e) => updateLigne(ligneIndex, 'quantite', parseFloat(e.target.value) || 0)}
                    className="w-20 text-center border-0 bg-transparent"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ligne.prix_unitaire}
                    onChange={(e) => updateLigne(ligneIndex, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                    className="w-28 text-right border-0 bg-transparent"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={ligne.tva}
                    onChange={(e) => updateLigne(ligneIndex, 'tva', parseFloat(e.target.value) || 0)}
                    className="w-16 text-center border-0 bg-transparent"
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatAmount ? formatAmount((ligne.quantite || 0) * (ligne.prix_unitaire || 0)) : 
                    `${((ligne.quantite || 0) * (ligne.prix_unitaire || 0)).toFixed(2)} €`}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLigne(ligneIndex)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Button
          variant="outline"
          size="sm"
          onClick={addLigne}
          className="mt-3"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une ligne
        </Button>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Total HT</span>
            <span className="font-medium">{formatAmount ? formatAmount(totals.ht) : `${totals.ht.toFixed(2)} €`}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">TVA</span>
            <span className="font-medium">{formatAmount ? formatAmount(totals.tva) : `${totals.tva.toFixed(2)} €`}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total TTC</span>
            <span className={cn(
              option.color === 'blue' ? "text-blue-600" : 
              option.color === 'amber' ? "text-amber-600" : 
              option.color === 'emerald' ? "text-emerald-600" : 
              option.color === 'purple' ? "text-purple-600" : "text-slate-900"
            )}>
              {formatAmount ? formatAmount(totals.ttc) : `${totals.ttc.toFixed(2)} €`}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Comparison preview
const OptionsComparison = ({ options, formatAmount }) => {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((option) => {
        const Icon = option.icon || Package;
        const totals = {
          ht: (option.lignes || []).reduce((sum, l) => sum + ((l.quantite || 0) * (l.prix_unitaire || 0)), 0),
          tva: (option.lignes || []).reduce((sum, l) => sum + ((l.quantite || 0) * (l.prix_unitaire || 0) * (l.tva || 0) / 100), 0),
        };
        totals.ttc = totals.ht + totals.tva;

        return (
          <Card 
            key={option.id} 
            className={cn(
              "relative transition-all hover:shadow-lg",
              option.recommended && "ring-2 ring-blue-500 scale-[1.02]"
            )}
          >
            {option.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white shadow-md">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Recommandé
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-2">
              <div className={cn(
                "w-14 h-14 rounded-xl mx-auto flex items-center justify-center mb-3",
                option.color === 'blue' ? "bg-blue-100" : 
                option.color === 'amber' ? "bg-amber-100" : 
                option.color === 'emerald' ? "bg-emerald-100" : 
                option.color === 'purple' ? "bg-purple-100" : "bg-slate-100"
              )}>
                <Icon className={cn(
                  "w-7 h-7",
                  option.color === 'blue' ? "text-blue-600" : 
                  option.color === 'amber' ? "text-amber-600" : 
                  option.color === 'emerald' ? "text-emerald-600" : 
                  option.color === 'purple' ? "text-purple-600" : "text-slate-600"
                )} />
              </div>
              <CardTitle className="text-xl">{option.name}</CardTitle>
              <CardDescription>{option.description}</CardDescription>
            </CardHeader>

            <CardContent className="text-center">
              <div className="text-3xl font-bold mb-1">
                {formatAmount ? formatAmount(totals.ttc) : `${totals.ttc.toFixed(2)} €`}
              </div>
              <p className="text-xs text-slate-500 mb-4">TTC</p>

              <div className="space-y-2 text-left">
                {(option.lignes || []).map((ligne, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{ligne.description || 'Ligne sans description'}</span>
                  </div>
                ))}
              </div>

              <Button 
                className={cn(
                  "w-full mt-6",
                  option.recommended ? "bg-blue-600 hover:bg-blue-700" : ""
                )}
                variant={option.recommended ? "default" : "outline"}
              >
                Choisir cette option
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Main component
const MultiOptionsDevis = ({ 
  options, 
  onChange, 
  formatAmount,
  mode = 'edit' // 'edit' | 'preview' | 'comparison'
}) => {
  const [activeTab, setActiveTab] = useState(options?.[0]?.id || 'basic');

  const handleUpdateOption = (index, updatedOption) => {
    const newOptions = [...options];
    
    // If marking as recommended, unmark others
    if (updatedOption.recommended && !options[index].recommended) {
      newOptions.forEach((opt, i) => {
        if (i !== index) opt.recommended = false;
      });
    }
    
    newOptions[index] = updatedOption;
    onChange(newOptions);
  };

  const handleAddOption = () => {
    const colors = ['slate', 'blue', 'amber', 'emerald', 'purple'];
    const usedColors = options.map(o => o.color);
    const availableColor = colors.find(c => !usedColors.includes(c)) || 'slate';
    
    const newOption = {
      id: `option_${Date.now()}`,
      name: `Option ${options.length + 1}`,
      description: '',
      icon: Package,
      color: availableColor,
      recommended: false,
      lignes: []
    };
    onChange([...options, newOption]);
    setActiveTab(newOption.id);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 1) {
      return; // Keep at least one option
    }
    const newOptions = options.filter((_, i) => i !== index);
    onChange(newOptions);
    if (activeTab === options[index].id) {
      setActiveTab(newOptions[0]?.id);
    }
  };

  const handleDuplicateOption = (index) => {
    const source = options[index];
    const newOption = {
      ...source,
      id: `option_${Date.now()}`,
      name: `${source.name} (copie)`,
      recommended: false,
      lignes: source.lignes.map(l => ({ ...l }))
    };
    const newOptions = [...options];
    newOptions.splice(index + 1, 0, newOption);
    onChange(newOptions);
    setActiveTab(newOption.id);
  };

  const handleMoveOption = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= options.length) return;
    
    const newOptions = [...options];
    [newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]];
    onChange(newOptions);
  };

  if (mode === 'comparison') {
    return <OptionsComparison options={options} formatAmount={formatAmount} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Options du devis</h3>
          <p className="text-sm text-slate-500">
            Créez plusieurs options pour que votre client puisse choisir
          </p>
        </div>
        <Button onClick={handleAddOption} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Ajouter une option
        </Button>
      </div>

      {/* Tabs for options */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
          {options.map((option) => {
            const Icon = option.icon || Package;
            const totals = {
              ttc: (option.lignes || []).reduce((sum, l) => {
                const ht = (l.quantite || 0) * (l.prix_unitaire || 0);
                return sum + ht + (ht * (l.tva || 0) / 100);
              }, 0)
            };
            
            return (
              <TabsTrigger 
                key={option.id} 
                value={option.id}
                className="flex flex-col items-center gap-1 py-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span>{option.name}</span>
                  {option.recommended && (
                    <Sparkles className="w-3 h-3 text-blue-500" />
                  )}
                </div>
                <span className="text-xs text-slate-500">
                  {formatAmount ? formatAmount(totals.ttc) : `${totals.ttc.toFixed(2)} €`}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {options.map((option, index) => (
          <TabsContent key={option.id} value={option.id} className="mt-4">
            <OptionEditor
              option={option}
              index={index}
              onUpdate={(updated) => handleUpdateOption(index, updated)}
              onRemove={() => handleRemoveOption(index)}
              onDuplicate={() => handleDuplicateOption(index)}
              onMoveUp={() => handleMoveOption(index, -1)}
              onMoveDown={() => handleMoveOption(index, 1)}
              canMoveUp={index > 0}
              canMoveDown={index < options.length - 1}
              formatAmount={formatAmount}
            />
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview toggle */}
      {options.length > 1 && (
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Aperçu comparatif</h4>
          <OptionsComparison options={options} formatAmount={formatAmount} />
        </div>
      )}
    </div>
  );
};

export { MultiOptionsDevis, OptionsComparison, DEFAULT_OPTIONS };
export default MultiOptionsDevis;
