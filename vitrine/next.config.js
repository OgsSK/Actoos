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
  // Redirection 301 /actoos-jobs vers jobs.actoos.com
  async redirects() {
    return [
      {
        source: '/actoos-jobs',
        destination: 'https://jobs.actoos.com',
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