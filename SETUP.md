# Puesta en marcha (versión corta)

> ⚠️ **Esta versión asume que ya has usado Supabase, GitHub y Vercel antes.**
> Si es tu primera vez, no sigas acá: ve a
> **[EMPEZAR-AQUI.md](EMPEZAR-AQUI.md)**, que es lo mismo pero explicado clic
> por clic, con qué botón apretar y qué tiene que aparecer en pantalla.

Todo lo que sigue es lo que **solo tú puedes hacer**: crear cuentas y pegar
llaves. El código ya está listo y esperando esos valores.

**Orden importante.** Google exige una URL pública de política de privacidad
para aprobar su pantalla de consentimiento, y esa URL no existe hasta que el
sitio esté desplegado. Por eso el orden correcto es:

> Supabase → config → Vercel (desplegar) → **recién ahí** Google

Si intentas hacer Google primero, te vas a quedar trabado pidiendo una URL que
todavía no tienes.

Tiempo real: unos 40 minutos la primera vez, casi todo esperando pantallas.

---

## Paso 1 — Proyecto de Supabase (10 min)

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta.
2. **New project**:
   - **Name**: `propio-shift-tracker`
   - **Database Password**: genera una larga y guárdala en tu gestor de
     contraseñas. No la vas a necesitar para esta app, pero perderla complica
     cualquier mantenimiento futuro.
   - **Region**: la más cercana a tus usuarios. Desde Honduras, *East US
     (North Virginia)*.
   - **Plan**: Free.
3. Espera a que termine de crearse (1-2 min).

### Correr el esquema

1. Menú lateral → **SQL Editor** → **New query**.
2. Copia **todo** el contenido de `supabase/migrations/0001_init.sql` y pégalo.
3. **Run**. Debe terminar en `Success. No rows returned`.
4. Comprueba en **Table Editor** que existen las tablas `profiles` y
   `user_data`, ambas con el candado de **RLS enabled**.

> Si alguna aparece sin RLS, algo falló: vuelve a correr el script completo. Sin
> RLS cualquier cuenta podría leer los datos de otra.

### Copiar las llaves

**Project Settings → API**. Vas a necesitar tres valores:

| Valor | Dónde va | ¿Secreto? |
|---|---|---|
| **Project URL** | `js/config.js` y variable de Vercel | No |
| **anon public** | `js/config.js` y variable de Vercel | No — la protege RLS |
| **service_role** | **solo** variable de Vercel | **SÍ. Nunca en el navegador.** |

La `service_role` salta todas las políticas de seguridad. Si alguna vez la
pegas por error en un archivo del repo, rótala de inmediato desde ese mismo
panel.

### Configurar el auth

**Authentication → URL Configuration**:

- **Site URL**: `https://tu-dominio.vercel.app` (la vas a tener en el paso 3;
  por ahora puedes poner `http://localhost:3000` y volver a corregirla).
- **Redirect URLs**: agrega estas dos, una por línea:
  ```
  https://tu-dominio.vercel.app/**
  http://localhost:3000/**
  ```

**Authentication → Providers → Email**: déjalo habilitado.
**Confirm email** activado es lo recomendable (evita cuentas con correos
falsos que después no pueden recuperar la contraseña). La app ya contempla ese
caso: muestra "revisa tu correo" en vez de quedarse girando.

---

## Paso 2 — Configurar el código (2 min)

Abre `js/config.js` y reemplaza los dos marcadores:

```js
export const SUPABASE_URL = 'https://xxxxxxxxxxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6...';
```

Sí, esos dos valores quedan públicos en el navegador. **Es lo esperado**: así
funciona cualquier app de Supabase. Lo que protege los datos no es esconder la
anon key, es Row Level Security — que ya está puesta.

### Rellenar los textos legales

Busca y reemplaza en `privacidad.html`, `terminos.html` y `LICENSE`:

- `[TU NOMBRE O RAZÓN SOCIAL]`
- `[TU CORREO DE CONTACTO]`
- `[TU PAÍS]`

No es opcional: Google revisa la política de privacidad antes de aprobar el
login, y una política con marcadores sin rellenar es motivo de rechazo.

---

## Paso 3 — Desplegar en Vercel (10 min)

