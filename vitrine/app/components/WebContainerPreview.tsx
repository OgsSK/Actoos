'use client';

import { useEffect, useRef, useState } from 'react';
import { WebContainer } from '@webcontainer/api';

interface Props {
  code: string;
  dependencies?: Record<string, string>;
  onRetry?: () => void;
}

const defaultDependencies: Record<string, string> = {
  'react': '^18.2.0',
  'react-dom': '^18.2.0',
  'lucide-react': '^0.400.0',
  'framer-motion': '^10.0.0',
  'tailwindcss': '^3.4.0',
  'autoprefixer': '^10.4.0',
  'postcss': '^8.4.0',
  'react-tabs': '^6.0.0',
};

const KNOWN_PACKAGES: Record<string, string> = {
  'react-tabs': '^6.0.0',
  'react-router-dom': '^6.20.0',
  'recharts': '^2.10.0',
  'zustand': '^4.4.0',
  'axios': '^1.6.0',
  'swr': '^2.2.0',
  'react-hook-form': '^7.48.0',
  'react-select': '^5.8.0',
  'react-modal': '^3.16.0',
  'react-datepicker': '^4.25.0',
  'react-icons': '^4.12.0',
  'react-hot-toast': '^2.4.0',
  'react-query': '^3.39.0',
  '@tanstack/react-query': '^5.12.0',
  'react-beautiful-dnd': '^13.1.0',
  'react-dnd': '^16.0.0',
  'react-grid-layout': '^1.4.0',
  'ag-grid-react': '^31.0.0',
  'chart.js': '^4.4.0',
  'react-chartjs-2': '^5.2.0',
  'lodash': '^4.17.21',
  'moment': '^2.29.0',
  'dayjs': '^1.11.0',
  'uuid': '^9.0.0',
  'classnames': '^2.3.0',
  'clsx': '^2.0.0',
};

let globalContainer: WebContainer | null = null;
let globalBootPromise: Promise<WebContainer> | null = null;

function extractImports(code: string): Record<string, string> {
  const deps: Record<string, string> = {};
  const regex = /import\s+(?:(?:\{[^}]*\}|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(code)) !== null) {
    const pkg = match[1];
    if (!pkg.startsWith('.') && !pkg.startsWith('/') && !defaultDependencies[pkg] && !pkg.startsWith('react/') && !pkg.startsWith('next/')) {
      deps[pkg] = KNOWN_PACKAGES[pkg] || 'latest';
    }
  }
  return deps;
}

export default function WebContainerPreview({ code, dependencies = {}, onRetry }: Props) {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<string>('Démarrage du conteneur...');
  const mountedRef = useRef(true);
  const serverStartedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError('');
    setUrl('');
    setProgress('Démarrage du conteneur...');

    async function boot() {
      try {
        if (!globalContainer) {
          if (!globalBootPromise) {
            globalBootPromise = WebContainer.boot();
          }
          globalContainer = await globalBootPromise;
          globalBootPromise = null;
        }

        const container = globalContainer;

        const extractedDeps = extractImports(code);
        const allDeps = { ...defaultDependencies, ...extractedDeps, ...dependencies };

        const safeDeps: Record<string, string> = {};
        for (const [pkg, version] of Object.entries(allDeps)) {
          if (pkg && pkg.length > 0 && !pkg.startsWith('react/') && !pkg.startsWith('next/')) {
            safeDeps[pkg] = version;
          }
        }

        setProgress('Préparation des fichiers...');

        const files: Record<string, any> = {
          'package.json': {
            file: {
              contents: JSON.stringify({
                name: 'actoos-preview',
                type: 'module',
                scripts: { dev: 'vite' },
                dependencies: safeDeps,
                devDependencies: {
                  vite: '^5.0.0',
                  '@vitejs/plugin-react': '^4.0.0',
                },
              }),
            },
          },
          'vite.config.js': {
            file: {
              contents: `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });`,
            },
          },
          'tailwind.config.js': {
            file: {
              contents: `/** @type {import('tailwindcss').Config} */\nexport default {\n  content: ['./index.html', './App.jsx', './index.jsx'],\n  theme: { extend: {} },\n  plugins: [],\n};`,
            },
          },
          'postcss.config.js': {
            file: {
              contents: `export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n};`,
            },
          },
          'index.css': {
            file: {
              contents: `@tailwind base;\n@tailwind components;\n@tailwind utilities;`,
            },
          },
          'index.html': {
            file: {
              contents: `<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8"/>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n  <link rel="stylesheet" href="/index.css">\n</head>\n<body>\n  <div id="root"></div>\n  <script type="module" src="/index.jsx"></script>\n</body>\n</html>`,
            },
          },
          'App.jsx': {
            file: { contents: code },
          },
          'index.jsx': {
            file: {
              contents: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App.jsx';\nReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));`,
            },
          },
        };

        await container.mount(files);

        setProgress('Installation des dépendances...');
        try {
          const installProcess = await container.spawn('npm', ['install', '--legacy-peer-deps', '--no-audit', '--no-fund']);
          const installExit = await installProcess.exit;
          if (installExit !== 0) {
            const retryProcess = await container.spawn('npm', ['install', '--force', '--no-audit']);
            await retryProcess.exit;
          }
        } catch {
          // Continuer même si l'installation échoue
        }

        setProgress('Démarrage du serveur...');
        if (!serverStartedRef.current) {
          container.spawn('npm', ['run', 'dev']);
          serverStartedRef.current = true;
        }

        container.on('server-ready', (port, serverUrl) => {
          if (mountedRef.current) {
            setUrl(serverUrl);
            setLoading(false);
          }
        });
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message || 'Erreur lors du démarrage du conteneur');
          setLoading(false);
        }
      }
    }

    boot();

    return () => {
      mountedRef.current = false;
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
          <span className="text-red-400 text-2xl font-bold">✕</span>
          <p className="text-red-600 text-sm font-medium mt-2">Erreur</p>
          <p className="text-red-500 text-xs mt-1 max-w-md">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors"
            >
              Réessayer
            </button>
          )}
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