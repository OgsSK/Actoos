import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

const AIAssistant = ({ agentId, initialText, context = '', onApply }) => {
  const [text, setText] = useState(initialText);
  const [improved, setImproved] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  // Synchronise l'état local avec la prop chaque fois qu'elle change
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleImprove = async () => {
    if (!text.trim()) {
      toast.error('Veuillez entrer du texte à améliorer.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId, text, context }),
      });
      setImproved(res.result);
      setShowResult(true);
      toast.success('Texte amélioré avec succès !');
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'amélioration IA.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (onApply) onApply(improved);
    setShowResult(false);
    setImproved('');
    toast.success('Texte appliqué !');
  };

  return (
    <div className="relative">
      {!showResult && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleImprove}
          disabled={loading}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Améliorer avec l'IA
        </Button>
      )}

      {showResult && (
        <div className="mt-3 border border-blue-200 rounded-2xl p-4 bg-blue-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">Version améliorée</h3>
            </div>
            <button onClick={() => setShowResult(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-slate-700 whitespace-pre-wrap">{improved}</div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Check className="w-4 h-4 mr-2" />
              Appliquer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowResult(false)}>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;