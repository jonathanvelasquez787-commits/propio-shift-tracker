# Operación y recuperación

El acceso público usa Google. Email está desactivado en Supabase y `EMAIL_AUTH_READY=false`: no hay registro, recuperación ni cambios de correo que prometan mensajes sin SMTP. Para añadirlos, primero configurar y verificar SMTP y después activar ambos lados. No hace falta comprar un dominio para la versión que usa Google.

## Monitor

Supabase cron llama cada cinco minutos a `/api/operations?mode=monitor`, autenticado con un secreto de Vault que coincide con `CRON_SECRET` en Vercel. Comprueba readiness de SQL y la app pública con CSP/HSTS. Un segundo cron recoge cada minuto las respuestas fallidas o ausentes y evita que un fallo antiguo borre un éxito posterior. `/api/health` devuelve 503 si el monitor lleva más de 15 minutos sin éxito o el backup externo más de 26 horas. La app consulta ese estado y muestra un aviso cuando falla. GitHub Actions conserva una segunda comprobación y sus notificaciones de fallo; su scheduler no garantiza la cadencia del monitor principal.

No se garantiza entrega por correo o SMS ni vigilancia independiente de una caída simultánea de Supabase y Vercel. El aviso en la app y el estado HTTP público sí están implementados. Configurar un destinatario externo requiere que el propietario elija ese canal.

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

El script rechaza el identificador del proyecto de producción actual y cualquier destino con usuarios o datos. Usa una transacción; valida los conteos y revierte todo si falla. Se mantienen las identidades, payloads, ajustes y backups; las cuotas se derivan mediante los triggers. No restaura sesiones activas, secretos de proveedores, archivos de servicios externos o métricas. El operador debe verificar login Google, RLS, horario y ganancias en ese destino antes de promoverlo. RTO de un desastre alojado no está medido: la prueba local mide sólo la reconstrucción de datos.

El historial `0001`–`0004` se registró como baseline tras comparar funciones y columnas de producción; no se reaplicaron esas migraciones a datos reales. Las cuatro migraciones posteriores usan las mismas versiones que Supabase. Cambios nuevos siempre van en un archivo nuevo.
