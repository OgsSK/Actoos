'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { STEP_LIBRARY, STEP_CATEGORIES, StepCategory } from '../../lib/step-library';

interface SelectedStep {
  id: string;
  label: string;
}

interface StepPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (steps: string[]) => void;
  language: 'fr' | 'en';
}

export default function StepPickerModal({ isOpen, onClose, onAdd, language }: StepPickerModalProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<StepCategory | 'all'>('all');
  const [selected, setSelected] = useState<SelectedStep[]>([]);
  const [customInput, setCustomInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setActiveCategory('all');
      setSelected([]);
      setCustomInput('');
    }
  }, [isOpen]);

  const selectedIds = useMemo(() => new Set(selected.map(s => s.id)), [selected]);

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase();
    return STEP_LIBRARY.filter(s => {
      const matchSearch = !q || s.labelFr.toLowerCase().includes(q) || s.labelEn.toLowerCase().includes(q);
      const matchCat = activeCategory === 'all' || s.category === activeCategory;
      return matchSearch && matchCat;
    });
  }, [search, activeCategory]);

  const toggleLibraryStep = (template: typeof STEP_LIBRARY[number]) => {
    if (selectedIds.has(template.id)) {
      setSelected(prev => prev.filter(s => s.id !== template.id));
    } else {
      const label = language === 'fr' ? template.labelFr : template.labelEn;
      setSelected(prev => [...prev, { id: template.id, label }]);
    }
  };

  const addCustomStep = () => {
    const v = customInput.trim();
    if (!v) return;
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setSelected(prev => [...prev, { id, label: v }]);
    setCustomInput('');
  };

  const removeStep = (id: string) => {
    setSelected(prev => prev.filter(s => s.id !== id));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= selected.length) return;
    setSelected(prev => {
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const handleSubmit = () => {
    if (selected.length === 0) return;
    onAdd(selected.map(s => s.label));
    onClose();
  };

  if (!isOpen) return null;

  const t = language === 'fr' ? frText : enText;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">{t.title}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.allCategories}
            </button>
            {STEP_CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === c.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {language === 'fr' ? c.labelFr : c.labelEn}
              </button>
            ))}
          </div>

          <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
            {filteredLibrary.length === 0 && (
              <p className="p-4 text-sm text-slate-400 text-center">{t.noResults}</p>
            )}
            {filteredLibrary.map(s => {
              const checked = selectedIds.has(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => toggleLibraryStep(s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    checked ? 'bg-slate-900 border-slate-900' : 'border-slate-300 bg-white'
                  }`}>
                    {checked && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm text-slate-700">{language === 'fr' ? s.labelFr : s.labelEn}</span>
                </button>
              );
            })}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">{t.customLabel}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomStep();
                  }
                }}
                placeholder={t.customPlaceholder}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                onClick={addCustomStep}
                disabled={!customInput.trim()}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={t.addCustomBtn}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {selected.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">
                {t.selectedCount.replace('{n}', String(selected.length))}
              </p>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                {selected.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-xs text-slate-400 w-5 shrink-0">{i + 1}.</span>
                    <span className="flex-1 text-sm text-slate-700 truncate">{s.label}</span>
                    <button
                      onClick={() => moveStep(i, -1)}
                      disabled={i === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveStep(i, 1)}
                      disabled={i === selected.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => removeStep(s.id)}
                      className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t border-slate-200 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 bg-white text-slate-700 border border-slate-200 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={selected.length === 0}
            className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t.add}
          </button>
        </div>
      </div>
    </div>
  );
}

const frText = {
  title: 'Ajouter des étapes',
  searchPlaceholder: 'Rechercher une étape…',
  allCategories: 'Toutes',
  noResults: 'Aucune étape ne correspond.',
  customLabel: 'Ajouter une étape personnalisée',
  customPlaceholder: 'Ex : Intégration Shopify',
  addCustomBtn: 'Ajouter',
  selectedCount: 'Étapes sélectionnées ({n})',
  cancel: 'Annuler',
  add: 'Ajouter au projet',
};

const enText = {
  title: 'Add steps',
  searchPlaceholder: 'Search a step…',
  allCategories: 'All',
  noResults: 'No step matches.',
  customLabel: 'Add a custom step',
  customPlaceholder: 'Ex: Shopify integration',
  addCustomBtn: 'Add',
  selectedCount: 'Selected steps ({n})',
  cancel: 'Cancel',
  add: 'Add to project',
};