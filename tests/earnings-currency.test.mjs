import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { ui, translateText } from '../js/i18n.js';

const source = fs.readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8');
const declarations = new Map(parse(source, { ecmaVersion: 'latest', sourceType: 'module' }).body.map(node => node.declaration || node)
  .filter(node => node.type === 'FunctionDeclaration').map(node => [node.id.name, source.slice(node.start, node.end)]));
function fixture() {
  const controls = new Map(), elements = new Map(); let persisted, reject = false;
  for (const id of ['earningsValue', 'cycleEarningsValue']) {
    const control = { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
    controls.set(id, control); elements.set(id, { textContent: '', closest: () => control });
  }
  for (const id of ['earningsConvertedText', 'cycleEarningsConvertedText']) elements.set(id, { textContent: '' });
  const h = { ui, translateText, settings: { currencyLabel: 'L', exchangeRate: 26.8 }, document: { getElementById: id => elements.get(id) },
    saveSettingsOnly() { if (reject) return false; persisted = JSON.stringify(h.settings); return true; },
    render() { h.renderEarningsCurrency('earningsValue', 'earningsConvertedText', 14.32); h.renderEarningsCurrency('cycleEarningsValue', 'cycleEarningsConvertedText', 28.64); } };
  vm.createContext(h); vm.runInContext(['money', 'convertedAmountText', 'renderEarningsCurrency', 'toggleEarningsCurrency'].map(name => declarations.get(name)).join('\n'), h);
  return { h, elements, controls, reload() { h.settings = JSON.parse(persisted); h.render(); }, rejectSave() { reject = true; } };
}

test('one currency preference swaps both earnings cards and survives serialized account settings', () => {
  const f = fixture(); f.h.render();
  assert.equal(f.elements.get('earningsValue').textContent, '$14.32');
  f.h.toggleEarningsCurrency();
  assert.equal(f.elements.get('earningsValue').textContent, 'L 384');
  assert.equal(f.elements.get('earningsConvertedText').textContent, '≈ $14.32');
  assert.equal(f.elements.get('cycleEarningsValue').textContent, 'L 768');
  assert.equal(f.elements.get('cycleEarningsConvertedText').textContent, '≈ $28.64');
  f.reload(); assert.equal(f.elements.get('earningsValue').textContent, 'L 384');
  f.h.toggleEarningsCurrency(); f.reload(); assert.equal(f.elements.get('earningsValue').textContent, '$14.32');
});

test('missing conversion keeps USD usable without erasing preference and rejected saves restore the previous display', () => {
  const f = fixture(); f.h.toggleEarningsCurrency();
  f.h.settings.currencyLabel = ''; f.h.render();
  assert.equal(f.elements.get('earningsValue').textContent, '$14.32');
  assert.equal(f.controls.get('earningsValue').attributes['aria-disabled'], 'true');
  f.h.toggleEarningsCurrency(); assert.equal(f.h.settings.earningsPreferSecondary, true);
  f.h.settings.currencyLabel = 'L'; f.h.render();
  f.rejectSave(); f.h.toggleEarningsCurrency();
  assert.equal(f.h.settings.earningsPreferSecondary, true);
  assert.equal(f.elements.get('earningsValue').textContent, 'L 384');
  f.h.settings.exchangeRate = 30; f.h.render(); assert.equal(f.elements.get('earningsValue').textContent, 'L 430');
});
