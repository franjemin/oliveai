const { getDefaultConfig } = require("expo/metro-config");

// Keep the default Expo config. Root pnpm-workspace.yaml makes Metro
// stat /workspace/node_modules — see that folder's .gitkeep.
module.exports = getDefaultConfig(__dirname);
