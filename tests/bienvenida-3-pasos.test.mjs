import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const html = read('app.html');
const settingsSource = read('js/settings.js');
const mainSource = read('js/app-main.js');
const css = read('css/app-shell.css');
const modal = html.slice(html.indexOf('id="onboardingModal"'), html.indexOf('id="confirmModal"'));
const finishNode = parse(settingsSource, { ecmaVersion: 'latest', sourceType: 'module' }).body
  .map(item => item.declaration || item).find(item => item.id?.name === 'finishOnboarding');
const onboarding = settingsSource.slice(settingsSource.indexOf('const ONBOARDING_DEFAULTS'), finishNode.end).replace(/export /g, '');
const copy = value => JSON.parse(JSON.stringify(value));
const baseBlocks = [
  { type: 'work', start: '07:00', dur: 130, goalMin: 120 }, { type: 'break', start: '09:10', dur: 20 },
  { type: 'work', start: '09:30', dur: 130, goalMin: 120 }, { type: 'break', start: '11:40', dur: 20 },
  { type: 'work', start: '12:00', dur: 65, goalMin: 60 }, { type: 'lunch', start: '13:05', dur: 50 },
  { type: 'work', start: '13:55', dur: 65, goalMin: 60 },
];

function context(settings, values = {}, extra = {}) {
  const fields = { onboardingNameInput: { value: 'Ana' }, onboardingEmojiInput: { value: '⭐' },
    obRateInput: { value: '0.12' }, obExchangeInput: { value: '26.80' }, obCurrencyInput: { value: 'L' },
    obSkipOffInput: { checked: true }, obStartInput: { value: '07:00' }, obEndInput: { value: '15:00' }, obGoalInput: { value: '' }, obTurnSection: { hidden: false }, ...values };
  const log = { reload: 0, closed: 0 };
  const h = vm.createContext({ settings, state: {}, fields, log, RATE: 0.12,
    document: { getElementById: id => fields[id] || null, querySelectorAll: () => [] },
    window: { location: { reload() { log.reload++; } } }, normalizeLanguage: value => value === 'en' ? 'en' : 'es',
    saveLanguagePreference() {}, applyAppearance() {}, translateText: text => text, ui: (parts, ...v) => String.raw({ raw: parts }, ...v),
    money: value => String(value), toast() {}, closeModal() { log.closed++; }, render() {}, saveAll: () => true, ...extra });
  vm.runInContext(onboarding, h);
  return h;
}

test('la bienvenida tiene 3 pasos con los controles aprobados y sin elegir tema', () => {
  for (const id of ['onboardingStep1', 'onboardingStep2', 'onboardingStep3', 'obGoalInput', 'obStartInput', 'obEndInput', 'obRateInput', 'obCurrencyInput', 'obExchangeInput', 'obSkipOffInput', 'onboardingBackBtn', 'onboardingNextBtn', 'onboardingSaveBtn']) {
    assert.ok(modal.includes(`id="${id}"`), id);
  }
  for (const goal of ['300', '360', '420', '480', 'other']) assert.ok(modal.includes(`data-ob-goal="${goal}"`), goal);
  for (const hours of ['07:00-15:00', '06:00-14:00', 'other']) assert.ok(modal.includes(`data-ob-hours="${hours}"`), hours);
  for (const palette of ['original', 'graphite', 'lavender', 'royal', 'ocean', 'sage', 'neon']) assert.ok(modal.includes(`data-ob-palette="${palette}"`), palette);
  assert.ok(modal.includes('data-ob-lang="es"') && modal.includes('data-ob-lang="en"'));
  assert.ok(/id="obSkipOffInput"[^>]*checked/.test(modal), 'dias libres encendido por defecto');
  assert.ok(/data-ob-goal="360" aria-pressed="true"/.test(modal) && /data-ob-hours="07:00-15:00" aria-pressed="true"/.test(modal));
  assert.ok(/id="onboardingStep2"[^>]*hidden/.test(modal) && /id="onboardingStep3"[^>]*hidden/.test(modal));
  assert.doesNotMatch(modal, /data-ob-theme|Tema|claro|oscuro/i);
  assert.ok(mainSource.includes("resetOnboardingSteps({ keepSchedule: !eraseSchedule })"));
});

test('el horario por defecto 7-3 queda igual y 6-2 corre todos los bloques una hora', () => {
  const h = context({});
  const same = copy(h.buildOnboardingBlocks(baseBlocks, '07:00', '15:00', 360));
  assert.deepEqual(same, baseBlocks);
  const early = copy(h.buildOnboardingBlocks(baseBlocks, '06:00', '14:00', 360));
  assert.equal(early[0].start, '06:00');
  assert.equal(early[6].start, '12:55');
  assert.equal(early[6].dur, 65);
});

