import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ui,translateText,translateMarkup,displayLocale,setLanguage} from '../js/i18n.js';
const source=fs.readFileSync(new URL('../js/finance.js',import.meta.url),'utf8')
  .replace(/^import .*;\r?$/gm,'').replace(/\bexport (?=(?:async )?(?:function|const))/g,'');
test('expense and savings category IDs remain valid while the form labels change language',()=>{
  const category={value:''},name={value:''},fields={financeRowCategoryInput:category,financeRowNameInput:name};
  for(const language of ['es','en']){
    setLanguage(language);
    const context=vm.createContext({ui,translateText,translateMarkup,displayLocale,
      settings:{customFinanceCategories:[],currencyLabel:'',exchangeRate:0},calls:[],
      document:{getElementById:id=>fields[id]||null}});
    vm.runInContext(source,context);
    vm.runInContext('configureFinanceContext({openModal:()=>{}})',context);
    vm.runInContext("openFinanceRowModal('gasto')",context);assert.equal(category.value,'casa');
    assert.equal(name.value,translateText('Renta'));
    vm.runInContext("openFinanceRowModal('meta')",context);assert.equal(category.value,'ahorro');
  }
  setLanguage('es');
});
