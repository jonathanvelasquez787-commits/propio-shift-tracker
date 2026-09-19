# Pruebas de humo

La red de seguridad de la Fase 0. Antes de v540 este QA se armaba a mano en
cada versión; ahora corre con un comando y se puede repetir después de cada
paso de la refactorización.

## Instalar (una vez)

```bash
pip install -r tests/requirements.txt
playwright install chromium
```

## Correr

```bash
pytest tests/smoke.py -q                   # todo
pytest tests/smoke.py -q -k reference      # solo el v539 congelado
pytest tests/smoke.py -q -k app            # solo el app.html generado
pytest tests/smoke.py -q -k "390"          # solo mobile
```

## Qué cubre

| Prueba | Qué garantiza |
|---|---|
| `test_carga_sin_errores` | 0 `pageerror` / `console.error` en 2 zonas horarias × 2 anchos |
| `test_paginas_del_sidebar` | Las 6 páginas se muestran sin romper nada |
| `test_modales_abren_atrapan_foco_y_cierran` | Los 16 modales abren, retienen el foco con 12 Tab y cierran con Escape |
| `test_sin_desborde_horizontal` | `scrollWidth <= innerWidth` en cada página, a 1280 y 390 px |
| `test_migracion_de_datos_viejos` | `breaks[]`→`blocks[]`, fechas sin ceros, claves de semana, basura descartada, ids asignados |
| `test_popup_de_bienvenida_en_perfil_nuevo` | Un perfil vacío ve el onboarding y puede completarlo |
| `test_gate_de_sesion_bloquea_la_app` | Sin sesión, `app.html` no ejecuta una sola línea de la app |
| `test_landing_carga_y_muestra_formularios` | La landing funciona incluso sin Supabase configurado |
| `test_paginas_legales_cargan` | Privacidad y Términos cargan; avisa si quedan marcadores `[TU ...]` |
| `test_app_html_esta_al_dia` | `app.html` coincide con lo que genera el script desde el congelado |

## Dos objetivos

Cada prueba de app corre dos veces:

- **`reference`** — el archivo congelado `reference/propio_shift_tracker_Fixed_v539.html`.
  Es la app pura, sin cuentas. Si algo falla acá, se rompió la lógica.
- **`app`** — el `app.html` generado, con el gate de sesión puenteado a mano
  (las pruebas anulan `boot.js` y montan el script igual que `mountApp()`).
  Si falla acá pero no en `reference`, se rompió el envoltorio de sesión.

## Nota

Estas pruebas NO tocan Supabase: no hacen login ni suben nada. Probar el
sincronizado de verdad requiere un proyecto real y va aparte (ver `SETUP.md`,
"Lista de verificación").
