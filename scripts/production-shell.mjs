import { parse, parseFragment, serialize } from 'parse5';

export function createAppShell(source, release, externalCss) {
  const document = parse(source);
  const html = document.childNodes.find(node => node.tagName === 'html');
  const head = html.childNodes.find(node => node.tagName === 'head');
  const body = html.childNodes.find(node => node.tagName === 'body');
  const attribute = (node, name) => node.attrs?.find(attr => attr.name === name)?.value;
  const styles = head.childNodes.filter(node => node.tagName === 'style');
  const coreLinks = head.childNodes.filter(node => node.tagName === 'link'
    && attribute(node, 'rel') === 'stylesheet' && attribute(node, 'href') === '/css/app-core.css');
  const gate = body.childNodes.find(node => attribute(node, 'id') === 'bootGate');
  const scripts = body.childNodes.filter(node => node.tagName === 'script');
  if (styles.length + coreLinks.length !== 1 || (coreLinks.length && !externalCss?.trim())
    || !gate || !scripts.some(node => attribute(node, 'src')?.includes('/assets/boot.js'))) {
    throw new Error('The app shell requires one stylesheet, the boot gate and the boot script.');
  }
  const removeComments = node => {
    if (node.childNodes) {
      node.childNodes = node.childNodes.filter(child => child.nodeName !== '#comment');
      node.childNodes.forEach(removeComments);
    }
    if (node.content) removeComments(node.content);
  };
  removeComments(document);
  const stylesheet = styles[0] || coreLinks[0];
  const css = styles.length ? stylesheet.childNodes.map(node => node.value || '').join('') : externalCss;
  const cssLink = parseFragment(`<link rel="stylesheet" href="/css/app-core.css?v=${release}">`).childNodes[0];
  head.childNodes = head.childNodes.map(node => node === stylesheet ? cssLink : node);
  for (const node of head.childNodes) {
    if (node.tagName !== 'link' || attribute(node, 'rel') !== 'stylesheet') continue;
    const href = node.attrs.find(attr => attr.name === 'href');
    if (href && /^\/css\/[^?#]+\.css$/.test(href.value)) href.value += `?v=${encodeURIComponent(release)}`;
  }
  const viewNodes = body.childNodes.filter(node => node !== gate && node.tagName !== 'script');
  const markup = serialize({ nodeName: '#document-fragment', childNodes: viewNodes });
  const viewScript = `(() => {\nconst view = document.createElement('template');\nview.innerHTML = ${JSON.stringify(markup)};\ndocument.body.insertBefore(view.content, document.getElementById('bootGate'));\n})();\n`;
  const loader = parseFragment(`<script src="/assets/app-view.js?v=${release}" defer></script>`).childNodes[0];
  body.childNodes = [gate, loader, ...scripts];
  return { html: serialize(document), css, viewScript };
}
