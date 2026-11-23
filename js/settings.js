import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
import { AuthError, authErrorMessage, getSession, getProfile, getUser, updateEmail, updateUsername } from './auth.js';
import { settings, state, setAppSettings, setAppState } from './app-context.js';
import { normalizeLanguage, saveLanguagePreference } from './language-preference.js';
import { EMAIL_AUTH_READY } from './config.js';
import { PALETTES } from './theme-palettes.js';
import { applyAppearance } from './appearance.js';

let DEFAULT_USER_EMOJI, EMOJI_CHOICES, RATE, closeModal, convertedAmountText;
let currencyCeilFromUsdAmount, effectiveCycleGoal, effectiveDailyGoal, ensureCurrencySettings, escapeHtml;
let formatCallDayLabel, formatMinutes, getActiveDayKey, getDailyGoalOverride, iconHtml, money;
let onReinforcementDayMetadataChanged, openModal, render, saveSettingsOnly, saveAll, snapshotHistoricalPlanning;
let setDailyGoalOverride, toast;
let todayCallDateKey, usdCeilFromCurrencyAmount;

export function configureSettingsContext(context) {
  ({ DEFAULT_USER_EMOJI, EMOJI_CHOICES, RATE, closeModal, convertedAmountText, currencyCeilFromUsdAmount,
    effectiveCycleGoal, effectiveDailyGoal, ensureCurrencySettings, escapeHtml, formatCallDayLabel,
    formatMinutes, getActiveDayKey, getDailyGoalOverride, iconHtml, money, onReinforcementDayMetadataChanged, openModal, render,
    saveSettingsOnly, saveAll, snapshotHistoricalPlanning, setDailyGoalOverride, toast, todayCallDateKey,
    usdCeilFromCurrencyAmount } = context);
}

export function wireSettingsLanguage({ getSettings, save }) {
  const language = document.getElementById('settingsLanguage');
  if (!language || language.dataset.wired) return;
  language.dataset.wired = 'true';
  language.value = normalizeLanguage(getSettings().language);
  language.addEventListener('change', event => {
    const next = normalizeLanguage(event.target.value);
    if (getSettings().language === next) return;
    const previous = getSettings().language;
    getSettings().language = next;
    if (save() === false) {
      getSettings().language = previous;
      event.target.value = normalizeLanguage(previous);
      return;
    }
    saveLanguagePreference(next);
    try {
      const page = document.querySelector('.app-page:not([hidden])')?.dataset.page;
      if (page) sessionStorage.setItem('propio_appearance_return_page', page);
    } catch {}
    window.location.reload();
  });
  setTimeout(() => {
    try {
      const page = sessionStorage.getItem('propio_appearance_return_page');
      sessionStorage.removeItem('propio_appearance_return_page');
      if (page) document.querySelector(`.sidebar-link[data-page="${page.replace(/[^a-z]/g, '')}"]`)?.click();
    } catch {}
  }, 0);
}

