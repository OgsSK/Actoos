'use client';

import { useEffect, useRef } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';

interface Props {
  code: string;
}

export default function DirectPreview({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;
    containerRef.current.innerHTML = '';

    try {
      // 1. Supprimer TOUT ce qui commence par "import" jusqu'au point-virgule (sur plusieurs lignes)
      let cleanCode = code
        .replace(/import\s+[\s\S]*?;\s*/g, '')  // imports sur une ligne
        .replace(/import\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?\s*/g, '') // imports nommés
        .replace(/import\s+\w+\s+from\s+['"][^'"]+['"];?\s*/g, '') // imports par défaut
        .replace(/import\s+['"][^'"]+['"];?\s*/g, '') // imports CSS
        .trim();

      // 2. Fallback si vide
      if (!cleanCode || cleanCode.length < 20) {
        containerRef.current.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">Aperçu en cours de génération...</div>';
        return;
      }

      // 3. Supprimer "export default"
      cleanCode = cleanCode.replace(/export\s+default\s+/g, '');

      // 4. Exécuter
      const AppComponent = new Function('React', `${cleanCode}; return App;`)(React);

      const root = ReactDOM.createRoot(containerRef.current);
      root.render(React.createElement(AppComponent));

      return () => { root.unmount(); };
    } catch (err) {
      containerRef.current.innerHTML = `<div style="padding:20px;color:#ef4444;">Erreur: ${(err as Error).message}</div>`;
    }
  }, [code]);

  return <div ref={containerRef} className="w-full h-full overflow-auto" />;
}