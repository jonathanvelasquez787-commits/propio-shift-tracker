import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'parse5';
import { createInterpreterGuide } from '../scripts/interpreter-guide.mjs';
import { createLocalizedLanding } from '../scripts/landing-pages.mjs';
import { SITE_ORIGIN, INTERPRETER_GUIDE_PATHS } from '../js/landing-meta.js';

const read = path => fs.readFileSync(new URL('../'+path, import.meta.url),'utf8');
const nodes = node => [node,...(node.childNodes||[]).flatMap(nodes)];
const attr = (node,key) => node.attrs?.find(item=>item.name===key)?.value;
const text = node => node.nodeName==='#text'?node.value:(node.childNodes||[]).map(text).join('');

for (const language of ['es','en']) {
  test(`${language} guide has complete static content, consistent metadata and working internal destinations`, () => {
    const html=createInterpreterGuide(language,'test-release'), all=nodes(parse(html));
    assert.equal(attr(all.find(n=>n.tagName==='html'),'lang'),language);
    assert.equal(all.filter(n=>n.tagName==='h1').length,1);
    assert.match(text(all.find(n=>n.tagName==='title')),/^Propio Shift Tracker \|/);
    const url=SITE_ORIGIN+INTERPRETER_GUIDE_PATHS[language];
    assert.equal(attr(all.find(n=>attr(n,'rel')==='canonical'),'href'),url);
    for(const lang of ['es','en','x-default']) {
      assert.equal(attr(all.find(n=>attr(n,'hreflang')===lang&&n.tagName==='link'),'href'),SITE_ORIGIN+INTERPRETER_GUIDE_PATHS[lang==='x-default'?'en':lang]);
    }
    const schema=JSON.parse(text(all.find(n=>attr(n,'type')==='application/ld+json')));
    assert.equal(schema['@type'],'Article');assert.equal(schema.url,url);assert.equal(schema.inLanguage,language);
    assert.equal(schema.headline,text(all.find(n=>n.tagName==='h1')));
    assert.equal(schema.aggregateRating,undefined);assert.doesNotMatch(html,/noindex|\/assets\/landing\.js|translateDocument/);
    const ids=new Set(all.map(n=>attr(n,'id')).filter(Boolean));
    const links=all.filter(n=>n.tagName==='a').map(n=>attr(n,'href'));
    for(const link of links.filter(link=>link.startsWith('#')))assert(ids.has(link.slice(1)),link);
    assert(links.includes(INTERPRETER_GUIDE_PATHS[language==='es'?'en':'es']));
    assert.match(text(all.find(n=>n.tagName==='article')),language==='es'?/L 187,20/:/L 187.20/);
    assert.match(text(all.find(n=>n.tagName==='article')),/CSV.*PDF.*JSON/s);
    const landing=nodes(parse(createLocalizedLanding(read('index.html'),language)));
    const guideLink=landing.find(n=>attr(n,'data-interpreter-guide')!==undefined);
    assert.equal(attr(guideLink,'href'),INTERPRETER_GUIDE_PATHS[language]);
    assert.equal(text(guideLink),language==='es'?'Guía para intérpretes':'Interpreter guide');
  });

  test(`${language} guide theme preserves account settings and the article's URL language when storage fails`, () => {
    const classes=new Set(['theme-light']), handlers={}, attrs={};
    const original={language:language==='es'?'en':'es',ratePerMin:0.12,financeRows:[{id:'keep',assignedAmount:12}],theme:'light'};
    let saved=JSON.stringify(original), blocked=false;
    const root={lang:language,hasAttribute:name=>name==='data-public-guide',classList:{contains:name=>classes.has(name),toggle(name,on){if(on)classes.add(name);else classes.delete(name);}}};
    const button={setAttribute:(name,value)=>{attrs[name]=value;},addEventListener:(name,handler)=>{handlers[name]=handler;}};
    const context={document:{documentElement:root,querySelector:()=>button},window:{addEventListener(){}},
      localStorage:{getItem(){return saved;},setItem(key,value){if(blocked)throw Error('quota');saved=value;}},
      readLanguagePreference:()=>original.language,applySavedColors(settings){root.lang=settings.language;}};
    vm.runInNewContext(read('js/theme-init.js').replace(/^import[^\n]+\n/gm,''),context);
    assert.equal(root.lang,language);
    vm.runInNewContext(read('js/guide-theme.js').replace(/^import[^\n]+\n/,''),context);
    handlers.click();
    assert.deepEqual(JSON.parse(saved),{...original,theme:'dark'});
    assert.equal(root.lang,language);assert.equal(attrs['aria-pressed'],'true');
    blocked=true;handlers.click();
    assert(classes.has('theme-light'));assert.equal(JSON.parse(saved).theme,'dark');assert.equal(root.lang,language);
  });
}

test('both guide routes have canonical redirects and reciprocal sitemap entries', () => {
  const routing=JSON.parse(read('vercel.json')), sitemap=read('sitemap.xml');
  for(const language of ['es','en']) {
    const route=INTERPRETER_GUIDE_PATHS[language];
    assert.equal(routing.rewrites.find(r=>r.source===route).destination,route+'.html');
    const redirect=routing.redirects.find(r=>r.source===route+'.html');
    assert.equal(redirect.destination,route);assert.equal(redirect.permanent,true);
    assert(sitemap.includes(`<loc>${SITE_ORIGIN+route}</loc>`));
    assert.equal(sitemap.split(`hreflang="${language}" href="${SITE_ORIGIN+route}"`).length-1,2);
  }
  assert.doesNotMatch(sitemap,/<loc>[^<]*\/app/);
});
