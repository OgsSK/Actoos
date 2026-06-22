import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../lib/api';

const AIAssistant = ({ agentId, initialText, context = '', onApply }) => {
  const { t, i18n } = useTranslation();   // ← ajout de t
  const [text, setText] = useState(initialText);
  const [improved, setImproved] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleImprove = async () => {
    if (!text.trim()) {
      toast.error(t('aiAssistant.emptyText', 'Veuillez entrer du texte à améliorer.'));
      return;
    }
    setLoading(true);

    const targetLang = i18n.language;
    console.log('[AIAssistant] Langue cible :', targetLang);

    try {
      // 1. Amélioration en français (toujours)
      const res1 = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: agentId,
          text,
          context,
          language: 'fr',
        }),
      });

      let improvedText = res1.result;

      // 2. Traduction si la langue de l'utilisateur n'est pas le français
      if (targetLang !== 'fr') {
        const res2 = await apiFetch('/api/ai/agent', {
          method: 'POST',
          body: JSON.stringify({
            agent_id: 'translator',
            text: improvedText,
            language: targetLang,
          }),
        });
        improvedText = res2.result || improvedText;
      }

      setImproved(improvedText);
      setShowResult(true);
      toast.success(t('aiAssistant.improvedSuccess', 'Texte amélioré avec succès !'));
    } catch (err) {
      toast.error(err.message || t('aiAssistant.improveError', "Erreur lors de l'amélioration IA."));
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (onApply) onApply(improved);
    setShowResult(false);
    setImproved('');
    toast.success(t('aiAssistant.appliedSuccess', 'Texte appliqué !'));
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
          {t('aiAssistant.improve', 'Améliorer avec l\'IA')}
        </Button>
      )}

      {showResult && (
        <div className="mt-3 border border-blue-200 rounded-2xl p-4 bg-blue-50/50">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">
                {t('aiAssistant.improvedVersion', 'Version améliorée')}
              </h3>
            </div>
            <button onClick={() => setShowResult(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-slate-700 whitespace-pre-wrap">{improved}</div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white ">
              <Check className="w-4 h-4 mr-2" />
              {t('aiAssistant.apply', 'Appliquer')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowResult(false)}>
              <X className="w-4 h-4 mr-2" />
              {t('aiAssistant.cancel', 'Annuler')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;