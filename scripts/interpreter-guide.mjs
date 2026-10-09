import { SITE_ORIGIN, INTERPRETER_GUIDE_PATHS } from '../js/landing-meta.js';

const content = {
  es: {
    title: 'Propio Shift Tracker | Guía para intérpretes remotos',
    description: 'Aprende a registrar turnos, llamadas y pausas, calcular ganancias por minuto y revisar tus reportes con Propio Shift Tracker.',
    home: '/es', alternate: 'en', language: 'Read in English', theme: 'Cambiar a modo oscuro',
    kicker: 'GUÍA PARA INTÉRPRETES REMOTOS',
    heading: 'Tus turnos, llamadas y ganancias, paso a paso',
    intro: 'Al terminar una jornada de interpretación, conviene poder responder tres preguntas: cuánto tiempo trabajaste, cuántos minutos fueron facturables y qué importe esperas recibir. Esta guía explica cómo llevar ese registro con Propio Shift Tracker y cómo revisar las diferencias antes de cerrar tu día.',
    updated: 'Publicado el 9 de octubre de 2026', toc: 'En esta guía', start: 'Abrir Propio Shift Tracker',
    sections: [
      ['preparar', '1. Prepara tu horario y tu tarifa', `<p>Antes del primer turno, abre <strong>Horario</strong> y configura la hora de inicio, la hora de fin y los bloques de Trabajo, Break y Lunch. Usa la plantilla para tu horario habitual y una semana específica cuando solo esa semana tenga un plan distinto.</p><p>En <strong>Ajustes</strong>, revisa la tarifa por minuto y la moneda secundaria. El tipo de cambio es el que tú configuras; no debe confundirse con una cotización actualizada automáticamente. Si tienes tarifas especiales, revisa también <strong>Higher Rate</strong>.</p><p>Define una meta diaria que te ayude a comparar el avance de tus ganancias. El horario, la tarifa y la meta representan cosas diferentes: cambiar una meta no añade llamadas ni dinero a tu registro.</p>`],
      ['llamadas', '2. Registra el turno y las llamadas', `<p>Usa <strong>Iniciar shift</strong> cuando te conectes. Para una llamada que vas a registrar en vivo, pulsa <strong>Iniciar llamada</strong> y termínala cuando finalice. Revisa la fila guardada si necesitas corregir algún dato.</p><p>Para una llamada pasada, usa <strong>Agregar llamada</strong> y comprueba fecha, hora, duración, importe y estado facturable. Para traer registros de la plataforma, usa <strong>Pegar Llamadas</strong> con tu exportación y revisa el resumen y las advertencias del pegado.</p><p>Si una llamada ya existe, corrige ese registro o importa su versión oficial. Evita crear otra fila manual solo para ajustar el importe: podrías intentar contar dos veces la misma actividad. Una importación puede omitir filas duplicadas, futuras o con solapamientos que no puede reconciliar de forma segura.</p>`],
      ['pausas', '3. Separa Break, Lunch y tiempo en llamada', `<p>Inicia y termina cada pausa desde su control correspondiente. Registrar la pausa cuando ocurre ayuda a comparar tu actividad con los bloques planeados y a entender los huecos entre llamadas.</p><p>Tiempo conectado y minutos facturables no son equivalentes. Una jornada de varias horas puede incluir llamadas, pausas y tiempo disponible entre llamadas; cada uno tiene una función distinta en el reporte.</p><p>Si una llamada interrumpe una pausa o registraste algo por accidente, revisa los intervalos y corrige el evento correspondiente. No ajustes la duración de una llamada para compensar una pausa mal registrada.</p>`],
      ['ganancias', '4. Comprueba las ganancias por minuto', `<p>En una llamada con tarifa uniforme, el cálculo básico es <strong>minutos facturables × tarifa por minuto</strong>. El importe guardado y las condiciones de Higher Rate también pueden influir en el resultado del tracker.</p><div class="guide-example"><h3>Un ejemplo sencillo</h3><p>60 minutos facturables a USD 0,12 por minuto dan <strong>USD 7,20</strong>. Con un tipo de cambio de ejemplo de L 26 por dólar, serían aproximadamente <strong>L 187,20</strong>.</p><p>La tarifa y el cambio de este ejemplo son ilustrativos. No representan una tarifa ofrecida por Propio ni un cambio vigente. Las horas conectado no se multiplican por la tarifa por minuto si ese tiempo no fue facturable.</p></div><p>Compara <strong>Hoy</strong> y <strong>Ciclo</strong> para distinguir el resultado de una jornada del acumulado del período. Si una llamada cambia de duración, importe o estado, vuelve a revisar los totales y las asignaciones de <strong>Finanzas</strong>.</p>`],
      ['adherencia', '5. Lee productividad y adherencia por separado', `<p>La productividad te ayuda a ver el tiempo en llamada frente al tiempo de trabajo. La adherencia compara tu actividad real con el horario planeado y sus reglas de gracia. Puedes tener llamadas válidas y, a la vez, una diferencia respecto a una hora de entrada o una pausa.</p><p>Revisa <strong>Bloques del día</strong> cuando el porcentaje te sorprenda. Comprueba el plan de esa fecha, tus horas reales y las pausas antes de cambiar el horario. Cambiar el plan para ocultar una diferencia no explica lo que ocurrió.</p><p>En un turno que cruza medianoche, una llamada puede tener una fecha calendario diferente del día del turno. Revisa el día activo y la pertenencia del registro antes de moverlo a otra jornada.</p>`],
      ['cerrar', '6. Revisa, cierra y conserva tus reportes', `<p>Antes de finalizar el shift, comprueba que no queden una llamada o una pausa activas, que los importes sean razonables y que el día seleccionado sea el correcto. Si llegaron datos oficiales después del turno, puedes importarlos y volver a revisar la jornada.</p><p>Usa <strong>Reportes</strong> y <strong>Calendario</strong> para comparar días y períodos. Exporta CSV o PDF cuando necesites consultar o compartir un reporte; conserva también una copia JSON para respaldo. Exportar un archivo no sustituye comprobar que tus datos se hayan sincronizado.</p><p>Si trabajas desde otro dispositivo, abre tu cuenta y comprueba que los últimos registros estén presentes. Ante un conflicto entre copias, revisa las fechas y el contenido antes de elegir cuál conservar.</p>`],
      ['dudas', 'Dudas habituales', `<h3>¿El tracker determina lo que me pagarán?</h3><p>Es un registro personal y una herramienta de cálculo. Revisa siempre los registros oficiales y las condiciones de tu plataforma o empleador para conocer el pago definitivo.</p><h3>¿Por qué cambia el total después de importar?</h3><p>Una versión oficial puede corregir el importe o la duración de una llamada provisional. Revisa las filas modificadas y las advertencias; no añadas otra llamada solo para recuperar el total anterior.</p><h3>¿Necesito la extensión para empezar?</h3><p>Puedes comenzar con el registro en vivo, las llamadas manuales y el pegado de exportaciones dentro del tracker. La extensión es un complemento; utiliza únicamente la que hayas instalado y conectado a tu cuenta.</p>`],
    ],
    closing: 'Empieza con una jornada y revisa tus registros al cerrarla. Un historial consistente es más útil que un porcentaje perfecto.',
    independent: 'Propio Shift Tracker es una herramienta independiente. No está afiliada oficialmente a Propio Language Services ni sustituye sus registros.',
    privacy: 'Privacidad', terms: 'Términos', back: 'Volver a la portada',
  },
  en: {
    title: 'Propio Shift Tracker | Remote Interpreter Guide',
    description: 'Learn to track interpreter shifts, calls and breaks, calculate per-minute earnings and review reports with Propio Shift Tracker.',
    home: '/', alternate: 'es', language: 'Leer en español', theme: 'Switch to dark mode',
    kicker: 'REMOTE INTERPRETER GUIDE', heading: 'Your shifts, calls and earnings, step by step',
    intro: 'At the end of an interpreting shift, you should be able to answer three questions: how long you worked, how many minutes were billable and what earnings you expect. This guide explains how to keep that record with Propio Shift Tracker and review differences before closing your day.',
    updated: 'Published October 9, 2026', toc: 'In this guide', start: 'Open Propio Shift Tracker',
    sections: [
      ['preparar', '1. Set your schedule and rate', `<p>Before your first shift, open <strong>Schedule</strong> and set your start time, end time and Work, Break and Lunch blocks. Use the template for your regular schedule and a specific week when only that week has a different plan.</p><p>In <strong>Settings</strong>, check your per-minute rate and secondary currency. The exchange rate is the value you configure; it is not an automatically updated market rate. If you have special rates, review <strong>Higher Rate</strong> as well.</p><p>Set a daily earnings goal to compare your progress. Your schedule, rate and goal serve different purposes: changing a goal does not add calls or money to your record.</p>`],
      ['llamadas', '2. Record your shift and calls', `<p>Use <strong>Start shift</strong> when you connect. To record a live call, choose <strong>Start call</strong> and end it when the call finishes. Review the saved row if you need to correct a detail.</p><p>For a past call, use <strong>Add call</strong> and check its date, start time, duration, earnings and billable status. To bring records from the platform, use <strong>Paste Calls</strong> with your export and review the import summary and warnings.</p><p>If a call already exists, correct that record or import its official version. Avoid adding another manual row just to adjust earnings: you could try to count the same activity twice. An import can skip duplicate or future rows and overlaps it cannot safely reconcile.</p>`],
      ['pausas', '3. Separate breaks, lunch and call time', `<p>Start and end each pause with its corresponding control. Recording pauses as they happen helps compare actual activity with planned blocks and explain gaps between calls.</p><p>Connected time and billable minutes are different. A shift lasting several hours can include calls, pauses and available time between calls; each serves a different purpose in the report.</p><p>If a call interrupts a pause or you recorded something accidentally, review the intervals and correct the relevant event. Do not change a call duration to compensate for an incorrectly recorded pause.</p>`],
      ['ganancias', '4. Check per-minute earnings', `<p>For a call with one uniform rate, the basic calculation is <strong>billable minutes × per-minute rate</strong>. The saved earnings amount and Higher Rate conditions can also affect the tracker total.</p><div class="guide-example"><h3>A simple example</h3><p>60 billable minutes at USD 0.12 per minute produce <strong>USD 7.20</strong>. At an example exchange rate of L 26 per dollar, that is approximately <strong>L 187.20</strong>.</p><p>The rate and exchange value are illustrative. They are not an offered Propio rate or a current exchange quotation. Connected hours are not multiplied by the per-minute rate when that time was not billable.</p></div><p>Compare <strong>Today</strong> and <strong>Cycle</strong> to distinguish one day's result from the period total. After changing a call's duration, earnings or status, review your totals and <strong>Finance</strong> allocations again.</p>`],
      ['adherencia', '5. Read productivity and adherence separately', `<p>Productivity helps you compare call time with work time. Adherence compares actual activity with the planned schedule and its grace rules. You can have valid calls and still differ from a planned start or break time.</p><p>Review <strong>Day blocks</strong> when a percentage surprises you. Check that date's plan, actual times and pauses before changing the schedule. Editing the plan to hide a difference does not explain what happened.</p><p>For a shift crossing midnight, a call can have a calendar date different from its shift day. Check the active day and the record's assignment before moving it to another day.</p>`],
      ['cerrar', '6. Review, close and keep your reports', `<p>Before ending your shift, check that no call or pause is still active, that earnings look reasonable and that the selected day is correct. If official records arrive after your shift, import them and review the day again.</p><p>Use <strong>Reports</strong> and <strong>Calendar</strong> to compare days and periods. Export CSV or PDF when you need to review or share a report, and keep a JSON copy for backup. Exporting a file does not replace checking that your records have synced.</p><p>On another device, open your account and check that the latest records are present. If two copies conflict, review their dates and contents before choosing which to keep.</p>`],
      ['dudas', 'Common questions', `<h3>Does the tracker determine my final payment?</h3><p>It is a personal record and calculation tool. Always check official records and your platform's or employer's conditions for the final payment.</p><h3>Why did my total change after importing?</h3><p>An official version can correct a provisional call's earnings or duration. Review changed rows and warnings; do not add another call just to restore the previous total.</p><h3>Do I need the extension to start?</h3><p>You can start with live recording, manual calls and pasted exports inside the tracker. The extension is an optional companion; use only the one you have installed and connected to your account.</p>`],
    ],
    closing: 'Start with one day and review your records when it ends. A consistent history is more useful than a perfect percentage.',
    independent: 'Propio Shift Tracker is an independent tool. It is not officially affiliated with Propio Language Services and does not replace its records.',
    privacy: 'Privacy', terms: 'Terms', back: 'Back to the homepage',
  },
};

