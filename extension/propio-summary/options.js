import { languageOf } from './i18n.js';
export function normalizeSummaryOptions(stored, enabledByDefault = true) {
  const options = { enabled: typeof stored?.enabled === 'boolean' ? stored.enabled : enabledByDefault, language: languageOf(stored) };
  if (stored && typeof stored.currency === 'string' && stored.currency.trim().length > 0 && stored.currency.length <= 8 &&
      Number.isFinite(stored.rate) && stored.rate > 0 && stored.rate <= 100000) Object.assign(options, { currency: stored.currency, rate: stored.rate });
  return options;
}
