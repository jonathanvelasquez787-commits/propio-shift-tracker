# Visibilidad en Google

La página pública es https://propio-shift-tracker.vercel.app/. La landing y las
páginas legales declaran su URL canonical; robots.txt permite rastreo y apunta
al sitemap.xml con esas tres páginas. El build copia ambos archivos a public/.
La app de cuenta (/app y /app.html) lleva noindex en HTML y cabecera HTTP; no se
incluye en el sitemap. Noindex no reemplaza la autenticación ni RLS.

Estas ayudas no garantizan indexación ni posiciones. La landing ya entrega
contenido estático, título, descripción y enlaces sin necesitar una sesión.
Google puede cambiar el título y la descripción que muestra en resultados.

## Search Console

1. Con la cuenta de Google del propietario, agregar una propiedad de prefijo
   de URL para https://propio-shift-tracker.vercel.app/.
2. Elegir un método de verificación. Si entrega una etiqueta HTML, incorporar
   su valor real al head de index.html; si entrega un archivo, publicarlo también
   desde build.mjs. No usar valores inventados ni poner credenciales en código.
3. Tras verificar, enviar sitemap.xml en Sitemaps e inspeccionar la URL principal.
4. Solicitar indexación si corresponde y revisar errores, impresiones, clics y
   consultas en los informes. Repetir solicitudes no acelera el rastreo.

La verificación y solicitud no están hechas: requieren acceso a la propiedad
real. La ausencia en una búsqueda pública no prueba que el sitio no esté indexado.

## Próximas mejoras de contenido

- Describir claramente el uso para intérpretes: llamadas, ganancias estimadas,
  ciclos, calendario y reportes. Usar frases naturales, sin repetir palabras clave.
- Publicar guías útiles sobre esos flujos y enlazarlas desde la landing cuando
  el usuario apruebe su contenido y presentación.
- Para SEO bilingüe estable, servir URLs separadas con contenido de cada idioma
  y hreflang real. El selector actual cambia ES/EN en la misma URL; no declarar
  alternates ficticios ni prometer que Google indexe ambas versiones.
- Compartir enlaces auténticos en comunidades pertinentes. No comprar enlaces
  ni crear reseñas, estrellas, afiliación oficial o datos estructurados falsos.

Referencias: [guía SEO de Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide),
[sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing),
[idiomas](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites).
