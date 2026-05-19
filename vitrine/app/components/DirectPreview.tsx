'use client';

import { useEffect, useRef } from 'react';

interface Props {
  code: string;
}

export default function DirectPreview({ code }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;
    containerRef.current.innerHTML = '';

    try {
      // Créer un objet React minimal pour createElement
      const React = {
        createElement: (type: any, props: any, ...children: any[]) => {
          const el = document.createElement(type);
          if (props) {
            Object.entries(props).forEach(([key, value]) => {
              if (key === 'style' && typeof value === 'object') {
                Object.assign(el.style, value);
              } else if (key === 'className') {
                el.setAttribute('class', value as string);
              } else if (key.startsWith('on')) {
                el.addEventListener(key.slice(2).toLowerCase(), value as any);
              } else if (key !== 'children') {
                el.setAttribute(key, value as string);
              }
            });
          }
          children.forEach(child => {
            if (typeof child === 'string' || typeof child === 'number') {
              el.appendChild(document.createTextNode(String(child)));
            } else if (child instanceof Node) {
              el.appendChild(child);
            }
          });
          return el;
        },
        useState: (initial: any) => {
          let state = initial;
          const setState = (newState: any) => {
            state = typeof newState === 'function' ? newState(state) : newState;
          };
          return [state, setState];
        },
        useEffect: (fn: any, deps?: any[]) => { fn(); },
        useRef: (initial: any) => ({ current: initial }),
        useMemo: (fn: any) => fn(),
        useCallback: (fn: any) => fn,
      };

      // Supprimer "export default" et "import" du code
      let cleanCode = code
        .replace(/export\s+default\s+/g, '')
        .replace(/import\s+[^;]+;/g, '')
        .trim();

      const AppComponent = new Function('React', `${cleanCode}; return App;`)(React);
      const element = AppComponent();
      
      containerRef.current.innerHTML = '';
      if (element instanceof Node) {
        containerRef.current.appendChild(element);
      }
    } catch (err) {
      containerRef.current.innerHTML = `<div style="padding:20px;color:#ef4444;">Erreur: ${(err as Error).message}</div>`;
    }
  }, [code]);

  return <div ref={containerRef} className="w-full h-full overflow-auto" />;
}