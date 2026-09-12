const path = require('path');

module.exports = {
    eslint: {
    enable: false,
  },
  webpack: {
    configure: (webpackConfig) => {
      // 1. Retirer ModuleScopePlugin (bloque les imports hors src/)
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
      );
      if (scopePluginIndex !== -1) {
        webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);
      }

      // 2. Ajouter les chemins du monorepo
      webpackConfig.resolve.modules = [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, '../../node_modules'),
        'node_modules',
      ];

      // 3. Forcer tailwindcss à être résolu depuis frontend/node_modules
      // 4. Forcer @actoos/auth-client vers son dist (CRA ne transpile pas le TS source)
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        tailwindcss: path.resolve(__dirname, 'node_modules/tailwindcss'),
        '@actoos/auth-client': path.resolve(
          __dirname,
          '../../packages/auth-client/dist/index.js'
        ),
      };

      return webpackConfig;
    },
  },
};