#!/usr/bin/env python3
"""
Genera resumen_v540.md a partir del resumen_v539.md.

Se hace con ediciones dirigidas y no reescribiendo el archivo a mano para que
los tres protocolos permanentes (LAYOUT, COMENTARIOS, DIAGNÓSTICO DE OVERFLOW)
y todos los PENDIENTES lleguen intactos — son justo lo que el propio archivo
manda conservar.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FUENTE = ROOT / "docs" / "resumen_v539.md"
DESTINO = ROOT / "resumen_v540.md"

# --- 1. Excepción al protocolo de LAYOUT -----------------------------------

EXCEPCION_V540 = """- v540 — EXCEPCIÓN PUNTUAL, NO PERMANENTE: para la landing, el panel de entrada
  y las páginas legales (Fase 2 del roadmap) el usuario dijo textualmente "no me
  pidas aprobaciones para nada, solo haz lo que creas que es lo mejor y luego
  cuando ya tengamos todo listo te diré si debemos de cambiar algo". Vale SOLO
  para esa tanda — el protocolo sigue igual para cualquier rediseño futuro,
  salvo que el usuario vuelva a renunciar al mockup explícitamente. Lo que se
  construyó reutiliza los tokens reales de la app (`--panel-navy`, `--cyan`,
  `--card-line`, radios, sombras) en `css/tokens.css`, así que si hay que
  ajustar algo se ajusta ahí, no se rehace.
"""

ANCLA_EXCEPCION = """- v537 — Extensión de v536: el borde izquierdo de la tarjeta de bloque usa el
  mismo color por tipo que el riel. Solo cambia qué token se aplica.
"""

# --- 2. Roadmap actualizado -------------------------------------------------

ROADMAP_NUEVO = """**ROADMAP A PRODUCCIÓN — login, nube, modularización y protección del código**
(Fases 0, 1 y 2 cerradas en v540. Este bloque se mantiene hasta que las 5 estén
cerradas; al cerrar cada fase se borra su detalle y se deja una línea.)

DECISIONES YA CONFIRMADAS POR EL USUARIO:
1. **Más usuarios** → modelo de datos, RLS y textos legales multi-tenant desde
   el día 1. Implementado.
2. **Supabase** como auth + base de datos. Implementado.
3. **Los 3 métodos de login** (Google + correo/contraseña + usuario/contraseña).
   Implementado. La fricción real (Supabase no tiene cuentas sin correo) se
   resolvió como estaba previsto: el registro pide correo + username, `profiles`
   mapea username → `auth.users.id`, y el login acepta cualquiera de los dos.
   **Cambio respecto al plan original**: esa traducción NO ocurre en el
   navegador. Resolver username → correo desde el cliente convertiría cualquier
   lista de usernames en una lista de correos, así que vive en
   `/api/login` (Vercel Function con `service_role`), que solo devuelve la
   sesión ya creada. La función SQL `email_for_login_identifier` tiene el
   `execute` revocado a `anon` y `authenticated`.
4. **Vercel Hobby por ahora.** Verificado en vercel.com/docs/limits/fair-use-guidelines
   (revisado 2026-09-19): Hobby no limita por cantidad de usuarios, limita por
   **uso comercial** — cobrar, pedir donaciones, correr publicidad o que el link
   de afiliados sea el propósito del sitio. Un producto gratis con varios
   usuarios reales sigue siendo válido mientras nadie gane dinero con él. El día
   que se cobre algo hay que pasar a Pro ANTES de activarlo, no después. Dato a
   vigilar: en Hobby, el contenido subido A TRAVÉS DE VERCEL puede usarse para
   entrenar modelos de IA. Los datos reales viven en Supabase, no en
   almacenamiento de Vercel, así que hoy no aplica — pero si algún día una
   Vercel Function procesa datos de usuario, revisar esa cláusula de nuevo.

FASE 0 — **CERRADA en v540.** `reference/propio_shift_tracker_Fixed_v539.html`
congelado + `tests/smoke.py` (Playwright/pytest) con las 6 páginas, los 16
modales, 2 zonas horarias, 2 anchos, migración de datos viejos y cero errores
de consola. Corre contra dos objetivos: el congelado y el `app.html` generado.

