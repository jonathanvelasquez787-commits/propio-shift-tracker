import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { minify } from 'terser';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createAppShell } from './production-shell.mjs';

const root = process.cwd();
const out = path.join(root, 'public');
const assets = path.join(out, 'assets');
const release = process.env.VERCEL_GIT_COMMIT_SHA || 'local';

await rm(out, { recursive: true, force: true });
await mkdir(assets, { recursive: true });
await mkdir(path.join(out, 'icons'), { recursive: true });

const entries = {
  'theme-init': 'js/theme-init.js',
  boot: 'js/boot.js',
  landing: 'js/landing.js',
  'landing-ui': 'js/landing-ui.js',
  'theme-toggle': 'js/theme-toggle.js',
};

// Cada entrypoint queda autocontenido. Además de evitar peticiones extra en el
// gate de acceso, esto impide que un service worker viejo mezcle un entrypoint
// nuevo con un chunk compartido de otra versión durante una actualización.
for (const [name, input] of Object.entries(entries)) {
  const bundle = await rollup({
    input: path.join(root, input),
    plugins: [nodeResolve({ browser: true })],
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
    format: ['boot', 'landing', 'theme-init'].includes(name) ? 'iife' : 'es',
    inlineDynamicImports: true,
    sourcemap: false,
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
      const isModule = !['boot.js', 'landing.js', 'theme-init.js'].includes(entry.name);
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
for (const name of ['robots.txt', 'sitemap.xml']) {
  await cp(path.join(root, name), path.join(out, name));
}

for (const name of ['index.html', 'app.html', 'privacidad.html', 'terminos.html']) {
  let html = await readFile(path.join(root, name), 'utf8');
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
  if (name === 'app.html') html = html.replace('</head>', `<link rel="modulepreload" href="/assets/boot.js?v=${release}">\n</head>`);
  html = html.replace('</head>', `<script src="/assets/monitoring.js?v=${release}"></script>\n</head>`);
  html = html.replace('</head>', '<link rel="manifest" href="/manifest.webmanifest">\n<meta name="theme-color" content="#07111f">\n</head>');
  html = html.replace('</body>', `<script src="/assets/register-sw.js?v=${release}" defer></script>\n</body>`);
  if (name === 'app.html') {
    const shell = createAppShell(html, release);
    await writeFile(path.join(out, 'css/app-core.css'), shell.css);
    await minifyFile(path.join(assets, 'app-view.js'), shell.viewScript);
    html = shell.html;
  }
  await writeFile(path.join(out, name), html);
}

console.log('Build listo en public/ sin sourcemaps ni módulos fuente.');
