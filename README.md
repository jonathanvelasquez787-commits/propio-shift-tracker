# Propio Shift Tracker

Registro personal de turnos, pausas, llamadas y ganancias, con adherencia
minuto a minuto, Higher Rate, finanzas y calendario de productividad.

Esta versión es el salto de "un archivo HTML en localStorage" a
"producto con cuentas y respaldo en la nube".

---

## Qué hay aquí

```
index.html            Landing pública + los 3 métodos de entrada
app.html               La app completa — se edita directamente, sin build
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

api/
  login.js               Traduce usuario → correo del lado del servidor
  delete-account.js      Borra la cuenta entera (necesita service_role)

supabase/migrations/
  0001_init.sql          Tablas, RLS, triggers y funciones. Se corre una vez.

tests/smoke.py            Suite de humo con Playwright, sobre app.html directo
```

---

## Cómo se edita `app.html`

`app.html` es un único archivo y es la fuente de verdad. No hay un archivo
de referencia aparte ni un script que lo genere — eso se retiró a propósito,
porque exigía verificación byte por byte y correr un script en terminal, algo
que no hace falta para mantener este proyecto.

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

Por eso, dentro de `app.html`, el `<script>` principal de la app queda
marcado como `type="text/plain" id="appMainScript"`: el navegador no lo
corre solo. `js/boot.js` lo inyecta recién cuando (1) hay sesión y (2)
`localStorage` ya tiene los datos de **esa** cuenta. Es el gate de sesión
completo, y vive dentro del propio `app.html` — no depende de ningún paso de
generación aparte.

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
