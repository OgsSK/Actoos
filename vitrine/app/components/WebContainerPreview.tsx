'use client';

import { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';
import { X } from 'lucide-react';

interface Props {
  code: string;
  dependencies?: Record<string, string>;
}

const defaultDependencies: Record<string, string> = {
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
  'lucide-react': '^0.400.0',
  'framer-motion': '^10.0.0',
  'tailwindcss': '^3.4.0',
  'autoprefixer': '^10.4.0',
  'postcss': '^8.4.0',
};

export default function WebContainerPreview({ code, dependencies = {} }: Props) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('Démarrage du conteneur...');
  const containerRef = useRef<WebContainer | null>(null);
  const bootedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setUrl('');
    setProgress('Démarrage du conteneur...');

    async function boot() {
      try {
        // Éviter de démarrer plusieurs conteneurs
        if (!bootedRef.current) {
          containerRef.current = await WebContainer.boot();
          bootedRef.current = true;
        }
        const container = containerRef.current!;

        // Fusionner les dépendances
        const allDeps = { ...defaultDependencies, ...dependencies };

        setProgress('Préparation des fichiers...');

        // Fichiers de base
        const files: Record<string, any> = {
          'package.json': {
            file: {
              contents: JSON.stringify({
                name: 'actoos-preview',
                type: 'module',
                scripts: { dev: 'vite' },
                dependencies: allDeps,
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
          'tailwind.config.js': {
            file: {
              contents: `
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './App.jsx', './index.jsx'],
  theme: { extend: {} },
  plugins: [],
};
`,
            },
          },
          'postcss.config.js': {
            file: {
              contents: `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`,
            },
          },
          'index.css': {
            file: {
              contents: `@tailwind base;\n@tailwind components;\n@tailwind utilities;`,
            },
          },
          'index.html': {
            file: {
              contents: `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <link rel="stylesheet" href="/index.css">
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/index.jsx"></script>
</body>
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
        };

        await container.mount(files);

        setProgress('Installation des dépendances...');

        // Installer les dépendances
        const installProcess = await container.spawn('npm', ['install']);
        const installExit = await installProcess.exit;

        if (installExit !== 0) {
          throw new Error('Erreur lors de l\'installation des dépendances');
        }

        setProgress('Démarrage du serveur...');

        // Démarrer le serveur de développement
        container.spawn('npm', ['run', 'dev']);

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
  }, [code, JSON.stringify(dependencies)]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50 rounded-2xl">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4AF37] border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">{progress}</p>
          <p className="text-xs text-slate-400 mt-1">Cela peut prendre quelques secondes</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 rounded-2xl p-6">
        <div className="text-center">
          <X className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-600 text-sm font-medium">Erreur</p>
          <p className="text-red-500 text-xs mt-1 max-w-md">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError('');
              setUrl('');
              bootedRef.current = false;
            }}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={url}
      className="w-full h-full border-0 rounded-2xl"
      title="Preview"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}