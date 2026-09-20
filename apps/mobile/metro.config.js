const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

// Root pnpm-workspace.yaml has no root package.json. Metro can walk up and
// miss apps/mobile/node_modules (expo-linear-gradient). Pin the project.
const config = getDefaultConfig(__dirname);
config.watchFolders = [__dirname];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, "node_modules")];
module.exports = config;
