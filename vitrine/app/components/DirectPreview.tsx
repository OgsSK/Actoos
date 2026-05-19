'use client';

import { useEffect, useRef } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';

export default function DirectPreview({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !code) return;
    containerRef.current.innerHTML = '';

    try {
      const AppComponent = new Function('React', `${code}; return App;`)(React);
      const root = ReactDOM.createRoot(containerRef.current);
      root.render(React.createElement(AppComponent));
      return () => { root.unmount(); };
    } catch (err) {
      containerRef.current.innerHTML = `<div style="padding:20px;color:#ef4444;">${(err as Error).message}</div>`;
    }
  }, [code]);

  return <div ref={containerRef} className="w-full h-full overflow-auto" />;
}