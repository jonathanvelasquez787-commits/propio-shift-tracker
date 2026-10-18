# Visibilidad en Google

La página pública es https://propio-shift-tracker.vercel.app/ en inglés y
https://propio-shift-tracker.vercel.app/es en español. El build genera HTML
completo por idioma, con títulos, descripciones, canonical y hreflang recíproco
en/es/x-default. El selector conserva el formulario de acceso y sincroniza la
dirección y los metadatos. Una preferencia guardada puede abrir la portada en
español; `/es` siempre elige español, incluso sin almacenamiento disponible.
Las páginas legales también declaran canonical. robots.txt permite rastreo y
apunta al sitemap.xml con seis páginas públicas, incluidas las dos versiones
de la guía para intérpretes; ambos se copian a public/.
`/index.html` y `/es.html` redirigen permanentemente a sus direcciones públicas.
La app de cuenta (/app) lleva noindex en HTML y cabecera HTTP; /app.html redirige
permanentemente a /app y conserva los parámetros. La app no se
incluye en el sitemap. Noindex no reemplaza la autenticación ni RLS.

Con sesión verificada, la app cambia la dirección visible a `/` mediante
History API, conservando parámetros y fragmentos. `/app` sigue siendo su punto
de carga; al recargar `/`, la landing detecta la sesión y vuelve a abrirla.
Así la raíz conserva la portada pública indexable para visitas sin sesión.

Estas ayudas no garantizan indexación ni posiciones. La landing ya entrega
contenido estático, título, descripción y enlaces sin necesitar una sesión.
Google puede cambiar el título y la descripción que muestra en resultados.

Desde v595 el título comienza con Propio Shift Tracker en ambos idiomas,
el H1 contiene el nombre completo y la presentación explica qué hace la
herramienta. Las descripciones y `og:site_name` usan la misma identidad.
WebSite conserva el nombre y ofrece el dominio como alternativa; no se
declara afiliación oficial ni se agregan valoraciones o enlaces externos ficticios.
Los seis checks de SEO verifican HTML legible sin JS, ambos idiomas, identidad,
canonical/hreflang, schema y conservación del acceso. Build y revisión de
las portadas en móvil/escritorio completados localmente.

Publicación v595 confirmada: commit `a7f8336993fcc88b8cd8315c45ecc91eeb103aa5`,
Vercel correcto y CI completa correcta. Search Console probó las URLs públicas
el 5/10/2026 a las 9:31 (`/`) y 9:34 (`/es`), hora de Tegucigalpa: ambas disponibles
para Google y aptas para indexar. El HTML probado contiene los títulos y
descripciones nuevos en su idioma; en inglés también se confirmó el H1 nuevo.
Esta comprobación externa evitó confundir la copia antigua mostrada
en el navegador local con la versión publicada. La conexión HTTPS directa
de este equipo falló para GitHub/Vercel; los cambios se publicaron mediante
el conector de GitHub y la copia local quedó sincronizada conservando el commit original.

Se intentó una sola solicitud para actualizar la raíz tras publicar v595.
Google la rechazó por «Cuota superada» el 5/10/2026 y pidió volver mañana.
No se intentó la solicitud española tras ese rechazo ni se creó una nueva
automatización. El rastreo normal sigue permitido; una prueba en tiempo real
no demuestra que Google ya haya actualizado su índice ni el posicionamiento.
Evidencia en outputs: google-html-publicado-v595-en.jpg,
google-html-publicado-v595-es.jpg, google-portada-publicada-v595-es.jpg y
google-solicitud-v595-cuota-2026-10-05.jpg.

Comprobación de búsquedas el 5/10/2026: Google muestra la raíz como primer
resultado web al buscar `propio-shift-tracker.vercel.app`; no se encontró en
la primera página para `propio shift tracker` ni como coincidencia exacta
entre comillas. Esto distingue aparición real por dirección de posicionamiento
por nombre. La inspección confirma último rastreo el 4/10/2026 a las 14:03:12,
obtención correcta y canonical seleccionada igual a la raíz. El informe de
rendimiento aún no sirve para evaluar estos cambios: sus datos procesados
llegaban al 3/10/2026. No atribuir la falta de posición a una causa comprobada
ni prometer un plazo. Evidencia: google-resultado-por-dominio-2026-10-05.jpg.

Desde v590 el contenido describe turnos de interpretación, minutos facturables,
ganancias estimadas y adherencia. Tres preguntas frecuentes explican cálculo,
importación y uso gratuito en móvil. WebSite/WebApplication en JSON-LD describen
la herramienta sin inventar reseñas, estrellas ni afiliación oficial; no se
declara elegibilidad para resultados enriquecidos. Open Graph y Twitter usan
una imagen local de 1200 × 630. Las páginas legales recuperan el responsable y
correo público que el propietario había proporcionado.

