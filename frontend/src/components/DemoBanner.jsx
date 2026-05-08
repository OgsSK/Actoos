import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';
import { 
  AlertTriangle, X, Sparkles, ArrowRight, 
  Mail, MessageSquare, Shield, Database,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from './ui/button';

/**
 * Bannière Mode Démo - Affichée en haut du dashboard
 * Design professionnel avec message clair et CTA
 */
export const DemoBanner = ({ variant = 'full' }) => {
  const { isDemo, exitDemo, messages } = useDemo();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isDemo || dismissed) return null;

  const handleUpgrade = () => {
    exitDemo();
  };

  // Version compacte pour mobile ou espaces réduits
  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">Mode démonstration</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleUpgrade}
              className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs h-7 px-2"
            >
              S'abonner
            </Button>
            <button
              onClick={exitDemo}
              className="text-white/80 hover:text-white p-1"
              aria-label="Quitter la démo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Version complète
  return (
    <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white border-b border-slate-700">
      {/* Ligne principale */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-start sm:items-center justify-between gap-4">
          {/* Contenu principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 flex-shrink-0">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">
                  {messages.banner.title}
                </h3>
                <p className="text-slate-300 text-sm hidden sm:block">
                  {messages.banner.description}
                </p>
              </div>
            </div>

            {/* Détails sur mobile - expandable */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-slate-400 text-xs mt-2 sm:hidden hover:text-slate-300"
            >
              {expanded ? 'Masquer les détails' : 'Voir les détails'}
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={handleUpgrade}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium gap-2"
              size="sm"
              data-testid="demo-upgrade-btn"
            >
              <span className="hidden sm:inline">Démarrer l'essai gratuit</span>
              <span className="sm:hidden">S'abonner</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <button
              onClick={exitDemo}
              className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Quitter la démo"
              data-testid="demo-exit-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Détails expanded (mobile) */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-700 sm:hidden">
            <p className="text-slate-300 text-sm mb-3">
              {messages.banner.details}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <RestrictionBadge icon={Mail} text="Emails simulés" />
              <RestrictionBadge icon={MessageSquare} text="SMS simulés" />
              <RestrictionBadge icon={Shield} text="Paiements désactivés" />
              <RestrictionBadge icon={Database} text="Données 24h" />
            </div>
          </div>
        )}

        {/* Barre d'info supplémentaire (desktop) */}
        <div className="hidden sm:flex items-center gap-4 mt-3 pt-3 border-t border-slate-700">
          <span className="text-slate-400 text-xs">Fonctionnalités simulées :</span>
          <div className="flex items-center gap-3">
            <RestrictionBadge icon={Mail} text="Emails" />
            <RestrictionBadge icon={MessageSquare} text="SMS / WhatsApp" />
            <RestrictionBadge icon={Shield} text="Paiements" />
            <RestrictionBadge icon={Database} text="Données conservées 24h" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Badge de restriction
 */
const RestrictionBadge = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-1.5 text-slate-400 text-xs bg-slate-800/50 px-2 py-1 rounded">
    <Icon className="w-3 h-3" />
    <span>{text}</span>
  </div>
);

/**
 * Message de restriction pour les fonctionnalités bloquées
 * À utiliser quand l'utilisateur tente une action non disponible en démo
 */
export const DemoRestrictionMessage = ({ 
  feature, 
  showUpgrade = true,
  className = ''
}) => {
  const { isDemo, getUpgradeMessage, exitDemo } = useDemo();
  const navigate = useNavigate();

  if (!isDemo) return null;

  const message = getUpgradeMessage(feature);

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="text-amber-800 text-sm font-medium mb-1">
            Fonctionnalité limitée en mode démo
          </p>
          <p className="text-amber-700 text-sm">
            {message}
          </p>
          {showUpgrade && (
            <Button
              onClick={() => exitDemo()}
              variant="outline"
              size="sm"
              className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Voir les offres
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Indicateur inline pour les actions simulées
 * Petit badge discret à côté des boutons d'envoi
 */
export const DemoSimulatedBadge = ({ action }) => {
  const { isDemo } = useDemo();

  if (!isDemo) return null;

  const labels = {
    email: 'Email simulé',
    sms: 'SMS simulé',
    whatsapp: 'WhatsApp simulé',
    payment: 'Paiement désactivé',
    default: 'Simulé'
  };

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
      <Sparkles className="w-3 h-3" />
      {labels[action] || labels.default}
    </span>
  );
};

/**
 * Tooltip/Info pour expliquer qu'une action est simulée
 */
export const DemoTooltip = ({ children, action }) => {
  const { isDemo, simulateAction } = useDemo();
  const [showTooltip, setShowTooltip] = useState(false);

  if (!isDemo) return children;

  const handleAction = async (originalAction) => {
    // Simuler l'action
    const result = await simulateAction(action);
    
    // Montrer le tooltip de confirmation
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3000);

    // Exécuter l'action originale si fournie
    if (originalAction) {
      originalAction();
    }
  };

  return (
    <div className="relative inline-block">
      {React.cloneElement(children, {
        onClick: (e) => {
          e.preventDefault();
          const originalOnClick = children.props.onClick;
          handleAction(originalOnClick);
        }
      })}
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Action simulée en mode démo</span>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-slate-800" />
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoBanner;
