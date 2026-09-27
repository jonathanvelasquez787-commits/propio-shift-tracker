# Preparación de Content Security Policy

`vercel.json` envía `Content-Security-Policy`. El navegador bloquea scripts,
conexiones y recursos que no aparezcan en la lista permitida. No hay un
endpoint de reportes ni recopilación centralizada de violaciones.

Los scripts propios se sirven como archivos de `js/`. `theme-init.js` se
carga de forma bloqueante en el `<head>` para aplicar el tema antes de pintar;
no lee la cuenta ni modifica los ajustes. El reporte PDF registra su botón de
impresión con `addEventListener`, sin un atributo `onclick`.

La política admite el CDN actual de Supabase (jsDelivr), las conexiones HTTPS
y WebSocket al proyecto configurado y las fuentes de Google. Conserva estilos
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

Validación disponible para el agente: `npm test` y `npm run check:modules`.
No hay pasos técnicos que deba ejecutar el usuario.

Referencias: [CSP en MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy),
[Vercel Toolbar y CSP](https://vercel.com/docs/vercel-toolbar/managing-toolbar).
