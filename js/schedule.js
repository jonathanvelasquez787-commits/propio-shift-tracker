import { ui, translateText, translateMarkup, displayLocale } from './i18n.js';
// app-main.js injects schedule helpers; app-context.js owns shared state and editor offsets.
import {
  scheduleEditDay,
  setScheduleEditDay,
  scheduleOffsetMin,
  setScheduleOffsetMin,
  scheduleViewMode,
  scheduleWeekOffset,
  settings,
} from './app-context.js';

let WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_LABELS_SHORT, appConfirm, defaultDaySchedule;
let ensureWeeklySchedule, formatHHMM, formatMinutes, formatWeekRangeLabel, iconHtml, isScheduleWeekPast;
let minutesToHHMM, onGameDayMetadataChanged, pad, saveAll, saveSettingsOnly, snapshotHistoricalPlanning;
let startOfCycleWeek, timeLabel, toMinutes, toast, todayCallDateKey, weekStartKeyFromDate;

export function configureScheduleContext(context) {
  ({ WEEKDAYS, WEEKDAY_LABELS, WEEKDAY_LABELS_SHORT, appConfirm, defaultDaySchedule, ensureWeeklySchedule,
    formatHHMM, formatMinutes, formatWeekRangeLabel, iconHtml, isScheduleWeekPast, minutesToHHMM,
    onGameDayMetadataChanged, pad, saveAll, saveSettingsOnly, snapshotHistoricalPlanning,
    startOfCycleWeek, timeLabel, toMinutes, toast, todayCallDateKey, weekStartKeyFromDate } = context);
}

    // "+1:00" / "-0:30" / "+0:00" — mismo formato que ya usa el resto de la app para horas (ver formatDuration), pero con signo explícito y sin segundos, ya que aquí el usuario razona en pasos de 15 min.
    function formatScheduleOffsetLabel(mins) {
      const sign = mins < 0 ? '-' : '+';
      const abs = Math.abs(mins);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return `${sign}${h}:${pad(m)}`;
    }

    export function syncScheduleOffsetUI() {
      const valueEl = document.getElementById('scheduleOffsetValue');
      if (valueEl) valueEl.textContent = formatScheduleOffsetLabel(scheduleOffsetMin);
    }

    // Mueve Inicio/Fin del turno Y todos los bloques del formulario por `scheduleOffsetMin` minutos — mismo desplazamiento para todo, así que el orden y la duración de cada bloque no cambian, solo su hora.
    export function applyScheduleOffset() {
      if (!scheduleOffsetMin) {
        toast(translateText('Elige cuánto ajustar el turno antes de aplicar.'));
        return;
      }
      const current = readBlocksFromEditor();
      if (!current.length) {
        toast(translateText('No hay bloques que ajustar en este día.'));
        return;
      }

      const startInput = document.getElementById('dayStartInput');
      const endInput = document.getElementById('dayEndInput');
      if (startInput) startInput.value = minutesToHHMM(toMinutes(formatHHMM(startInput.value)) + scheduleOffsetMin);
      if (endInput) endInput.value = minutesToHHMM(toMinutes(formatHHMM(endInput.value)) + scheduleOffsetMin);
      const shifted = current.map(b => ({ ...b, start: minutesToHHMM(toMinutes(b.start) + scheduleOffsetMin) }));
      renderBlocksEditor(shifted);
      toast(ui`Turno ajustado ${formatScheduleOffsetLabel(scheduleOffsetMin)} — recuerda "Guardar día" para confirmar`);
      setScheduleOffsetMin(0);
      syncScheduleOffsetUI();
    }

    function scheduleWeekStartDate(offset = scheduleWeekOffset) {
      const base = startOfCycleWeek(new Date());
      return new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset * 7);
    }

    function scheduleWeekKeyForOffset(offset = scheduleWeekOffset) {
      return weekStartKeyFromDate(scheduleWeekStartDate(offset));
    }

    export function scheduleWeekIsPast(offset = scheduleWeekOffset) {
      return isScheduleWeekPast(scheduleWeekStartDate(offset));
    }

    function scheduleWeekOverride(offset = scheduleWeekOffset) {
      const key = scheduleWeekKeyForOffset(offset);
      return (settings.scheduleOverridesByWeek && settings.scheduleOverridesByWeek[key]) || null;
    }

    export function scheduleWeekHasCustom(offset = scheduleWeekOffset) {
      return !!scheduleWeekOverride(offset);
    }

    // Clona la plantilla actual (ya migrada/normalizada por ensureWeeklySchedule) como punto de partida de un override nuevo
    function cloneWeeklyScheduleForOverride() {
      ensureWeeklySchedule();
      const out = {};
      WEEKDAYS.forEach(k => { out[k] = JSON.parse(JSON.stringify(settings.weeklySchedule[k])); });
      return out;
    }

    export function ensureScheduleWeekOverride(offset = scheduleWeekOffset) {
      const key = scheduleWeekKeyForOffset(offset);
      if (!settings.scheduleOverridesByWeek) settings.scheduleOverridesByWeek = {};
      if (!settings.scheduleOverridesByWeek[key]) settings.scheduleOverridesByWeek[key] = cloneWeeklyScheduleForOverride();
      return settings.scheduleOverridesByWeek[key];
    }

    export function removeScheduleWeekOverride(offset = scheduleWeekOffset) {
      snapshotHistoricalPlanning();
      const key = scheduleWeekKeyForOffset(offset);
      if (settings.scheduleOverridesByWeek) delete settings.scheduleOverridesByWeek[key];
    }

    // Objeto {mon..sun} sobre el que se está leyendo/escribiendo ahora mismo — la plantilla en modo 'template', o el override de la semana actual en modo 'week' (se crea si todavía no existe, salvo que la semana ya esté protegida por pasada
    function activeScheduleTarget({ createIfMissing = false } = {}) {
      if (scheduleViewMode === 'template') {
        ensureWeeklySchedule();
        return settings.weeklySchedule;
      }
      const existing = scheduleWeekOverride(scheduleWeekOffset);
      if (existing) return existing;
      if (createIfMissing && !scheduleWeekIsPast(scheduleWeekOffset)) return ensureScheduleWeekOverride(scheduleWeekOffset);
      // Semana sin personalizar (o ya pasada, protegida): se devuelve una vista de solo-lectura basada en la plantilla, sin crear ni guardar nada
      ensureWeeklySchedule();
      return settings.weeklySchedule;
    }

    export function renderDayTabs() {
      const wrap = document.getElementById('scheduleDayTabs');
      if (!wrap) return;
      const target = activeScheduleTarget();
      wrap.innerHTML = WEEKDAYS.map(k => {
        const active = k === scheduleEditDay;
        const off = !target[k] || target[k].off;
        return ui`<button class="day-tab ${active ? 'active' : ''} ${off ? 'off' : ''}" data-day="${k}" type="button">${WEEKDAY_LABELS_SHORT[k]}</button>`;
      }).join('');
      wrap.querySelectorAll('.day-tab').forEach(btn => {
        btn.addEventListener('click', () => {
          const nextDay = btn.getAttribute('data-day');
          // Clickear el tab que YA está activo no debe hacer nada. Antes esto igual llamaba a syncShiftModalFields, que relee el horario guardado y sobreescribe el formulario — descartando en silencio cualquier cambio sin guardar (ej.
          if (nextDay === scheduleEditDay) return;
          // Si hay cambios sin guardar en el día actual, se avisa antes de cambiar de tab y perderlos — mismo patrón de confirmación que ya usa el resto de la app (appConfirm).
          if (scheduleFormIsDirty()) {
            appConfirm(ui`Tienes cambios sin guardar en ${WEEKDAY_LABELS[scheduleEditDay]}. ¿Descartarlos y cambiar a ${WEEKDAY_LABELS[nextDay]}?`, () => {
              setScheduleEditDay(nextDay);
              syncShiftModalFields();
            });
            return;
          }
          setScheduleEditDay(nextDay);
          syncShiftModalFields();
        });
      });
    }

    // Pedido del usuario: unificar Trabajo/Break/Lunch en UNA sola lista de bloques en Horario — cada fila tiene Tipo (selector) + inicio + min, todos editables/agregables/eliminables exactamente igual, sin importar el tipo.
    const BLOCK_TYPE_LABELS = { work: translateText('Trabajo'), break: 'Break', lunch: 'Lunch' };

    // Pedido del usuario: Meta de Productividad configurable POR BLOQUE de Trabajo (reemplaza al viejo ratio global de "Margen"). Esta función arma la forma CANÓNICA de un bloque para comparar/guardar
    function normalizeBlockForCompare(b) {
      const type = BLOCK_TYPE_LABELS[String(b && b.type || '').toLowerCase()] ? String(b.type).toLowerCase() : 'work';
      const base = { type, start: formatHHMM((b && b.start) || '00:00'), dur: Math.max(0, Number(b && b.dur) || 0) };
      if (type === 'work') base.goalMin = Math.max(0, Number(b && b.goalMin) || 0);
      return base;
    }

    // Pedido del usuario (rediseño 100% visual de "Horario", timeline de bloques): ícono + subtítulo por tipo, puramente decorativos.
    // Guarda el NOMBRE del ícono, no el HTML ya renderizado: llamar a iconHtml() aquí arriba (a
    // nivel de módulo) revienta el arranque, porque este archivo se importa desde app-main.js y a
    // la vez importa iconHtml() de vuelta desde ahí (import circular) — en ese punto ICON todavía
    // no existe dentro de app-main.js, así que iconHtml() truena con "Cannot access 'ICON' before
    // initialization". Se llama a iconHtml(meta.iconName) recién donde se usa, en tiempo de
    // ejecución (ver renderBlocksEditor más abajo).
    export const BLOCK_TIMELINE_META = {
      work: { iconName: 'briefcase', subtitle: translateText('Enfoque y productividad') },
      break: { iconName: 'coffee', subtitle: translateText('Descanso corto') },
      lunch: { iconName: 'utensils', subtitle: translateText('Almuerzo / Descanso largo') },
    };

    // Duración legible ("2h 10m" / "45 min" / "1h") para la píldora de la tarjeta
    export function formatBlockDurationLabel(mins) {
      const total = Math.max(0, Math.round(Number(mins) || 0));
      const h = Math.floor(total / 60);
      const m = total % 60;
      if (h <= 0) return `${m} min`;
      if (m === 0) return `${h}h`;
      return `${h}h ${m}m`;
    }

    export function renderBlocksEditor(blocks) {
      const list = document.getElementById('blocksEditorList');
      if (!list) return;
      const arr = Array.isArray(blocks) ? blocks : [];
      list.innerHTML = arr.map((b, i) => {
        const type = BLOCK_TYPE_LABELS[String(b?.type || '').toLowerCase()] ? String(b.type).toLowerCase() : 'work';
        // Pedido del usuario: mostrar "Inicio" + "Fin" (hora) en vez de "Inicio" + "Min" (duración)
        const startVal = formatHHMM(b?.start || '09:00');
        const durVal = Number(b?.dur) || 0;
        const endVal = minutesToHHMM(toMinutes(startVal) + durVal);
        // Pedido del usuario: Meta de Productividad EN MINUTOS por cada bloque de Trabajo — campo nuevo, visible solo cuando Tipo = Trabajo (oculto para Break/Lunch, que no tienen este concepto).
        const rawGoalMin = Number(b?.goalMin);
        const goalVal = (Number.isFinite(rawGoalMin) && rawGoalMin >= 0) ? rawGoalMin : durVal;
        // Ver comentario junto a BLOCK_TIMELINE_META/ formatBlockDurationLabel arriba: `meta`/`durationLabel` son solo para pintar la tarjeta (ícono, subtítulo, píldora de duración)
        const meta = BLOCK_TIMELINE_META[type] || BLOCK_TIMELINE_META.work;
        const durationLabel = formatBlockDurationLabel(durVal);
        // Ver comentario junto a `.sched-tl-hour` en el CSS: la hora de inicio se repite aquí como texto suelto a la izquierda de la línea/punto conector
        return ui`
        <div class="block-row sched-tl-item" data-block-row="${i}" data-block-type="${type}">
          <div class="sched-tl-hour" aria-hidden="true">${startVal}</div>
          <div class="sched-tl-rail" aria-hidden="true"><span class="sched-tl-dot"></span></div>
          <div class="sched-tl-card">
            <div class="sched-tl-card-top">
              <span class="sched-tl-icon">${iconHtml(meta.iconName)}</span>
              <div class="sched-tl-titles">
                <select class="alert-select block-type-input sched-tl-type-select">
                  <option value="work" ${type === 'work' ? 'selected' : ''}>Trabajo</option>
                  <option value="break" ${type === 'break' ? 'selected' : ''}>Break</option>
                  <option value="lunch" ${type === 'lunch' ? 'selected' : ''}>Lunch</option>
                </select>
                <div class="sched-tl-subtitle">${meta.subtitle}</div>
              </div>
              <div class="sched-tl-time-inline">
                <input type="time" class="block-start-input sched-tl-time-input" inputmode="numeric" value="${startVal}"/>
                <span class="sched-tl-time-sep" aria-hidden="true">—</span>
                <input type="time" class="block-end-input sched-tl-time-input" inputmode="numeric" value="${endVal}"/>
              </div>
              <span class="sched-tl-duration">${durationLabel}</span>
              <span class="sched-tl-handle" aria-hidden="true" title="Orden (informativo)">⋮⋮</span>
              <button type="button" class="gap-edit-btn block-remove-btn sched-tl-remove" data-remove-block="${i}" aria-label="Eliminar bloque ${i + 1}"><svg class="ic-svg" viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="field block-goal-field sched-tl-goal" style="${type === 'work' ? '' : 'display:none;'}">
              <label>Meta productiva (min)</label>
              <input type="number" class="block-goal-input" inputmode="numeric" min="0" step="1" value="${goalVal}"/>
            </div>
          </div>
        </div>
      `;
      }).join('') || translateMarkup('<div class="note" style="margin:0;">Sin bloques configurados. Usa "+ Agregar bloque" para empezar (Trabajo también es un bloque explícito ahora).</div>');
    }

    // Conserva el orden del editor y despliega los finales que caen después de medianoche.
    function readBlocksFromEditor() {
      const rows = document.querySelectorAll('#blocksEditorList .block-row');
      return Array.from(rows).map(row => {
        const typeInput = row.querySelector('.block-type-input');
        const startInput = row.querySelector('.block-start-input');
        const endInput = row.querySelector('.block-end-input');
        const goalInput = row.querySelector('.block-goal-input');
        const type = BLOCK_TYPE_LABELS[typeInput ? typeInput.value : ''] ? typeInput.value : 'work';
        const start = formatHHMM(startInput ? startInput.value : '09:00');
        const end = formatHHMM(endInput ? endInput.value : start);
        const dur = (toMinutes(end) - toMinutes(start) + 1440) % 1440;
        return normalizeBlockForCompare({ type, start, dur, goalMin: goalInput ? goalInput.value : 0 });
      });
    }

    // Inicio y fin iguales son ambiguos; un final anterior representa el día siguiente.
    function blockRowsWithEqualTimes() {
      const rows = document.querySelectorAll('#blocksEditorList .block-row');
      const offenders = [];
      Array.from(rows).forEach((row, i) => {
        const typeInput = row.querySelector('.block-type-input');
        const startInput = row.querySelector('.block-start-input');
        const endInput = row.querySelector('.block-end-input');
        if (!startInput || !endInput) return;
        const start = formatHHMM(startInput.value);
        const end = formatHHMM(endInput.value);
        if (toMinutes(end) === toMinutes(start)) {
          const type = BLOCK_TYPE_LABELS[typeInput ? typeInput.value : ''] ? typeInput.value : 'work';
          offenders.push({ index: i, typeLabel: BLOCK_TYPE_LABELS[type], start, end });
        }
      });
      return offenders;
    }

    function blockEqualTimesMessage(offenders) {
      const first = offenders[0];
      const extra = offenders.length > 1 ? ui` (y ${offenders.length - 1} más)` : '';
      return ui`${first.typeLabel} ${timeLabel(first.start)}–${timeLabel(first.end)} tiene inicio y fin iguales${extra}. Ajusta una de las dos horas.`;
    }

    // "+ Agregar bloque": toma lo que ya está en el formulario (para no perder ediciones a medio hacer en filas existentes) y le agrega una fila nueva al final. Pedido del usuario :

    // Pedido del usuario ("qué más sería buena idea que se hiciera automático al agregar un bloque"): antes Tipo/Duración del bloque nuevo eran SIEMPRE fijos (Break, 15 min), sin importar qué venía antes ni cuánto turno quedaba

    // Tipo sugerido para el próximo bloque — ver comentario de v289 arriba
    // para el criterio completo.
    function suggestNextBlockType(current, lastEndingBlock, newStart) {
      if (!current.length || !lastEndingBlock) return 'work';
      if (lastEndingBlock.type !== 'work') return 'work';
      const hasLunch = current.some(b => b.type === 'lunch');
      if (!hasLunch) {
        const dayStartVal = document.getElementById('dayStartInput')?.value;
        const dayEndVal = document.getElementById('dayEndInput')?.value;
        if (dayStartVal && dayEndVal) {
          const startMin = toMinutes(formatHHMM(dayStartVal));
          let endMin = toMinutes(formatHHMM(dayEndVal));
          if (endMin < startMin) endMin += 1440;
          if (endMin > startMin) {
            const midpointMin = startMin + (endMin - startMin) / 2;
            const nextMin = toMinutes(newStart) < startMin ? toMinutes(newStart) + 1440 : toMinutes(newStart);
            if (nextMin >= midpointMin) return 'lunch';
          }
        }
      }
      return 'break';
    }

    // Duración sugerida para el próximo bloque — ver comentario de v289
    // arriba para el criterio completo (tope de 130 min en Trabajo, y
    // recorte para no sugerir pasarse del fin del turno).
    function suggestNextBlockDuration(type, newStart) {
      const dayEndVal = document.getElementById('dayEndInput')?.value;
      const dayStartMin = toMinutes(formatHHMM(document.getElementById('dayStartInput')?.value || '00:00'));
      let dayEndMin = dayEndVal ? toMinutes(formatHHMM(dayEndVal)) : null;
      if (dayEndMin !== null && dayEndMin < dayStartMin) dayEndMin += 1440;
      const nextMin = toMinutes(newStart) < dayStartMin ? toMinutes(newStart) + 1440 : toMinutes(newStart);
      const remainingMin = dayEndMin !== null ? dayEndMin - nextMin : null;
      let dur = type === 'lunch' ? 50 : type === 'break' ? 15 : 130;
      if (remainingMin !== null && remainingMin > 0) dur = Math.min(dur, remainingMin);
      return dur;
    }

    export function addBlockRow() {
      const current = readBlocksFromEditor();
      let newStart = '09:00';
      let lastEndingBlock = null;
      if (current.length) {
        let maxEnd = -Infinity;
        const anchor = toMinutes(formatHHMM(document.getElementById('dayStartInput')?.value || '00:00'));
        current.forEach(b => {
          const start = toMinutes(b.start) < anchor ? toMinutes(b.start) + 1440 : toMinutes(b.start);
          const end = start + b.dur;
          if (end > maxEnd) { maxEnd = end; lastEndingBlock = b; }
        });
        newStart = minutesToHHMM(maxEnd);
      }
      const type = suggestNextBlockType(current, lastEndingBlock, newStart);
      const dur = suggestNextBlockDuration(type, newStart);
      current.push({ type, start: newStart, dur });
      renderBlocksEditor(current);

      // Pedido del usuario: si la lista de bloques ya es larga, el bloque recién agregado (siempre al final) puede caer fuera de la vista — se desliza la pantalla hasta él. `block:
      const newRow = document.querySelector(`#blocksEditorList .block-row[data-block-row="${current.length - 1}"]`);
      if (newRow && newRow.scrollIntoView) {
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    // Eliminar una fila: se relee el estado actual del formulario (para no perder ediciones de las OTRAS filas) y se vuelve a pintar sin la fila quitada.
    export function removeBlockRowAt(idx) {
      const current = readBlocksFromEditor();
      current.splice(idx, 1);
      renderBlocksEditor(current);
    }

    // Habilita/deshabilita los campos del día (Día libre, Inicio, Fin, bloques + "+ Agregar bloque") y los botones de copiar/guardar
    function setScheduleFormDisabled(disabled) {
      ['dayOffInput', 'dayStartInput', 'dayEndInput', 'addBlockBtn', 'copyDayToAllBtn', 'copyWeekendBtn', 'saveShiftWindowBtn', 'scheduleOffsetMinusBtn', 'scheduleOffsetPlusBtn', 'scheduleOffsetApplyBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
      });
      const list = document.getElementById('blocksEditorList');
      if (list) list.querySelectorAll('input, select, button').forEach(el => { el.disabled = disabled; });
    }

    // Pedido del usuario: "Plantilla" y "Semana específica" se veían casi idénticas (mismo formulario)
    function syncScheduleModeBanner(isWeekMode, hasCustom = false) {
      const accordion = document.getElementById('scheduleConfigAccordion');
      const banner = document.getElementById('scheduleModeBanner');
      const bannerText = document.getElementById('scheduleModeBannerText');
      const bannerIcon = banner ? banner.querySelector('.sched-mode-banner-icon') : null;
      if (accordion) accordion.classList.toggle('sched-week-active', isWeekMode && hasCustom);
      if (!banner || !bannerText || !bannerIcon) return;
      if (!isWeekMode) {
        banner.className = 'sched-mode-banner tone-template';
        bannerIcon.innerHTML = iconHtml('repeat');
        bannerText.textContent = translateText('Editando tu horario de siempre — se repite cada semana.');
      } else if (!hasCustom) {
        banner.className = 'sched-mode-banner tone-template';
        bannerIcon.innerHTML = iconHtml('eye');
        bannerText.textContent = translateText('Viendo tu plantilla como referencia — activa "Personalizar esta semana" para editar solo esta semana.');
      } else {
        const weekStart = scheduleWeekStartDate(scheduleWeekOffset);
        const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
        banner.className = 'sched-mode-banner tone-week';
        bannerIcon.innerHTML = iconHtml('calendar');
        bannerText.textContent = ui`Editando SOLO ${formatWeekRangeLabel(weekStart, weekEnd)} — tu plantilla no se toca.`;
      }
    }

    function syncScheduleWeekNavUI() {
      const nav = document.getElementById('scheduleWeekNav');
      if (!nav) return;
      const isWeekMode = scheduleViewMode === 'week';
      nav.style.display = isWeekMode ? '' : 'none';
      document.querySelectorAll('#scheduleModeTabs .day-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === scheduleViewMode);
      });
      // Bug reportado por el usuario ("ninguno de los horarios que quiero hacer me funciona", en ambos modos):
      if (!isWeekMode) {
        setScheduleFormDisabled(false);
        syncScheduleModeBanner(false);
        return;
      }

      const weekStart = scheduleWeekStartDate(scheduleWeekOffset);
      const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
      const rangeLabel = document.getElementById('scheduleWeekRangeLabel');
      if (rangeLabel) {
        rangeLabel.textContent = `${scheduleWeekOffset === 0 ? translateText('Semana actual · ') : ''}${formatWeekRangeLabel(weekStart, weekEnd)}`;
      }

      const isPast = scheduleWeekIsPast(scheduleWeekOffset);
      const hasCustom = scheduleWeekHasCustom(scheduleWeekOffset);
      const customInput = document.getElementById('scheduleWeekCustomInput');
      const lockedNote = document.getElementById('scheduleWeekLockedNote');
      if (customInput) {
        customInput.checked = hasCustom;
        customInput.disabled = isPast;
      }
      if (lockedNote) lockedNote.style.display = isPast ? '' : 'none';

      // Editable solo si: no está protegida por pasada, Y ya se activó
      // "Personalizar esta semana" (si no, se está viendo la plantilla nada
      // más como referencia, de solo lectura, hasta que se active).
      setScheduleFormDisabled(isPast || !hasCustom);
      syncScheduleModeBanner(true, hasCustom);
    }

    export function syncShiftModalFields() {
      ensureWeeklySchedule();
      const target = activeScheduleTarget();
      const cfg = target[scheduleEditDay] || defaultDaySchedule(true);
      const dayOffInput = document.getElementById('dayOffInput');
      const startInput = document.getElementById('dayStartInput');
      const endInput = document.getElementById('dayEndInput');
      const lateSelect = document.getElementById('lateArrivalModeInput');
      const blocks = Array.isArray(cfg.blocks) ? cfg.blocks : [];

      if (dayOffInput) dayOffInput.checked = !!cfg.off;
      if (startInput) startInput.value = formatHHMM(cfg.start || '07:00');
      if (endInput) endInput.value = formatHHMM(cfg.end || '16:00');
      // Pedido del usuario: título de la tarjeta de cabecera del día muestra el NOMBRE COMPLETO del día activo (ver `.sched-day-card- title` en el CSS/HTML)
      const schedDayCardTitle = document.getElementById('schedDayCardTitle');
      if (schedDayCardTitle) schedDayCardTitle.textContent = WEEKDAY_LABELS[scheduleEditDay] || translateText('Lunes');
      renderBlocksEditor(blocks);
      if (lateSelect) lateSelect.value = settings.lateArrivalMode || 'anchor';
      // Pedido del usuario (v147): Adherencia vuelve a Horario (pasó por
      // Avisos en v145 y por Ajustes en v146) — global, no depende de
      // scheduleEditDay, mismo criterio que ya usaba antes de v145.
      const adherenceGraceMinInput = document.getElementById('adherenceGraceMinInput');
      if (adherenceGraceMinInput && document.activeElement !== adherenceGraceMinInput) adherenceGraceMinInput.value = settings.adherenceGraceMin;
      const adherenceGoalPctInput = document.getElementById('adherenceGoalPctInput');
      if (adherenceGoalPctInput && document.activeElement !== adherenceGoalPctInput) adherenceGoalPctInput.value = settings.adherenceGoalPct;
      renderDayTabs();
      syncScheduleWeekNavUI();
      // El ajuste de turno es por-visita, no por-día: cambiar de día (o de semana) sin haber tocado "Aplicar a todos" debe dejarlo en 0:00 para el día nuevo, no arrastrar el valor del día anterior.
      setScheduleOffsetMin(0);
      syncScheduleOffsetUI();
    }

    function readScheduleFormAsConfig() {
      const dayOffInput = document.getElementById('dayOffInput');
      const startInput = document.getElementById('dayStartInput');
      const endInput = document.getElementById('dayEndInput');
      if (!startInput || !endInput) return null;
      return {
        off: dayOffInput ? dayOffInput.checked : false,
        start: formatHHMM(startInput.value),
        end: formatHHMM(endInput.value),
        blocks: readBlocksFromEditor(),
      };
    }

    // Bug reportado por el usuario: "Guardar día"/"Copiar a todos los días" parecían no hacer nada. Causa real:
    export function scheduleFormIsDirty() {
      const cfg = readScheduleFormAsConfig();
      if (!cfg) return false;
      const stored = activeScheduleTarget()[scheduleEditDay];
      // Mismo normalizeBlockForCompare que ya usa readBlocksFromEditor (ver ahí) — necesario desde que los bloques de Trabajo llevan `goalMin` (Meta de Productividad):
      const storedBlocks = (stored && Array.isArray(stored.blocks) ? stored.blocks : [])
        .map(normalizeBlockForCompare);
      const storedNormalized = {
        off: !!(stored && stored.off),
        start: formatHHMM((stored && stored.start) || '07:00'),
        end: formatHHMM((stored && stored.end) || '16:00'),
        blocks: storedBlocks,
      };
      const lateSelect = document.getElementById('lateArrivalModeInput');
      const lateDirty = !!lateSelect && lateSelect.value !== (settings.lateArrivalMode || 'anchor');
      return lateDirty || JSON.stringify(cfg) !== JSON.stringify(storedNormalized);
    }

    // Valida que TODOS los bloques del día (Trabajo/Break/Lunch, unificados en cfg.blocks) (a) queden dentro de la ventana de turno (inicio–fin) y (b) no se crucen entre sí
    function validateDayConfig(cfg) {
      const errors = [];
      if (!cfg || cfg.off) return { valid: true, errors };

      const dayStart = toMinutes(formatHHMM(cfg.start));
      let dayEnd = toMinutes(formatHHMM(cfg.end));
      if (dayEnd === dayStart) {
        errors.push(translateText('La hora de fin debe ser después del inicio del turno.'));
        return { valid: false, errors };
      }
      if (dayEnd < dayStart) dayEnd += 1440;

      const typeLabel = { work: 'Trabajo', break: 'Break', lunch: 'Lunch' };
      const counters = { work: 0, break: 0, lunch: 0 };
      const segments = [];
      (Array.isArray(cfg.blocks) ? cfg.blocks : []).forEach((b) => {
        if (!b || !(Number(b.dur) > 0) || !b.start) return;
        const type = String(b.type || '').toLowerCase();
        if (!typeLabel[type]) return;
        counters[type] += 1;
        const clockStart = toMinutes(formatHHMM(b.start));
        const s = clockStart < dayStart ? clockStart + 1440 : clockStart;
        const label = `${typeLabel[type]} ${counters[type]}`;
        segments.push({ label, start: s, end: s + Number(b.dur) });
        // Pedido del usuario: Meta de Productividad por bloque no puede ser
        // mayor que la propia duración del bloque — no tendría sentido
        // pedir más minutos productivos de los que el bloque dura.
        if (type === 'work') {
          const goalMin = Number(b.goalMin) || 0;
          if (goalMin > Number(b.dur)) {
            errors.push(ui`${label}: la meta productiva (${formatMinutes(goalMin)} min) no puede ser mayor que la duración del bloque (${formatMinutes(Number(b.dur))} min).`);
          }
        }
      });

      segments.forEach(seg => {
        if (seg.start < dayStart || seg.end > dayEnd) {
          errors.push(ui`${seg.label} (${timeLabel(minutesToHHMM(seg.start))}–${timeLabel(minutesToHHMM(seg.end))}) queda fuera del turno (${timeLabel(cfg.start)}–${timeLabel(cfg.end)}).`);
        }
      });

      for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
          const a = segments[i], b = segments[j];
          if (a.start < b.end && b.start < a.end) {
            errors.push(ui`${a.label} y ${b.label} se cruzan.`);
          }
        }
      }

      return { valid: errors.length === 0, errors };
    }

    // Pedido del usuario : "Guardar día" debe guardar SOLO el día que se está editando
    export function saveShiftWindow() {
      if (scheduleViewMode === 'week' && scheduleWeekIsPast(scheduleWeekOffset)) return; // protegido, no debería llegar aquí (botón deshabilitado)
      const midnightOffenders = blockRowsWithEqualTimes();
      if (midnightOffenders.length) {
        toast(blockEqualTimesMessage(midnightOffenders));
        return;
      }
      const cfg = readScheduleFormAsConfig();
      if (!cfg) return;
      const check = validateDayConfig(cfg);
      if (!check.valid) {
        toast(check.errors[0]);
        return;
      }
      snapshotHistoricalPlanning();
      const target = activeScheduleTarget({ createIfMissing: true });
      target[scheduleEditDay] = cfg;
      if (scheduleViewMode === 'template') {
        const lateSelect = document.getElementById('lateArrivalModeInput');
        if (lateSelect) settings.lateArrivalMode = lateSelect.value;
        // mantiene shiftStart/shiftEnd viejos sincronizados por compatibilidad, sin usarlos ya para dibujar bloques
        settings.shiftStart = cfg.start;
        settings.shiftEnd = cfg.end;
      }
      if (saveSettingsOnly() === false) return false;
      onGameDayMetadataChanged(todayCallDateKey());
      if (saveAll() === false) return false;
      renderDayTabs();
      toast(scheduleViewMode === 'week'
        ? ui`Horario de ${WEEKDAY_LABELS[scheduleEditDay]} guardado para esa semana`
        : ui`Horario de ${WEEKDAY_LABELS[scheduleEditDay]} guardado`);
    }

    // Pedido del usuario: "Copiar a todos los días" pasa a significar SOLO Lunes-Viernes
    export function copyDayToAll() {
      if (scheduleViewMode === 'week' && scheduleWeekIsPast(scheduleWeekOffset)) return;
      const midnightOffendersAll = blockRowsWithEqualTimes();
      if (midnightOffendersAll.length) {
        toast(blockEqualTimesMessage(midnightOffendersAll));
        return;
      }
      const cfg = readScheduleFormAsConfig();
      if (!cfg) return;
      const check = validateDayConfig(cfg);
      if (!check.valid) {
        toast(check.errors[0]);
        return;
      }
      const scope = scheduleViewMode === 'week' ? translateText('de esa semana') : '';
      appConfirm(ui`¿Copiar este horario (${WEEKDAY_LABELS[scheduleEditDay]}) a Lunes-Viernes ${scope}? Esto sobreescribe Lunes a Viernes — Sábado y Domingo no se tocan.`, () => {
        snapshotHistoricalPlanning();
      const target = activeScheduleTarget({ createIfMissing: true });
        target[scheduleEditDay] = cfg;
        WEEKDAYS.filter(k => k !== 'sat' && k !== 'sun').forEach(k => {
          target[k] = {
            off: cfg.off,
            start: cfg.start,
            end: cfg.end,
            blocks: cfg.blocks.map(b => ({ ...b })),
          };
        });
        if (saveSettingsOnly() === false) return false;
        onGameDayMetadataChanged(todayCallDateKey());
        if (saveAll() === false) return false;
        renderDayTabs();
        toast(ui`Horario copiado a Lunes-Viernes ${scope}`.trim());
      });
    }

    // Pedido del usuario : botón propio "Copiar a Sábado-Domingo", mismo patrón/nivel que "Copiar a Lunes-Viernes" (copyDayToAll)
    export function copyDayToWeekend() {
      if (scheduleViewMode === 'week' && scheduleWeekIsPast(scheduleWeekOffset)) return;
      const midnightOffendersWeekend = blockRowsWithEqualTimes();
      if (midnightOffendersWeekend.length) {
        toast(blockEqualTimesMessage(midnightOffendersWeekend));
        return;
      }
      const cfg = readScheduleFormAsConfig();
      if (!cfg) return;
      const check = validateDayConfig(cfg);
      if (!check.valid) {
        toast(check.errors[0]);
        return;
      }
      const scope = scheduleViewMode === 'week' ? translateText('de esa semana') : '';
      appConfirm(ui`¿Copiar este horario (${WEEKDAY_LABELS[scheduleEditDay]}) a Sábado y Domingo ${scope}? Esto sobreescribe Sábado y Domingo — el resto de los días no se tocan.`, () => {
        snapshotHistoricalPlanning();
      const target = activeScheduleTarget({ createIfMissing: true });
        target[scheduleEditDay] = cfg;
        target.sat = { off: cfg.off, start: cfg.start, end: cfg.end, blocks: cfg.blocks.map(b => ({ ...b })) };
        target.sun = { off: cfg.off, start: cfg.start, end: cfg.end, blocks: cfg.blocks.map(b => ({ ...b })) };
        if (saveSettingsOnly() === false) return false;
        onGameDayMetadataChanged(todayCallDateKey());
        if (saveAll() === false) return false;
        renderDayTabs();
        toast(ui`Horario copiado a Sábado y Domingo ${scope}`.trim());
      });
    }
