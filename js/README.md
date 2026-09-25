# Propio Shift Tracker

Registro personal de turnos, pausas, llamadas y ganancias, con adherencia
minuto a minuto, Higher Rate, finanzas y calendario de productividad.

Esta versión es el salto de "un archivo HTML en localStorage" a
"producto con cuentas y respaldo en la nube".

---

## Qué hay aquí

```
index.html            Landing pública + los 3 métodos de entrada
app.html               La app completa — marcado y estilos, se edita directamente, sin build
privacidad.html        Política de privacidad
terminos.html          Términos de uso

css/
  tokens.css            Paleta y tipografía, claro y oscuro
  landing.css           Landing y panel de entrada
  legal.css             Páginas legales
  app-shell.css         Gate de arranque y panel de cuenta dentro de la app

js/
  config.js             URL y anon key de Supabase  ← se edita a mano
  supabase-client.js     Cliente único y compartido
  auth.js                Google · correo/contraseña · usuario/contraseña
  landing.js              Pestañas, registro, recuperación, sesión activa
  sync.js                 localStorage ↔ Supabase, con control de conflictos
  boot.js                 Gate de sesión, hidratación y montaje de la app
  app-main.js              Cuerpo principal de la app (Inicio, Horario, Llamadas...)
  finance.js               Página Finanzas (Gastos, Metas, categorías propias)
  reports.js                Página Reportes (KPIs, gráfico mensual, racha...)
  calendar.js               Página Calendario (vista mensual y anual)

api/
  login.js               Traduce usuario → correo del lado del servidor
  delete-account.js      Borra la cuenta entera (necesita service_role)

supabase/migrations/
  0001_init.sql          Tablas, RLS, triggers y funciones. Se corre una vez.

tests/smoke.py            Suite de humo con Playwright, sobre app.html directo
```

---

## Cómo se edita `app.html`

`app.html` es el marcado y los estilos de la app — es la fuente de verdad de
esa parte. No hay un archivo de referencia aparte ni un script que lo genere
— eso se retiró a propósito, porque exigía verificación byte por byte y
correr un script en terminal, algo que no hace falta para mantener este
proyecto.

Flujo de trabajo:

1. Se comparte el contenido actual de `app.html` (o del archivo `js/*.js`
   correspondiente) pegado como texto o como documento en la conversación
   con Claude.
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

Por eso `js/boot.js` importa `js/app-main.js` con un `import()` dinámico
recién cuando (1) hay sesión y (2) `localStorage` ya tiene los datos de
**esa** cuenta. Es el gate de sesión completo.

### Por qué existe `/api/login`

Entrar con nombre de usuario exige traducir el username a su correo. Si esa
traducción ocurriera en el navegador, cualquiera con la anon key podría
convertir una lista de usernames en una lista de correos. La función de
servidor hace la traducción con la `service_role`, y al navegador solo le
devuelve la sesión.

Por eso también el error de login es **siempre el mismo**, exista o no la
cuenta: responder distinto sería el mismo problema por otra puerta.

### Por qué el blob y no tablas por entidad

`user_data` guarda `state`, `calls` y `settings` como tres `jsonb`: el
equivalente exacto de las tres claves de `localStorage`. Un año de llamadas
son unos pocos MB.

### Por qué nunca hay merge automático

Dos dispositivos con versiones divergentes son dos verdades distintas sobre el
mismo día de trabajo. Mezclarlas automáticamente inventaría un día que no
existió. El usuario elige cuál se queda, y el guardado usa control de
concurrencia (`push_user_data` compara el `updated_at` que el cliente creía
vigente) para que nadie pise a nadie en silencio a mitad de sesión.

---

## Los módulos de `js/` dependen unos de otros — cómo no romper la cadena

Desde la Fase 3/4, la lógica de la app dejó de vivir toda en un solo
`<script>` dentro de `app.html` y se repartió en **4 archivos que se
importan entre sí como módulos ES**:

```
app-main.js  ──imports──▶  finance.js
app-main.js  ──imports──▶  reports.js
app-main.js  ──imports──▶  calendar.js
reports.js   ──imports──▶  app-main.js   (sí, en las dos direcciones)
calendar.js  ──imports──▶  app-main.js
finance.js   ──imports──▶  app-main.js
```

Cada `import { nombre } from './otroArchivo.js'` en un archivo **tiene que
tener su `export` exacto** (mismo nombre, misma mayúscula/minúscula) del
otro lado. Si uno de los dos lados cambia — se borra un `export`, se le
cambia el nombre a una función, se olvida reexportarla — el navegador no
puede terminar de cargar ESE archivo. Y como los 4 están enlazados entre sí,
**la app entera se queda muda**: pantalla estática, botones sin reacción,
reloj parado, sin ningún error visible. Eso fue justo lo que pasó una vez
(un `export export function` duplicado en `calendar.js`, y después un
`import` en `reports.js` de algo que `app-main.js` nunca reexportaba).

### Por qué antes no se veía ningún error

Además del problema de imports en sí, `js/boot.js` tenía un segundo bug que
lo empeoraba: quitaba la pantalla de carga (`#bootGate`) **antes** de
intentar montar la app, así que si el montaje fallaba, el mensaje de error
se escribía dentro de un elemento que ya no estaba en la página — invisible,
y como el error quedaba atrapado en un `catch`, tampoco llegaba a la consola
del navegador. Esto ya está corregido: ahora el mensaje de error siempre se
ve en pantalla y además se manda a `console.error`. Si en el futuro algo
similar vuelve a romperse, ya no vas a ver una app "muda" — vas a ver una
tarjeta que dice "No se pudo abrir la app" con el motivo.

### Checklist antes de subir un cambio a `app-main.js`, `finance.js`, `reports.js` o `calendar.js`

Si le pides a Claude un cambio en cualquiera de estos 4 archivos, pídele
explícitamente que, antes de entregarte el resultado, haga esto (es
exactamente lo que resolvió el bug la vez pasada):

1. **Listar cada `import { ... } from './otroArchivo.js'`** de los 4
   archivos y confirmar que cada nombre importado tiene su `export` con el
   mismo nombre en el archivo de origen.
2. **Revisar que no haya ningún `export` duplicado** (`export export
   function...`) — es un error de tecleo fácil de cometer al editar a mano
   o al pegar un fragmento corregido encima de otro.
3. Si Claude tiene acceso a una terminal, correr `node --check archivo.js`
   sobre cada uno de los 4 archivos editados — es gratis y detecta errores
   de sintaxis al instante, sin necesidad de abrir el navegador.
4. Entregar el **archivo completo**, no un fragmento — así lo reemplazas
   entero en GitHub y no hay riesgo de pegar un pedazo a medias.

Y después de subir a GitHub: abre la app, espera a que cargue, y si algo se
ve raro, abre la consola del navegador (F12 → pestaña "Console"). Con el
`boot.js` corregido, cualquier error de carga real ahora aparece ahí en rojo
— cópialo y pégaselo a Claude tal cual, es la forma más rápida de que
encuentre el problema exacto sin tener que adivinar.

---

## Trabajar sobre esto

```bash
# Suite de humo (prueba app.html directamente)
pip install -r tests/requirements.txt && playwright install chromium
pytest tests/smoke.py -q
```

Para probar en local hace falta un servidor HTTP de verdad: los módulos ES no
cargan desde `file://`.

```bash
python3 -m http.server 3000
# luego: http://localhost:3000
```

Las funciones de `api/` **no** corren con `http.server`. Para probarlas en
local: `npx vercel dev`.

---

## Licencia

Software propietario. Ver [LICENSE](LICENSE).
