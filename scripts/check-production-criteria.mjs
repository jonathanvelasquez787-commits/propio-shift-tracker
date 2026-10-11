import fs from 'node:fs';
import { parse } from 'acorn';

const matrix=JSON.parse(fs.readFileSync('docs/production-criteria.json','utf8'));
const coveredTests=new Set(),coveredSources=new Set();
const ids=new Set();
for(const row of matrix.criteria){
 if(ids.has(row.id)||!row.acceptance)throw Error(`Invalid production criterion: ${row.id}`);
 ids.add(row.id);
 for(const file of row.sources){if(!fs.existsSync(file))throw Error(`Missing source: ${file}`);coveredSources.add(file);}
 for(const {file,namedCases} of row.tests){
  const source=fs.readFileSync(file,'utf8'),names=new Set();
  function walk(node){if(!node||typeof node!=='object')return;
   if(node.type==='CallExpression'&&node.callee?.name==='test'&&typeof node.arguments[0]?.value==='string')names.add(node.arguments[0].value);
   for(const v of Object.values(node))if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);
  }walk(parse(source,{ecmaVersion:'latest',sourceType:'module'}));
  if(!namedCases.length)throw Error(`No named regression evidence: ${file}`);
  for(const name of namedCases)if(!names.has(name))throw Error(`Criterion points to retired test: ${file}: ${name}`);
  coveredTests.add(file);
 }
}
for(const file of fs.readdirSync('tests').filter(x=>x.endsWith('.test.mjs')))
 if(!coveredTests.has(`tests/${file}`))throw Error(`Test suite missing from production criteria: ${file}`);
for(const directory of ['js','api','lib'])for(const file of fs.readdirSync(directory).filter(x=>x.endsWith('.js')&&x!=='locales.generated.js'))
 if(!coveredSources.has(`${directory}/${file}`))throw Error(`Module missing from production criteria: ${directory}/${file}`);
console.log(`${matrix.criteria.length} production criteria map ${coveredTests.size} suites and ${coveredSources.size} source modules. Structural mapping does not certify every UI combination.`);
