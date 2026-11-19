import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

test('las herramientas de Windows estan en el repo y Chrome pierde el modo de eficiencia', () => {
  for (const file of ['herramientas-windows/grabadora/grabadora.pyw', 'herramientas-windows/grabadora/grabadora.ico', 'herramientas-windows/grabadora/timbre-propio.wav', 'herramientas-windows/grabadora/crear_exe.bat', 'Reparar-notas.bat']) assert.ok(existsSync(file), file);
  const bat = readFileSync('herramientas-windows/optimizar-interpreter/optimizar_interpreter.bat', 'utf8');
  const script = readFileSync('herramientas-windows/optimizar-interpreter/optimizar_chrome.ps1', 'utf8');
  assert.match(bat, /\[4\/4\].*Chrome/);
  assert.match(bat, /optimizar_chrome\.ps1/);
  assert.match(script, /--disable-features=UseEcoQoSForBackgroundProcess/);
  assert.match(script, /Open-Chrome-And-Notes\.exe/);
  assert.match(script, /ChromeArguments/);
});
