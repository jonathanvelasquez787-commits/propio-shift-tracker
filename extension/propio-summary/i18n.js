export const settingsKey = 'propio-summary-options-v1';
export const languageOf = options => options?.language === 'es' ? 'es' : 'en';
const messages = {
  en: {
    title: 'Minutes and earnings', section: 'Propio history summary', details: 'Details', hide: 'Hide',
    language: 'Language', currency: 'Secondary currency', example: 'E.g.: L', rate: 'Rate per 1 USD', optional: 'Optional', save: 'Save', clear: 'No conversion',
    sum: 'Calculate Total', recalculate: 'Recalculate', cancel: 'Cancel', cancelling: 'Cancelling…', cancellingScan: 'Cancelling scan…',
    visible: 'Visible page', period: 'Period total', partial: 'Partial total', calls: count => `${count} call${count === 1 ? '' : 's'}`,
    progress: (count, total) => `Adding ${count}/${total} calls…`,
    explanation: 'First select Start Date and End Date in Propio and apply the filter to update your history. Then click Calculate Total: it adds all pages in that date range and returns to your original page. It adds Duration (Minutes) and Pay; ongoing calls are not included. The visible-page subtotal updates when Propio updates the history table. Click Recalculate to refresh the full period.',
    tooltip: 'Select Start Date and End Date in Propio and update your history. Then click here to add all pages in that date range and return to your original page. You can cancel.',
    cancelTooltip: 'Stops the scan and returns to your original page once the current page finishes loading.',
    pending: (minutes, pay) => `Pending or unrecognized data: ${minutes} duration(s), ${pay} payment(s). Excluded from their respective sums.`,
    saved: 'Settings saved in this browser.', failed: 'Could not save settings.', invalid: 'Enter a currency and a rate greater than zero, or choose No conversion.',
    privacy: 'Works with your existing Propio session. It does not ask for or store your username or password. Calculations stay in your browser; only your currency and language preferences are saved. Your history is not sent to other services.',
    popupIntro: 'The summary bar appears above your Propio history.',
    popupHelp: 'Select Start Date and End Date in Propio and update your history. Then click Calculate Total to include all pages in that date range. The visible-page subtotal follows history updates; click Recalculate to refresh the full period.',
    open: 'Open Propio', independent: 'Independent tool. Set your language and optional conversion in Details.',
    genericError: 'The scan could not be completed. Update your history and try again.'
  },
  es: {
    title: 'Minutos y ganancias', section: 'Resumen del historial de Propio', details: 'Detalles', hide: 'Ocultar',
    language: 'Idioma', currency: 'Moneda secundaria', example: 'Ej.: L', rate: 'Cambio por 1 USD', optional: 'Opcional', save: 'Guardar', clear: 'Sin conversión',
    sum: 'Calcular total', recalculate: 'Recalcular', cancel: 'Cancelar', cancelling: 'Cancelando…', cancellingScan: 'Cancelando el recorrido…',
    visible: 'Página visible', period: 'Total del período', partial: 'Total parcial', calls: count => `${count} llamada${count === 1 ? '' : 's'}`,
    progress: (count, total) => `Sumando ${count}/${total} llamadas…`,
    explanation: 'Primero elegí Start Date y End Date en Propio y aplicá el filtro para actualizar el historial. Después pulsá Calcular total: recorre todas las páginas de ese rango y vuelve a tu página inicial. Suma Duration (Minutes) y Pay; no incluye llamadas en curso. El subtotal visible se actualiza cuando Propio actualiza la tabla del historial. Pulsá Recalcular para actualizar el período completo.',
    tooltip: 'Elegí Start Date y End Date en Propio y actualizá el historial. Después pulsá acá para sumar todas las páginas de ese rango y volver a tu página inicial. Podés cancelar.',
    cancelTooltip: 'Detiene el recorrido y vuelve a la página inicial cuando termina de cargar la página en curso.',
    pending: (minutes, pay) => `Datos pendientes o no reconocidos: ${minutes} duración(es), ${pay} pago(s). Se excluyen de su suma.`,
    saved: 'Configuración guardada en este navegador.', failed: 'No se pudo guardar la configuración.', invalid: 'Ingresá moneda y cambio mayor que cero, o elegí Sin conversión.',
    privacy: 'Funciona con la sesión de Propio que ya tenés abierta. No pide ni guarda tu usuario o contraseña. Los cálculos se hacen en tu navegador y solo se recuerdan tus preferencias de moneda e idioma; tu historial no se envía a otros servicios.',
    popupIntro: 'La barra aparece encima del historial de Propio.',
    popupHelp: 'Elegí Start Date y End Date en Propio y actualizá el historial. Después pulsá Calcular total para incluir todas las páginas de ese rango. El subtotal visible sigue las actualizaciones del historial; pulsá Recalcular para actualizar el período completo.',
    open: 'Abrir Propio', independent: 'Herramienta independiente. El idioma y la conversión opcional se configuran en Detalles.',
    genericError: 'No se pudo completar el cálculo. Actualizá el historial y volvé a intentar.'
  }
};
export const copyFor = options => messages[languageOf(options)];
const errors = new Map([
  ['No se reconoce la paginación del historial.', 'The history pagination could not be recognized.'],
  ['El período es demasiado grande. Elegí un rango de fechas más corto.', 'The period is too large. Select a shorter date range.'],
  ['Cálculo cancelado.', 'Scan cancelled.'],
  ['El historial cambió durante el cálculo. Volvé a sumar el período.', 'The history changed during the scan. Sum the period again.'],
  ['El historial cambió durante el cálculo.', 'The history changed during the scan.'],
  ['La página todavía no muestra todas sus llamadas.', 'The page has not loaded all of its calls yet.'],
  ['La paginación no avanzó como se esperaba.', 'The pagination did not advance as expected.'],
  ['Falta una página del historial; no se mostrará un total incompleto.', 'A history page is missing; an incomplete total will not be displayed.'],
  ['No se pudieron leer todas las llamadas del período.', 'Not all calls in the period could be read.'],
  ['Se leyeron las llamadas, pero no se pudo volver a tu página inicial. Volvé a calcular.', 'Calls were read, but your original page could not be restored. Recalculate.'],
  ['Propio no permite avanzar a esa página.', 'Propio does not allow moving to that page.'],
  ['Propio no terminó de cargar una página. No se mostrará un total incompleto.', 'Propio did not finish loading a page. An incomplete total will not be displayed.']
]);
export function scanError(message, options) {
  if (!message) return '';
  return languageOf(options) === 'es' ? (errors.has(message) ? message : copyFor(options).genericError) : (errors.get(message) || copyFor(options).genericError);
}