let syncingGoals = false;
    // Lee los 3 campos de meta y devuelve los valores ya sincronizados entre sí, SIN guardar nada —
    // quién guarda (y con qué alcance) lo decide applyGoalValues.
    function computeGoalsFromInputs(source) {
      const minInput = document.getElementById('productiveGoalInput');
      const usdInput = document.getElementById('earningsGoalInput');
      const currencyInput = document.getElementById('goalCurrencyInput');
      const current = effectiveDailyGoal(getActiveDayKey(), { withDebt: false });
      let minutes = Number(minInput.value);
      let dollars = Number(usdInput.value);
      let currencyAmount = Number(currencyInput?.value);
      if (!Number.isFinite(minutes)) minutes = current.min;
      if (!Number.isFinite(dollars)) dollars = current.usd;
      // El atributo min del input no frena negativos ni notación científica: se clamea aquí.
      minutes = Math.max(0, minutes);
      dollars = Math.max(0, dollars);
      if (Number.isFinite(currencyAmount)) currencyAmount = Math.max(0, currencyAmount);
      // La tasa por minuto sale de settings.rate, editable en Ajustes.
      const rate = Number(settings.rate) > 0 ? Number(settings.rate) : RATE;
      // "Meta en tu moneda" (ej. Lempiras), sincronizada en ambos sentidos con Meta en
      // dólares/minutos usando la tasa de cambio ya configurada en Metas (settings.exchangeRate).
      const exchangeRate = Number(settings.exchangeRate) > 0 ? Number(settings.exchangeRate) : 0;
      if (source === 'minutes') dollars = minutes * rate;
      if (source === 'dollars') minutes = dollars / rate;
      if (source === 'currency' && exchangeRate > 0) {
        if (!Number.isFinite(currencyAmount)) currencyAmount = currencyCeilFromUsdAmount(dollars, exchangeRate);
        dollars = usdCeilFromCurrencyAmount(currencyAmount, exchangeRate);
        minutes = dollars / rate;
      }
      // Segundo clamp, justo antes de guardar: los 3 renglones de arriba
      // (source==='minutes'/'dollars'/'currency') recalculan minutes/dollars a partir de otro
      // campo.
      minutes = Math.max(0, minutes);
      dollars = Math.max(0, dollars);
      if (!Number.isFinite(minutes) || !Number.isFinite(dollars)) return null;
      return { minutes: Number(minutes), dollars: Number(dollars) };
    }

    // Scope 'day' guarda la meta SOLO para ese día; 'global' guarda la meta de siempre y borra el
    // override de ese día, para que la nueva general también aplique ahí.
    export function applyGoalValues(minutes, dollars, scope, dayKey, persistSnapshot = null, source = 'manual') {
      const ownerSettings = settings, ownerState = state;
      const previousSettings = JSON.parse(JSON.stringify(settings)), previousState = JSON.parse(JSON.stringify(state));
      if (scope === 'day') {
        setDailyGoalOverride(dayKey, { min: minutes, usd: dollars });
      } else {
        snapshotHistoricalPlanning();
        settings.productiveGoalMin = Number(minutes);
        settings.earningsGoal = Number(dollars);
        settings.goalProvenance = { source, min: Number(minutes), usd: Number(dollars) };
        state.productiveGoalMin = settings.productiveGoalMin;
        state.earningsGoal = settings.earningsGoal;
        setDailyGoalOverride(dayKey, null);
      }
      if ((persistSnapshot ? persistSnapshot() : saveAll({render:false})) === false) {
        // Restore in place so a surrounding finance transaction can still recognize its owner.
        for (const [current, owner, previous] of [[settings, ownerSettings, previousSettings], [state, ownerState, previousState]]) {
          if (current !== owner) continue;
          Object.keys(owner).forEach(key => delete owner[key]);
          Object.assign(owner, previous);
        }
        refreshGoalInputs(); render();
        return false;
      }
      onReinforcementDayMetadataChanged(dayKey);
      refreshGoalInputs();
      render();
      return true;
    }

    // Repinta los 3 campos de meta con el valor efectivo del día activo.
    function refreshGoalInputs() {
      const minInput = document.getElementById('productiveGoalInput');
      const usdInput = document.getElementById('earningsGoalInput');
      const currencyInput = document.getElementById('goalCurrencyInput');
      const exchangeRate = Number(settings.exchangeRate) > 0 ? Number(settings.exchangeRate) : 0;
      const goal = effectiveDailyGoal(getActiveDayKey(), { withDebt: false });
      if (minInput) minInput.value = formatMinutes(goal.min);
      if (usdInput) usdInput.value = goal.usd.toFixed(2);
      if (currencyInput && exchangeRate > 0) currencyInput.value = currencyCeilFromUsdAmount(goal.usd, exchangeRate).toFixed(2);
    }

    let pendingGoalChange = null;

    export function requestGoalChange(source) {
      if (syncingGoals) return;
      const dayKey = getActiveDayKey();
      const computed = computeGoalsFromInputs(source);
      if (!computed) {
        pendingGoalChange = null;
        refreshGoalInputs();
        toast(translateText('Ese valor es demasiado grande para calcular la meta.'));
        return;
      }
      const { minutes, dollars } = computed;
      const current = effectiveDailyGoal(dayKey, { withDebt: false });
      if (Math.abs(current.min - minutes) < 0.005 && Math.abs(current.usd - dollars) < 0.005) {
        refreshGoalInputs();
        return;
      }
      pendingGoalChange = { minutes, dollars, dayKey };
      const isToday = dayKey === todayCallDateKey();
      const dayLabel = isToday ? translateText('hoy') : formatCallDayLabel(dayKey);
      const summaryEl = document.getElementById('goalScopeSummary');
      const dayBtnEl = document.getElementById('goalScopeDayBtn');
      const dayHintEl = document.getElementById('goalScopeDayHint');
      if (summaryEl) summaryEl.textContent = ui`Meta nueva: ${formatMinutes(minutes)} min · ${money(dollars)}${convertedAmountText(dollars) ? ` (${convertedAmountText(dollars)})` : ''}`;
      if (dayBtnEl) dayBtnEl.innerHTML = ui`${iconHtml('calendar')} Solo ${escapeHtml(dayLabel)}`;
      if (dayHintEl) dayHintEl.textContent = ui`"Solo ${dayLabel}" deja tu meta de siempre intacta y aplica esta solo a ese día.`;
      openModal('goalScopeModal');
    }

    export function applyPendingGoalChange(scope) {
      if (!pendingGoalChange) return;
      const { minutes, dollars, dayKey } = pendingGoalChange;
      pendingGoalChange = null;
      closeModal('goalScopeModal');
      if (applyGoalValues(minutes, dollars, scope, dayKey) === false) return;
      toast(scope === 'day'
        ? ui`Meta de ${dayKey === todayCallDateKey() ? translateText('hoy') : formatCallDayLabel(dayKey)}: ${formatMinutes(minutes)} min · ${money(dollars)}${convertedAmountText(dollars) ? ` (${convertedAmountText(dollars)})` : ''}`
        : ui`Meta general: ${formatMinutes(minutes)} min · ${money(dollars)}${convertedAmountText(dollars) ? ` (${convertedAmountText(dollars)})` : ''}`);
    }

    export function cancelPendingGoalChange() {
      if (!pendingGoalChange) return;
      pendingGoalChange = null;
      refreshGoalInputs();
    }

    // Quita el override del día activo desde Ajustes, sin tener que volver a teclear la meta
    // general.
    export function clearActiveDayGoalOverride() {
      const dayKey = getActiveDayKey();
      if (!getDailyGoalOverride(dayKey)) return;
      const ownerSettings = settings, ownerState = state;
      const previousSettings = JSON.parse(JSON.stringify(settings)), previousState = JSON.parse(JSON.stringify(state));
      setDailyGoalOverride(dayKey, null);
      if (saveAll({render:false}) === false) {
        if (settings === ownerSettings) setAppSettings(previousSettings);
        if (state === ownerState) setAppState(previousState);
        refreshGoalInputs(); render();
        return false;
      }
      onReinforcementDayMetadataChanged(dayKey);
      refreshGoalInputs();
      render();
      toast(translateText('Ese día vuelve a usar tu meta general'));
    }

    // La tarifa recalcula la meta general; conserva las metas especiales y el historial.
    export function updateRate() {
      const rateInput = document.getElementById('rateInput');
      let rate = Number(rateInput?.value);
      if (!Number.isFinite(rate) || rate <= 0) rate = settings.rate || RATE;
      const dollars = Number(settings.productiveGoalMin) * rate;
      if (!Number.isFinite(dollars)) {
        if (rateInput) rateInput.value = String(settings.rate || RATE);
        toast(translateText('Ese valor es demasiado grande para calcular la meta.'));
        return;
      }
      const ownerSettings = settings, ownerState = state;
      const previousSettings = JSON.parse(JSON.stringify(settings)), previousState = JSON.parse(JSON.stringify(state));
      snapshotHistoricalPlanning();
      settings.rate = rate;
      settings.earningsGoal = dollars;
      state.earningsGoal = dollars;
      if (saveAll({render:false}) === false) {
        if (settings === ownerSettings) setAppSettings(previousSettings);
        if (state === ownerState) setAppState(previousState);
        if (rateInput) rateInput.value = String(settings.rate);
        render(); toast(translateText('No se aplicó la tarifa porque no se pudo guardar.'), {persistenceFailure:true}); return false;
      }
      onReinforcementDayMetadataChanged(todayCallDateKey());
      refreshGoalInputs();
      render();
    }

    // Cambios de moneda secundaria (símbolo + tasa de cambio), editables en Metas.
    export function updateCurrencySettings() {
      const exchangeInput = document.getElementById('exchangeRateInput');
      const labelInput = document.getElementById('currencyLabelInput');
      const owner = settings;
      const previousRate = settings.exchangeRate, previousLabel = settings.currencyLabel;
      let exchangeRate = Number(exchangeInput?.value);
      if (!Number.isFinite(exchangeRate) || exchangeRate < 0 || !Number.isFinite(exchangeRate * 1e9)) {
        if (exchangeInput) exchangeInput.value = String(previousRate);
        if (labelInput) labelInput.value = String(previousLabel || '');
        toast(translateText('Usa un tipo de cambio de cero o mayor que permita convertir tus importes.')); return false;
      }
      settings.exchangeRate = exchangeRate;
      settings.currencyLabel = String(labelInput?.value || '').trim().slice(0, 6);
      if (saveSettingsOnly() === false) {
        if (settings === owner) { settings.exchangeRate = previousRate; settings.currencyLabel = previousLabel; }
        if (exchangeInput) exchangeInput.value = String(settings.exchangeRate);
        if (labelInput) labelInput.value = String(settings.currencyLabel || '');
        render(); toast(translateText('No se aplicó la moneda porque no se pudo guardar.'), {persistenceFailure:true}); return false;
      }
      render();
    }
    // Guarda nombre + emoji capturados en el popup de bienvenida (ver onboardingModal) y marca
    // settings.onboarded = true para que el popup no vuelva a salir en esta misma
    // instalación/navegador.
    export function renderEmojiPicker(containerId, selected) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = EMOJI_CHOICES.map(e => {
        const isClear = e === '';
        const display = isClear ? '✕' : e;
        const label = isClear ? translateText('Sin emoji') : ui`Elegir ${e}`;
        return ui`<button type="button" class="emoji-option ${isClear ? 'emoji-clear' : ''} ${e === selected ? 'selected' : ''}" data-emoji="${e}" aria-label="${label}">${display}</button>`;
      }).join('');
    }

    // Actualiza solo la clase.selected de los botones ya pintados, sin tocar el HTML.
    export function syncEmojiPickerSelection(containerId, selected) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.querySelectorAll('.emoji-option').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-emoji') === selected);
      });
    }

    // Conecta los clicks del grid (delegado, un solo listener por contenedor) con el input de texto
    // correspondiente.
    export function wireEmojiPicker(containerId, inputId, onPick) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.addEventListener('click', (e) => {
        const btn = e.target instanceof Element ? e.target.closest('.emoji-option') : null;
        if (!btn) return;
        const emoji = btn.getAttribute('data-emoji') || '';
        const input = document.getElementById(inputId);
        if (input) input.value = emoji;
        el.querySelectorAll('.emoji-option').forEach(b => b.classList.toggle('selected', b === btn));
        if (typeof onPick === 'function') onPick(emoji);
      });
    }

    // Rediseño visual de "Ajustes" — el picker de emojis (#emojiPickerMetas) + su input de texto
    // (#userEmojiInput) ya no viven siempre expandidos, se revelan con este botón pill "Cambiar
    // emoji".
    export function toggleEmojiPickerMetas() {
      const wrap = document.getElementById('goalsEmojiPickerWrap');
      const btn = document.getElementById('toggleEmojiPickerMetasBtn');
      if (!wrap || !btn) return;
      const open = !wrap.classList.contains('open');
      wrap.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? translateText('Ocultar emoji') : translateText('Cambiar emoji');
    }

    export function toggleEmojiPickerOnboarding() {
      const wrap = document.getElementById('onboardingEmojiPickerWrap');
      const btn = document.getElementById('toggleEmojiPickerOnboardingBtn');
      if (!wrap || !btn) return;
      const open = !wrap.classList.contains('open');
      wrap.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? translateText('Ocultar emoji') : translateText('Cambiar emoji');
    }

    // Bienvenida en 3 pasos (Tu turno / Tu dinero / Tu app). Las elecciones viven en este objeto
    // hasta "Guardar y empezar"; el tema claro/oscuro NO se elige (queda en 'auto').
    const ONBOARDING_DEFAULTS = { goal: 360, hours: '07:00-15:00', language: 'es', palette: 'original' };
    let onboardingStep = 1;
    let onboardingKeepSchedule = false;
    const onboardingChoice = { ...ONBOARDING_DEFAULTS };
    const hhmmToMin = value => { const [h, m] = String(value || '').split(':').map(Number); return h * 60 + m; };
    const minToHHMM = total => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

    export function onboardingGoalMinutes() {
      if (onboardingChoice.goal !== 'other') return Number(onboardingChoice.goal);
      return Math.round(Number(document.getElementById('obGoalInput')?.value));
    }

    export function onboardingHours() {
      if (onboardingChoice.hours !== 'other') {
        const [start, end] = onboardingChoice.hours.split('-');
        return { start, end };
      }
      return { start: document.getElementById('obStartInput')?.value || '', end: document.getElementById('obEndInput')?.value || '' };
    }

    // Corre los bloques del horario de siempre a la nueva entrada y estira o acorta el ultimo
    // bloque para llegar a la salida. Devuelve null si el horario no cabe.
    export function buildOnboardingBlocks(baseBlocks, start, end, goalMin) {
      const delta = hhmmToMin(start) - hhmmToMin(baseBlocks[0].start);
      const blocks = baseBlocks.map(block => ({ ...block, start: minToHHMM(hhmmToMin(block.start) + delta) }));
      const last = blocks[blocks.length - 1];
      last.dur = hhmmToMin(end) - hhmmToMin(last.start);
      if (!(last.dur >= 15)) return null;
      const work = blocks.filter(block => block.type === 'work');
      const total = work.reduce((sum, block) => sum + block.dur, 0);
      let left = goalMin;
      work.forEach((block, index) => {
        const part = index === work.length - 1 ? left : Math.min(left, Math.round(goalMin * block.dur / total));
        block.goalMin = part;
        left -= part;
      });
      return blocks;
    }

    function onboardingError(text) {
      const box = document.getElementById('obError');
      if (!box) return;
      box.textContent = text ? translateText(text) : '';
      box.hidden = !text;
    }

    function pressChips(attr, value) {
      document.querySelectorAll(`[${attr}]`).forEach(button => button.setAttribute('aria-pressed', String(button.getAttribute(attr) === String(value))));
    }

    function refreshOnboardingNotes() {
      const rate = Number(document.getElementById('obRateInput')?.value) || RATE;
      const goal = onboardingGoalMinutes();
      const note = document.getElementById('obGoalNote');
      if (note) note.textContent = Number.isFinite(goal) && goal > 0 ? ui`${goal} min = ${money(goal * rate)} al día con tu pago por minuto` : '';
      const exchange = Number(document.getElementById('obExchangeInput')?.value);
      const label = String(document.getElementById('obCurrencyInput')?.value || '').trim();
      const exchangeNote = document.getElementById('obExchangeNote');
      if (exchangeNote) exchangeNote.textContent = exchange > 0 ? ui`1 dólar = ${label} ${exchange.toFixed(2)}` : '';
    }

    export function showOnboardingStep(step) {
      onboardingStep = Math.min(3, Math.max(1, step));
      document.querySelectorAll('.ob-step').forEach(panel => { panel.hidden = Number(panel.dataset.obStep) !== onboardingStep; });
      document.querySelectorAll('.ob-dots i').forEach((dot, index) => dot.classList.toggle('on', index === onboardingStep - 1));
      const back = document.getElementById('onboardingBackBtn');
      const next = document.getElementById('onboardingNextBtn');
      const save = document.getElementById('onboardingSaveBtn');
      if (back) back.hidden = onboardingStep === 1;
      if (next) next.hidden = onboardingStep === 3;
      if (save) save.hidden = onboardingStep !== 3;
      onboardingError('');
      refreshOnboardingNotes();
    }

    // Deja la bienvenida en el paso 1 con los valores de siempre. Se llama al abrirla.
    export function resetOnboardingSteps({ keepSchedule = false } = {}) {
      onboardingKeepSchedule = !!keepSchedule;
      const turn = document.getElementById('obTurnSection');
      if (turn) turn.hidden = onboardingKeepSchedule;
      Object.assign(onboardingChoice, ONBOARDING_DEFAULTS, { language: normalizeLanguage(settings.language) });
      const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
      set('obGoalInput', ''); set('obStartInput', '07:00'); set('obEndInput', '15:00');
      set('obRateInput', String(RATE)); set('obCurrencyInput', 'L'); set('obExchangeInput', '26.80');
      const skip = document.getElementById('obSkipOffInput');
      if (skip) skip.checked = true;
      const goalOther = document.getElementById('obGoalOther');
      const hoursOther = document.getElementById('obHoursOther');
      if (goalOther) goalOther.hidden = true;
      if (hoursOther) hoursOther.hidden = true;
      pressChips('data-ob-goal', onboardingChoice.goal);
      pressChips('data-ob-hours', onboardingChoice.hours);
      pressChips('data-ob-lang', onboardingChoice.language);
      pressChips('data-ob-palette', onboardingChoice.palette);
      showOnboardingStep(1);
    }

    export function wireOnboarding() {
      const modal = document.getElementById('onboardingModal');
      if (!modal || modal.dataset.wired) return;
      modal.dataset.wired = 'true';
      document.querySelectorAll('.ob-palette').forEach(button => {
        const palette = PALETTES.find(item => item.id === button.dataset.obPalette);
        if (!palette) return;
        button.querySelector('.ob-palette-name').textContent = translateText(palette.name);
        button.querySelector('.ob-swatches').replaceChildren(...palette.colors.map(color => {
          const swatch = document.createElement('i');
          swatch.style.background = color;
          return swatch;
        }));
      });
      modal.addEventListener('click', event => {
        const target = event.target.closest('[data-ob-goal],[data-ob-hours],[data-ob-lang],[data-ob-palette]');
        if (!target) return;
        if (target.dataset.obGoal) {
          onboardingChoice.goal = target.dataset.obGoal;
          pressChips('data-ob-goal', onboardingChoice.goal);
          document.getElementById('obGoalOther').hidden = onboardingChoice.goal !== 'other';
          if (onboardingChoice.goal === 'other') document.getElementById('obGoalInput')?.focus();
        } else if (target.dataset.obHours) {
          onboardingChoice.hours = target.dataset.obHours;
          pressChips('data-ob-hours', onboardingChoice.hours);
          document.getElementById('obHoursOther').hidden = onboardingChoice.hours !== 'other';
        } else if (target.dataset.obLang) {
          onboardingChoice.language = target.dataset.obLang;
          pressChips('data-ob-lang', onboardingChoice.language);
        } else if (target.dataset.obPalette) {
          onboardingChoice.palette = target.dataset.obPalette;
          pressChips('data-ob-palette', onboardingChoice.palette);
          previewOnboardingPalette();
        }
        onboardingError('');
        refreshOnboardingNotes();
      });
      modal.addEventListener('input', refreshOnboardingNotes);
      document.getElementById('onboardingBackBtn')?.addEventListener('click', () => showOnboardingStep(onboardingStep - 1));
      document.getElementById('onboardingNextBtn')?.addEventListener('click', () => {
        if (onboardingStep === 1 && !validateOnboardingTurn()) return;
        if (onboardingStep === 2 && !validateOnboardingMoney()) return;
        showOnboardingStep(onboardingStep + 1);
      });
    }

    // Tema que necesita la paleta elegida: si no existe en el modo actual (Graphite y Neon solo son
    // oscuras) se pasa a su modo; si existe, no se toca el tema.
    function onboardingThemeFor(paletteId, theme) {
      const palette = PALETTES.find(item => item.id === paletteId);
      if (!palette) return theme;
      const mode = theme === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
        : theme === 'dark' ? 'dark' : 'light';
      return Object.hasOwn(palette.modes, mode) ? theme : Object.keys(palette.modes)[0];
    }

    // Igual que applyTheme de la app: primero la clase claro/oscuro de la pagina y luego los colores.
    function applyOnboardingLook(look) {
      const root = document.documentElement;
      if (root && root.classList) {
        root.classList.remove('theme-light', 'theme-dark');
        if (look.theme === 'light') root.classList.add('theme-light');
        else if (look.theme === 'dark') root.classList.add('theme-dark');
      }
      applyAppearance(look);
    }

    // Muestra la paleta elegida sin guardar nada todavia.
    function previewOnboardingPalette() {
      const theme = onboardingThemeFor(onboardingChoice.palette, settings.theme);
      applyOnboardingLook({ ...settings, palette: onboardingChoice.palette, theme });
    }

    function validateOnboardingTurn() {
      if (onboardingKeepSchedule) return true;
      const goal = onboardingGoalMinutes();
      if (!Number.isFinite(goal) || goal < 1 || goal > 1440) { onboardingError('Escribe tu meta en minutos, entre 1 y 1440.'); return false; }
      const { start, end } = onboardingHours();
      if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || hhmmToMin(end) <= hhmmToMin(start)) {
        onboardingError('Escribe una entrada y una salida, y la salida debe ser después de la entrada.'); return false;
      }
      const base = (settings.weeklySchedule?.mon?.blocks || []);
      if (base.length && !buildOnboardingBlocks(base, start, end, goal)) { onboardingError('Ese horario es muy corto para tus bloques. Cambia la entrada o la salida.'); return false; }
      onboardingError('');
      return true;
    }

    function validateOnboardingMoney() {
      const rate = Number(document.getElementById('obRateInput')?.value);
      const exchange = Number(document.getElementById('obExchangeInput')?.value);
      if (!(rate > 0)) { toast(translateText('El pago por minuto debe ser mayor que cero.')); return false; }
      if (!Number.isFinite(exchange) || exchange < 0) { toast(translateText('Usa un tipo de cambio de cero o mayor que permita convertir tus importes.')); return false; }
      return true;
    }

    export function finishOnboarding() {
      const nameInput = document.getElementById('onboardingNameInput');
      const emojiInput = document.getElementById('onboardingEmojiInput');
      if (!validateOnboardingTurn()) { showOnboardingStep(1); return false; }
      if (!validateOnboardingMoney()) { showOnboardingStep(2); return false; }
      const owner = settings, ownerState = state;
      const previous = JSON.parse(JSON.stringify(settings)), previousState = JSON.parse(JSON.stringify(state));
      const rate = Number(document.getElementById('obRateInput').value);
      const goal = onboardingKeepSchedule ? Number(settings.productiveGoalMin) : onboardingGoalMinutes();
      const { start, end } = onboardingKeepSchedule ? { start: settings.shiftStart, end: settings.shiftEnd } : onboardingHours();
      settings.userName = String(nameInput?.value || '').trim().slice(0, 40);
      settings.userEmoji = String(emojiInput?.value || '').trim().slice(0, 8);
      settings.rate = rate;
      if (!onboardingKeepSchedule) {
        settings.productiveGoalMin = goal;
        settings.earningsGoal = goal * rate;
        state.productiveGoalMin = goal;
        state.earningsGoal = settings.earningsGoal;
      }
      settings.exchangeRate = Number(document.getElementById('obExchangeInput').value);
      settings.currencyLabel = String(document.getElementById('obCurrencyInput')?.value || '').trim().slice(0, 6);
      if (!onboardingKeepSchedule) {
        settings.shiftStart = start;
        settings.shiftEnd = end;
      }
      for (const day of onboardingKeepSchedule ? [] : Object.keys(settings.weeklySchedule || {})) {
        const cfg = settings.weeklySchedule[day];
        if (!cfg || !Array.isArray(cfg.blocks) || !cfg.blocks.length) continue;
        const blocks = buildOnboardingBlocks(cfg.blocks, start, end, goal);
        if (!blocks) continue;
        cfg.start = start; cfg.end = end; cfg.blocks = blocks;
      }
      settings.theme = onboardingThemeFor(onboardingChoice.palette, settings.theme);
      settings.palette = onboardingChoice.palette;
      settings.language = normalizeLanguage(onboardingChoice.language);
      settings.streakSkipOffDays = !!document.getElementById('obSkipOffInput')?.checked;
      settings.onboarded = true;
      if (saveAll({ render: false }) === false) {
        if (settings === owner) { Object.keys(owner).forEach(key => delete owner[key]); Object.assign(owner, previous); }
        if (state === ownerState) { Object.keys(ownerState).forEach(key => delete ownerState[key]); Object.assign(ownerState, previousState); }
        return false;
      }
      closeModal('onboardingModal');
      if (settings.language !== normalizeLanguage(previous.language)) {
        saveLanguagePreference(settings.language);
        window.location.reload();
        return true;
      }
      applyOnboardingLook(settings);
      render();
    }
    export function formatGoalFields() {
      const languageInput = document.getElementById('settingsLanguage');
      if (languageInput && document.activeElement !== languageInput) languageInput.value = normalizeLanguage(settings.language);
      const minInput = document.getElementById('productiveGoalInput');
      const usdInput = document.getElementById('earningsGoalInput');
      const nameInput = document.getElementById('userNameInput');
      const emojiInput = document.getElementById('userEmojiInput');
      const rateInput = document.getElementById('rateInput');
      const exchangeInput = document.getElementById('exchangeRateInput');
      const currencyInput = document.getElementById('currencyLabelInput');
      // Los 3 campos de meta muestran la meta EFECTIVA del día activo (puede
      // ser un override de ese día, ver effectiveDailyGoal).
      const activeDayGoal = effectiveDailyGoal(getActiveDayKey(), { withDebt: false });
      if (!pendingGoalChange && document.activeElement !== minInput) minInput.value = formatMinutes(activeDayGoal.min);
      if (!pendingGoalChange && document.activeElement !== usdInput) usdInput.value = activeDayGoal.usd.toFixed(2);
      const goalDayOverrideNote = document.getElementById('goalDayOverrideNote');
      const goalDayOverrideNoteText = document.getElementById('goalDayOverrideNoteText');
      if (goalDayOverrideNote && goalDayOverrideNoteText) {
        if (activeDayGoal.isOverride) {
          const activeDayKeyForNote = getActiveDayKey();
          const dayLabel = activeDayKeyForNote === todayCallDateKey() ? translateText('hoy') : formatCallDayLabel(activeDayKeyForNote);
          goalDayOverrideNoteText.textContent = ui`Meta especial solo para ${dayLabel}. Tu meta general sigue en ${formatMinutes(Number(settings.productiveGoalMin) || 0)} min · ${money(Number(settings.earningsGoal) || 0)}${convertedAmountText(Number(settings.earningsGoal) || 0) ? ` (${convertedAmountText(Number(settings.earningsGoal) || 0)})` : ''}.`;
          goalDayOverrideNote.style.display = '';
        } else {
          goalDayOverrideNote.style.display = 'none';
        }
      }
      if (nameInput && document.activeElement !== nameInput) nameInput.value = String(settings.userName || '');
      if (emojiInput && document.activeElement !== emojiInput) emojiInput.value = String(settings.userEmoji || '');
      if (rateInput && document.activeElement !== rateInput) rateInput.value = Number(settings.rate || RATE).toFixed(2);
      if (exchangeInput && document.activeElement !== exchangeInput) exchangeInput.value = Number(settings.exchangeRate || 0).toFixed(2);
      if (currencyInput && document.activeElement !== currencyInput) currencyInput.value = String(settings.currencyLabel || '');
      // Pedido del usuario: "Meta en tu moneda" en el modal Metas — oculto hasta que haya tasa de cambio Y símbolo de moneda configurados (mismo criterio que ya usa convertedAmountText para ocultar el helper "≈ L..." del header).
      const goalCurrencyField = document.getElementById('goalCurrencyField');
      const goalCurrencyInput = document.getElementById('goalCurrencyInput');
      const goalCurrencyLabelEl = document.getElementById('goalCurrencyLabel');
      const currencyLabelTrimmed = String(settings.currencyLabel || '').trim();
      const hasCurrency = Number(settings.exchangeRate) > 0 && !!currencyLabelTrimmed;
      if (goalCurrencyField) goalCurrencyField.style.display = hasCurrency ? '' : 'none';
      if (hasCurrency) {
        if (goalCurrencyLabelEl) goalCurrencyLabelEl.textContent = ui`Meta en ${currencyLabelTrimmed}`;
        if (goalCurrencyInput && !pendingGoalChange && document.activeElement !== goalCurrencyInput) {
          goalCurrencyInput.value = currencyCeilFromUsdAmount(activeDayGoal.usd, Number(settings.exchangeRate)).toFixed(2);
        }
      }
      syncEmojiPickerSelection('emojiPickerMetas', String(settings.userEmoji || ''));
      // Ver comentario junto a ".goals-emoji-circle" en el CSS: círculo grande de solo lectura en la cabecera de "Tu perfil"
      const goalsEmojiPreview = document.getElementById('goalsEmojiPreview');
      if (goalsEmojiPreview) goalsEmojiPreview.textContent = String(settings.userEmoji || '').trim() || DEFAULT_USER_EMOJI;

      // Pedido del usuario: Ciclo de pago se movió de Horario a Metas (es
      // dinero, no horario) — mismo criterio de sincronización que ya usaba
      // en Horario: settings globales, no dependen del día activo.
      ensureCurrencySettings();
      const cycleAnchorInput = document.getElementById('cycleAnchorInput');
      const cyclePayOffsetInput = document.getElementById('cyclePayOffsetInput');
      if (cycleAnchorInput && document.activeElement !== cycleAnchorInput) cycleAnchorInput.value = settings.cycleAnchorDate;
      if (cyclePayOffsetInput && document.activeElement !== cyclePayOffsetInput) cyclePayOffsetInput.value = settings.cyclePayOffsetDays;
    }

