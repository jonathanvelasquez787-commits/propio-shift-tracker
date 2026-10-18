# Propio Shift Tracker

Registro personal de turnos, pausas, llamadas y ganancias para intérpretes.
Incluye adherencia, Higher Rate, finanzas, calendario, reportes y gamificación
opcional. La entrada pública usa **Google**; correo/contraseña y usuario/contraseña
no están habilitados como métodos públicos de acceso.

La extensión unificada conecta el portal de Propio con el tracker, sincroniza
llamadas e historial oficial y permite configurar disponibilidad automática,
vista original del portal y distribución de ventanas. La disponibilidad pulsa
Start Calls o Stop Calls bajo sus condiciones; no acepta ni rechaza llamadas.

## Documentación

- [Lista de mejoras aprobadas](docs/plan-mejoras-integrales.md): estado individual y evidencia de cada entrega.
- [Guía práctica de funciones](docs/guia-practica-tool-y-extension.md): qué hace
  cada función, qué se configura y un ejemplo real.
- [Extensión actual](extension/propio-bridge/README.md): instalación, permisos,
  automatismos, prioridades y límites.
- [Instrucciones del proyecto](instrucciones.md): protocolos y pendientes.
- [Auditoría actual y antecedentes](docs/auditoria-profunda-2026-10-18.md):
  evidencia fechada, correcciones y límites.
- [Criterios de publicación](docs/production-readiness.md),
  [operación](docs/production-operations.md),
  [recuperación](docs/production-recovery.md) y
  [política de seguridad](docs/security-policy.md).

## Organización y fuentes

```text
index.html                Fuente de las portadas públicas ES/EN
app.html                  Marcado fuente de la app
css/                      Estilos base, temas, shell y páginas
js/                       Lógica, autenticación, sincronización e idiomas
api/, lib/                Funciones del servidor y utilidades compartidas
extension/propio-bridge/   Única extensión mantenida
windows/                  Iniciador nativo de Chrome y Notas
scripts/                  Build, instalación local y verificaciones
supabase/migrations/      Historial SQL y políticas de acceso
tests/                    Regresiones, integración y simulaciones
docs/                     Guías y referencias de mantenimiento
```

`app.html`, `js/app-main.js` y `js/boot.js` son las fuentes de la app. El build
usa Rollup y Terser para generar `public/`, sin sourcemaps públicos. Solo esa
carpeta se publica; es un resultado generado y no se incluye en Git. Los recursos
que recibe el navegador siguen siendo inspeccionables.

El arranque verifica la sesión y prepara los datos de su cuenta antes de montar
la aplicación. El tema se aplica antes de pintar. No se mantiene una copia
congelada del HTML ni una segunda extensión de resumen independiente.

## Desarrollo y comprobaciones

El agente realiza los cambios, las verificaciones y la publicación. La persona
usuaria no necesita editar archivos ni ejecutar comandos. Referencia técnica:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm build:extension
```

El catálogo de navegador `js/locales.generated.js` se genera desde `locales/`
al ejecutar pruebas o build y no se guarda en Git. Después de un checkout nuevo,
`pnpm test` o `pnpm build` lo preparan automáticamente.

El build comprueba traducciones, exports, controles y la
[matriz de criterios](docs/production-criteria.json). CI añade escaneo de
credenciales en el historial y auditoría de dependencias, y compila la app y
la extensión activa. La salida predeterminada de esta última es
`work/propio-bridge/`, también excluida de Git.

Para servir el resultado localmente se necesita HTTP: los módulos no cargan
desde `file://`. Un servidor estático permite revisar `public/`; las funciones
de `api/` requieren un entorno como `vercel dev`.

## Datos y seguridad

El servidor guarda estado y ajustes en `user_data`, y llamadas en `calls`, con
políticas de acceso por cuenta. La copia local conserva su propietario y permite
recuperación limitada sin red. No garantiza funcionamiento con la PC suspendida
ni evita que el navegador demore tareas en segundo plano.

La sincronización compara revisiones y envía cambios de llamadas. Si dos copias
divergen, solicita elegir una; no mezcla silenciosamente estados. Un guardado
rechazado debe conservar su error y no anunciar éxito por un acuse anterior.
Las migraciones y regresiones se conservan aunque se consoliden informes antiguos.

`js/config.js` contiene URL y clave pública del cliente. Las claves privilegiadas
solo corresponden al entorno del servidor y nunca al repositorio ni al navegador.
El endpoint heredado de acceso por correo/usuario mantiene sus protecciones; los
formularios deshabilitados se retiraron. Se conserva recuperación de enlaces emitidos. CSP y demás controles se documentan en la política de seguridad.

## Configuración local de Windows

`scripts/install-desktop-workspace.ps1` configura el iniciador de `windows/`
con el perfil, accesos y archivo de notas de esa PC. Abrir la web no instala ni
cambia accesos de Windows. Esta configuración es independiente del despliegue
de Vercel y de los datos de la cuenta.

## Licencia

Software propietario. Ver [LICENSE](LICENSE).