La landing carga un bundle compartido en lugar de tres copias de i18n. Las
fuentes externas se cargan sin bloquear el primer render, con fallback sin
JavaScript. El hero queda visible desde el HTML inicial. El detalle de la
auditoría y sus límites figura en [informe original del 04/10](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/seo-audit-2026-10-04.md),
consolidado en [antecedentes](auditoria-profunda-2026-10-17.md#antecedentes-consolidados--18102026).

## Search Console

1. Con la cuenta de Google del propietario, agregar una propiedad de prefijo
   de URL para https://propio-shift-tracker.vercel.app/.
2. Elegir un método de verificación. Si entrega una etiqueta HTML, incorporar
   su valor real al head de index.html; si entrega un archivo, publicarlo también
   desde build.mjs. No usar valores inventados ni poner credenciales en código.
3. Tras verificar, enviar sitemap.xml en Sitemaps e inspeccionar la URL principal.
4. Solicitar indexación si corresponde y revisar errores, impresiones, clics y
   consultas en los informes. Repetir solicitudes no acelera el rastreo.

El 4 de octubre de 2026 se creó y verificó la propiedad real en la cuenta del
propietario usando la etiqueta HTML publicada en v591. Google mostró
«Propiedad verificada». La etiqueta permanece en ambas portadas; no quitarla.

El 4/10 se envió `sitemap.xml` y Google confirmó el envío. El informe mostró
inicialmente «No se ha podido obtener», aunque la prueba en tiempo real
confirmó rastreo permitido y obtención correcta del XML. Se reenvió una vez.
Las portadas entonces figuraban desconocidas para Google; una solicitud de
indexación fue rechazada por «Cuota superada».

El 5 de octubre de 2026 se realizó el reintento autorizado en la cuenta real
antes de su horario programado, a pedido del propietario. El sitemap ya figura
«Correcto», con cuatro páginas descubiertas y última lectura el 4/10/2026.
La inspección de `https://propio-shift-tracker.vercel.app/` y de
`https://propio-shift-tracker.vercel.app/es` muestra «La URL está en Google»
y «La página está indexada». Por estar ambas indexadas, no se solicitó de nuevo
su indexación ni se reenvió el sitemap. No se certifica una posición en las
búsquedas, volumen de impresiones ni clics.

El reintento único está terminado. La automatización
`reintentar-indexaci-n-de-propio-shift-tracker` quedó PAUSED para evitar otra
ejecución a las 13:00 de America/Tegucigalpa. No hay un seguimiento indefinido.
Evidencia visual guardada en los entregables del chat: `google-sitemap-correcto-2026-10-05.jpg`,
`google-portada-en-indexada-2026-10-05.jpg` y `google-portada-es-indexada-2026-10-05.jpg`.

## Guía pública para intérpretes (v601)

El propietario autorizó publicar la guía y añadir enlaces reales desde su
extensión y perfiles públicos el 9/10/2026. Las rutas de la guía son:

- Español: https://propio-shift-tracker.vercel.app/es/guias/turnos-de-interprete
- Inglés: https://propio-shift-tracker.vercel.app/guides/interpreter-shifts

El build entrega un artículo completo sin sesión ni traducción en JavaScript:
horario y tarifa, registro de llamadas, pausas, ganancias por minuto,
adherencia, cierre, exportaciones y dudas frecuentes. Reutiliza el diseño y las
paletas existentes; conserva el idioma de su URL aunque la cuenta tenga otro
guardado. El cambio de tema conserva los demás ajustes, incluso ante fallos de
almacenamiento. Cada versión tiene canonical propio, hreflang recíproco,
Article en JSON-LD, fecha real de publicación e imagen social. La portada
enlaza la versión correspondiente desde su pie; el sitemap incluye ambas.

Cinco regresiones nuevas elevan la suite a 393 pruebas: contenido, idioma,
enlaces, tema y conservación de ajustes, rutas y sitemap. La aparición por
nombre no se certifica con esta publicación. El 9/10 Google mostró ambas
portadas al buscar por dominio, pero no se encontró la herramienta en la
primera página de la búsqueda `propio shift tracker`. No se repitieron
solicitudes manuales ni se reenvió el sitemap.

Revisión local real: ES/EN, modos claro/oscuro, anchuras de 320, 390 y 1.365
píxeles sin overflow, selector de idioma visible, índice con destinos válidos
y enlace de la portada que cambia de ruta junto con el idioma.

El propietario completó los accesos solicitados. Ko-fi confirmó el guardado
del enlace a la portada y del enlace adicional a la guía española, visible en
su página pública. El enlace de la guía lleva `nofollow` según la política de
Ko-fi: sirve para navegación, sin atribuirle una mejora de posición.
Chrome Web Store muestra el registro inicial de desarrollador con acuerdo y
cuota de USD 5 en la cuenta abierta, sin ficha editable. No se aceptó ese
acuerdo ni se pagó la cuota. El propietario confirmó que instala la extensión
desde el archivo descargado; no existe una ficha propia que editar. Este paso
no aplica y no requiere publicar una extensión. No se usó como propia una
extensión de terceros del README.

Despliegue inicial v601 verificado por SHA en ambas guías y portadas, con HTTP
200, assets correctos, redirecciones 308, sitemap de seis páginas y `/app`
con noindex. La primera CI detectó una prueba que exigía archivos de `public/`
antes del build; se corrigió para comprobar rutas y sitemap desde sus fuentes.
El contenido generado se valida por separado en las pruebas del artículo y
en las comprobaciones HTTP del despliegue, sin depender de un build previo.

## Próximas mejoras de contenido

- Ampliar la guía cuando cambien los flujos, conservando pasos y datos reales.
- Revisar resultados de búsqueda cuando Google procese el contenido nuevo;
  no repetir solicitudes manuales por cuota ni prometer un plazo.
- Compartir enlaces auténticos en comunidades pertinentes. No comprar enlaces
  ni crear reseñas, estrellas, afiliación oficial o datos estructurados falsos.

Referencias: [guía SEO de Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing),
[idiomas](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).
