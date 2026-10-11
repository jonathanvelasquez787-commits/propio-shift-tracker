# Operación y recuperación

El acceso público usa Google. Por decisión del propietario del 10/10/2026, Email permanece desactivado en Supabase y `EMAIL_AUTH_READY=false`. Registro y recuperación por correo quedan fuera del alcance de lanzamiento; SMTP no es un pendiente del producto actual. No hace falta comprar un dominio para la versión que usa Google.

## Monitor

Supabase cron llama cada cinco minutos a `/api/operations?mode=monitor`, autenticado con un secreto de Vault que coincide con `CRON_SECRET` en Vercel. Comprueba readiness de SQL y la app pública con CSP/HSTS. Un segundo cron recoge cada minuto las respuestas fallidas o ausentes y evita que un fallo antiguo borre un éxito posterior. `/api/health` devuelve 503 si el monitor lleva más de 15 minutos sin éxito o el backup externo más de 26 horas. La app consulta ese estado y muestra un aviso cuando falla. GitHub Actions conserva una segunda comprobación y sus notificaciones de fallo; su scheduler no garantiza la cadencia del monitor principal.

El propietario eligió avisos externos en Codex. Un heartbeat local activo comprueba cada quince minutos el estado público y la app, independientemente de los jobs de Supabase/Vercel. Confirma un fallo con un segundo intento después de diez segundos; informa fallos nuevos o diferentes y recuperaciones, y evita avisos repetidos. No envía datos de usuarios ni necesita SMTP. Depende de que Codex y el equipo estén disponibles; no garantiza vigilancia cuando estén apagados, ni entrega por correo/SMS. GitHub continúa como control secundario.

La comprobación reproducible es `node scripts/external-monitor.mjs /ruta/absoluta/privada/monitor-state.json`. Conserva sólo fecha, estado, versión pública y categorías de fallo. Sus pruebas incluyen fallo de readiness con HTTP 200, errores de gateway, fallo de red, reintento transitorio, deduplicación y recuperación.

## Backup externo

Vercel cron ejecuta `/api/operations` cada día a las 05:27 UTC (23:27 del día anterior en Tegucigalpa). Exporta usuarios, identidades, perfiles, datos, llamadas, snapshots internos y un manifiesto de esquema. Comprime y cifra con AES-256-GCM y una clave de datos nueva; RSA-OAEP-SHA256 protege esa clave con `BACKUP_PUBLIC_KEY`. Vercel y Supabase nunca reciben la clave privada de descifrado.

Las copias inmutables `recovery/YYYY-MM-DD.json` están en el Blob privado `propio-recovery`, conectado sólo a producción mediante OIDC. Retención: 31 días. Cada envoltura está limitada a 8 MiB y el job falla visiblemente al excederlo; el límite no es una promesa de capacidad ilimitada. RPO objetivo de esta copia: 24 horas; los snapshots internos se ejecutan diez minutos antes. Aumentar la capacidad necesita una decisión de almacenamiento, no quitar las guardas.

Guardar `propio-recovery-private-key.pem` en dos ubicaciones privadas fuera de este equipo. No subirlo al repositorio, Vercel, Supabase ni al chat. Perder todas las copias de esa clave vuelve irrecuperables estos archivos. El cifrado usa Node estándar y no depende de un usuario o perfil Windows.

## Ensayo y restauración

`node --test tests/production-postgres.test.mjs` construye dos bases Postgres PGlite, ejecuta las migraciones reales, verifica RLS y conflictos, escribe 10.000 llamadas, restaura un snapshot y reconstruye seis tablas desde un bundle en la base vacía. Auth y las interfaces de cron/net son fixtures; esto no representa una restauración completa de un proyecto Supabase alojado ni un ensayo de OAuth en dos dispositivos físicos.

Para verificar un backup real sin escribir datos descifrados al disco:

```sh
node scripts/recover-portable-backup.mjs backup.encrypted.json propio-recovery-private-key.pem
```

Para recuperación operativa: elegir un proyecto Supabase vacío, aplicar las migraciones del repositorio, configurar Google y sus redirects y las variables de Vercel para ese destino. Obtener su conexión SQL con TLS desde el dashboard y definir `RECOVERY_DATABASE_URL` en un entorno privado. Ejecutar:

```sh
node scripts/restore-portable-backup.mjs backup.encrypted.json propio-recovery-private-key.pem --empty-recovery-target
```

El script rechaza el identificador del proyecto de producción actual y cualquier destino con usuarios o datos. Usa una transacción; valida los conteos y revierte todo si falla. Se mantienen las identidades, payloads, ajustes y backups; las cuotas se derivan mediante los triggers. No restaura sesiones activas, secretos de proveedores, archivos de servicios externos o métricas. El operador debe verificar login Google, RLS, horario y ganancias en ese destino antes de promoverlo. El RTO del servicio completo sigue sin medirse; el ensayo siguiente acredita la recuperación de esquema y datos alojados.

Para reconstruir también el despliegue, `scripts/prepare-recovery-deployment.mjs` recibe el ref de destino, su clave publicable y una carpeta absoluta nueva fuera del repositorio. Copia exclusivamente archivos Git rastreados, rechaza secretos y enlaces simbólicos, cambia la configuración pública y CSP al destino y elimina los cron del ensayo. Verifica que Email y acceso anónimo estén desactivados. No copia claves administrativas, secretos OAuth ni la clave privada del backup. Configure Google, redirects y secretos de servidor exclusivamente para ese proyecto antes de validar el servicio completo.

El historial `0001`–`0004` se registró como baseline tras comparar funciones y columnas de producción; no se reaplicaron esas migraciones a datos reales. Las cuatro migraciones posteriores usan las mismas versiones que Supabase. Cambios nuevos siempre van en un archivo nuevo.

## Ensayo alojado completado: 10 de octubre de 2026

Destino vacío: `propio-recovery-drill` (`qcvdexkkrwfkbxkmnohl`), PostgreSQL 17.11, en la misma organización Free con límite de gasto activado. Se reconstruyeron las ocho migraciones y se restauró el backup cifrado real del 10/10 a las 19:15:23 UTC mediante una única transacción SQL usando las consultas de la librería de restauración. La clave privada permaneció local.

Resultado: una cuenta, una identidad, un perfil, una fila de datos, cero llamadas normalizadas y 13 snapshots. Las 14 llamadas del blob heredado se conservaron. Se compararon las columnas no generadas y los payloads; las revisiones `updated_at` de la aplicación se regeneran durante el restore. El propietario pudo leer sus datos bajo RLS y otra identidad no pudo leerlos. La API anónima rechazó perfiles, datos y exportación privada con HTTP 401.

Duración observada: 6 min 26 s para reconstruir, importar y comprobar mediante el conector, incluidos los reintentos del script de ensayo; la transacción final y su ida/vuelta duraron 1,67 s. Estos tiempos excluyen aprovisionar el proyecto, configurar OAuth, cambiar Vercel y validar login; no son el RTO de todo el servicio.

Los cron del ensayo se retiraron con `cron.unschedule(jobid)`, para evitar trabajos automáticos o solicitudes al monitor de producción. En Supabase alojado, modificar directamente `cron.job` requiere permisos que el rol de operación no tiene. Al recrear un destino de ensayo, retirar sus jobs dentro de la migración que los crea. Para una recuperación operativa, configurar los secretos y destinos antes de programarlos de nuevo. El ensayo no modificó datos de producción.