FASE 1 — **CERRADA en código en v540**, pendiente el trámite manual del usuario
(crear el proyecto de Supabase y pegar las llaves — todo el paso a paso está en
`SETUP.md`). Entregado: `supabase/migrations/0001_init.sql` (tablas `profiles` y
`user_data`, RLS por dueño, triggers de alta y de `updated_at`, RPC
`push_user_data` con control de concurrencia, `username_available`,
`wipe_my_data`), `js/sync.js` y `js/boot.js`.

FASE 2 — **CERRADA en v540.** `index.html` es la landing con los 3 métodos,
registro con disponibilidad de username en vivo, recuperación de contraseña,
`privacidad.html` y `terminos.html`. La app quedó en `/app` detrás de la sesión.
Pendiente menor: faltan las capturas reales de la app (claro y oscuro) en la
landing — ver PENDIENTES.

FASE 3 — Partir el archivo en un proyecto de verdad
- Herramienta: **Vite** en modo "vanilla" (sin framework). No hay que reescribir
  la app a React; solo pasar de un `<script>` gigante a módulos ES.
- Estructura propuesta:
  `index.html` (landing) · `app.html` · `src/styles/*.css` (tokens, temas,
  layout, componentes) · `src/state.js` · `src/dates.js` · `src/schedule.js` ·
  `src/adherence.js` · `src/gaps.js` · `src/higherRate.js` · `src/finance.js` ·
  `src/cycle.js` · `src/alarms.js` · `src/render/*.js` · `src/wiring.js`.
  `src/sync.js`, `src/auth.js` y `src/boot.js` ya existen y entran tal cual.
- RIESGO REAL, no menor: hoy TODO es global (`state`, `settings`, `calls` son
  `let` de módulo y ~300 funciones se llaman entre sí sin imports). Partirlo
  obliga a decidir cómo se comparte el estado mutable. Plan: `src/state.js`
  exporta UN objeto (`export const app = { state, settings, calls }`) y se
  reemplazan las referencias sueltas — mecánico pero masivo.
- **Dependencia nueva que introduce v540**: `js/boot.js` monta la app inyectando
  el contenido de `#appMainScript`, y `js/sync.js` intercepta
  `Storage.prototype.setItem`. Al pasar a módulos, las dos cosas desaparecen:
  el `boot` importa la app normalmente y el sync se engancha a las funciones de
  guardado reales. Ninguna de las dos es permanente, son andamios de esta fase.
- **Dependencia de `boot.js` sobre globales de la app**: usa `window.appConfirm`
  y `window.toast` (declaraciones de función en script clásico, que sí quedan en
  `window`). Al modularizar dejan de ser globales: hay que exportarlas.
- Orden correcto: extraer primero el CSS (bajísimo riesgo), después los módulos
  "puros" sin DOM (fechas, adherencia, huecos, ciclo, Higher Rate, finanzas), y
  al final los `render*` y el wiring. `pytest tests/smoke.py` completo entre
  cada paso — para eso se escribió.

FASE 4 — Protección del código fuente (expectativas realistas)
- La verdad primero: **cualquier JS que llegue al navegador se puede leer**. No
  existe forma de impedirlo. En orden de utilidad real:
  1. **Minificar y bundlear** (sale gratis con la Fase 3) y **no publicar
     sourcemaps**. — pendiente, depende de Fase 3.
  2. **Mover al servidor lo que de verdad valga** (Vercel Functions): el
     candidato natural es el motor de Adherencia minuto a minuto + los reportes
     agregados. Ojo: rompe el funcionamiento offline de esa parte. — pendiente.
  3. **Gate de cuenta**: sin login no hay app. — **HECHO en v540** (ver
     `#appMainScript` + `js/boot.js`).
  4. **Licencia + copyright + términos** en el repo y en la landing. —
     **HECHO en v540** (`LICENSE`, `terminos.html`, `privacidad.html`). Falta
     rellenar los marcadores `[TU NOMBRE...]`, `[TU CORREO...]`, `[TU PAÍS]`.
  5. Ofuscadores tipo `javascript-obfuscator`: cuestan tamaño y velocidad,
     complican depurar bugs reportados y solo frenan al curioso. Recomendación:
     NO usarlo al principio.
  6. Repo **privado** en GitHub. — pendiente del usuario.