test('"Otro": la salida estira el ultimo bloque y la meta se reparte en los bloques de Trabajo', () => {
  const h = context({});
  const blocks = copy(h.buildOnboardingBlocks(baseBlocks, '06:30', '14:30', 390));
  assert.equal(blocks[6].start, '13:25');
  assert.equal(blocks[6].dur, 65);
  assert.equal(blocks.filter(b => b.type === 'work').reduce((sum, b) => sum + b.goalMin, 0), 390);
  const longer = copy(h.buildOnboardingBlocks(baseBlocks, '07:00', '16:00', 360));
  assert.equal(longer[6].dur, 125);
  assert.equal(h.buildOnboardingBlocks(baseBlocks, '07:00', '13:00', 360), null);
});

test('guardar y empezar escribe cada valor con las claves de siempre y no toca el tema', () => {
  const settings = { theme: 'auto', language: 'es', weeklySchedule: { mon: { off: false, start: '07:00', end: '15:00', blocks: copy(baseBlocks) } } };
  const h = context(settings, { obRateInput: { value: '0.15' }, obCurrencyInput: { value: 'Q' }, obExchangeInput: { value: '7.8' }, obSkipOffInput: { checked: false } });
  vm.runInContext("onboardingChoice.goal = '420'; onboardingChoice.hours = '06:00-14:00'; onboardingChoice.palette = 'royal';", h);
  h.finishOnboarding();
  assert.equal(h.settings.userName, 'Ana');
  assert.equal(h.settings.productiveGoalMin, 420);
  assert.equal(h.settings.rate, 0.15);
  assert.ok(Math.abs(h.settings.earningsGoal - 63) < 1e-9);
  assert.equal(h.settings.currencyLabel, 'Q');
  assert.equal(h.settings.exchangeRate, 7.8);
  assert.equal(h.settings.shiftStart, '06:00');
  assert.equal(h.settings.shiftEnd, '14:00');
  assert.equal(h.settings.weeklySchedule.mon.start, '06:00');
  assert.equal(h.settings.palette, 'royal');
  assert.equal(h.settings.streakSkipOffDays, false);
  assert.equal(h.settings.theme, 'auto');
  assert.equal(h.settings.onboarded, true);
  assert.equal(h.state.productiveGoalMin, 420);
  assert.equal(h.log.reload, 0);
});

test('elegir English guarda el idioma y recarga la app', () => {
  const h = context({ language: 'es' });
  vm.runInContext("onboardingChoice.language = 'en';", h);
  h.finishOnboarding();
  assert.equal(h.settings.language, 'en');
  assert.equal(h.log.reload, 1);
});

test('una meta o un horario mal escritos frenan en el paso 1 sin guardar', () => {
  for (const [goal, start, end] of [['0', '07:00', '15:00'], ['1500', '07:00', '15:00'], ['390', '15:00', '07:00'], ['390', '', '15:00']]) {
    let saved = 0;
    const h = context({ weeklySchedule: {} }, { obGoalInput: { value: goal }, obStartInput: { value: start }, obEndInput: { value: end }, obError: { textContent: '', hidden: true } }, { saveAll: () => { saved++; return true; } });
    vm.runInContext("onboardingChoice.goal = 'other'; onboardingChoice.hours = 'other';", h);
    assert.equal(h.finishOnboarding(), false);
    assert.equal(saved, 0);
  }
});

test('si solo se borro el perfil, la bienvenida conserva el horario y la meta que ya habia', () => {
  const settings = { productiveGoalMin: 300, earningsGoal: 36, shiftStart: '08:00', shiftEnd: '16:00', language: 'es',
    weeklySchedule: { mon: { off: false, start: '08:00', end: '16:00', blocks: [{ type: 'work', start: '08:00', dur: 480, goalMin: 300 }] } } };
  const h = context(settings, { obRateInput: { value: '0.2' } });
  vm.runInContext('onboardingKeepSchedule = true;', h);
  h.finishOnboarding();
  assert.equal(h.settings.productiveGoalMin, 300);
  assert.equal(h.settings.earningsGoal, 36);
  assert.equal(h.settings.shiftStart, '08:00');
  assert.equal(h.settings.weeklySchedule.mon.blocks[0].dur, 480);
  assert.equal(h.settings.rate, 0.2);
});

test('estilos de la bienvenida: llaves balanceadas y sin colores fijos', () => {
  const block = css.slice(css.indexOf('/* bienvenida 3 pasos */'), css.indexOf('/* fin bienvenida 3 pasos */'));
  assert.ok(block.length > 100);
  assert.equal(block.split('{').length, block.split('}').length);
  assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/);
});
