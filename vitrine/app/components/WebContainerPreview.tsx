'use client';

import { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';

interface Props {
  code: string;
  dependencies?: Record<string, string>;
}

export default function WebContainerPreview({ code, dependencies = {} }: Props) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const containerRef = useRef<WebContainer | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setUrl('');

    async function boot() {
      try {
        if (!containerRef.current) {
          containerRef.current = await WebContainer.boot();
        }
        const container = containerRef.current;

        // Préparer les fichiers
        await container.mount({
          'package.json': {
            file: {
              contents: JSON.stringify({
                name: 'actoos-preview',
                type: 'module',
                scripts: { dev: 'vite' },
                dependencies: {
                  react: '^18.2.0',
                  'react-dom': '^18.2.0',
                  ...dependencies,
                },
                devDependencies: {
                  vite: '^5.0.0',
                  '@vitejs/plugin-react': '^4.0.0',
                },
              }),
            },
          },
          'vite.config.js': {
            file: {
              contents: `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });
`,
            },
          },
          'index.html': {
            file: {
              contents: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body><div id="root"></div><script type="module" src="/index.jsx"></script></body>
</html>
`,
            },
          },
          'App.jsx': {
            file: { contents: code },
          },
          'index.jsx': {
            file: {
              contents: `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
`,
            },
          },
        });

        // Installer les dépendances
        const installProcess = await container.spawn('npm', ['install']);
        await installProcess.exit;

        // Lancer le serveur de dev
        const serverProcess = await container.spawn('npm', ['run', 'dev']);

        // Écouter l'URL du serveur
        container.on('server-ready', (port, serverUrl) => {
          if (mounted) {
            setUrl(serverUrl);
            setLoading(false);
          }
        });
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Erreur lors du démarrage du conteneur');
          setLoading(false);
        }
      }
    }

    boot();

    return () => {
      mounted = false;
    };
  }, [code, dependencies]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 rounded-2xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D4AF37] border-t-transparent mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Démarrage du conteneur...</p>
          <p className="text-xs text-slate-400 mt-1">Cela peut prendre quelques secondes</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-2xl p-4">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={url}
      className="w-full h-full border-0 rounded-2xl"
      title="Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}