- Lo que NO sirve y no se va a implementar: bloquear click derecho, deshabilitar
  F12, detectar DevTools.

FASE 5 — Opcionales, después de que lo de arriba funcione
- `calls` en tabla propia (consultas y reportes del lado del servidor).
- PWA instalable + offline real con service worker.
- Monitoreo de errores (Sentry) y backup automático diario de la base.
- Borrado de cuenta y exportación de datos. — **ADELANTADO a v540**: el borrado
  existe (`/api/delete-account` + botón en Ajustes) porque la política de
  privacidad lo promete, y la exportación JSON ya existía.
"""

# --- 3. Pendientes nuevos ---------------------------------------------------

PENDIENTES_NUEVOS = """**PENDIENTES**

- **Capturas reales en la landing.** El plan de la Fase 2 pedía screenshots de
  la app en claro y oscuro. No se pusieron: no hay forma de generarlas sin
  correr la app con datos reales. Cuando existan, van como `<img>` en
  `index.html` entre el hero y la sección de funciones. Hoy el ancla visual es
  la tarjeta de entrada, que funciona pero muestra el producto menos que una
  captura.
- **Cambiar el username no tiene pantalla.** `auth.js` ya exporta
  `updateUsername()` con su manejo de "ya está ocupado", pero nada la llama.
  Importa sobre todo para las cuentas de Google, a las que el trigger les genera
  el username desde el correo (`jonathan` → `jonathan`, y si choca, `jonathan1`).
  Sitio natural: Ajustes → "Tu perfil", junto a nombre y emoji.
- **Cambiar el correo tampoco.** Mismo lugar; Supabase lo soporta con
  `auth.updateUser({ email })` y manda confirmación a los dos correos.
- **Sin Content-Security-Policy.** `vercel.json` trae nosniff, Referrer-Policy,
  X-Frame-Options, Permissions-Policy y HSTS, pero no CSP. Motivo concreto:
  `boot.js` monta la app creando un `<script>` inline, y cualquier CSP sin
  `'unsafe-inline'` lo bloquearía. Se resuelve solo en la Fase 3, cuando la app
  sea un módulo con `src`. Ponerlo antes obliga a nonces generados por
  middleware — trabajo que se tira a la basura al modularizar.
- **`@supabase/supabase-js` pinchado a 2.45.4 desde jsDelivr.** No hay lockfile
  ni build: un `@2` flotante puede cambiar de comportamiento en cualquier
  despliegue. Para actualizar: subir el número en `js/supabase-client.js`,
  probar login + sincronización, y recién ahí desplegar.
- **El freno por IP de `/api/login` es best-effort.** Vive en memoria y las
  funciones serverless se reciclan, así que no sustituye al rate limit de
  Supabase Auth — solo abarata los picos obvios. Si algún día hace falta de
  verdad: Upstash Redis o el propio rate limiting de Vercel.
- **El blob de `user_data` no tiene tope.** Un año de llamadas son pocos MB y
  Supabase Free aguanta de sobra, pero cada subida manda el snapshot completo.
  Si `calls` llega a decenas de miles de filas, toca la Fase 5 (tabla propia).
  Señal de alarma: que la subida empiece a tardar más de 1-2 s.
- **Moneda secundaria, decisiones conscientes (NO agregar):** exportación
  CSV/PDF de contabilidad (`exportAccountingCsv`/`exportAccountingPdf`) queda
  solo en dólares, es un documento contable. Tampoco los rótulos de tarifa por
  minuto (`$0.12/min`, `Gold +$0.03`, `+$0.02/min` en "Editar llamada"): son
  tasas, no montos ganados.
