# Empezar aquí

Esta guía asume que **nunca has hecho nada de esto**. No hace falta que sepas
programar, ni instalar nada, ni usar la consola. Es todo hacer clic en páginas
web y copiar y pegar texto.

Léela de arriba hacia abajo y no te saltes pasos.

---

## Antes de nada: ¿qué vamos a hacer?

Hoy tu app es **un archivo** en tu computadora. Lo abres con doble clic y los
datos se guardan dentro de ese navegador, en esa computadora. Si cambias de
teléfono, no están.

Lo que vamos a hacer es ponerla en internet, con cuentas. Para eso necesitas
**tres servicios gratuitos**:

| Servicio | Para qué sirve | Piénsalo como… |
|---|---|---|
| **Supabase** | Guarda los datos y maneja las cuentas | El archivero con llave |
| **Vercel** | Publica la página en internet | El local donde está la tienda |
| **GitHub** | Guarda los archivos del proyecto | La bodega de donde Vercel saca todo |

Los tres son gratis para lo que vas a hacer. Ninguno te va a pedir tarjeta.

**Google (entrar con tu cuenta de Google) lo dejamos para el final y es
opcional.** Es la parte más tediosa y la app funciona perfecto sin eso: la
gente entra con correo y contraseña, o con usuario y contraseña. Si te cansas,
para en el Paso 7 y ya tienes la app funcionando. Google lo agregas otro día.

**Tiempo real:** hora y media la primera vez, tranquilo. No hay prisa y nada
de esto se rompe si te equivocas: todo se puede borrar y volver a hacer.

**Mientras tanto tu app de siempre sigue funcionando igual.** El archivo que
usas hoy no se toca. Si esto sale mal, sigues con tu archivo como siempre.

---

## Paso 1 — Bajar el proyecto a tu computadora (5 min)

1. Descarga el archivo **`propio-shift-tracker.zip`** que te dejé.
2. Guárdalo en un lugar que encuentres fácil. Sugerencia: el Escritorio.
3. Clic derecho encima → **Extraer todo** (en Mac: doble clic).
4. Te queda una carpeta llamada **`propio-shift-tracker`**. Ábrela.

Adentro vas a ver esto:

```
propio-shift-tracker/
├── index.html          ← la página de bienvenida
├── app.html            ← tu app de siempre
├── api/                ← carpeta
├── css/                ← carpeta
├── js/                 ← carpeta
├── supabase/           ← carpeta
└── ...varios archivos más
```

**No borres ni muevas nada de adentro.** Vamos a editar solo 4 archivos, y te
voy a decir exactamente cuáles.

> **Importante:** esa carpeta completa es "el proyecto". Cuando más adelante te
> diga "sube el proyecto", me refiero a **toda** esta carpeta con todo lo que
> tiene adentro, respetando las subcarpetas.

---

## Paso 2 — Crear tu cuenta de Supabase (10 min)

Supabase es donde van a vivir los datos y las cuentas de los usuarios.

