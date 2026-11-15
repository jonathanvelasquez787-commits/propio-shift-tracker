import test from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage, translateText } from '../js/i18n.js';
import { setAppSettings } from '../js/app-context.js';
import { reinforcementText } from '../js/reinforcement-feedback.js';

test('reinforcement templates follow runtime language changes', () => {
  setAppSettings({});
  try {
    for (const language of ['es', 'en', 'es']) {
      setLanguage(language);
      assert.equal(reinforcementText('call-normal', { amount: '$1.00' }),
        translateText('Llamada completada · sumaste {amount} a tu día').replace('{amount}', '$1.00'));
    }
  } finally { setLanguage('es'); setAppSettings({}); }
});
