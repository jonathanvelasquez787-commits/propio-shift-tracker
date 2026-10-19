import path from 'node:path';

// Keep the authenticated app outside the gate bundle. Inlining a dynamic
// import executes its module body eagerly, before boot hydrates localStorage.
export function entryBundleOptions(root, name, release) {
  const app = path.join(root, 'js/app-main.js');
  const details = path.join(root, 'js/detail-views.js');
  return {
    external: name === 'boot' ? id => id === './app-main.js' || id === app
      : name === 'app-main' ? id => id === './detail-views.js' || id === details : undefined,
    makeAbsoluteExternalsRelative: false,
    output: {
      format: ['boot', 'landing', 'theme-init', 'guide-theme'].includes(name) ? 'iife' : 'es',
      inlineDynamicImports: true,
      sourcemap: false,
      paths: id => id === app || id === './app-main.js'
        ? `/assets/app-main.js?v=${encodeURIComponent(release)}`
        : id === details || id === './detail-views.js' ? `/assets/detail-views.js?v=${encodeURIComponent(release)}` : id,
    },
  };
}
