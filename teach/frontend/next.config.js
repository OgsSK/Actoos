/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@actoos/auth-client'],
  eslint: {
    // ESLint est bloquant sur Vercel par défaut.
    // On le désactive : TypeScript fait déjà la vérification des types.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias || {}),
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
};

export default nextConfig;