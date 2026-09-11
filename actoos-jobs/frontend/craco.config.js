const path = require('path');

module.exports = {
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
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        tailwindcss: path.resolve(__dirname, 'node_modules/tailwindcss'),
      };

      return webpackConfig;
    },
  },
};