1. Sube el proyecto a un repositorio **privado** de GitHub.
2. [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo.
3. **Framework Preset**: *Other*. No hay build: Vercel sirve los archivos tal
   cual y convierte `api/*.js` en funciones.
4. Antes de desplegar, en **Environment Variables** agrega las tres (las mismas
   que trae `.env.example`), marcadas para *Production*, *Preview* y
   *Development*:

   | Nombre | Valor |
   |---|---|
   | `SUPABASE_URL` | tu Project URL |
   | `SUPABASE_ANON_KEY` | tu anon public |
   | `SUPABASE_SERVICE_ROLE_KEY` | tu service_role |

5. **Deploy**.
6. Copia la URL que te queda (`https://algo.vercel.app`) y **vuelve a Supabase**
   → *Authentication → URL Configuration* → pon esa URL real en **Site URL** y
   en **Redirect URLs**.

### Comprobar que las funciones subieron

Abre `https://tu-dominio.vercel.app/api/login` en el navegador. Debe responder
`{"error":"METHOD_NOT_ALLOWED"}`. Si responde 404, Vercel no detectó la carpeta
`api/`: revisa que esté en la raíz del repo, no dentro de otra carpeta.

---

## Paso 4 — Google (15 min, y hasta 3 días si piden verificación)

Ahora sí, porque ya tienes la URL de la política de privacidad.

### En Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → crea un
   proyecto (`Propio Shift Tracker`).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - **Tipo**: Externo.
   - **Nombre de la app**: Propio Shift Tracker.
   - **Correo de asistencia** y **datos de contacto**: los tuyos.
   - **Dominio de la app**:
     - Página principal: `https://tu-dominio.vercel.app`
     - Política de privacidad: `https://tu-dominio.vercel.app/privacidad`
     - Términos del servicio: `https://tu-dominio.vercel.app/terminos`
   - **Dominios autorizados**: `vercel.app` (o tu dominio propio).
   - **Permisos (scopes)**: solo `email`, `profile` y `openid`. No pidas nada
     más: cada permiso extra alarga la revisión y no hace falta.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - **Tipo**: Aplicación web.
   - **URI de redireccionamiento autorizados** — este es el que todo el mundo
     se equivoca. Va el de **Supabase**, no el de tu sitio:
     ```
     https://xxxxxxxxxxxxxxxx.supabase.co/auth/v1/callback
     ```
   - Guarda el **ID de cliente** y el **Secreto de cliente**.

### De vuelta en Supabase

**Authentication → Providers → Google** → activar → pegar *Client ID* y
*Client Secret* → **Save**.

### Sobre la verificación

Mientras la app esté en modo *Testing*, solo entran los correos que agregues
como usuarios de prueba (hasta 100). Para abrirla a cualquiera hay que
publicarla; con solo `email`/`profile`/`openid` la revisión suele ser rápida o
ni siquiera necesaria.

---

## Paso 5 — Lista de verificación

Con todo desplegado, recorre esto una vez. Es media hora que ahorra semanas de
reportes confusos.

### Cuenta

- [ ] Crear cuenta con correo/contraseña → llega el correo de confirmación.
- [ ] Confirmar y entrar. Debe abrir `/app`.
- [ ] Salir y **entrar con el nombre de usuario** en vez del correo. Debe
      funcionar igual.
- [ ] Escribir una contraseña incorrecta → "Usuario o contraseña incorrectos".
- [ ] Escribir un usuario **que no existe** → *el mismo mensaje exacto*. Si
      dijera algo distinto, cualquiera podría averiguar quién tiene cuenta.
- [ ] "¿La olvidaste?" → llega el correo → poner contraseña nueva → entra.
- [ ] Entrar con Google. Si es tu primera vez, el username se genera solo desde
      tu correo.
- [ ] Intentar registrar un username ya ocupado → avisa **mientras escribes**.

### Sincronización

- [ ] Con sesión abierta, registrar una llamada. Esperar ~6 s: el punto del
      menú lateral pasa a verde con "Guardado en la nube".
- [ ] En Supabase → *Table Editor → user_data*: tu fila tiene los datos.
- [ ] Abrir la app en otro dispositivo (o una ventana privada) con la misma
      cuenta → aparecen los mismos datos.
- [ ] Editar en el dispositivo A, y **sin recargar** editar en el B. Al recargar
      el que quedó atrás debe salir la pantalla de "dos versiones distintas",
      no un pisotón silencioso.
- [ ] Poner el modo avión, registrar algo, volver a conectar → sube solo.

### Aislamiento (la prueba que de verdad importa)

- [ ] Crear una **segunda** cuenta.
- [ ] Desde ella, en la consola del navegador:
      ```js
      const { data, error } = await window.supabase?.from('user_data').select('*');
      ```
      Si `supabase` no está expuesto, hazlo desde el *SQL Editor* de Supabase con
      *Impersonate user*. El resultado debe traer **solo** la fila propia.
- [ ] En el mismo navegador donde ya usaste la cuenta A, entrar con la B: los
      datos de A **no** deben aparecer ni subirse a B.

### Borrado

- [ ] Ajustes → "Borrar mi cuenta" → confirma → te saca a la landing.
- [ ] En Supabase, esa fila ya no está ni en `profiles` ni en `user_data`.

---

## Problemas frecuentes

**"redirect_uri_mismatch" al entrar con Google.**
La URI autorizada en Google debe ser la de *Supabase*
(`https://TU-REF.supabase.co/auth/v1/callback`), no la de tu sitio.

**Google entra pero vuelve a la landing sin pasar a la app.**
Falta tu dominio en *Supabase → Authentication → Redirect URLs*. Tiene que
terminar en `/**`.

**`/api/login` devuelve 500 `SERVER_NOT_CONFIGURED`.**
Faltan variables de entorno en Vercel, o las agregaste después de desplegar.
Vuelve a desplegar: las variables se leen en el momento del despliegue.

**Al registrarse: "Database error saving new user".**
El trigger rechazó el username (ocupado o con caracteres no permitidos).
Confirma que el script SQL corrió completo, incluida la sección 5.

**La app se queda en "Abriendo tu cuenta…".**
Abre la consola. Casi siempre es `js/config.js` sin editar, o la tabla
`user_data` inexistente porque el SQL no corrió entero.

**Cambié `js/config.js` y no se nota.**
El navegador cacheó el módulo. Recarga forzada (Ctrl+Shift+R) o abre en
ventana privada.
