const SPECIES = [
  {
    id: 'lunes-perezoso',
    name: 'Lunes Perezoso',
    phrase: 'Cinco minutitos más…',
    weekdayKeys: ['mon'],
    face: 'sleepy',
  },
  {
    id: 'martillo-tuerto',
    name: 'Martillo Tuerto',
    phrase: 'Hoy sí me doy cuenta de todo',
    weekdayKeys: ['tue'],
    face: 'one-eyed',
  },
  {
    id: 'mediodia-mordedor',
    name: 'Mediodía Mordedor',
    phrase: 'Estoy a la mitad y con hambre',
    weekdayKeys: ['wed'],
    face: 'toothy',
  },
  {
    id: 'jueves-jadeante',
    name: 'Jueves Jadeante',
    phrase: 'Ya casi, ya casi…',
    weekdayKeys: ['thu'],
    face: 'breathing',
  },
  {
    id: 'viernes-furioso',
    name: 'Viernes Furioso',
    phrase: 'El viernes también cuenta',
    weekdayKeys: ['fri'],
    face: 'horned',
  },
  {
    id: 'fantasma-fin-de-semana',
    name: 'Fantasma de Fin de Semana',
    phrase: 'Si trabajas, aparezco',
    weekdayKeys: ['sat', 'sun'],
    face: 'ghost',
    weekend: true,
  },
];

const byId = Object.fromEntries(SPECIES.map((entry) => [entry.id, Object.freeze({ ...entry })]));
const weekend = byId['fantasma-fin-de-semana'];

const catalog = {
  mon: Object.freeze({ ...byId['lunes-perezoso'], weekdayKey: 'mon' }),
  tue: Object.freeze({ ...byId['martillo-tuerto'], weekdayKey: 'tue' }),
  wed: Object.freeze({ ...byId['mediodia-mordedor'], weekdayKey: 'wed' }),
  thu: Object.freeze({ ...byId['jueves-jadeante'], weekdayKey: 'thu' }),
  fri: Object.freeze({ ...byId['viernes-furioso'], weekdayKey: 'fri' }),
  sat: Object.freeze({ ...weekend, weekdayKey: 'sat' }),
  sun: Object.freeze({ ...weekend, weekdayKey: 'sun' }),
};

export const MONSTER_SPECIES = Object.freeze(byId);
export const MONSTER_CATALOG = Object.freeze(catalog);
export const MONSTERS_BY_WEEKDAY = MONSTER_CATALOG;
export const MONSTER_SPECIES_BY_WEEKDAY = MONSTER_CATALOG;

const STATE_LABELS = Object.freeze({
  sleeping: 'dormido',
  awake: 'despierto',
  angry: 'enojado',
  wounded: 'herido',
  fury: 'en furia',
  defeated: 'derrotado',
});

const VALID_STATES = new Set(Object.keys(STATE_LABELS));
const VALID_VARIANTS = new Set(['normal', 'gold', 'streak']);

const EQUIPMENT_LABELS = Object.freeze({
  'corona-del-ciclo': 'Corona del ciclo',
  'cuernos-dorados': 'Cuernos dorados',
  'bufanda-de-racha': 'Bufanda de racha',
  'alas-pixel': 'Alas pixel',
  'armadura-cian': 'Armadura cian',
  'ojo-de-rubi': 'Ojo de rubí',
});

function equipmentEntries(value) {
  const values = value && typeof value === 'object' && !Array.isArray(value)
    ? Object.values(value)
    : Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) => {
    const raw = item && typeof item === 'object' ? (item.id || item.name || item.label) : item;
    const token = safeToken(raw, '') || Object.entries(EQUIPMENT_LABELS).find(([, label]) => label.toLowerCase() === String(raw ?? '').trim().toLowerCase())?.[0] || '';
    return token && EQUIPMENT_LABELS[token] ? [{ id: token, label: EQUIPMENT_LABELS[token] }] : [];
  });
}

function safeToken(value, fallback) {
  const token = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(token) ? token : fallback;
}

