import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { minify } from 'terser';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAppShell } from './production-shell.mjs';
import { createLocalizedLanding } from './landing-pages.mjs';
import { createInterpreterGuide } from './interpreter-guide.mjs';
import { INTERPRETER_GUIDE_PATHS } from '../js/landing-meta.js';
import { entryBundleOptions } from './bundle-entry.mjs';

const root = process.cwd();
const out = path.join(root, 'public');
const assets = path.join(out, 'assets');
const release = process.env.VERCEL_GIT_COMMIT_SHA || 'local';
const catalogModule = path.join(root, 'js/locales.generated.js');

await rm(out, { recursive: true, force: true });
await mkdir(assets, { recursive: true });
await mkdir(path.join(out, 'icons'), { recursive: true });
await minifyFile(path.join(assets, 'locales.js'),
  (await readFile(catalogModule, 'utf8')).replace('export const resources =', 'window.pstLocaleResources ='));

const entries = {
  'theme-init': 'js/theme-init.js',
  boot: 'js/boot.js',
  'app-main': 'js/app-main.js',
  landing: 'js/landing-entry.js',
  'landing-ui': 'js/landing-ui.js',
  'theme-toggle': 'js/theme-toggle.js',
  'guide-theme': 'js/guide-theme.js',
};

// Cada entrypoint queda autocontenido; la app se importa únicamente después de
// verificar la sesión e hidratar los datos. Ambos archivos llevan la misma
// versión para que el service worker no mezcle releases.
for (const [name, input] of Object.entries(entries)) {
  const options = entryBundleOptions(root, name, release);
  const bundle = await rollup({
    input: path.join(root, input),
    external: options.external,
    makeAbsoluteExternalsRelative: options.makeAbsoluteExternalsRelative,
    plugins: [nodeResolve({ browser: true }), {
      name: 'shared-locale-data',
      load(id) { if (id === catalogModule) return 'export const resources = window.pstLocaleResources;'; },
    }],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') {
        const ownCycle = (warning.ids || []).some(id => !id.includes('/node_modules/') && !id.includes('\\node_modules\\'));
        if (ownCycle) throw new Error(warning.message);
        return;
      }
      warn(warning);
    },
  });
  await bundle.write({
    file: path.join(assets, `${name}.js`),
    ...options.output,
  });
  await bundle.close();
}

async function minifyFile(file, source, isModule = false) {
  const result = await minify(source, { module: isModule, compress: true, mangle: true });
  if (!result.code) throw new Error(`Terser no produjo salida para ${file}`);
  await writeFile(file, result.code);
}

async function minifyTree(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await minifyTree(file);
    else if (entry.name.endsWith('.js')) {
      const isModule = !['boot.js', 'landing.js', 'theme-init.js', 'guide-theme.js'].includes(entry.name);
      await minifyFile(file, await readFile(file, 'utf8'), isModule);
    }
  }
}

await minifyTree(assets);
for (const name of ['footer-year', 'register-sw', 'monitoring']) {
  let source = await readFile(path.join(root, 'js', `${name}.js`), 'utf8');
  if (name === 'monitoring') source = source.replaceAll('__BUILD_VERSION__', release);
  await minifyFile(path.join(assets, `${name}.js`), source);
}
const worker = (await readFile(path.join(root, 'js/service-worker.js'), 'utf8'))
  .replaceAll('__BUILD_VERSION__', JSON.stringify(release));
await minifyFile(path.join(out, 'sw.js'), worker);

await cp(path.join(root, 'css'), path.join(out, 'css'), { recursive: true });
await cp(path.join(root, 'manifest.webmanifest'), path.join(out, 'manifest.webmanifest'));
await cp(path.join(root, 'icons/app-icon.svg'), path.join(out, 'icons/app-icon.svg'));
await cp(path.join(root, 'icons/social-preview.png'), path.join(out, 'icons/social-preview.png'));
for (const name of ['robots.txt', 'sitemap.xml']) {
  await cp(path.join(root, name), path.join(out, name));
}

for (const name of ['index.html', 'app.html', 'privacidad.html', 'terminos.html']) {
  let html = await readFile(path.join(root, name), 'utf8');
  html = html.replace('<head>', `<head>\n<script src="/assets/locales.js?v=${release}"></script>`);
  if (name === 'index.html') html = html.replace(/<script type="module" src="js\/(?:theme-toggle|landing-ui)\.js"><\/script>\r?\n/g, '');
  html = html
    .replaceAll('/js/theme-init.js', `/assets/theme-init.js?v=${release}`)
    .replaceAll('/js/footer-year.js', `/assets/footer-year.js?v=${release}`)
    .replaceAll('js/theme-toggle.js', `/assets/theme-toggle.js?v=${release}`)
    .replaceAll('js/landing-ui.js', `/assets/landing-ui.js?v=${release}`)
    .replaceAll('js/landing.js', `/assets/landing.js?v=${release}`)
    .replaceAll('/js/boot.js', `/assets/boot.js?v=${release}`)
    .replace(/<script type="module" src="(\/assets\/theme-init\.js\?v=[^"]+)"><\/script>/g, '<script src="$1"></script>')
    .replace(/<script type="module" src="(\/assets\/(?:landing|boot)\.js\?v=[^"]+)"><\/script>/g, '<script src="$1" defer></script>')
    .replace(/^<link rel="modulepreload" href="\/js\/.*?"\/>\r?\n/gm, '');
  if (name === 'app.html') html = html.replace('</head>', `<link rel="modulepreload" href="/assets/app-main.js?v=${release}">\n</head>`);
  html = html.replace('</head>', `<script src="/assets/monitoring.js?v=${release}"></script>\n</head>`);
  html = html.replace('</head>', '<link rel="manifest" href="/manifest.webmanifest">\n<meta name="theme-color" content="#07111f">\n</head>');
  html = html.replace('</body>', `<script src="/assets/register-sw.js?v=${release}" defer></script>\n</body>`);
  if (name === 'app.html') {
    const shell = createAppShell(html, release, await readFile(path.join(root, 'css/app-core.css'), 'utf8'));
    await writeFile(path.join(out, 'css/app-core.css'), shell.css);
    await minifyFile(path.join(assets, 'app-view.js'), shell.viewScript);
    html = shell.html;
  }
  if (name === 'index.html') {
    await writeFile(path.join(out, 'es.html'), createLocalizedLanding(html, 'es'));
    html = createLocalizedLanding(html, 'en');
  }
  // A physical root index takes precedence over Vercel's conditional rewrite.
  await writeFile(path.join(out, name === 'index.html' ? 'landing.html' : name), html);
}

for (const language of ['en', 'es']) {
  const target = path.join(out, INTERPRETER_GUIDE_PATHS[language].slice(1) + '.html');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, createInterpreterGuide(language, release).replace('<head>',
    `<head>\n<script src="/assets/locales.js?v=${release}"></script>`));
}
for (const [file, limit] of Object.entries({ 'boot.js':350000, 'app-main.js':802000, 'locales.js':230000 })) {
  const size = (await stat(path.join(assets, file))).size;
  if (size > limit) throw new Error(`Bundle ${file} exceeds its reviewed byte budget: ${size} > ${limit}`);
}
console.log('Build listo en public/ sin sourcemaps ni módulos fuente. Presupuestos de tamaño verificados.');
