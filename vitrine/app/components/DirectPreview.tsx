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
      // 1. Supprimer TOUS les imports
      let cleanCode = code
        .split('\n')
        .filter(line => !line.trim().startsWith('import '))
        .join('\n');

      // 2. Si le code ne contient pas "function App" ou "const App", fallback
      if (!cleanCode.includes('function App') && !cleanCode.includes('const App') && !cleanCode.includes('export default')) {
        containerRef.current.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">Aperçu non disponible</div>';
        return;
      }

      // 3. Supprimer "export default" pour pouvoir appeler App directement
      cleanCode = cleanCode.replace(/export\s+default\s+/g, '');

      // 4. Exécuter le code
      const AppComponent = new Function('React', `${cleanCode}; return App;`)(React);

      // 5. Rendre le composant
      const root = ReactDOM.createRoot(containerRef.current);
      root.render(React.createElement(AppComponent));

      return () => { root.unmount(); };
    } catch (err) {
      containerRef.current.innerHTML = `<div style="padding:20px;color:#ef4444;">Erreur: ${(err as Error).message}</div>`;
    }
  }, [code]);

  return <div ref={containerRef} className="w-full h-full overflow-auto" />;
}