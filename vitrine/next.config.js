/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Désactiver les fonctionnalités serveur pour export statique
  experimental: {
    // Aucune fonctionnalité expérimentale nécessaire
  },
};

module.exports = nextConfig;
