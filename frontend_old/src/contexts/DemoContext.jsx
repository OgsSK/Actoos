import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DemoContext = createContext(null);

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};

export const DemoProvider = ({ children }) => {
  const { user, logout } = useAuth();
  const [isDemo, setIsDemo] = useState(false);
  const [demoStatus, setDemoStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Check if current user is demo
  useEffect(() => {
    if (user?.email === 'demo@actoos.com' || user?.is_demo) {
      setIsDemo(true);
      // Set default demo status without API call
      setDemoStatus({
        is_demo: true,
        session_started: new Date().toISOString(),
        actions_count: 0
      });
    } else {
      setIsDemo(false);
      setDemoStatus(null);
    }
  }, [user]);

  // Initialize demo session (reset data) - simplified
  const initDemoSession = useCallback(async () => {
    setLoading(true);
    try {
      // Demo mode - just reset local state
      setDemoStatus({
        is_demo: true,
        session_started: new Date().toISOString(),
        actions_count: 0
      });
      return { success: true, message: 'Session démo initialisée' };
    } finally {
      setLoading(false);
    }
  }, []);

  // Simulate an action in demo mode
  const simulateAction = useCallback(async (actionType) => {
    if (!isDemo) return { success: true };
    
    // Demo mode - always return success
    return {
      success: true,
      message: `Action "${actionType}" simulée en mode démo`,
      demo_note: 'Cette action est simulée en mode démonstration'
    };
  }, [isDemo]);

  // Check if a feature is available
  const checkFeature = useCallback(async (feature) => {
    if (!isDemo) return { available: true };
    return { available: true, is_demo: true };
  }, [isDemo]);

  // Exit demo mode
  const exitDemo = useCallback(async () => {
    await logout();
    window.location.href = '/pricing';
  }, [logout]);

  // Get upgrade message based on feature
  const getUpgradeMessage = useCallback((feature) => {
    const messages = {
      default: "Passez à un abonnement pour débloquer cette fonctionnalité.",
      emails: "Les emails sont simulés en mode démo. Souscrivez pour envoyer de vrais emails à vos clients.",
      sms: "Les SMS sont simulés. Disponible à partir du plan Pro.",
      whatsapp: "WhatsApp est simulé. Disponible à partir du plan Pro.",
      api: "L'accès API est réservé aux plans Pro et Entreprise.",
      white_label: "Le white-labeling est disponible uniquement avec le plan Entreprise.",
      export: "L'export de données est réservé aux abonnés.",
      conversion_auto: "La conversion automatique devis → facture est disponible à partir du plan Pro."
    };
    return messages[feature] || messages.default;
  }, []);

  const value = {
    isDemo,
    demoStatus,
    loading,
    initDemoSession,
    simulateAction,
    checkFeature,
    exitDemo,
    getUpgradeMessage,
    // Message constants for UI
    messages: {
      banner: {
        title: "Mode démonstration actif",
        description: "Vous explorez actuellement une version simulée du dashboard administrateur.",
        details: "Certaines actions (emails, notifications, signatures) sont simulées pour vous permettre de tester l'application en toute sécurité.",
        cta: "Pour accéder à l'ensemble des fonctionnalités et à l'application technicien, veuillez activer un abonnement."
      },
      restrictions: {
        emails: "Les emails sont simulés en mode démo",
        sms: "Les SMS sont simulés en mode démo",
        payments: "Les paiements sont désactivés en mode démo",
        persistence: "Les données ne sont pas conservées entre les sessions"
      }
    }
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};

export default DemoContext;