const escape = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

export function createInterpreterGuide(language, release = 'local') {
  if (!content[language]) throw new Error('Unsupported guide language');
  const c = content[language], url = SITE_ORIGIN + INTERPRETER_GUIDE_PATHS[language];
  const schema = {
    '@context':'https://schema.org', '@type':'Article', '@id':url+'#article', url,
    headline:c.heading, description:c.description, inLanguage:language,
    mainEntityOfPage:url, datePublished:'2026-10-09', dateModified:'2026-10-09',
    author:{'@type':'Organization',name:'Propio Shift Tracker',url:SITE_ORIGIN+'/'},
    publisher:{'@type':'Organization',name:'Propio Shift Tracker',url:SITE_ORIGIN+'/'},
    image:SITE_ORIGIN+'/icons/social-preview.png', isAccessibleForFree:true,
  };
  return `<!DOCTYPE html>
<html lang="${language}" data-public-guide>
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(c.title)}</title><meta name="description" content="${escape(c.description)}">
<link rel="canonical" href="${url}">
${['en','es','x-default'].map(lang=>`<link rel="alternate" hreflang="${lang}" href="${SITE_ORIGIN+INTERPRETER_GUIDE_PATHS[lang==='x-default'?'en':lang]}">`).join('\n')}
<meta property="og:type" content="article"><meta property="og:site_name" content="Propio Shift Tracker">
<meta property="og:title" content="${escape(c.title)}"><meta property="og:description" content="${escape(c.description)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE_ORIGIN}/icons/social-preview.png"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/icons/app-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/tokens.css"><link rel="stylesheet" href="/css/landing.css"><link rel="stylesheet" href="/css/guide.css">
<script src="/assets/theme-init.js?v=${escape(release)}"></script>
<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<','\\u003c')}</script>
</head>
<body class="guide-page">
<header class="site-header"><div class="wrap header-inner">
<a class="brand" href="${c.home}">Propio Shift Tracker</a>
<nav class="header-nav" aria-label="${language==='es'?'Navegación':'Navigation'}">
<a class="guide-language" href="${INTERPRETER_GUIDE_PATHS[c.alternate]}" hreflang="${c.alternate}">${c.language}</a>
<button class="theme-toggle" type="button" data-guide-theme aria-pressed="false" aria-label="${c.theme}">◐</button>
</nav></div></header>
<main class="wrap guide-main">
<article>
<header class="guide-intro"><p class="eyebrow">${c.kicker}</p><h1>${c.heading}</h1><p class="guide-lead">${c.intro}</p><p class="guide-meta"><time datetime="2026-10-09">${c.updated}</time> · Propio Shift Tracker</p></header>
<nav class="guide-toc" aria-label="${c.toc}"><h2>${c.toc}</h2><ol>${c.sections.map(([id,title])=>`<li><a href="#${id}">${title.replace(/^\d+\. /,'')}</a></li>`).join('')}</ol></nav>
<div class="guide-prose">${c.sections.map(([id,title,body])=>`<section id="${id}"><h2>${title}</h2>${body}</section>`).join('\n')}
<section class="guide-close"><h2>${c.start}</h2><p>${c.closing}</p><a class="header-cta" href="${c.home}#entrar">${c.start}</a></section></div>
</article></main>
<footer class="site-footer"><div class="wrap"><p class="guide-independent">${c.independent}</p><nav class="footer-links"><a href="${c.home}">${c.back}</a><a href="/privacidad.html">${c.privacy}</a><a href="/terminos.html">${c.terms}</a></nav></div></footer>
<script src="/assets/guide-theme.js?v=${escape(release)}" defer></script>
</body></html>`;
}
