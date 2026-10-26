const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 1. Encuentra la ruta raíz del monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 2. Monitorea las carpetas del monorepo
config.watchFolders = [monorepoRoot];

// 3. Permite a Metro resolver paquetes de los node_modules del proyecto y del monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
