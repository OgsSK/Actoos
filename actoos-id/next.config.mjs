/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@actoos/auth-client'],
  webpack: (config) => {
    // Résoudre les imports .js vers .ts dans @actoos/auth-client
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