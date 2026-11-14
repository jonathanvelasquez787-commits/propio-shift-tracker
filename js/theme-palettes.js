export const PALETTES = [
  { id:'original',name:'Original',description:'Los colores actuales de la aplicación',colors:['#0D1230','#2FD5FF','#FFFFFF','#6366F1'],modes:{ light:'Original Claro',dark:'Original Oscuro' } },
  { id:'graphite',name:'Negro Grafito',description:'Cambia solo los tres negros de fondo',colors:['#09090B','#131315','#1E1E22','#A1A1AA'],lightAccent:3,darkAccent:3,secondary:3,gameBody:'#6366F1',modes:{ dark:'Negro Grafito' } },
  { id:'lavender',name:'Lavanda Pastel',description:'Lavanda, celeste y menta',colors:['#9FA1FF','#B5BAFF','#AEE2FF','#D9F9DF'],code:'9fa1ffb5baffaee2ffd9f9df',lightAccent:0,darkAccent:2,secondary:1,lightBackground:3,modes:{ light:'Lavanda Suave',dark:'Lavanda Nocturna' } },
  { id:'royal',name:'Azul Real',description:'Azul noche, intenso y celeste',colors:['#091540','#1B2CC1','#7692FF','#ABD2FA'],code:'0915401b2cc17692ffabd2fa',lightAccent:1,darkAccent:2,secondary:2,lightBackground:3,modes:{ light:'Cielo Azul',dark:'Azul Medianoche' } },
  { id:'ocean',name:'Turquesa Profundo',description:'Turquesa, azul y violeta',colors:['#78B9B5','#0F828C','#065084','#320A6B'],code:'78b9b50f828c065084320a6b',lightAccent:1,darkAccent:0,secondary:3,lightBackground:0,modes:{ light:'Brisa Turquesa',dark:'Mar Profundo' } },
  { id:'sage',name:'Verde Salvia',description:'Verde salvia, menta y crema',colors:['#659287','#88BDA4','#B1D3B9','#E6F2DD'],code:'65928788bda4b1d3b9e6f2dd',lightAccent:0,darkAccent:1,secondary:2,lightBackground:3,modes:{ light:'Salvia Fresca',dark:'Bosque de Salvia' } },
  { id:'neon',name:'Morado Neón',description:'Violeta, fucsia, coral y amarillo',colors:['#5003C0','#AB03A9','#FF467A','#FFD51E'],code:'5003c0ab03a9ff467affd51e',lightAccent:0,darkAccent:3,secondary:1,lightBackground:3,modes:{ dark:'Noche Violeta' } }
];
const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16));
const hex = channels => '#'+channels.map(value=>Math.round(value).toString(16).padStart(2,'0')).join('');
export const mix = (color,base,weight) => hex(rgb(color).map((value,index)=>value*weight+rgb(base)[index]*(1-weight)));
const luminance = color => rgb(color).map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((total,value,index)=>total+value*[.2126,.7152,.0722][index],0);
export const contrast = (a,b) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const readable = (color,backgrounds) => {
  const surfaces = Array.isArray(backgrounds) ? backgrounds : [backgrounds];
  const destination = luminance(surfaces[0])>.4?'#10121d':'#ffffff';
  for(let weight=1;weight>=0;weight-=.025) { const result=mix(color,destination,weight);if(surfaces.every(background=>contrast(result,background)>=4.7))return result; }
  return destination;
};
// Orden de los tres fondos en cada modo: [afuera/página = a medio camino entre el más claro y el intermedio (así no queda lavado), tarjeta principal = el más intenso, interior/secundario = intermedio].
const PALETTE_SURFACES = {
  neon: { dark:['#3D1E5C','#140329','#351653'] },
  lavender: { light:['#EAECFC','#DBDEFA','#E3E5FA'], dark:['#424569','#242541','#3A3D61'] },
  royal: { light:['#E4EEFD','#CEDDF7','#DDE8FB'], dark:['#202E55','#060B1E','#19264A'] },
  ocean: { light:['#E1F0EE','#C5E1DF','#D8ECE9'], dark:['#164250','#071E2B','#12394A'] },
  sage: { light:['#E3F0E4','#CDE3D3','#DCECDF'], dark:['#304A44','#162A28','#29423D'] },
  graphite: { dark:['#18181C','#09090B','#131315'] },
};
// Todas las paletas solo cambian los fondos: el resto de colores (texto, bordes, botones,
// acentos) se queda con los de Original. Estos valores solo alimentan los tokens --palette-*.
const ORIGINAL_ACCENTS = {
  dark: { accent:'#2FD5FF', secondary:'#8B7BFF', blue:'#7D8CFF', good:'#66E2A5', warn:'#FFD15C', bad:'#FF6B72' },
  light: { accent:'#6366F1', secondary:'#7C3AED', blue:'#A855F7', good:'#22C55E', warn:'#F97316', bad:'#DC2626' },
};
const SURFACE_ONLY_KEEP = /^--(bg|bg-2|bg-page|bg-card|panel|panel-navy|panel-2|accordion-bg|primary-light|btn-secondary-bg|surface-control|surface-sunken|palette-.+|game-pixel-.+|liquid-.+|rail-.+)$/;
export function paletteTokens(palette,mode) {
  if(palette.id==='original')return {};
  const light=mode==='light',colors=palette.colors;
  const deep=palette.id==='ocean'?colors[3]:colors[0];
  const [background,panel,panel2]=PALETTE_SURFACES[palette.id][mode];
  const fixed=ORIGINAL_ACCENTS[mode];
  const raw=fixed?fixed.accent:colors[light?palette.lightAccent:palette.darkAccent];
  const surfaces=[panel,panel2,background];
  const accent=fixed?fixed.accent:readable(raw,surfaces),secondary=fixed?fixed.secondary:readable(colors[palette.secondary],surfaces);
  const neutral=null;
  const text=neutral?neutral.text:light?mix(deep,'#11131b',.35):mix(colors[3],'#ffffff',.12);
  const muted=readable(mix(text,panel,.65),surfaces),line=neutral?neutral.line:mix(text,panel,light?.16:.22);
  const line2=neutral?neutral.line2:mix(text,panel,.28);
  const good=fixed?fixed.good:readable(light?'#14794d':'#83e6ad',surfaces),warn=fixed?fixed.warn:readable(light?'#a25c08':'#ffd17b',surfaces),bad=fixed?fixed.bad:readable(light?'#b63149':'#ff96ad',surfaces);
  const onRaw=contrast(raw,'#10121d')>=contrast(raw,'#ffffff')?'#10121d':'#ffffff';
  const tokens={
    '--bg':background,'--bg-2':background,'--bg-page':background,'--bg-card':panel,
    '--panel':panel,'--panel-navy':panel,'--panel-2':panel2,'--accordion-bg':panel,
    '--text':text,'--text-dark':text,'--muted':muted,'--text-gray':muted,'--muted-3':muted,'--text-muted-3':muted,
    '--line':line,'--line-2':line2,'--card-line':line,'--border-light':line,
    '--cyan':accent,'--primary':accent,'--primary-light':panel2,'--teal':secondary,'--blue':secondary,'--purple':secondary,'--pink':accent,
    '--good':good,'--success-green':good,'--warn':warn,'--break-orange':warn,'--bad':bad,'--danger-red':bad,'--lunch-purple':secondary,
    '--pale-cyan':accent,'--pale-teal':secondary,'--pale-indigo':secondary,'--pale-good':good,'--pale-warn':warn,'--pale-bad':bad,
    '--rpt-blue':accent,'--rpt-purple':secondary,'--accent-decorative':accent,'--pale-decorative':accent,'--accent-blue-2':accent,'--hover-flip':accent,
    '--icon-mono':text,'--btn-secondary-bg':panel2,'--surface-control':panel2,'--surface-sunken':background,'--black-badge':light?text:background,
    '--palette-primary':raw,'--palette-secondary':colors[palette.secondary],'--palette-on-primary':onRaw,
    '--palette-card-tint':mix(raw,panel,light?.14:.12),'--palette-hero-tint':palette.id==='graphite'?panel:mix(fixed?fixed.secondary:colors[palette.secondary],panel,.15),
    '--earnings-value-color':accent,'--glow-1':'transparent','--glow-2':'transparent',
    '--shadow':light?'0 4px 18px rgba(20,25,45,.09)':'0 6px 22px rgba(0,0,0,.18)',
    '--shadow-soft':light?'0 2px 8px rgba(20,25,45,.04)':'0 3px 10px rgba(0,0,0,.1)',
    '--shadow-active':'0 0 0 2px '+mix(raw,panel,.25),
    '--game-pixel-ink':light?mix(deep,'#11131b',.55):background,
    '--game-pixel-body':palette.gameBody||colors[light?palette.lightAccent:palette.darkAccent],
    '--game-pixel-highlight':mix(raw,'#ffffff',.55),'--game-pixel-shade':mix(raw,deep,.4),
    '--game-pixel-floor':mix(raw,panel,.14),'--game-pixel-good':good,'--game-pixel-good-text':good,
    '--tier-gold':warn,'--tier-bronze':light?'#a45e24':'#ffc397','--tier-silver':muted,
    '--gradient-logo':`linear-gradient(135deg,${raw},${colors[palette.secondary]})`
  };
  const mappings={cyan:accent,teal:secondary,blue:secondary,purple:secondary,pink:accent,good,warn,bad,'danger-red':bad,'rpt-blue':accent,'rpt-purple':secondary,'accent-decorative':accent,'accent-blue-2':accent,'hover-flip':accent,'tier-gold':warn,'palette-primary':raw,'palette-secondary':colors[palette.secondary]};
  for(const [name,value] of Object.entries(mappings))tokens[`--${name}-rgb`]=rgb(value).join(',');
  for(const [name,value] of Object.entries({cyan:accent,blue:fixed?fixed.blue:secondary,pink:accent,good,warn,bad}))tokens[`--palette-on-${name}`]=contrast(value,'#10121d')>=contrast(value,'#ffffff')?'#10121d':'#ffffff';
  for(const [name,value] of Object.entries({work:raw,break:warn,lunch:colors[palette.secondary]})) {
    tokens[`--liquid-${name}-rgb`]=rgb(value).join(',');tokens[`--rail-${name}-rgb`]=rgb(value).join(',');
  }
  if(fixed)for(const name of Object.keys(tokens))if(!SURFACE_ONLY_KEEP.test(name))delete tokens[name];
  return tokens;
}

// Un solo tema = una paleta con su modo (claro u oscuro). Estas son las tarjetas del selector.
export const PALETTE_CHOICES = PALETTES.flatMap(palette => Object.entries(palette.modes).map(([mode,name]) => ({
  key:`${palette.id}:${mode}`, paletteId:palette.id, mode, name, description:palette.description,
  colors: palette.id==='original'
    ? (mode==='light' ? ['#FFFFFF','#6366F1','#7C3AED','#A855F7'] : ['#0D1230','#2FD5FF','#8B7BFF','#7D8CFF'])
    : [...PALETTE_SURFACES[palette.id][mode],ORIGINAL_ACCENTS[mode].accent],
})));
// Si el tema guardado ya no existe (paleta quitada o modo que esa paleta no tiene), se usa Original.
export function resolvePalette(id,mode) {
  const palette = PALETTES.find(item => item.id === id);
  return palette && Object.hasOwn(palette.modes,mode) ? palette : PALETTES[0];
}
export const choiceName = (palette,mode) => palette.modes[mode];
