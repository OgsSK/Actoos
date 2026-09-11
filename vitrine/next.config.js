/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  // trailingSlash: true,  // ← commentée
  images: {
    unoptimized: true,
  },
  experimental: {
    // Aucune fonctionnalité expérimentale nécessaire
  },
  // ✅ Transpiler le package partagé @actoos/auth-client
  transpilePackages: ['@actoos/auth-client'],
  // ✅ Résoudre les imports `.js` en essayant `.ts` d'abord
  // (nécessaire car le package utilise node16 qui exige `.js` dans les imports)
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
    };
    return config;
  },
  // Redirections 301
  async redirects() {
    return [
      // Redirection existante : /actoos-jobs → jobs.actoos.com
      {
        source: '/actoos-jobs',
        destination: 'https://jobs.actoos.com',
        permanent: true,
      },
      // Nouvelle structure : anciennes routes → nouvelles
      {
        source: '/produits',
        destination: '/jobs',
        permanent: true,
      },
      {
        source: '/expertise',
        destination: '/',
        permanent: true,
      },
      {
        source: '/philosophie',
        destination: '/a-propos',
        permanent: true,
      },
    ];
  },
  // Désactiver le cache Vercel pour l'API admin
  async headers() {
    return [
      {
        source: '/api/admin/projets',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;