let profileRequestVersion = 0;

export async function syncAccountProfileFields() {
  const owner = settings, version = ++profileRequestVersion;
  const current = () => owner === settings && version === profileRequestVersion;
  const saveButton = document.getElementById('saveAccountProfileBtn');
  if (saveButton) saveButton.disabled = false;
  const usernameInput = document.getElementById('accountUsernameInput');
  const emailInput = document.getElementById('accountEmailInput');
  const initialUsername = usernameInput?.value, initialEmail = emailInput?.value;
  if (emailInput) emailInput.readOnly = !EMAIL_AUTH_READY;
  const status = document.getElementById('accountProfileStatus');
  if (status) status.textContent = translateText('Cargando los datos de la cuenta…');
  try {
    const session = await getSession();
    if (!current()) return;
    if (!session?.user?.id) throw new AuthError('NOT_AUTHENTICATED');
    const [profile, user] = await Promise.all([getProfile(session.user.id), getUser(session.user.id)]);
    if (!current()) return;
    if (usernameInput && document.activeElement !== usernameInput && usernameInput.value === initialUsername) usernameInput.value = profile?.username || '';
    if (emailInput && document.activeElement !== emailInput && emailInput.value === initialEmail) emailInput.value = user?.email || '';
    if (status) status.textContent = '';
  } catch (err) {
    if (current() && status) status.textContent = authErrorMessage(err);
  }
}