"""

ANCLA_PENDIENTES_INICIO = "**PENDIENTES**\n"
ANCLA_PENDIENTES_FIN = "\n**LIMITACIONES CONOCIDAS**"

# --- 4. Entrada de v540 en ÚLTIMOS FIXES ------------------------------------

FIX_V540 = """**v540** — Fases 0, 1 y 2 del roadmap a producción: red de seguridad, cuentas
con Supabase y landing pública. La app NO se reescribió.

- **Fase 0 — red de seguridad.** `propio_shift_tracker_Fixed_v539.html` queda
  congelado en `reference/`. `app.html` ya no se edita a mano: lo genera
  `tools/build_app_html.py`, que aplica 4 cambios y después **verifica que
  revertirlos devuelva el v539 byte por byte**. El script principal se compara
  por hash: 549.806 chars, intacto. `tests/smoke.py` formaliza el QA manual
  (6 páginas, 16 modales con 12 Tab y Escape, 2 zonas horarias, 1280 y 390 px,
  migración de `settings`/`state` viejos, `scrollWidth <= innerWidth`, 0
  `pageerror`/`console.error`) y corre contra los dos objetivos.
- **Gate de sesión sin tocar la app.** El `<script>` principal pasa a
  `type="text/plain" id="appMainScript"`, así el navegador NO lo ejecuta.
  `js/boot.js` lo inyecta recién cuando hay sesión Y `localStorage` ya tiene los
  datos de esa cuenta. Resuelve de raíz el riesgo de que la app se dibuje con
  los datos de la cuenta anterior en el mismo navegador, y evita la recarga que
  exigía el plan original.
- **Fase 1 — cuentas y nube.** `supabase/migrations/0001_init.sql`: `profiles`
  (username único, case-insensitive vía columna generada) y `user_data` (3
  `jsonb` = las 3 claves de localStorage), ambas con RLS por dueño. Trigger
  `handle_new_user` crea ambas filas en el alta, para los 3 métodos: si el
  username venía elegido y está tomado, aborta el alta entera; si viene de
  Google, lo deriva del correo y lo desambigua.
- **Sincronización.** `js/sync.js` intercepta `Storage.prototype.setItem` — así
  no hay que tocar ninguna de las ~400 llamadas a `saveAll`/`saveStateOnly`/
  `saveSettingsOnly`. Debounce de 6 s, tope de 45 s, flush con `keepalive` al
  cerrar la pestaña y reintento al volver la conexión. El guardado va por
  `push_user_data`, que compara el `updated_at` que el cliente creía vigente: si
  no coincide, NO guarda y avisa — reutilizando `.storage-conflict-banner`, que
  ya existía para el conflicto entre pestañas.
- **Conflictos, nunca automáticos.** Al arrancar, `resolveBoot()` decide entre 5
  casos. Los importantes: si lo local pertenece a OTRA cuenta (mismo navegador,
  otro usuario) se descarta sin preguntar y jamás se sube; si la nube cambió y
  no hay nada local sin subir, se baja (no se pierde nada); y solo si hay dos
  versiones divergentes de verdad se le pregunta al usuario, con el resumen de
  cada una.
- **Fuga evitada en el login por username.** La traducción username → correo NO
  puede ocurrir en el navegador: convertiría una lista de usernames en una lista
  de correos. Vive en `/api/login` con `service_role`, y la función SQL tiene el
  `execute` revocado a `anon`/`authenticated`. El error de login es idéntico
  exista o no la cuenta, por el mismo motivo.
- **Fase 2 — landing.** `index.html` con los 3 métodos, disponibilidad de
  username en vivo, recuperación de contraseña y tarjeta de sesión activa.
  `privacidad.html` y `terminos.html` (Google exige la primera para aprobar su
  pantalla de consentimiento). `css/tokens.css` replica la paleta real de la app,
  claro y oscuro, y las tres páginas respetan el tema que el usuario ya eligió
  dentro de la app leyendo `settings.theme` antes de pintar.
