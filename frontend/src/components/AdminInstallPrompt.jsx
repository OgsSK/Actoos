import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';

/**
 * PWA Install Prompt for Admin Dashboard
 * Shows installation banner for desktop and mobile
 */
const AdminInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect mobile/iOS
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsMobile(isMobileDevice);
    setIsIOS(isIOSDevice);

    // Check localStorage for dismissed state
    const dismissed = localStorage.getItem('pwa-admin-install-dismissed');
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 14) return; // Don't show for 14 days
    }

    // For iOS, show manual guide after delay
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 5000);
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      toast.success('Actoos Admin installé avec succès !');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    
    if (!deferredPrompt) {
      // Show manual instructions for desktop
      toast.info(
        <div>
          <p className="font-medium">Pour installer Actoos Admin :</p>
          <p className="text-sm mt-1">Cliquez sur l'icône ⊕ dans la barre d'adresse de votre navigateur</p>
        </div>,
        { duration: 8000 }
      );
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-admin-install-dismissed', new Date().toISOString());
    setShowPrompt(false);
    setShowIOSGuide(false);
  };

  if (isInstalled || !showPrompt) return null;

  // iOS Guide Modal
  if (showIOSGuide) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <Card className="w-full max-w-md bg-white">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Monitor className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Installer Actoos Admin</h2>
              <p className="text-slate-500 text-sm">Suivez ces étapes</p>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">Appuyez sur Partager</p>
                  <p className="text-xs text-slate-500">L'icône ⬆️ en bas de Safari</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">Sur l'écran d'accueil</p>
                  <p className="text-xs text-slate-500">Sélectionnez cette option ➕</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">Confirmez avec "Ajouter"</p>
                  <p className="text-xs text-slate-500">L'app apparaît sur votre écran</p>
                </div>
              </div>
            </div>
            
            <Button onClick={handleDismiss} className="w-full" variant="outline">
              J'ai compris
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom max-w-sm">
      <Card className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white border-0 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              {isMobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">Installer Actoos Admin</h3>
              <p className="text-xs text-indigo-100 mb-3">
                Accédez au tableau de bord depuis votre {isMobile ? 'écran d\'accueil' : 'bureau'}
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleInstall}
                  className="bg-white text-indigo-600 hover:bg-indigo-50 text-xs h-8"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Installer
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className="text-white hover:bg-white/20 text-xs h-8"
                >
                  Plus tard
                </Button>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-white/70 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInstallPrompt;
