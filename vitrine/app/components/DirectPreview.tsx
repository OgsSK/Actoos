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
  containerRef.current.innerHTML = '';

  try {
    // Supprimer TOUS les imports et les remplacer par rien
    let cleanCode = code
      .replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '')
      .replace(/import\s+['"].*?['"];?\s*/g, '')
      .trim();

    // Si le code est vide après nettoyage, afficher un message
    if (!cleanCode.includes('function App') && !cleanCode.includes('const App')) {
      containerRef.current.innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">Preview non disponible</div>';
      return;
    }

    // Exécuter le code nettoyé
    const AppComponent = new Function('React', `${cleanCode}; return App;`)(React);

    const root = ReactDOM.createRoot(containerRef.current);
    root.render(React.createElement(AppComponent));

    return () => { root.unmount(); };
  } catch (err) {
    containerRef.current.innerHTML = `<div style="padding:20px;color:red;">Erreur: ${(err as Error).message}</div>`;
  }
}, [code]);

  return <div ref={containerRef} className="w-full h-full overflow-auto" />;
}