1. Entra a **[supabase.com](https://supabase.com)**.
2. Botón **Start your project** (o *Sign up*).
3. Lo más simple: **Continue with GitHub**… pero todavía no tienes GitHub. Así
   que mejor **Sign up with email**: pon tu correo y una contraseña.
4. Te llega un correo de confirmación. Ábrelo y confirma.

Ya adentro, te va a pedir crear una **organización** (es solo un nombre, pon lo
que quieras: `Jonathan`) y después un **proyecto**:

- **Name** (nombre): `propio-shift-tracker`
- **Database Password** (contraseña de la base de datos): hay un botón que dice
  *Generate a password*. Úsalo, y **guarda esa contraseña en algún lado**
  (un archivo de texto, tu gestor de contraseñas, donde sea).

  > Esta contraseña **no** es la que vas a usar para entrar a tu app. Es de la
  > base de datos por dentro. Hoy no la vas a necesitar para nada, pero si
  > algún día la necesitas y la perdiste, es un dolor de cabeza.

- **Region** (región): elige **East US (North Virginia)**. Es la más cercana a
  Honduras de las gratuitas.
- **Plan**: Free.

Dale a **Create new project** y **espera**. Tarda 1 o 2 minutos armando todo.
Vas a ver una pantalla con barras de carga. No cierres.

> ⚠️ **Dato que vas a agradecer después:** en el plan gratis, si nadie usa el
> proyecto por **una semana entera**, Supabase lo pausa. No se borra nada:
> entras a supabase.com, le das a *Restore* y vuelve en un par de minutos.
> Mientras estás usando la app todos los días, esto nunca pasa.

---

## Paso 3 — Crear las tablas (esto es lo que no entendías) (10 min)

### ¿Qué estamos haciendo aquí?

Tu proyecto de Supabase ahora mismo es una base de datos **vacía**. No tiene ni
idea de que existen usuarios, ni llamadas, ni turnos.

Yo te dejé escritas todas las instrucciones para que se arme sola. Están en un
archivo de texto dentro del proyecto. Se llama **`0001_init.sql`** y está en:

```
propio-shift-tracker/  ←  la carpeta que bajaste
└── supabase/
    └── migrations/
        └── 0001_init.sql   ←  ESTE
```

Ese archivo está escrito en SQL, que es el idioma que entienden las bases de
datos. Dice cosas como "crea una tabla que se llame `profiles`", "solo el dueño
puede ver sus datos", etc.

**Lo único que tienes que hacer es copiar todo ese texto y pegarlo en Supabase.**
No tienes que entenderlo ni escribir nada. Es copiar y pegar, literal.

### 3.1 — Abrir el archivo y copiar el texto

En Windows:

1. Entra a la carpeta `propio-shift-tracker` → `supabase` → `migrations`.
2. **Clic derecho** sobre `0001_init.sql` → **Abrir con** → **Bloc de notas**.

   > Si no te aparece el Bloc de notas en la lista, dale a *Elegir otra
   > aplicación* y búscalo ahí.
   >
   > ❌ **No lo abras con Word.** Word le mete formato y lo daña.

3. Se abre una ventana con un montón de texto. **No leas nada, no cambies
   nada.**
4. Haz clic **adentro** del texto, en cualquier parte.
5. Presiona **Ctrl + A** (selecciona todo — se pone todo azul).
6. Presiona **Ctrl + C** (copiar).
7. Cierra el Bloc de notas **sin guardar**.

En Mac: clic derecho → *Abrir con* → **TextEdit**. Después **Cmd + A** y
**Cmd + C**.

Ya tienes todo ese texto copiado en el portapapeles. **No copies nada más hasta
terminar el siguiente paso**, o lo pierdes.

### 3.2 — Pegarlo en Supabase

1. Vuelve a la pestaña de Supabase, adentro de tu proyecto.
2. En la **barra de la izquierda** busca un ícono/enlace que diga **SQL Editor**.
   (El menú a veces cambia de lugar. Es el que tiene una base de datos con el
   símbolo `>_`. Si no lo ves, presiona `Ctrl + K` y escribe "SQL Editor".)
3. Te va a aparecer un botón **+ New query** (o *New SQL snippet*). Dale.
4. Se abre un recuadro grande y vacío, con fondo oscuro. Haz clic adentro.
5. Presiona **Ctrl + V** (pegar). Se llena de texto.
6. Abajo a la derecha hay un botón verde que dice **Run** (o *Ejecutar*).
   También sirve `Ctrl + Enter`. **Dale.**
7. Espera unos segundos.

**Lo que tiene que pasar:** abajo aparece un mensaje verde que dice
**`Success. No rows returned`**.

Eso es lo correcto. Traducido: "Listo. No hay nada que mostrarte" — porque no
le pediste ver datos, le pediste crear tablas.

> ❌ **Si sale un error en rojo**, lo más probable es que no copiaste todo el
> archivo (te faltó el final) o lo abriste con Word. Vuelve a hacer el paso
> 3.1 con cuidado y dale Run otra vez. Correrlo dos veces no daña nada, está
> hecho a propósito para que se pueda repetir.

### 3.3 — Comprobar que sí se crearon

1. En la barra de la izquierda, busca **Table Editor**.
2. Tienen que aparecer dos tablas: **`profiles`** y **`user_data`**.
3. Al lado del nombre de cada una debe verse un **candado** o la palabra
   **RLS enabled**.

Ese candado es importante de verdad: es lo que hace que la cuenta de una
persona no pueda ver los datos de otra. Si alguna tabla apareciera **sin**
candado, vuelve a correr el paso 3.2 completo.

✅ **Acabas de terminar la parte más difícil.** El resto es más fácil.

---

## Paso 4 — Copiar tus dos llaves (5 min)

Ahora hay que decirle a tu app **cuál** es tu Supabase. Para eso hay dos
valores que tienes que copiar.

1. En Supabase, abajo a la izquierda busca el engranaje ⚙️ **Project Settings**
   (Configuración del proyecto).
2. Adentro, busca la sección **API** (o *API Keys*).

Ahí vas a ver:

- **Project URL** → algo como `https://abcdefghijklmnop.supabase.co`
- **anon** / **public** → un texto larguísimo que empieza con `eyJhbGci...`

  > Supabase está cambiando los nombres. Si en vez de "anon public" ves
  > **Publishable key** (empieza con `sb_publishable_`), esa es. Es la misma
  > idea: la llave que puede ser pública.

- **service_role** / **secret** → otro texto larguísimo, con un aviso rojo al
  lado que dice que nunca lo compartas. Hay que darle a *Reveal* para verlo.

**Abre el Bloc de notas y pega los tres ahí**, con su nombre, para tenerlos a
mano:

```
URL:           https://abcdefghijklmnop.supabase.co
anon:          eyJhbGciOi.....
service_role:  eyJhbGciOi.....
```

### ¿Cuál es secreto y cuál no?

| Llave | ¿Secreta? | Por qué |
|---|---|---|
| Project URL | No | Es solo una dirección |
| **anon** | No | Queda visible en el navegador de todos, **y está bien**. Lo que protege los datos es el candado del paso 3.3, no esconder esta llave. Así funcionan todas las apps de Supabase. |
| **service_role** | **SÍ, muchísimo** | Esta llave **se salta el candado**. Quien la tenga puede leer y borrar los datos de todos. Va a vivir solo en Vercel, escondida en el servidor. **Nunca la pegues en un archivo del proyecto, ni en un chat, ni en una captura de pantalla.** |

> Si alguna vez se te escapa la `service_role`, no es el fin del mundo: en esa
> misma pantalla de Supabase hay un botón para **rotarla** (generar una nueva),
> y la vieja deja de servir al instante.

---

## Paso 5 — Pegar las llaves en el proyecto (5 min)

Solo vas a tocar **un archivo**:

```
propio-shift-tracker/
└── js/
    └── config.js   ←  ESTE
```

1. **Clic derecho** sobre `config.js` → **Abrir con** → **Bloc de notas**.
2. Adentro vas a ver dos líneas parecidas a estas:

   ```js
   export const SUPABASE_URL = 'REEMPLAZAR_CON_TU_PROJECT_URL';
   export const SUPABASE_ANON_KEY = 'REEMPLAZAR_CON_TU_ANON_KEY';
   ```

3. Reemplaza **solo** lo que está entre las comillas, dejando las comillas:

   ```js
   export const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOi.....';
   ```

4. **Ctrl + S** para guardar. Cierra.

Cosas que arruinan este paso (y son las 3 fallas más comunes):

- ❌ Borrar las comillas `'` o el punto y coma `;` del final.
- ❌ Dejar un espacio adentro de las comillas: `' https://...'`.
- ❌ Pegar la `service_role` acá en vez de la `anon`. **La `service_role` no
  va en este archivo nunca.**

---

## Paso 6 — Rellenar tu nombre en los textos legales (5 min)

Hay tres archivos con espacios en blanco que solo tú puedes llenar:

```
propio-shift-tracker/
├── privacidad.html
├── terminos.html
└── LICENSE
```

Ábrelos **uno por uno** con el Bloc de notas y busca (con `Ctrl + B` en el
Bloc de notas, *Buscar*) estas tres cosas, para reemplazarlas:

| Busca esto | Escribe esto |
|---|---|
| `[TU NOMBRE O RAZÓN SOCIAL]` | Tu nombre completo |
| `[TU CORREO DE CONTACTO]` | Un correo donde te puedan escribir |
| `[TU PAÍS]` | Honduras |

**Borra también los corchetes `[ ]`.** Tiene que quedar así:

```
Responsable: Jonathan Pérez
Contacto: jonathan@ejemplo.com
```

Guarda cada archivo con `Ctrl + S`.

> **No te lo saltes.** Estos son los textos que dicen quién guarda los datos y
> cómo pedir que los borren. Si algún día quieres el login de Google, Google
> los lee antes de aprobarte — y una política con `[TU NOMBRE]` sin rellenar es
> rechazo automático.

---

## Paso 7 — Subir el proyecto a GitHub (15 min)

### ¿Por qué GitHub si yo solo quiero publicar la página?

Porque Vercel (el que publica) no recibe carpetas a mano: lee de GitHub. Tú
subes la carpeta a GitHub una vez, y de ahí en adelante Vercel se encarga solo.

Ventaja secundaria: te queda un respaldo del proyecto en internet.

### 7.1 — Crear la cuenta

1. Entra a **[github.com](https://github.com)** → **Sign up**.
2. Correo, contraseña, y un nombre de usuario (el que quieras).
3. Confirma el correo.

### 7.2 — Crear el repositorio

"Repositorio" es la palabra que usan ellos para decir "carpeta del proyecto".

1. Arriba a la derecha, el **`+`** → **New repository**.
2. **Repository name**: `propio-shift-tracker`
3. **Private** ← **elige esta, no Public.**

   > Público significa que cualquier persona del mundo puede leer tu código.
   > Privado significa que solo tú. Elige privado. Vercel puede publicar
   > repositorios privados sin problema en el plan gratis.

4. **No marques** nada de *Add a README*, *.gitignore* ni licencia. Déjalo
   todo vacío.
5. **Create repository**.

### 7.3 — Subir los archivos

Te queda una página con instrucciones para gente que usa consola. **Ignóralas.**
Busca un enlace chiquito que dice **"uploading an existing file"**
(subir un archivo existente). Dale clic.

También puedes ir directo a:
`https://github.com/TU-USUARIO/propio-shift-tracker/upload/main`

1. Abre la carpeta `propio-shift-tracker` en tu computadora, en otra ventana.
2. **Selecciona todo lo que hay adentro** (`Ctrl + A` dentro de la carpeta) —
   los archivos **y** las subcarpetas.
3. **Arrástralo** a la zona de la página de GitHub que dice
   *Drag files here to add them to your repository*.

   > Usa **Chrome, Edge o Firefox**. Arrastrar carpetas completas no funciona
   > bien en Safari.

4. Espera. Son unos 2 MB, tarda un poquito. Vas a ver la lista de archivos
   apareciendo abajo.
5. Cuando termine de listar todo, baja hasta el final y dale al botón verde
   **Commit changes**.

**Comprueba:** en la página principal del repositorio tienen que verse las
carpetas `api`, `css`, `js`, `supabase` y los archivos `index.html`,
`app.html`, `vercel.json`. Si te faltó alguna, repite el 7.3 y arrastra solo
lo que falte.

---

## Paso 8 — Publicar con Vercel (10 min)

1. Entra a **[vercel.com](https://vercel.com)** → **Sign Up**.
2. Elige **Continue with GitHub** (ahora sí ya tienes cuenta). Te va a pedir
   permiso para ver tus repositorios: acepta.
3. Cuando pregunte para qué lo vas a usar, elige **Hobby** (el gratis) y pon
   tu nombre.
4. **Add New… → Project**.
5. Te sale la lista de tus repositorios de GitHub. Busca
   `propio-shift-tracker` y dale a **Import**.

   > Si no aparece, hay un botón *Adjust GitHub App Permissions* para darle
   > acceso a ese repositorio en particular.

### 8.1 — ANTES de darle Deploy: las variables de entorno

Esto es importante y es fácil pasarlo por alto.

En la pantalla de configuración, busca la sección que se llama
**Environment Variables** (Variables de entorno). Es un desplegable, puede
estar cerrado.

"Variable de entorno" suena feo pero es simple: es **un secreto que le das al
servidor sin escribirlo en ningún archivo**. Así es como la `service_role`
llega a Vercel sin quedar en tu código.

Agrega **tres**, una por una (campo *Key* = el nombre, campo *Value* = el
valor, y después **Add**):

| Key (nombre, exacto así) | Value (pega esto) |
|---|---|
| `SUPABASE_URL` | Tu Project URL |
| `SUPABASE_ANON_KEY` | Tu llave **anon** |
| `SUPABASE_SERVICE_ROLE_KEY` | Tu llave **service_role** |

Cuida que:
- Los nombres estén escritos **idénticos**, en mayúsculas y con guiones bajos.
- No quede ningún espacio al principio ni al final del valor pegado.
- Estén marcadas para *Production*, *Preview* y *Development* (normalmente ya
  vienen las tres marcadas).

### 8.2 — Deploy

Dale al botón **Deploy** y espera 1-2 minutos. Van a salir líneas de texto
corriendo: es normal.

Cuando termine sale confeti 🎉 y una dirección tipo:

```
https://propio-shift-tracker-abc123.vercel.app
```

**Cópiala y pégala en tu Bloc de notas.** Es la dirección de tu app. Esa la
vas a usar de ahora en adelante y la puedes abrir desde el teléfono.

Ábrela. Debe cargar la página de bienvenida. **Todavía no crees la cuenta**,
falta un paso.

---

## Paso 9 — Volver a Supabase y decirle cuál es tu dirección (5 min)

Supabase necesita saber a qué sitio tiene permitido mandar a la gente después
de entrar. Si no se lo dices, el login da vueltas y no pasa nada.

1. Vuelve a Supabase → tu proyecto.
2. Barra izquierda → **Authentication** → **URL Configuration**.
3. **Site URL**: pega tu dirección de Vercel, así, sin barra al final:
   ```
   https://propio-shift-tracker-abc123.vercel.app
   ```
4. **Redirect URLs** → **Add URL**. Agrega esta, **con los dos asteriscos al
   final** (son obligatorios, significan "y cualquier página adentro"):
   ```
   https://propio-shift-tracker-abc123.vercel.app/**
   ```
5. **Save**.

### Y de una vez, revisa el correo

En **Authentication → Providers** (o *Sign In / Providers*), confirma que
**Email** esté **encendido**. Viene encendido por defecto.

Ahí mismo vas a ver **Confirm email**. Déjalo encendido: hace que la gente
tenga que confirmar su correo antes de entrar, y eso evita cuentas con correos
inventados que después no pueden recuperar su contraseña.

---

## Paso 10 — La primera prueba de verdad (10 min)

1. Abre tu dirección de Vercel.
2. **Crear cuenta**: pon tu correo, elige un nombre de usuario (fíjate que te
   avisa en vivo si ya está ocupado) y una contraseña.
3. Revisa tu correo. Llega un mensaje de Supabase. Dale al enlace.

   > Si no llega, mira la carpeta de spam. En el plan gratis Supabase manda
   > pocos correos por hora — si hiciste muchas pruebas seguidas, espera un
   > rato.

4. Entra. Debe abrirse **tu app de siempre**, idéntica.
5. Registra una llamada cualquiera.
6. **Espera unos 6 segundos** y mira el menú lateral (☰): debe aparecer que se
   guardó en la nube.
7. Vete a Supabase → **Table Editor** → **`user_data`**. Ahí está tu fila, con
   los datos adentro. **Eso significa que ya está funcionando de verdad.**
8. Abre la misma dirección en el teléfono, entra con la misma cuenta: tienen
   que aparecerte los mismos datos.

### La prueba que de verdad importa

Crea una **segunda cuenta** (con otro correo) desde una ventana de incógnito.
Entra con ella. **No tiene que ver ni uno solo de los datos de la primera.**

Si eso se cumple, el candado está haciendo su trabajo.

---

## Paso 11 — Google (opcional, déjalo para otro día)

Ya tienes la app funcionando. Esto es solo para que la gente pueda entrar con
un clic en vez de escribir correo y contraseña.

Es la parte más tediosa: hay que crear un proyecto en Google Cloud, llenar una
pantalla de consentimiento y a veces esperar una revisión de días.

**El paso a paso está en `SETUP.md`, Paso 4.** Cuando lo hagas, el único punto
donde todo el mundo se equivoca es este, así que lo repito acá:

> En Google, el campo **"URI de redireccionamiento autorizado"** NO lleva la
> dirección de tu sitio de Vercel. Lleva la de **Supabase**:
> ```
> https://TU-PROYECTO.supabase.co/auth/v1/callback
> ```

Mientras no hagas esto, el botón de Google en tu página va a dar error. Si
quieres, avísame y te lo quito de la pantalla hasta que lo configures.

---

## De ahora en adelante: ¿cómo cambio algo?

Esta es la parte que cambia respecto a como trabajabas antes.

**Antes:** yo te daba un archivo `.html`, lo abrías y ya.

**Ahora:** yo te doy el archivo, tú lo subes a GitHub, y Vercel lo publica solo
en unos segundos.

Para reemplazar un archivo:

1. Entra a tu repositorio en github.com.
2. Navega hasta el archivo y dale clic.
3. Arriba a la derecha, el ícono del **lápiz** (*Edit this file*) para cambios
   de texto chicos, o usa **Add file → Upload files** y arrastra el archivo
   nuevo encima para reemplazarlo completo.
4. Abajo, **Commit changes**.
5. Vercel se da cuenta solo y republica en ~30 segundos. Puedes ver el avance
   en vercel.com.

> **Truco:** si cambiaste algo y no se nota en el navegador, es que te lo
> guardó en caché. Recarga con **Ctrl + Shift + R** (Mac: `Cmd + Shift + R`).

---

## Diccionario de palabras raras

| Palabra | Qué significa de verdad |
|---|---|
| **Repositorio / repo** | La carpeta del proyecto, guardada en GitHub |
| **Commit** | Guardar un cambio. Como darle "Guardar" pero queda el historial |
| **Deploy / desplegar** | Publicar la página en internet |
| **SQL** | El idioma para hablarle a una base de datos |
| **Query** | Una instrucción escrita en SQL |
| **RLS** | El candado: cada quien solo ve lo suyo |
| **Endpoint / API** | Una dirección a la que el programa le hace preguntas |
| **Variable de entorno** | Un secreto guardado en el servidor, fuera del código |
| **Caché** | La copia vieja que el navegador guardó para ir más rápido |
| **Token / key / llave** | Un texto largo que sirve de contraseña entre programas |

---

## Si algo sale mal

**La página de bienvenida carga pero al entrar se queda pensando para siempre.**
Casi siempre es el Paso 5: `js/config.js` quedó sin editar, o se le borró una
comilla. Revísalo.

**"Database error saving new user" al crear la cuenta.**
El script del Paso 3 no corrió completo. Vuelve a hacer el 3.1 y 3.2 enteros.

**Entro con Google y me devuelve a la página de inicio sin pasar a la app.**
Falta tu dirección en el Paso 9, o la pusiste sin los `/**` del final.

**`/api/login` da error 500 "SERVER_NOT_CONFIGURED".**
Faltan las variables del Paso 8.1, o las agregaste después de desplegar. En
Vercel: *Settings → Environment Variables* para revisarlas, y después
*Deployments → …  → Redeploy*. Las variables solo se leen al desplegar.

**Supabase dice "Project paused".**
Pasó una semana sin usarlo. Dale a *Restore project* y espera dos minutos. No
se perdió nada.

**Me equivoqué en algo y quiero empezar de cero.**
Puedes borrar el proyecto de Supabase (*Project Settings → General → Delete
project*) y volver a hacer los pasos 2 y 3. Nada de esto es irreversible.

---

## ¿Dónde pido ayuda?

Si te trabas en un paso, dime **exactamente dos cosas**:

1. En qué número de paso estás.
2. Qué dice el mensaje de error, tal cual, o una captura de pantalla.

Con eso te digo qué hacer. No intentes adivinar ni cambiar cosas al azar: casi
siempre es un detalle chiquito (una comilla, un espacio, un `/**` que falta).
