/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@actoos/auth-client'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Désactive l'optimisation CSS de Next.js (fix 404 fonts)
  experimental: {
    optimizeCss: false,
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