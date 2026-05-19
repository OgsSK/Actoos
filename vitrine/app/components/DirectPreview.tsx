'use client';

import { useRef, useEffect } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';

interface Props {
  code: string;
}

export default function DirectPreview({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;

    // Nettoyer le conteneur
    containerRef.current.innerHTML = '';

    try {
      // Exécuter le code pour obtenir le composant
      const AppComponent = new Function('React', `${code}; return App;`)(React);

      // Créer une racine React et rendre le composant
      const root = ReactDOM.createRoot(containerRef.current);
      root.render(React.createElement(AppComponent));

      return () => {
        root.unmount();
      };
    } catch (err) {
      containerRef.current.innerHTML = `<div style="padding:20px;color:red;">Erreur: ${(err as Error).message || 'Erreur inconnue'}</div>`;
    }
  }, [code]);

  return <div ref={containerRef} className="w-full h-full overflow-auto" />;
}