- **Borrado de cuenta.** `/api/delete-account` + un botón inyectado en Ajustes
  desde `boot.js` (sin tocar el HTML de la app). Se adelantó de la Fase 5 porque
  la política de privacidad lo promete.
- No se tocó: ni una línea del script de la app, ni sus ids, listeners, colores
  o layout. Lo único que `boot.js` agrega a la interfaz es el panel de cuenta en
  el pie del sidebar y la tarjeta de borrado en Ajustes, ambos con clases que ya
  existían.
- Verificado: `node --check` limpio en el script principal extraído y en los 8
  módulos nuevos; `build_app_html.py` confirma que quitar los 4 cambios devuelve
  el v539 byte por byte; los 31 ids que `landing.js` y `boot.js` buscan existen
  en su HTML; los 4 selectores y las 5 globales que `boot.js` usa de la app
  están presentes; todos los enlaces internos resuelven a un archivo real;
  `vercel.json` y `package.json` parsean; lint estructural del SQL (14 `$$` en
  pares, 7 funciones, RLS + políticas en las 2 tablas, `email_for_login_identifier`
  concedida SOLO a `service_role`).
- **Sin probar todavía, y no se puede desde acá**: nada que toque Supabase de
  verdad (alta, login, OAuth de Google, subida, conflicto entre dispositivos) ni
  las Vercel Functions, porque exigen un proyecto real. La lista de verificación
  para hacerlo en 30 minutos está en `SETUP.md`, paso 5 — incluye la prueba de
  aislamiento entre cuentas, que es la que de verdad importa.

"""

ANCLA_FIXES = "**ÚLTIMOS FIXES (máx. 3, los más recientes)**\n\n"
ANCLA_V537 = "\n**v537** — Extensión de v536 pedida por el usuario"


def main() -> int:
    if not FUENTE.exists():
        print(f"Falta {FUENTE}", file=sys.stderr)
        return 1

    md = FUENTE.read_text(encoding="utf-8")
    original_len = len(md)

    # 1. Excepción al protocolo de LAYOUT
    assert ANCLA_EXCEPCION in md, "No se encontró la última excepción de LAYOUT"
    md = md.replace(ANCLA_EXCEPCION, ANCLA_EXCEPCION + EXCEPCION_V540, 1)

    # 2. Roadmap
    inicio = md.index("**ROADMAP A PRODUCCIÓN")
    fin = md.index("\n---\n\n**PENDIENTES**", inicio)
    md = md[:inicio] + ROADMAP_NUEVO + md[fin:]

    # 3. Pendientes
    inicio = md.index(ANCLA_PENDIENTES_INICIO)
    fin = md.index(ANCLA_PENDIENTES_FIN, inicio)
    md = md[:inicio] + PENDIENTES_NUEVOS + md[fin:]

    # 4. ÚLTIMOS FIXES: entra v540, sale v537 (máximo 3)
    assert ANCLA_FIXES in md
    md = md.replace(ANCLA_FIXES, ANCLA_FIXES + FIX_V540, 1)
    corte = md.index(ANCLA_V537)
    md = md[:corte].rstrip() + "\n"

    # Actualizar el título de referencia del congelado
    md = md.replace(
        "- Congelar `propio_shift_tracker_Fixed_v539.html` como referencia intocable.",
        "",
    )

    DESTINO.write_text(md, encoding="utf-8")

    fixes = md.count("\n**v5")
    print(f"resumen_v539.md : {original_len:,} chars")
    print(f"resumen_v540.md : {len(md):,} chars")
    print(f"entradas de ÚLTIMOS FIXES: {fixes} (máximo permitido: 3)")
    for proto in ["ESTILO DE LAYOUT", "PROTOCOLO DE COMENTARIOS", "PROTOCOLO DE DIAGNÓSTICO DE OVERFLOW", "PROTOCOLO DE MONEDA SECUNDARIA"]:
        print(f"  protocolo conservado: {proto} -> {'sí' if proto in md else 'NO'}")
    print(f"  LIMITACIONES CONOCIDAS conservadas: {'sí' if 'LIMITACIONES CONOCIDAS' in md else 'NO'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