function clampHp(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 100;
  return Math.round(Math.max(0, Math.min(100, numeric)) * 10) / 10;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function speciesEntry(value) {
  const raw = value && typeof value === 'object'
    ? (value.id || value.species || value.weekdayKey)
    : value;
  const token = safeToken(raw, '');
  return MONSTER_SPECIES[token] || MONSTER_CATALOG[token] || MONSTER_CATALOG.mon;
}

function weekdayEntry(weekdayKey) {
  return MONSTER_CATALOG[safeToken(weekdayKey, 'mon')] || MONSTER_CATALOG.mon;
}

export function monsterForWeekday(weekdayKey) {
  return weekdayEntry(weekdayKey);
}

export const monsterSpeciesForWeekday = monsterForWeekday;

function inferredState(value, hpPct) {
  if (VALID_STATES.has(value)) return value;
  if (hpPct <= 0) return 'defeated';
  if (hpPct <= 25) return 'wounded';
  if (hpPct <= 50) return 'angry';
  return 'awake';
}

function renderBody(entry) {
  if (entry.face === 'ghost') {
    return `
      <g class="monster-layer monster-layer--outline" fill="currentColor">
        <path class="monster-pixel monster-pixel--outline" d="M52 32h56v8h12v12h8v52h-12v-8h-8v12H92V96H80v12H64V96H52v12H36V52h8V40h8Z"/>
      </g>
      <g class="monster-layer monster-layer--body" fill="currentColor">
        <path class="monster-pixel monster-pixel--body" d="M56 40h48v8h12v8h4v36h-8v-8h-12v12h-4V84H76v12h-4V84H48v12h-4V56h4V48h8Z"/>
        <path class="monster-pixel monster-pixel--highlight" d="M56 40h48v8H56zM48 52h8v28h-8z"/>
      </g>`;
  }
  return `
    <g class="monster-layer monster-layer--outline" fill="currentColor">
      <path class="monster-pixel monster-pixel--outline" d="M40 24h12V12h16v12h24V12h16v12h12v12h12v16h8v36h-12v16h-16v8H48v-8H32V88H20V52h8V36h12Z"/>
    </g>
    <g class="monster-layer monster-layer--body" fill="currentColor">
      <path class="monster-pixel monster-pixel--body" d="M48 32h12V20h4v12h32V20h4v12h12v12h12v12h8v24h-12v16h-16v8H56v-8H40V80H28V56h8V44h12Z"/>
      <path class="monster-pixel monster-pixel--highlight" d="M48 36h64v8H48zM36 48h12v32H36z"/>
      <path class="monster-pixel monster-pixel--shade" d="M104 80h16v16h-16zM56 96h48v8H56z"/>
    </g>`;
}

function renderFace(entry, state) {
  if (state === 'defeated') {
    return `
      <g class="monster-layer monster-layer--face monster-layer--defeated" fill="currentColor" stroke="currentColor" stroke-linecap="square" stroke-width="4">
        <line class="monster-pixel monster-pixel--eye" x1="55" y1="57" x2="69" y2="71"/>
        <line class="monster-pixel monster-pixel--eye" x1="69" y1="57" x2="55" y2="71"/>
        <line class="monster-pixel monster-pixel--eye" x1="91" y1="57" x2="105" y2="71"/>
        <line class="monster-pixel monster-pixel--eye" x1="105" y1="57" x2="91" y2="71"/>
        <rect class="monster-pixel monster-pixel--mouth" x="64" y="78" width="33" height="7"/>
      </g>`;
  }

  if (state === 'sleeping') {
    return `
      <g class="monster-layer monster-layer--face monster-layer--sleeping" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="4">
        <line class="monster-pixel monster-pixel--eye" x1="53" y1="66" x2="67" y2="66"/>
        <line class="monster-pixel monster-pixel--eye" x1="93" y1="66" x2="107" y2="66"/>
        <line class="monster-pixel monster-pixel--mouth" x1="72" y1="82" x2="88" y2="82"/>
        <polyline class="monster-pixel monster-pixel--zzz" points="116,27 128,27 116,39 128,39"/>
        <polyline class="monster-pixel monster-pixel--zzz" points="124,13 134,13 124,23 134,23"/>
      </g>`;
  }

  const oneEye = entry.face === 'one-eyed';
  const eyeMarkup = oneEye
    ? '<rect class="monster-pixel monster-pixel--eye" x="76" y="59" width="10" height="14"/>'
    : `<rect class="monster-pixel monster-pixel--eye" x="54" y="59" width="12" height="14"/>
       <rect class="monster-pixel monster-pixel--eye" x="94" y="59" width="12" height="14"/>`;
  const browMarkup = state === 'angry' || state === 'wounded' || state === 'fury'
    ? `<line class="monster-pixel monster-pixel--brow" x1="51" y1="55" x2="68" y2="61"/>
       <line class="monster-pixel monster-pixel--brow" x1="92" y1="61" x2="109" y2="55"/>`
    : '';
  const mouthMarkup = entry.face === 'toothy'
    ? `<polygon class="monster-pixel monster-pixel--teeth" points="65,80 72,91 79,80 86,91 93,80"/>`
    : '<rect class="monster-pixel monster-pixel--mouth" x="69" y="81" width="22" height="7"/>';
  return `
    <g class="monster-layer monster-layer--face" fill="currentColor" stroke="currentColor" stroke-linecap="square" stroke-width="4">
      ${eyeMarkup}
      ${browMarkup}
      ${mouthMarkup}
    </g>`;
}

function renderSpeciesFeature(entry) {
  switch (entry.face) {
    case 'one-eyed':
      return `
        <g class="monster-layer monster-layer--weapon" fill="currentColor" stroke="currentColor" stroke-linecap="square" stroke-width="4">
          <rect class="monster-pixel monster-pixel--handle" x="122" y="57" width="7" height="43"/>
          <polygon class="monster-pixel monster-pixel--hammer" points="116,48 144,48 144,66 116,66"/>
        </g>`;
    case 'toothy':
      return `
        <g class="monster-layer monster-layer--accessory" fill="currentColor">
          <polygon class="monster-pixel monster-pixel--bib" points="46,92 114,92 104,113 56,113"/>
        </g>`;
    case 'breathing':
      return `
        <g class="monster-layer monster-layer--breath" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="4">
          <line class="monster-pixel monster-pixel--breath-line" x1="124" y1="74" x2="143" y2="68"/>
          <line class="monster-pixel monster-pixel--breath-line" x1="124" y1="83" x2="148" y2="83"/>
          <line class="monster-pixel monster-pixel--breath-line" x1="124" y1="92" x2="143" y2="98"/>
        </g>`;
    case 'horned':
      return `
        <g class="monster-layer monster-layer--horns" fill="currentColor">
          <polygon class="monster-pixel monster-pixel--horn" points="40,38 27,18 49,29"/>
          <polygon class="monster-pixel monster-pixel--horn" points="120,38 133,18 111,29"/>
        </g>`;
    case 'ghost':
      return `
        <g class="monster-layer monster-layer--ghost" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="4">
          <line class="monster-pixel monster-pixel--ghost-line" x1="51" y1="45" x2="61" y2="45"/>
          <line class="monster-pixel monster-pixel--ghost-line" x1="99" y1="45" x2="109" y2="45"/>
        </g>`;
    default:
      return `
        <g class="monster-layer monster-layer--accessory" fill="currentColor">
          <polygon class="monster-pixel monster-pixel--sleep-cap" points="42,34 58,17 82,30 107,17 118,34"/>
        </g>`;
  }
}

function renderStateFeature(state, variant) {
  const wounded = state === 'wounded';
  const fury = state === 'fury' || variant === 'gold';
  const defeated = state === 'defeated';
  const streak = variant === 'streak';
  return `
    ${wounded ? `
      <g class="monster-layer monster-layer--wounds" fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="3">
        <polyline class="monster-pixel monster-pixel--crack" points="42,47 52,60 45,72 56,82"/>
        <polyline class="monster-pixel monster-pixel--crack" points="112,48 103,62 112,73 101,89"/>
      </g>` : ''}
    ${fury ? `
      <g class="monster-layer monster-layer--fury" fill="currentColor" stroke="currentColor" stroke-linecap="square" stroke-width="3">
        <polygon class="monster-pixel monster-pixel--crown" points="57,27 65,12 80,24 95,12 103,27"/>
        <line class="monster-pixel monster-pixel--spark" x1="23" y1="24" x2="34" y2="13"/>
        <line class="monster-pixel monster-pixel--spark" x1="137" y1="24" x2="148" y2="13"/>
      </g>` : ''}
    ${streak ? `
      <g class="monster-layer monster-layer--streak" fill="currentColor">
        <polygon class="monster-pixel monster-pixel--star" points="80,3 86,16 100,17 89,26 93,39 80,31 67,39 71,26 60,17 74,16"/>
      </g>` : ''}
    ${defeated ? `
      <g class="monster-layer monster-layer--loot" fill="currentColor">
        <rect class="monster-pixel monster-pixel--loot-piece" x="19" y="96" width="10" height="10"/>
        <rect class="monster-pixel monster-pixel--loot-piece" x="130" y="97" width="9" height="9"/>
        <polygon class="monster-pixel monster-pixel--loot-piece" points="24,84 31,91 24,98 17,91"/>
      </g>` : ''}`;
}

function renderEquipment(value) {
  const entries = equipmentEntries(value);
  if (!entries.length) return '';
  const ids = new Set(entries.map((item) => item.id));
  return `
    <g class="monster-layer monster-layer--equipment" data-equipment="${escapeAttribute(entries.map((item) => item.id).join(' '))}" fill="currentColor" stroke="currentColor" stroke-linecap="square" stroke-width="3">
      ${ids.has('corona-del-ciclo') ? '<polygon class="monster-equipment monster-equipment--crown" points="57,30 64,13 80,25 96,13 103,30"/>' : ''}
      ${ids.has('cuernos-dorados') ? '<path class="monster-equipment monster-equipment--horns" d="M45 39 28 16l25 13m62 10 17-23-25 13" fill="none"/>' : ''}
      ${ids.has('bufanda-de-racha') ? '<path class="monster-equipment monster-equipment--scarf" d="M42 92h76l-8 13H50Z"/>' : ''}
      ${ids.has('alas-pixel') ? '<path class="monster-equipment monster-equipment--wings" d="M37 62 12 50l17 27m94-15 25-12-17 27" fill="none"/>' : ''}
      ${ids.has('armadura-cian') ? '<path class="monster-equipment monster-equipment--armor" d="M48 94h64v14H48Z" fill="none"/>' : ''}
      ${ids.has('ojo-de-rubi') ? '<rect class="monster-equipment monster-equipment--ruby" x="75" y="57" width="12" height="17"/>' : ''}
    </g>`;
}

export function monsterSvg({
  species = 'mon',
  state,
  variant = 'normal',
  hpPct = 100,
  sizeClass = 'md',
  equipment = null,
} = {}) {
  const entry = speciesEntry(species);
  const hp = clampHp(hpPct);
  const stateToken = inferredState(safeToken(state, ''), hp);
  const variantToken = VALID_VARIANTS.has(safeToken(variant, '')) ? safeToken(variant, '') : 'normal';
  const sizeToken = safeToken(sizeClass, 'md');
  const stateLabel = STATE_LABELS[stateToken];
  const equipped = equipmentEntries(equipment);
  const equipmentLabel = equipped.length ? `, equipado con ${equipped.map((item) => item.label).join(', ')}` : '';
  const ariaLabel = `${entry.name}, ${stateLabel}, ${Math.round(hp)}% de vida${equipmentLabel}`;
  const speciesToken = safeToken(entry.id, 'lunes-perezoso');

  return `<svg class="monster-svg monster-svg--${escapeAttribute(sizeToken)} monster-svg--${escapeAttribute(speciesToken)} monster-svg--${escapeAttribute(stateToken)} monster-svg--${escapeAttribute(variantToken)}" data-species="${escapeAttribute(speciesToken)}" data-state="${escapeAttribute(stateToken)}" data-variant="${escapeAttribute(variantToken)}" data-hp-pct="${escapeAttribute(hp)}" viewBox="0 0 160 128" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeAttribute(ariaLabel)}" focusable="false">
  <title>${escapeAttribute(ariaLabel)}</title>
  <g class="monster-sprite" aria-hidden="true">
    <g class="monster-layer monster-layer--shadow" fill="currentColor">
      <rect class="monster-pixel monster-pixel--shadow" x="27" y="113" width="106" height="6"/>
    </g>
    ${renderBody(entry)}
    ${renderSpeciesFeature(entry)}
    ${renderFace(entry, stateToken)}
    ${renderStateFeature(stateToken, variantToken)}
    ${renderEquipment(equipment)}
  </g>
</svg>`;
}

const PIXEL_ICONS = Object.freeze({
  sword: 'M12 1h3v3l-7 7-3-3zM2 7l7 7-2 2-3-3-2 2-2-2 2-2-2-2z',
  shield: 'M2 1h12v9h-2v2h-2v2H6v-2H4v-2H2z',
  check: 'M2 7h3v3h2V8h2V6h2V4h3v4h-2v2h-2v2H8v2H5v-2H3v-2H2z',
  star: 'M7 0h2v4h2v2h5v3h-3v2h-2v5H8v-2H6v2H3v-5H1V9H0V6h5V4h2z',
  crown: 'M1 3h3v3h2V2h4v4h2V3h3v9H1zM2 13h12v2H2z',
  cup: 'M2 4h10v1h3v6h-3v2H3v-2H2zM1 14h12v2H1zM4 0h2v3H4zM8 0h2v3H8z',
  gem: 'M4 1h8v2h2v2h2v3h-2v2h-2v2h-2v2H6v-2H4v-2H2V8H0V5h2V3h2z',
});

export function gamePixelIcon(name = 'shield') {
  const token = Object.hasOwn(PIXEL_ICONS, name) ? name : 'shield';
  return `<svg class="game-pixel-icon game-pixel-icon--${token}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path fill="currentColor" d="${PIXEL_ICONS[token]}"/></svg>`;
}

export function gamePixelChest(open = false) {
  return `<svg class="game-pixel-chest${open ? ' is-open' : ''}" viewBox="0 0 32 28" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><path fill="var(--game-pixel-ink)" d="M2 7h28v19H2z"/><path fill="currentColor" d="M4 9h24v15H4z"/><path fill="var(--game-pixel-shade)" d="M7 13h18v8H7z"/><path fill="currentColor" d="M8 10h3v13H8zM21 10h3v13h-3zM14 12h5v6h-5z"/><g class="game-pixel-chest-lid"><path fill="var(--game-pixel-ink)" d="M2 6h2V3h24v3h2v7H2z"/><path fill="currentColor" d="M4 6h2V5h20v1h2v5H4z"/><path fill="var(--game-pixel-highlight)" d="M7 6h18v2H7z"/></g></svg>`;
}
