# Propio Shift Tracker

Registro personal de turnos, pausas, llamadas y ganancias, con adherencia
minuto a minuto, Higher Rate, finanzas y calendario de productividad.

Esta versión es el salto de "un archivo HTML en localStorage" a
"producto con cuentas y respaldo en la nube". La app en sí **no se reescribió**:
sigue siendo el mismo archivo, ahora envuelto en una capa de sesión y
sincronización.

---

## Qué hay aquí

```
index.html            Landing pública + los 3 métodos de entrada
app.html              La app (generada desde el congelado — no editar a mano)
privacidad.html       Política de privacidad
terminos.html         Términos de uso

css/
  tokens.css          Paleta y tipografía, claro y oscuro
  landing.css         Landing y panel de entrada
  legal.css           Páginas legales
  app-shell.css       Gate de arranque y panel de cuenta dentro de la app

js/
  config.js           URL y anon key de Supabase  ← se edita a mano
  supabase-client.js  Cliente único y compartido
  auth.js             Google · correo/contraseña · usuario/contraseña
  landing.js          Pestañas, registro, recuperación, sesión activa
  sync.js             localStorage ↔ Supabase, con control de conflictos
  boot.js             Gate de sesión, hidratación y montaje de la app

api/
  login.js            Traduce usuario → correo del lado del servidor
  delete-account.js   Borra la cuenta entera (necesita service_role)

supabase/migrations/
  0001_init.sql       Tablas, RLS, triggers y funciones. Se corre una vez.

reference/
  propio_shift_tracker_Fixed_v539.html   Congelado. Intocable.

tools/build_app_html.py   Genera app.html y verifica que nada más cambió
tests/smoke.py            Suite de humo con Playwright
```

---

## Las decisiones que explican el diseño

### La app no se toca

`app.html` se **genera** desde el archivo congelado con
`python3 tools/build_app_html.py`. El script aplica cuatro cambios y después
verifica que, al revertirlos, se recupere el v539 **byte por byte**. Si alguien
edita `app.html` a mano, `tests/smoke.py::test_app_html_esta_al_dia` falla.

Los cuatro cambios son: un `<link>` al CSS del envoltorio, el `<script>`
principal marcado como `type="text/plain" id="appMainScript"`, el `<div>` del
gate de arranque y el `<script type="module">` de boot.

### Por qué el script principal no se autoejecuta

La app lee `localStorage` y se dibuja entera en cuanto se ejecuta. Si la
descarga desde la nube llegara después, habría que recargar la página — o peor,
alguien podría ver por un instante los datos de la cuenta anterior en el mismo
navegador.

Marcándolo como `text/plain`, el navegador no lo corre. `boot.js` lo inyecta
recién cuando (1) hay sesión y (2) `localStorage` ya tiene los datos de **esa**
cuenta. Es el gate de sesión completo, sin tocar una línea de las ~10.000 del
script.

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
equivalente exacto de las tres claves de `localStorage`. Así la app no tiene que
cambiar cómo guarda. Un año de llamadas son unos pocos MB. Si algún día crece,
`calls` se migra a tabla propia (Fase 5) sin tocar lo demás.

### Por qué nunca hay merge automático

Dos dispositivos con versiones divergentes son dos verdades distintas sobre el
mismo día de trabajo. Mezclarlas automáticamente inventaría un día que no
existió. El usuario elige cuál se queda, y el guardado usa control de
concurrencia (`push_user_data` compara el `updated_at` que el cliente creía
vigente) para que nadie pise a nadie en silencio a mitad de sesión.

---

## Trabajar sobre esto

```bash
# Regenerar app.html después de cambiar el archivo congelado
python3 tools/build_app_html.py

# Verificar que app.html está al día (no escribe nada)
python3 tools/build_app_html.py --check

# Suite de humo
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
