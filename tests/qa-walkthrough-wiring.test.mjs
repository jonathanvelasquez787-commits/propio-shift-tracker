import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const appMain = fs.readFileSync(path.join(root, 'js/app-main.js'), 'utf8');

test('QA guided tour binds only to its session and guards each state-changing callback', () => {
  assert.match(appMain, /import\s*\{[\s\S]*?configureQaWalkthroughContext[\s\S]*?initQaWalkthrough[\s\S]*?renderQaWalkthrough[\s\S]*?stopQaWalkthrough[\s\S]*?\}\s*from '\.\/qa-walkthrough\.js'/);
  assert.match(appMain, /function qaTourIsActive\(\)\s*\{\s*return isQaModeActive\(\)\s*&&\s*readQaSession\(\)\?\.scenario === 'tour';/);

  const initAt = appMain.indexOf('function initQaMode()');
  const gameInitAt = appMain.lastIndexOf('    initGame();');
  const qaInitCallAt = appMain.indexOf('    initQaMode();', gameInitAt);
  assert.ok(initAt >= 0 && gameInitAt >= 0 && qaInitCallAt > gameInitAt, 'initQaMode se invoca después de initGame');
  const initBody = appMain.slice(initAt, appMain.indexOf('\n    }', initAt) + 6);
  assert.match(initBody, /configureQaWalkthroughContext\(/);
  assert.match(initBody, /isActive:\s*qaTourIsActive/);
  assert.match(initBody, /addCall:\s*\(call, source\) =>\s*\{\s*if \(!qaTourIsActive\(\) \|\| !call\?\.id \|\| calls\.some\(\(item\) => String\(item\?\.id\) === String\(call\.id\)\)\) return false;[\s\S]*?saveAll\(\);\s*onGameCallSaved\(call, source\);\s*render\(\);/);
  assert.match(initBody, /reopenReflection:\s*\(call, dayKey\) => qaTourIsActive\(\) && reopenPositiveReflection\(call, dayKey\)/);
  assert.match(initBody, /startPause:\s*\(type\) => qaTourIsActive\(\) && startPause\(type\)/);
  assert.match(initBody, /endPause:\s*\(\) => qaTourIsActive\(\) && endPause\(\)/);
  assert.match(initBody, /endShift:\s*\(\) => qaTourIsActive\(\) && endShift\(\)/);
  assert.match(initBody, /navigate:\s*\(page, targetId\) =>\s*\{\s*if \(!qaTourIsActive\(\)\) return;/);
  assert.match(initBody, /restart:\s*\(\) =>\s*\{\s*if \(!qaTourIsActive\(\)\) return;/);
  assert.match(initBody, /hasOpenModal:\s*\(\) => !!document\.querySelector\('\.modal-overlay\.open'\)/);
  assert.match(initBody, /notify:\s*toast/);
});

test('reiniciar o salir del laboratorio limpia UI y transitorios antes de escribir/restaurar', () => {
  const cleanupAt = appMain.indexOf('function clearQaTransientUI()');
  const restartAt = appMain.indexOf('restart: () =>', appMain.indexOf('function initQaMode()'));
  const loadAt = appMain.indexOf('async function loadQaScenario()');
  const restoreAt = appMain.indexOf('function requestRestoreQaMode()');
  assert.ok(cleanupAt >= 0 && restartAt > cleanupAt && loadAt > cleanupAt && restoreAt > cleanupAt);

  const cleanupBody = appMain.slice(cleanupAt, appMain.indexOf('\n    }', cleanupAt) + 6);
  assert.match(cleanupBody, /stopQaWalkthrough\(\);\s*clearPositiveReinforcementTransients\(\);/);
  assert.match(cleanupBody, /querySelectorAll\('\.modal-overlay\.open'\)[\s\S]*?closeModal\(modal\.id\)/);
  for (const id of ['gameToastStack', 'gameCallFx', 'gameLootBox', 'gameRecordBanner']) assert.ok(cleanupBody.includes(`'${id}'`));
  assert.doesNotMatch(cleanupBody, /gameArena/);

  const restoreBody = appMain.slice(restoreAt, appMain.indexOf('\n    function initQaMode()', restoreAt));
  assert.match(restoreBody, /clearQaTransientUI\(\);\s*restoreQaMode\(\);\s*window\.location\.reload\(\)/);
  const loadBody = appMain.slice(loadAt, restoreAt);
  assert.match(loadBody, /const replacingQaScenario = isQaModeActive\(\);[\s\S]*?if \(replacingQaScenario\) clearQaTransientUI\(\);\s*writeQaSnapshot\(/);
  const initBody = appMain.slice(appMain.indexOf('function initQaMode()'), appMain.indexOf('\n    }', appMain.indexOf('function initQaMode()')) + 6);
  const restartBody = initBody.slice(initBody.indexOf('restart: () =>'));
  assert.match(restartBody, /clearQaTransientUI\(\);[\s\S]*?writeQaSnapshot\(createQaSnapshot\(\{ state, calls, settings \}, 'tour'\), 'tour'\);[\s\S]*?window\.location\.reload\(\)/);
});

test('render de controles QA repinta el panel informativo sin engancharlo a cada render global', () => {
  const renderAt = appMain.indexOf('function renderQaModeControls()');
  const initAt = appMain.indexOf('function initQaMode()');
  const renderBody = appMain.slice(renderAt, appMain.indexOf('\n    }', renderAt) + 6);
  assert.match(renderBody, /renderQaWalkthrough\(\)/);
  assert.match(renderBody, /session\?\.scenario === 'tour' && state\.qaWalkthrough\?\.version !== 1/);
  assert.match(renderBody, /Esta sesión de demostración es de una versión anterior\. Elige Recorrido guiado y pulsa Cargar otro escenario para abrir la guía\./);
  assert.doesNotMatch(renderBody, /writeQaSnapshot\(|\.click\(/, 'la nota informa sin ejecutar acciones automáticamente');
  assert.doesNotMatch(appMain.slice(appMain.indexOf('export function render()'), renderAt), /renderQaWalkthrough\(/);
  assert.match(appMain.slice(initAt), /initQaWalkthrough\(\);[\s\S]*?renderQaModeControls\(\)/);
});
