const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const mobileModules = path.resolve(projectRoot, "node_modules");

// Do not walk up to a root node_modules (pnpm-workspace / empty hoist).
const config = getDefaultConfig(projectRoot);
config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [mobileModules];
config.resolver.extraNodeModules = {
  "expo-linear-gradient": path.resolve(mobileModules, "expo-linear-gradient"),
  semver: path.resolve(mobileModules, "semver"),
};
module.exports = config;
