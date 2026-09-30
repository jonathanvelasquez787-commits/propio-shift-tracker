export const PALETTES = [
  { id:'original',name:'Original',description:'Los colores actuales de la tool',colors:['#0D1230','#2FD5FF','#FFFFFF','#6366F1'] },
  { id:'neon',name:'Morado Neón',description:'Violeta, fucsia, coral y amarillo',colors:['#5003C0','#AB03A9','#FF467A','#FFD51E'],code:'5003c0ab03a9ff467affd51e',lightAccent:0,darkAccent:3,secondary:1,lightBackground:3 },
  { id:'lavender',name:'Lavanda Pastel',description:'Lavanda, celeste y menta',colors:['#9FA1FF','#B5BAFF','#AEE2FF','#D9F9DF'],code:'9fa1ffb5baffaee2ffd9f9df',lightAccent:0,darkAccent:2,secondary:1,lightBackground:3 },
  { id:'magenta',name:'Rosa Magenta',description:'Morado profundo y tonos rosados',colors:['#462C7D','#831C91','#D552A3','#FF70BF'],code:'462c7d831c91d552a3ff70bf',lightAccent:1,darkAccent:3,secondary:2,lightBackground:3 },
  { id:'sand',name:'Azul Arena',description:'Azul suave, crema y arena',colors:['#81A6C6','#AACDDC','#F3E3D0','#D2C4B4'],code:'81a6c6aacddcf3e3d0d2c4b4',lightAccent:0,darkAccent:1,secondary:3,lightBackground:2 },
  { id:'royal',name:'Azul Real',description:'Azul noche, intenso y celeste',colors:['#091540','#1B2CC1','#7692FF','#ABD2FA'],code:'0915401b2cc17692ffabd2fa',lightAccent:1,darkAccent:2,secondary:2,lightBackground:3 },
  { id:'ocean',name:'Turquesa Profundo',description:'Turquesa, azul y violeta',colors:['#78B9B5','#0F828C','#065084','#320A6B'],code:'78b9b50f828c065084320a6b',lightAccent:1,darkAccent:0,secondary:3,lightBackground:0 },
  { id:'sage',name:'Verde Salvia',description:'Verde salvia, menta y crema',colors:['#659287','#88BDA4','#B1D3B9','#E6F2DD'],code:'65928788bda4b1d3b9e6f2dd',lightAccent:0,darkAccent:1,secondary:2,lightBackground:3 }
];
const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16));
const hex = channels => '#'+channels.map(value=>Math.round(value).toString(16).padStart(2,'0')).join('');
export const mix = (color,base,weight) => hex(rgb(color).map((value,index)=>value*weight+rgb(base)[index]*(1-weight)));
const luminance = color => rgb(color).map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((total,value,index)=>total+value*[.2126,.7152,.0722][index],0);
export const contrast = (a,b) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const readable = (color,background) => {
  const destination = luminance(background)>.4?'#10121d':'#ffffff';
  for(let weight=1;weight>=0;weight-=.025) { const result=mix(color,destination,weight);if(contrast(result,background)>=4.7)return result; }
  return destination;
};
export function paletteTokens(palette,mode) {
  if(palette.id==='original')return {};
  const light=mode==='light',colors=palette.colors;
  const deep=palette.id==='ocean'?colors[3]:colors[0];
  const background=light?(palette.id==='sand'||palette.id==='sage'||palette.id==='lavender'?colors[palette.lightBackground]:mix(colors[palette.lightBackground],'#ffffff',.11)):mix(deep,'#070a12',.4);
  const darkWeight=luminance(deep)>.25?.25:.57;
  const panel=light?mix(colors[palette.lightBackground],'#ffffff',.09):mix(deep,'#10131c',darkWeight);
  const panel2=light?mix(colors[palette.lightBackground],'#ffffff',.22):mix(deep,'#202431',darkWeight);
  const raw=colors[light?palette.lightAccent:palette.darkAccent];
  const accent=readable(raw,panel),secondary=readable(colors[palette.secondary],panel);
  const text=light?mix(deep,'#11131b',.35):mix(colors[3],'#ffffff',.12);
  const muted=readable(mix(text,panel,.65),panel),line=mix(text,panel,light?.16:.22);
  const good=light?'#14794d':'#83e6ad',warn=light?'#a25c08':'#ffd17b',bad=light?'#b63149':'#ff96ad';
  const onRaw=contrast(raw,'#10121d')>=contrast(raw,'#ffffff')?'#10121d':'#ffffff';
  const tokens={
    '--bg':background,'--bg-2':background,'--bg-page':background,'--bg-card':panel,
    '--panel':panel,'--panel-navy':panel,'--panel-2':panel2,'--accordion-bg':panel,
    '--text':text,'--text-dark':text,'--muted':muted,'--text-gray':muted,'--muted-3':muted,'--text-muted-3':muted,
    '--line':line,'--line-2':mix(text,panel,.28),'--card-line':line,'--border-light':line,
    '--cyan':accent,'--primary':accent,'--primary-light':panel2,'--teal':secondary,'--blue':secondary,'--purple':secondary,'--pink':accent,
    '--good':good,'--success-green':good,'--warn':warn,'--break-orange':warn,'--bad':bad,'--danger-red':bad,'--lunch-purple':secondary,
    '--pale-cyan':accent,'--pale-teal':secondary,'--pale-indigo':secondary,'--pale-good':good,'--pale-warn':warn,'--pale-bad':bad,
    '--rpt-blue':accent,'--rpt-purple':secondary,'--accent-decorative':accent,'--pale-decorative':accent,'--accent-blue-2':accent,'--hover-flip':accent,
    '--icon-mono':text,'--btn-secondary-bg':panel2,'--surface-control':panel2,'--surface-sunken':background,'--black-badge':light?text:background,
    '--palette-primary':raw,'--palette-secondary':colors[palette.secondary],'--palette-on-primary':onRaw,
    '--palette-card-tint':mix(raw,panel,.085),'--palette-hero-tint':mix(colors[palette.secondary],panel,.15),
    '--earnings-value-color':accent,'--glow-1':'transparent','--glow-2':'transparent',
    '--shadow':light?'0 4px 18px rgba(20,25,45,.045)':'0 6px 22px rgba(0,0,0,.18)',
    '--shadow-soft':light?'0 2px 8px rgba(20,25,45,.04)':'0 3px 10px rgba(0,0,0,.1)',
    '--shadow-active':'0 0 0 2px '+mix(raw,panel,.25),
    '--game-pixel-ink':light?mix(deep,'#11131b',.55):background,
    '--game-pixel-body':colors[light?palette.lightAccent:palette.darkAccent],
    '--game-pixel-highlight':mix(raw,'#ffffff',.55),'--game-pixel-shade':mix(raw,deep,.4),
    '--game-pixel-floor':mix(raw,panel,.14),'--game-pixel-good':good,'--game-pixel-good-text':good,
    '--tier-gold':warn,'--tier-bronze':light?'#a45e24':'#ffc397','--tier-silver':muted,
    '--gradient-logo':`linear-gradient(135deg,${raw},${colors[palette.secondary]})`
  };
  const mappings={cyan:accent,teal:secondary,blue:secondary,purple:secondary,pink:accent,good,warn,bad,'danger-red':bad,'rpt-blue':accent,'rpt-purple':secondary,'accent-decorative':accent,'accent-blue-2':accent,'hover-flip':accent,'tier-gold':warn,'palette-primary':raw,'palette-secondary':colors[palette.secondary]};
  for(const [name,value] of Object.entries(mappings))tokens[`--${name}-rgb`]=rgb(value).join(',');
  for(const [name,value] of Object.entries({cyan:accent,blue:secondary,pink:accent,good,warn,bad}))tokens[`--palette-on-${name}`]=contrast(value,'#10121d')>=contrast(value,'#ffffff')?'#10121d':'#ffffff';
  for(const [name,value] of Object.entries({work:raw,break:warn,lunch:colors[palette.secondary]})) {
    tokens[`--liquid-${name}-rgb`]=rgb(value).join(',');tokens[`--rail-${name}-rgb`]=rgb(value).join(',');
  }
  return tokens;
}
