# Revisión de los 20 controles de lanzamiento

Fecha: 10 de octubre de 2026, America/Tegucigalpa. Alcance: aplicación web, API de Vercel, permisos efectivos de Supabase, historial local disponible de Git y dependencias. Los controles corresponden a la imagen proporcionada por el usuario. Esta revisión complementa las auditorías previas; no certifica ausencia absoluta de vulnerabilidades ni cierra SMTP, alertas externas, dispositivos físicos o recuperación completa de OAuth y despliegue.

## Cambios de esta revisión

- El navegador usa la clave pública moderna `sb_publishable_`; no recibe credenciales administrativas.
- Se revocaron permisos anónimos de tablas y RPC de aplicación, acceso de clientes a límites internos y permisos innecesarios de funciones auxiliares. RLS y el acceso del propietario se conservan.
- Login limita el cuerpo a 8 KiB; telemetría, a 16 KiB. Se comprueban cuerpos ya procesados y streams, bytes UTF-8, tipos y longitudes. Las peticiones upstream tienen timeout.
- Los errores de login ya no distinguen una cuenta sin confirmar. Los logs de borrado/login no incluyen respuestas ni excepciones completas del proveedor.
- La telemetría del servidor elimina tokens, claves, contraseñas, correos y parámetros de URLs antes de truncar y almacenar. No constituye detección de toda información personal posible en texto libre.
- La exportación CSV neutraliza texto que una hoja de cálculo podría interpretar como fórmula, conserva números y escapa comillas/separadores.
- CI escanea archivos e historial de texto disponible por patrones de credenciales y rechaza dependencias con avisos altos o críticos. Las acciones externas se fijaron a commits de tags oficiales verificados. Se ignoran archivos de claves y backups exportados.

## Los 20 puntos y su alcance

