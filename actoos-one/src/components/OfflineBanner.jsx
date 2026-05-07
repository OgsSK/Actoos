import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  return (
    <div
      className="fixed top-0 left-0 right-0 bg-danger px-4 py-2 flex items-center justify-center gap-2 z-[70]"
      data-testid="offline-banner"
    >
      <WifiOff className="w-4 h-4 text-white" />
      <span className="text-sm text-white font-medium">
        Hors ligne - Vérifiez votre connexion
      </span>
    </div>
  );
}
