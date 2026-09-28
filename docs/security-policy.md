# Preparación de Content Security Policy

`vercel.json` envía `Content-Security-Policy`. El navegador bloquea scripts,
conexiones y recursos que no aparezcan en la lista permitida. Los errores de
ejecución se envían a `/api/telemetry`, que elimina correos, limita el volumen
por IP y los guarda en una tabla privada de Supabase.

Los scripts de producción se sirven desde `assets/`, empaquetados y minificados
sin sourcemaps. Los módulos fuente de `js/` no se publican. `theme-init.js` se
carga de forma bloqueante en el `<head>` para aplicar el tema antes de pintar;
no lee la cuenta ni modifica los ajustes. El reporte PDF registra su botón de
impresión con `addEventListener`, sin un atributo `onclick`.

El cliente de Supabase está incluido dentro del bundle, así que `script-src`
solo admite el mismo origen. La política permite las conexiones HTTPS y
WebSocket al proyecto configurado y las fuentes de Google. Conserva estilos
inline porque la app usa tanto `<style>` como estilos dinámicos. Los audios
personalizados y los recursos locales pueden usar `data:` y `blob:`. JavaScript
inline y `eval` quedarían bloqueados al pasar a aplicación efectiva.

La política se activó después de verificar con una cuenta real el acceso con
Google, el retorno OAuth, la carga del perfil, una ida y vuelta de tema con
guardado en la nube, la activación de audio y la generación del reporte PDF.
El navegador no registró errores ni avisos durante el recorrido. Correo,
username y recuperación comparten el mismo cliente y los mismos orígenes, pero
no se enviaron contraseñas ni correos de recuperación durante esta prueba.

Vercel Toolbar puede necesitar una política propia en previews; no ampliar la
lista de orígenes de producción solo por la barra.

Validación disponible para el agente: `npm test`, `npm run check:modules` y
`npm run build`.
No hay pasos técnicos que deba ejecutar el usuario.

Referencias: [CSP en MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy),
[Vercel Toolbar y CSP](https://vercel.com/docs/vercel-toolbar/managing-toolbar).