1. **Ocultar API keys — verificado para secretos.** Las claves administrativas y el secreto de operaciones están en servidor/Vault. Una clave publicable se entrega intencionalmente al navegador; ocultarla no protege la base. Ningún secreto identificado en el escaneo debe publicarse.
2. **Eliminar secretos de Git — escaneo sin hallazgos.** Se revisaron archivos y objetos de texto del historial local disponible. No se encontró una credencial de los patrones reconocidos, por lo que no se reescribió el historial ni se rotaron secretos sin motivo. El escáner no cubre formatos desconocidos ni contenido binario.
3. **Key pública para DB — verificado.** `js/config.js` usa una clave publicable activa del proyecto. La identidad autenticada y RLS determinan el acceso a filas; la clave por sí sola no concede datos privados.
4. **Row-Level Security — verificado.** Todas las tablas públicas tienen RLS. Las diez políticas de aplicación combinan rol autenticado y UID propietario. El usuario ajeno no lee ni escribe las filas del propietario.
5. **Encriptar datos sensibles — parcial por alcance.** El backup externo está cifrado con AES-256-GCM/RSA-OAEP y es privado. HTTPS protege transporte. Las copias offline y el JSON exportado por el usuario siguen en texto legible en el dispositivo; no hay cifrado de extremo a extremo de toda la aplicación.
6. **Forzar autenticación — verificado en rutas de datos.** Auth usa Google; el arranque resuelve la sesión antes de montar la app. Tablas/RPC requieren autenticación y borrado valida el token contra Auth. El modo offline usa la identidad previamente validada; no es una nueva autenticación remota.
7. **Restringir acceso a registros — verificado.** RLS limita filas al propietario. El endpoint de borrado deriva la cuenta del token, sin aceptar un ID de cuenta desde el formulario. Restauración/exportación administrativa no se puede ejecutar desde clientes.
8. **Bloquear manipulación de campos — verificado para campos de confianza.** `WITH CHECK` impide cambiar propietario. `updated_at` lo establece un trigger; hay constraints de tamaño, username y cuota. Rates y ajustes personales son editables por su propietario y no representan cobros verificados por un tercero.
9. **Proteger sesión/cookies — parcial por arquitectura.** PKCE, renovación de sesión, CSP estricta, ausencia de scripts inline y validación de token en borrado están implementados. Los tokens del SDK viven en localStorage y son accesibles a JavaScript del mismo origen: no hay sesión web basada en cookies HttpOnly. Adoptarla requiere cambiar autenticación y sincronización, manteniendo la función offline.
10. **Hashear contraseñas — no aplicable al acceso público actual.** Se usa Google y el proveedor Email está desactivado. La app no almacena contraseñas. Si se habilita Email, Supabase Auth gestiona el hashing; primero faltan SMTP, entrega y pruebas de recuperación.
11. **Rate limiting — verificado en login y telemetría.** Límite compartido persistente de login: 12/min por IP; telemetría: 30/5 min por IP y 600/5 min global. Login falla cerrado si el limitador no responde. Quota de llamadas: 100.000 por usuario. No se promete un límite general de frecuencia para toda consulta directa autenticada a Supabase.
12. **Protección contra bots — registro activo, alcance parcial.** DDoS de plataforma y límites de endpoints son las defensas actuales. Bot Protection se cambió de `off` a `log`, tras revisar el único cambio y obtener autorización explícita del usuario para publicarlo. Registrar no equivale a bloquear bots. La fase posterior de desafíos requiere revisar tráfico, probar OAuth, monitor/cron y API antes de activarla.
13. **Parametrizar queries — verificado.** Formularios llaman SDK/RPC con parámetros; restauración usa consultas parametrizadas e identificadores validados. No se concatena texto de formularios para ejecutar SQL arbitrario.
14. **Validar inputs — reforzado y probado.** Login comprueba objeto, cadenas y longitud; el lector limita tamaño; el importador valida estructura; PostgreSQL impone límites aunque el cliente sea modificado. Esto no valida que cada número ingresado refleje un hecho real del turno.
15. **Sanitizar contenido — reforzado y probado.** Texto dinámico se escapa para HTML; CSP bloquea scripts/eventos inline. CSV neutraliza fórmulas y telemetría redacciona credenciales antes de almacenar. Las pruebas incluyen payloads maliciosos; no se afirma cobertura exhaustiva de todo sink.
16. **Restringir archivos — verificado en el flujo actual.** Importación JSON hasta 8 MiB con validación estructural; audios hasta 300 KiB, tipo audio y presupuesto agregado de ajustes de 1 MiB. Se manejan como datos/audio local, sin ejecución de archivos en servidor. MIME no es un antivirus ni certifica el contenido de un archivo.
17. **Devolver datos necesarios — verificado.** Health devuelve estado y versión; login sólo sesión; borrado, resultado; operaciones están protegidas. Tablas internas, correos por username y exportación administrativa no quedan disponibles a visitantes.
18. **Security headers — verificado en producción.** CSP aplicada, HSTS, nosniff, DENY de frames, Permissions-Policy y Referrer-Policy. La ruta de app usa no-store. CSP conserva estilos inline necesarios, pero no permite scripts inline/eval.
19. **Forzar HTTPS — verificado en producción.** Dominio Vercel con redirección HTTP→HTTPS y HSTS. Supabase usa HTTPS/WSS; restauración remota exige TLS con verificación de certificado.
20. **Escanear dependencias — verificado y automatizado en CI.** Audit de pnpm: cero avisos conocidos en la consulta de esta revisión. Lockfile, paquetes fijados y acciones por commit. CI rechaza avisos altos/críticos; avisos nuevos pueden aparecer después y necesitan atención.

## Evidencia y operación

Las pruebas específicas ejecutan lectores reales, exportador CSV real, aislamiento/owner sync en PostgreSQL y distinción de errores de login. El proyecto Supabase de ensayo verificó owner sync y rechazos de acceso con rollback, sin modificar datos de producción. Producción conserva los cinco controles de readiness correctos después de la migración.

Comandos reproducibles:

```sh
node scripts/scan-secrets.mjs --history
pnpm audit --audit-level high
node --test tests/launch-security.test.mjs
pnpm test
pnpm build
```

Bot Protection está publicado en modo `log`. Revisar el tráfico en [Vercel Firewall](https://vercel.com/jonathanvelasquez787-commits-projects/propio-shift-tracker/firewall) antes de añadir desafíos. El rollout posterior debe conservar acceso legítimo y trabajos automáticos; no activar desafíos globales sin probar estos recorridos.

Validación completa local: 423/423 pruebas; CI previo al último cambio de documentación: 423/423, compilación de app y extensiones y ambos escaneos correctos. Las fixtures de Logros fijan el reloj: antes podían fallar los primeros minutos después de medianoche UTC al construir llamadas relativas de otro día.

Referencias oficiales: [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [seguridad Data API](https://supabase.com/docs/guides/api/securing-your-api), [contraseñas](https://supabase.com/docs/guides/auth/password-security), [Bot Management](https://vercel.com/docs/bot-management). El backup y sus límites operativos están documentados en `docs/production-recovery.md`.