const SETTINGS_TABS = ['general', 'dinero', 'avisos', 'datos'];

export function setSettingsTab(tab) {
  const active = SETTINGS_TABS.includes(tab) ? tab : 'general';
  document.querySelectorAll('#settingsTabs [data-set-tab]').forEach((btn) => {
    const on = btn.dataset.setTab === active;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('#goalsModal [data-set-panel]').forEach((panel) => {
    const on = panel.dataset.setPanel === active;
    panel.classList.toggle('active', on);
    panel.hidden = !on;
  });
  document.dispatchEvent(new CustomEvent('app:settings-tab', { detail: { tab: active } }));
}

export function wireSettingsTabs() {
  document.querySelectorAll('#settingsTabs [data-set-tab]').forEach((btn) => {
    btn.addEventListener('click', () => setSettingsTab(btn.dataset.setTab));
  });
}

export async function openSettingsModal() {
  formatGoalFields();
  setSettingsTab('general');
  openModal('goalsModal');
  await syncAccountProfileFields();
}

export async function saveAccountProfile() {
  const owner = settings, version = ++profileRequestVersion;
  const current = () => owner === settings && version === profileRequestVersion;
  const usernameInput = document.getElementById('accountUsernameInput');
  const emailInput = document.getElementById('accountEmailInput');
  const button = document.getElementById('saveAccountProfileBtn');
  const status = document.getElementById('accountProfileStatus');
  const username = String(usernameInput?.value || '').trim();
  const email = String(emailInput?.value || '').trim();
  if (button) button.disabled = true;
  if (status) status.textContent = translateText('Guardando…');
  try {
    const session = await getSession();
    if (!current()) return false;
    if (!session?.user?.id) throw new AuthError('NOT_AUTHENTICATED');
    const userId = session.user.id;
    const [profile, user] = await Promise.all([getProfile(userId), getUser(userId)]);
    if (!current()) return false;
    if (username !== String(profile?.username || '')) await updateUsername(username, userId);
    if (!current()) return false;
    const emailChanged = EMAIL_AUTH_READY && email.toLowerCase() !== String(user?.email || '').toLowerCase();
    if (emailChanged) await updateEmail(email, userId);
    if (!current()) return false;
    if (status) status.textContent = emailChanged
      ? translateText('Perfil guardado. Revisa tu correo para confirmar la nueva dirección.')
      : translateText('Perfil guardado.');
    toast(emailChanged ? translateText('Perfil guardado — confirma el correo nuevo') : translateText('Perfil guardado'));
  } catch (err) {
    if (!current()) return false;
    const message = authErrorMessage(err);
    if (status) status.textContent = message;
    toast(message);
  } finally {
    if (version === profileRequestVersion && button === document.getElementById('saveAccountProfileBtn')) button.disabled = false;
  }
}
