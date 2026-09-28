# Propio Shift Tracker

Registro personal de turnos, pausas, llamadas y ganancias, con adherencia
minuto a minuto, Higher Rate, finanzas, calendario de productividad y la
gamificación opcional «El Monstruo».

Esta versión es el salto de "un archivo HTML en localStorage" a
"producto con cuentas y respaldo en la nube".

---

## Qué hay aquí

```
index.html            Landing pública + los 3 métodos de entrada
app.html               Marcado y estilos fuente de la app
privacidad.html        Política de privacidad
terminos.html          Términos de uso

css/
  tokens.css            Paleta y tipografía, claro y oscuro
  landing.css           Landing y panel de entrada
  legal.css             Páginas legales
  app-shell.css         Gate de arranque y panel de cuenta dentro de la app

js/
  theme-init.js         Tema inicial antes de pintar, sin scripts inline
  footer-year.js        Año del pie de las páginas públicas
  config.js             URL y anon key de Supabase  ← se edita a mano
  supabase-client.js     Cliente único y compartido
  auth.js                Google · correo/contraseña · usuario/contraseña
  landing.js              Pestañas, registro, recuperación, sesión activa
  sync.js                 localStorage ↔ Supabase, con control de conflictos
  boot.js                 Gate de sesión, hidratación y montaje de la app
  monitoring.js           Captura errores sin enviar datos a terceros
  game.js                 XP, racha, misiones, cofres y jefes de ciclo
  monsters.js             Bestiario SVG determinista, sin dependencias
  service-worker.js       PWA y caché offline del shell

css/
  game.css                Arena, Logros y estados responsive claro/oscuro

api/
  login.js               Traduce usuario → correo del lado del servidor
  telemetry.js           Recibe errores saneados y limitados por IP
  delete-account.js      Borra la cuenta entera (necesita service_role)

supabase/migrations/
  0001_init.sql          Tablas, RLS, triggers y funciones. Se corre una vez.
  0003_phase_5.sql       Llamadas, límites, telemetría y backup diario

scripts/build.mjs         Bundle Rollup + minificación Terser, sin sourcemaps
tests/security-preparation.test.mjs  Pruebas de seguridad, PWA y datos
tests/game-phase6.test.mjs           Contratos y límites de la Fase 6
```

---

## Cómo se edita `app.html`

`app.html` sigue siendo la fuente de verdad del marcado y los estilos. Los
módulos de `js/` son la fuente de verdad de la lógica. Vercel ejecuta
`scripts/build.mjs`: Rollup empaqueta el cliente de Supabase y la app, y Terser
minifica el resultado sin sourcemaps. Solo `public/` se publica; los módulos
fuente no quedan expuestos como archivos navegables.

Flujo de trabajo:

1. Se comparte el contenido actual de `app.html` (pegado como texto o como
   documento) en la conversación con Claude.
2. Claude edita directamente ese contenido con sus propias herramientas de
   archivo — nunca se le pide a la persona que edite código a mano.
3. Claude entrega el archivo completo y editado, listo para reemplazar en
   GitHub (arrastrar el archivo nuevo encima del viejo en la interfaz web de
   GitHub y confirmar el cambio).

`tools/build_app_html.py` queda solo como aviso de que este flujo ya no se
usa; puede borrarse del repo sin ningún efecto.

### Por qué el script principal no se autoejecuta al abrir `/app`

La app lee `localStorage` y se dibuja entera en cuanto se ejecuta. Si la
descarga desde la nube llegara después, habría que recargar la página — o
peor, alguien podría ver por un instante los datos de la cuenta anterior en
el mismo navegador.

`js/boot.js` importa `js/app-main.js` recién cuando hay sesión y
`localStorage` ya contiene los datos de esa cuenta. Las precargas de módulos
no ejecutan la aplicación. `js/theme-init.js` aplica el tema antes de pintar,
sin esperar al cliente de autenticación.

### Por qué existe `/api/login`

Entrar con nombre de usuario exige traducir el username a su correo. Si esa
traducción ocurriera en el navegador, cualquiera con la anon key podría
convertir una lista de usernames en una lista de correos. La función de
servidor hace la traducción con la `service_role`, y al navegador solo le
devuelve la sesión.

Por eso también el error de login es **siempre el mismo**, exista o no la
cuenta: responder distinto sería el mismo problema por otra puerta.

### Cómo se guardan los datos

`user_data` guarda `state` y `settings`; cada llamada vive en `calls` con RLS.
El navegador conserva las tres claves de `localStorage` para trabajar offline,
pero la sincronización calcula deltas y solo sube llamadas nuevas, modificadas
o eliminadas. Estado, ajustes, lotes y filas tienen topes de tamaño.

### Por qué nunca hay merge automático

Dos dispositivos con versiones divergentes son dos verdades distintas sobre el
mismo día de trabajo. Mezclarlas automáticamente inventaría un día que no
existió. El usuario elige cuál se queda, y el guardado usa control de
concurrencia (`push_user_data` compara el `updated_at` que el cliente creía
vigente) para que nadie pise a nadie en silencio a mitad de sesión.

---

## Trabajar sobre esto

```bash
# Comprobaciones automáticas (las ejecuta el agente)
npm test
npm run check:modules
npm run build
```

Para probar en local hace falta un servidor HTTP de verdad: los módulos ES no
cargan desde `file://`.

```bash
python3 -m http.server 3000 --directory public
# luego: http://localhost:3000 (después de npm run build)
```

Las funciones de `api/` **no** corren con `http.server`. Para probarlas en
local: `npx vercel dev`.

---

## Licencia

Software propietario. Ver [LICENSE](LICENSE).

## Política de seguridad

CSP está activa. Alcance, orígenes permitidos y validación realizada:
[política de seguridad](docs/security-policy.md).
