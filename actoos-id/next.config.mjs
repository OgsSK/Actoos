/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@actoos/auth-client'],
  eslint: {
    // ESLint est bloquant sur Vercel par défaut, on le désactive
    // pour ne pas bloquer les builds sur des règles de style.
    // Les erreurs réelles sont attrapées par TypeScript.
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