const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the full monorepo so Metro picks up changes in workspace packages
config.watchFolders = [workspaceRoot]

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Follow symlinks created by Bun workspace linking
config.resolver.unstable_enableSymlinks = true

// Prefer react-native export condition from workspace packages
config.resolver.unstable_conditionNames = ['react-native', 'require', 'default']

// Force Metro to always resolve React (and react-native) from the workspace
// root, preventing the nested copy in packages/react-native/node_modules from
// being picked up through the symlink chain and causing a "multiple copies of
// React" crash (TypeError: Cannot read property 'useMemo' of null).
config.resolver.extraNodeModules = {
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(workspaceRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(workspaceRoot, 'node_modules/react/jsx-dev-runtime'),
  'react-dom': path.resolve(workspaceRoot, 'node_modules/react-dom'),
}

// Replace extraNodeModules with resolveRequest — highest priority, overrides nested node_modules.
// extraNodeModules is only a fallback; resolveRequest fires FIRST for every module resolution,
// ensuring the workspace-root React is always used even when Metro follows a symlink into
// packages/react-native/ and would otherwise find the nested copy via normal resolution.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const forced = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom']
  if (forced.includes(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.resolve(workspaceRoot, 'package.json') },
      moduleName,
      platform
    )
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
