import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/app-shell.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../js/reports.js', import.meta.url), 'utf8');
const pagina = html.slice(html.indexOf('id="pageReports"'), html.indexOf('<!-- /pageReports -->'));
const panel = k => {
  const a = pagina.indexOf(`id="rptPanel${k}"`);
  const b = pagina.indexOf(`<!-- /rptPanel${k} -->`);
  return pagina.slice(a, b);
};

test('reportes pestanas: hay 4 pestañas Hoy, Ciclo, Semana y Detalle con sus paneles', () => {
  for (const k of ['hoy', 'ciclo', 'semana', 'detalle']) {
    assert.match(pagina, new RegExp(`data-rpt-tab-btn="${k}"`));
    assert.match(pagina, new RegExp(`data-rpt-tab="${k}"`));
  }
  assert.match(pagina, /id="rptTabs"[^>]*role="tablist"/);
  assert.equal((pagina.match(/role="tab"/g) || []).length, 4);
});

test('reportes pestanas: cada sección vive en su panel y no se perdió ningún id', () => {
  const dentro = {
    Hoy: ['rptGoalsGrid', 'rptGoalsStatus', 'rptGoalsComparison', 'rptChartSvg', 'rptSecChart'],
    Ciclo: ['rptCycleGrid', 'earningsDetailsSection', 'earningsDayBreakdown', 'earningsCycleBreakdown'],
    Semana: ['weekSummaryAccordion', 'weekSummaryWrap', 'weekPrevBtn', 'rptMonthlyDetails', 'rptMonthlyChartSvg'],
    Detalle: ['rptAdherenceHistory', 'workDayReviewDetails', 'rptHoursDetails', 'rptHourBars', 'rptQualityDetails', 'rptTriGrid', 'rptTrendRow', 'dayStatsGrid', 'statsAccordion'],
  };
  for (const [k, ids] of Object.entries(dentro)) {
    const p = panel(k);
    assert.ok(p.length > 50, `falta el panel ${k}`);
    for (const id of ids) assert.ok(p.includes(`id="${id}"`), `${id} debe estar en el panel ${k}`);
  }
  assert.ok(pagina.includes('id="rptDashboard"'));
  assert.ok(pagina.includes('id="rptDatePill"'));
});

test('reportes pestanas: solo Hoy se ve al inicio y la pestaña elegida se recuerda', () => {
  assert.doesNotMatch(panel('Hoy').slice(0, 200), /hidden/);
  for (const k of ['Ciclo', 'Semana', 'Detalle']) assert.match(panel(k).slice(0, 220), /role="tabpanel"[^>]*hidden/);
  assert.match(js, /settings\.reportsTab/);
  assert.match(js, /saveSettingsOnly\(\)/);
  assert.match(readFileSync(new URL('../js/app-main.js', import.meta.url), 'utf8'), /reportsTab: 'hoy'/);
  assert.match(js, /wireReportsTabs[\s\S]*applyReportsTab\(\);\n\}/);
});

test('reportes pestanas: estilo del botón-grupo con variables del tema y celular a todo el ancho', () => {
  const b = css.slice(css.indexOf('/* reportes pestanas */'), css.indexOf('/* fin reportes pestanas */'));
  assert.ok(b.length > 100);
  assert.match(b, /border-radius:\s*12px/);
  assert.match(b, /var\(--line-2\)/);
  assert.match(b, /rgba\(var\(--blue-rgb\), \.32\)/);
  assert.match(b, /@media \(max-width: 760px\)[\s\S]*flex:\s*1 1 0/);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});

test('reportes hoy: la pestaña Hoy tiene 4 tarjetas, gráfica con Tu ciclo y 3 enlaces', () => {
  const hoy = panel('Hoy');
  for (const id of ['rptKpis', 'rptDashboard', 'rptChartSvg', 'rptChartDots', 'rptChartXAxis', 'rptChartYAxis', 'rptCycleSide', 'rptMoreLinks']) {
    assert.ok(hoy.includes(`id="${id}"`), `${id} debe estar en la pestaña Hoy`);
  }
  assert.equal((hoy.match(/data-rpt-go="/g) || []).length, 3);
  assert.match(hoy, /data-rpt-go="semana" data-rpt-open="weekSummaryAccordion"/);
  assert.match(hoy, /data-rpt-open="rptHoursDetails"/);
  assert.match(hoy, /data-rpt-open="rptQualityDetails"/);
  for (const id of ['rptGoalsGrid', 'rptGoalsStatus', 'rptGoalsComparison', 'rptSecGoals']) assert.ok(hoy.includes(`id="${id}"`), `${id} se conserva`);
  assert.match(hoy, /id="rptGoalsLegacy" hidden/);
});

test('reportes hoy: las tarjetas y Tu ciclo usan los mismos datos que ya calcula la app', () => {
  for (const nombre of ['effectiveDailyGoal(dayKey)', 'reportsCycleBreakdown()', 'reportsCycleProjection()', 'cycleGoalPace()', 'computeComplianceStreak()']) {
    assert.ok(js.includes(nombre), `debe reutilizar ${nombre}`);
  }
  for (const texto of ['Ganancias de hoy', 'Ganado del ciclo']) assert.ok(js.includes(`translateText('${texto}')`));
  assert.match(js, /id="rptProjectionHow"/);
  assert.match(js, /data-rpt-go="ciclo" data-rpt-open="rptProjectionHow"/);
});

test('reportes hoy: estilo con variables del tema, 4 columnas en compu y 2x2 en celular', () => {
  const b = css.slice(css.indexOf('/* reportes hoy */'), css.indexOf('/* fin reportes hoy */'));
  assert.ok(b.length > 500);
  assert.match(b, /\.rpt-kpis \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(b, /minmax\(0, 1\.75fr\) minmax\(0, 1fr\)/);
  assert.match(b, /color-mix\(in srgb, var\(--c\) 16%/);
  assert.match(b, /@media \(max-width: 760px\)[\s\S]*\.rpt-kpis \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(b, /#[0-9a-fA-F]{3,8}\b/);
});
