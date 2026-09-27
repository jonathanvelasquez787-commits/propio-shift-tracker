# Preparación de Content Security Policy

`vercel.json` envía `Content-Security-Policy-Report-Only`. La política genera
avisos en la consola del navegador, pero todavía no bloquea recursos. No hay
un endpoint de reportes ni recopilación centralizada de esos avisos.

Los scripts propios se sirven como archivos de `js/`. `theme-init.js` se
carga de forma bloqueante en el `<head>` para aplicar el tema antes de pintar;
no lee la cuenta ni modifica los ajustes. El reporte PDF registra su botón de
impresión con `addEventListener`, sin un atributo `onclick`.

La política admite el CDN actual de Supabase (jsDelivr), las conexiones HTTPS
y WebSocket al proyecto configurado y las fuentes de Google. Conserva estilos
inline porque la app usa tanto `<style>` como estilos dinámicos. Los audios
personalizados y los recursos locales pueden usar `data:` y `blob:`. JavaScript
inline y `eval` quedarían bloqueados al pasar a aplicación efectiva.

Antes de cambiar el encabezado a `Content-Security-Policy`, verificar en una
preview de Vercel los tres accesos (Google, correo y username), recuperación,
retorno OAuth, sincronización, edición de cuenta, audio y exportación PDF.
Revisar también la consola: Vercel Toolbar puede necesitar una política propia
para previews; no ampliar la lista de orígenes de producción solo por la barra.
La comprobación local no sustituye esos flujos con una cuenta real.

Validación disponible para el agente: `npm test` y `npm run check:modules`.
No hay pasos técnicos que deba ejecutar el usuario.

Referencias: [CSP en MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy),
[Vercel Toolbar y CSP](https://vercel.com/docs/vercel-toolbar/managing-toolbar).
