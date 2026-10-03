# Idiomas y temas

La tool comienza en **English** cuando no existe una preferencia válida. El
botón EN/ES de la barra superior, junto al modo claro/oscuro, cambia de idioma al instante,
sin borrar campos ni cambiar entre registro, recuperación y entrada. La elección
se conserva al recargar y se aplica después de hidratar la cuenta, sin sustituir
llamadas, horarios ni otras preferencias. Un idioma previamente elegido sigue
vigente. La selección pública no crea datos de cuenta ni conflictos de nube.

En el menú lateral, **Temas y colores** permite elegir Español o English,
Claro u Oscuro y Original o una de las siete paletas aprobadas. Las preferencias
se guardan y sincronizan con los ajustes existentes. Cambiar idioma recarga la
vista y vuelve a la misma página; llamadas, temporizadores y progreso se conservan.
Los nombres y notas personales se muestran tal como fueron escritos.

Los dos idiomas funcionan sin un servicio de traducción: sus catálogos se
incluyen en el bundle y en la PWA. Original conserva los colores originales;
las otras paletas usan variables derivadas para superficies, texto y controles.

## Cambiar o agregar textos

La fuente es español. En HTML, escribir el texto normalmente. En JavaScript,
usar `translateText('Texto')` para texto fijo, `ui` para plantillas y
`translateMarkup` para HTML fijo. Traducir las piezas escritas por el programador,
manteniendo los valores interpolados (nombres, notas, importes e identificadores)
fuera de la traducción. No traducir IDs, claves, clases CSS o valores guardados.

1. Ejecutar `pnpm i18n:extract` después del cambio.
2. Completar `locales/en.json`, usando las mismas claves de `locales/es.json`.
3. Ejecutar `pnpm i18n:check`, `pnpm test` y `pnpm build`.

Las claves dependen del texto español: modificarlo genera una clave nueva y
obliga a actualizar el inglés. El chequeo falla ante textos faltantes,
variables alteradas o HTML nuevo. `locales/sources.json` indica dónde aparece
cada texto. `js/locales.generated.js` se genera al validar; no editar a mano.

## Integración automática preparada

No hay cuenta, API ni traducciones automáticas activadas. Sin las dos variables,
`pnpm i18n:sync` y el workflow no contactan ningún servicio ni cambian catálogos.
La app nunca envía tus llamadas o notas a Locize; solo el catálogo de interfaz.

Para activar más adelante:

1. Crear un proyecto Locize, con idioma de referencia **es**, idioma **en**,
   namespace **translation**, versión **latest** y traducción automática al
   inglés habilitada según el servicio contratado.
2. Guardar **LOCIZE_PROJECTID** y **LOCIZE_API_KEY** como secretos del repositorio
   en GitHub → Settings → Secrets and variables → Actions. Nunca poner la clave
   en HTML, JavaScript, Vercel público o archivos versionados.
3. Ejecutar una vez Actions → **English translations** → Run workflow, marcando
   **seed** para cargar el inglés que ya incluye la app.

Después, cambios a HTML/JS en main suben el español, solicitan el inglés y
descargan el catálogo. El workflow verifica variables, pruebas y build antes de
guardar el resultado. Si la traducción tarda o falla, conserva los archivos
anteriores y falla sin publicar un catálogo incompleto. Se puede reintentar
desde Actions. Cambios simultáneos en main pueden impedir el push; reejecutar.
Los commits automáticos pasan las pruebas dentro del mismo workflow.

Para uso local: Node 22 o posterior y las mismas variables de entorno;
`pnpm i18n:sync --seed` solo la primera vez, luego `pnpm i18n:sync`.
La API y los cargos dependen de Locize. Revisar las traducciones automáticas,
especialmente ayuda y vocabulario financiero.

Referencias: [i18next](https://www.i18next.com/overview/configuration-options)
y [Locize CLI](https://github.com/locize/locize-cli).
