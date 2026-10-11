import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
import { authErrorMessage, getProfile, getUser, updateEmail, updateUsername } from './auth.js';
import { settings, state } from './app-context.js';
import { normalizeLanguage, saveLanguagePreference } from './language-preference.js';
import { EMAIL_AUTH_READY } from './config.js';

let DEFAULT_USER_EMOJI, EMOJI_CHOICES, RATE, closeModal, convertedAmountText;
let currencyCeilFromUsdAmount, effectiveCycleGoal, effectiveDailyGoal, ensureCurrencySettings, escapeHtml;
let formatCallDayLabel, formatMinutes, getActiveDayKey, getDailyGoalOverride, iconHtml, money;
let onGameDayMetadataChanged, openModal, render, saveSettingsOnly, saveStateOnly, snapshotHistoricalPlanning;
let setDailyGoalOverride, toast;
let todayCallDateKey, usdCeilFromCurrencyAmount;

export function configureSettingsContext(context) {
  ({ DEFAULT_USER_EMOJI, EMOJI_CHOICES, RATE, closeModal, convertedAmountText, currencyCeilFromUsdAmount,
    effectiveCycleGoal, effectiveDailyGoal, ensureCurrencySettings, escapeHtml, formatCallDayLabel,
    formatMinutes, getActiveDayKey, getDailyGoalOverride, iconHtml, money, onGameDayMetadataChanged, openModal, render,
    saveSettingsOnly, saveStateOnly, snapshotHistoricalPlanning, setDailyGoalOverride, toast, todayCallDateKey,
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
      const current = effectiveDailyGoal(getActiveDayKey());
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
    function applyGoalValues(minutes, dollars, scope, dayKey) {
      if (scope === 'day') {
        setDailyGoalOverride(dayKey, { min: minutes, usd: dollars });
      } else {
        snapshotHistoricalPlanning();
        settings.productiveGoalMin = Number(minutes);
        settings.earningsGoal = Number(dollars);
        state.productiveGoalMin = settings.productiveGoalMin;
        state.earningsGoal = settings.earningsGoal;
        setDailyGoalOverride(dayKey, null);
        if (saveStateOnly() === false) return false;
      }
      if (saveSettingsOnly() === false) return false;
      onGameDayMetadataChanged(dayKey);
      refreshGoalInputs();
      render();
    }

    // Repinta los 3 campos de meta con el valor efectivo del día activo.
    function refreshGoalInputs() {
      const minInput = document.getElementById('productiveGoalInput');
      const usdInput = document.getElementById('earningsGoalInput');
      const currencyInput = document.getElementById('goalCurrencyInput');
      const exchangeRate = Number(settings.exchangeRate) > 0 ? Number(settings.exchangeRate) : 0;
      const goal = effectiveDailyGoal(getActiveDayKey());
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
      const current = effectiveDailyGoal(dayKey);
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
      setDailyGoalOverride(dayKey, null);
      if (saveSettingsOnly() === false) return false;
      onGameDayMetadataChanged(dayKey);
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
      snapshotHistoricalPlanning();
      settings.rate = rate;
      settings.earningsGoal = dollars;
      state.earningsGoal = dollars;
      if (saveStateOnly() === false || saveSettingsOnly() === false) return false;
      onGameDayMetadataChanged(todayCallDateKey());
      refreshGoalInputs();
      render();
    }

    // Cambios de moneda secundaria (símbolo + tasa de cambio), editables en Metas.
    export function updateCurrencySettings() {
      const exchangeInput = document.getElementById('exchangeRateInput');
      const labelInput = document.getElementById('currencyLabelInput');
      let exchangeRate = Number(exchangeInput?.value);
      if (!Number.isFinite(exchangeRate) || exchangeRate < 0) exchangeRate = settings.exchangeRate || 0;
      settings.exchangeRate = exchangeRate;
      settings.currencyLabel = String(labelInput?.value || '').trim().slice(0, 6);
      saveSettingsOnly();
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

    export function finishOnboarding() {
      const nameInput = document.getElementById('onboardingNameInput');
      const emojiInput = document.getElementById('onboardingEmojiInput');
      settings.userName = String(nameInput?.value || '').trim().slice(0, 40);
      settings.userEmoji = String(emojiInput?.value || '').trim().slice(0, 8);
      settings.onboarded = true;
      if (saveSettingsOnly() === false) return false;
      closeModal('onboardingModal');
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
      const activeDayGoal = effectiveDailyGoal(getActiveDayKey());
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
      // v328 — Meta del ciclo actual, editable también desde aquí (ver
      // comentario junto a cycleGoalOverrides en defaultSettings()).
      const cycleGoalInput = document.getElementById('cycleGoalInput');
      if (cycleGoalInput && document.activeElement !== cycleGoalInput) cycleGoalInput.value = effectiveCycleGoal(0).toFixed(2);
    }

export async function syncAccountProfileFields() {
  const usernameInput = document.getElementById('accountUsernameInput');
  const emailInput = document.getElementById('accountEmailInput');
  if (emailInput) emailInput.readOnly = !EMAIL_AUTH_READY;
  const status = document.getElementById('accountProfileStatus');
  if (status) status.textContent = translateText('Cargando los datos de la cuenta…');
  try {
    const [profile, user] = await Promise.all([getProfile(), getUser()]);
    if (usernameInput && document.activeElement !== usernameInput) usernameInput.value = profile?.username || '';
    if (emailInput && document.activeElement !== emailInput) emailInput.value = user?.email || '';
    if (status) status.textContent = '';
  } catch (err) {
    if (status) status.textContent = authErrorMessage(err);
  }
}

export async function openSettingsModal() {
  formatGoalFields();
  openModal('goalsModal');
  await syncAccountProfileFields();
}

export async function saveAccountProfile() {
  const usernameInput = document.getElementById('accountUsernameInput');
  const emailInput = document.getElementById('accountEmailInput');
  const button = document.getElementById('saveAccountProfileBtn');
  const status = document.getElementById('accountProfileStatus');
  const username = String(usernameInput?.value || '').trim();
  const email = String(emailInput?.value || '').trim();
  if (button) button.disabled = true;
  if (status) status.textContent = 'Guardando…';
  try {
    const [profile, user] = await Promise.all([getProfile(), getUser()]);
    if (username !== String(profile?.username || '')) await updateUsername(username);
    const emailChanged = EMAIL_AUTH_READY && email.toLowerCase() !== String(user?.email || '').toLowerCase();
    if (emailChanged) await updateEmail(email);
    if (status) status.textContent = emailChanged
      ? translateText('Perfil guardado. Revisa tu correo para confirmar la nueva dirección.')
      : translateText('Perfil guardado.');
    toast(emailChanged ? translateText('Perfil guardado — confirma el correo nuevo') : translateText('Perfil guardado'));
  } catch (err) {
    const message = authErrorMessage(err);
    if (status) status.textContent = message;
    toast(message);
  } finally {
    if (button) button.disabled = false;
  }
}
