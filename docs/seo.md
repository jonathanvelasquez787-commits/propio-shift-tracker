# Visibilidad en Google

La página pública es https://propio-shift-tracker.vercel.app/ en inglés y
https://propio-shift-tracker.vercel.app/es en español. El build genera HTML
completo por idioma, con títulos, descripciones, canonical y hreflang recíproco
en/es/x-default. El selector conserva el formulario de acceso y sincroniza la
dirección y los metadatos. Una preferencia guardada puede abrir la portada en
español; `/es` siempre elige español, incluso sin almacenamiento disponible.
Las páginas legales también declaran canonical. robots.txt permite rastreo y
apunta al sitemap.xml con esas cuatro páginas; ambos se copian a public/.
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
auditoría y sus límites figura en `seo-audit-2026-10-04.md`.

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

Se envió `sitemap.xml` y Google confirmó el envío. El informe mostró después
«No se ha podido obtener». La inspección en tiempo real del propio Google
confirmó rastreo permitido y obtención correcta del archivo, que además
responde 200 como application/xml y contiene cuatro URLs válidas. Tras esa
comprobación se reenvió una vez; falta confirmar su procesamiento en el informe.

La inspección del índice mostró `/` y `/es` aún sin indexar («Google no reconoce
esta URL»). Las pruebas de ambas portadas confirmaron «La URL está disponible
para Google». Al solicitar indexación, Google rechazó la solicitud por
«Cuota superada» y pidió reintentar mañana. No se completó una solicitud aceptada
ni se certifica indexación o posición en resultados.

El propietario autorizó un único reintento automático para el 5 de octubre de
2026 a las 13:00, America/Tegucigalpa, en este chat. La automatización
`reintentar-indexaci-n-de-propio-shift-tracker` revisará el sitemap, solicitará
ambas portadas y notificará el resultado real. Si exige iniciar sesión o un
CAPTCHA, se informará del bloqueo. No repetir solicitudes en bucle.

## Próximas mejoras de contenido

- Publicar guías útiles sobre esos flujos y enlazarlas desde la landing cuando
  el usuario apruebe su contenido y presentación.
- Compartir enlaces auténticos en comunidades pertinentes. No comprar enlaces
  ni crear reseñas, estrellas, afiliación oficial o datos estructurados falsos.

Referencias: [guía SEO de Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing),
[idiomas](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).
