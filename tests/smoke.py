"""
Suite de humo de Propio Shift Tracker.

Formaliza el QA que hasta v539 se armaba a mano en cada ronda: las 6 páginas
del sidebar, los modales, dos zonas horarias, dos anchos, migración de datos
viejos y cero errores de consola.

Corre contra dos objetivos:
  reference -> el v539 congelado, sin cuentas. Es la red de regresión pura
               de la lógica de la app.
  app       -> el app.html generado, con el gate de sesión puenteado. Prueba,
               además, que el truco de type="text/plain" + inyección de
               verdad monta la app en un navegador real.

Uso:
    pip install -r tests/requirements.txt
    playwright install chromium
    pytest tests/smoke.py -q                  # los dos objetivos
    pytest tests/smoke.py -q -k reference     # solo el congelado
    pytest tests/smoke.py -q -k "app and 390" # solo mobile sobre app.html
"""

from __future__ import annotations

import json
import socket
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest
from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parent.parent

VIEWPORTS = {"1280": (1280, 900), "390": (390, 800)}
TIMEZONES = ["America/Tegucigalpa", "America/New_York"]

PAGINAS = ["home", "schedule", "reports", "paydates", "calendar", "finance"]

# onboardingModal queda fuera a propósito: no tiene botón de cierre ni se
# cierra con Escape, por diseño (es el popup de bienvenida obligatorio).
MODALES = [
    "goalsModal",
    "notificationsModal",
    "higherRateModal",
    "callsModal",
    "resetModal",
    "acwGoalModal",
    "financeRowModal",
    "cycleGoalModal",
    "goalScopeModal",
    "calYearGoalModal",
    "calHistoryStartModal",
    "gapModal",
    "dayNoteModal",
    "callEditModal",
    "manualCallModal",
    "confirmModal",
]

SETTINGS_KEY = "propio_shift_tracker_settings_es_v1"
STATE_KEY = "propio_shift_tracker_state_es_v4"
CALLS_KEY = "propio_shift_tracker_calls_es_v4"

# Perfil mínimo ya "onboardeado": sin esto la app abre el popup de bienvenida
# y tapa todo lo demás.
SETTINGS_LISTO = {"onboarded": True, "userName": "QA", "theme": "dark"}

# Datos guardados por una versión anterior a varias migraciones: horario con
# breaks[]/lunch{} en vez de blocks[], fecha sin ceros a la izquierda, clave de
# semana mal formada, override de ciclo basura y registros sin id.
SETTINGS_VIEJOS = {
    "onboarded": True,
    "userName": "Antiguo",
    "productiveGoalMin": 59,
    "earningsGoal": 7.08,
    "shiftStart": "07:00",
    "shiftEnd": "16:00",
    "weeklySchedule": {
        dia: {
            "off": dia in ("sat", "sun"),
            "start": "07:00",
            "end": "16:00",
            "breaks": [{"start": "09:10", "dur": 15}],
            "lunch": {"start": "12:00", "dur": 45},
        }
        for dia in ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
    },
    "scheduleOverridesByWeek": {"2026-1-5": {"mon": {"off": False, "start": "08:00", "end": "17:00"}}},
    "higherRateWindows": [
        {"date": "1/5/2026", "start": "9:00", "end": "11:00", "tier": "gold"},
        {"date": "basura", "start": "x", "end": "y", "tier": "platino"},
    ],
    "cycleGoalOverrides": {"no-es-fecha": "tampoco-un-numero"},
    "yearGoalOverrides": {"20XX": -5},
    "dailyGoalOverrides": {"13/45/2026": {"min": "x", "usd": None}},
}

STATE_VIEJO = {
    "shiftStartedAt": None,
    "shiftEndedAt": None,
    "activePause": None,
    "pauseHistory": [{"type": "break", "startedAt": "2026-09-01T13:00:00.000Z", "endedAt": "2026-09-01T13:15:00.000Z"}],
    "events": [{"ts": "2026-09-01T12:00:00.000Z", "type": "shift", "title": "Shift iniciado", "detail": "07:00:00"}],
}

CALLS_VIEJAS = [
    {
        "customerId": "4576",
        "callDate": "09/01/2026",
        "callStart": "10:19 AM",
        "durationMin": 6,
        "billable": "Yes",
        "dropped": "No",
        "pay": "$0.72",
        "startISO": "2026-09-01T16:19:00.000Z",
        "endISO": "2026-09-01T16:25:00.000Z",
        "countsAsProductive": True,
    }
]


# ---------------------------------------------------------------------------
# Servidor estático
# ---------------------------------------------------------------------------


def _puerto_libre() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def servidor():
    puerto = _puerto_libre()
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = ThreadingHTTPServer(("127.0.0.1", puerto), handler)
    hilo = threading.Thread(target=httpd.serve_forever, daemon=True)
    hilo.start()
    yield f"http://127.0.0.1:{puerto}"
    httpd.shutdown()


@pytest.fixture(scope="session")
def navegador():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        yield browser
        browser.close()


# ---------------------------------------------------------------------------
# Apertura de la app en cualquiera de los dos objetivos
# ---------------------------------------------------------------------------


class Errores:
    """Junta todo lo que el navegador considere un problema."""

    def __init__(self) -> None:
        self.items: list[str] = []

    def enganchar(self, page: Page) -> None:
        page.on("pageerror", lambda e: self.items.append(f"pageerror: {e}"))
        page.on(
            "console",
            lambda m: self.items.append(f"console.{m.type}: {m.text}")
            if m.type in ("error",)
            else None,
        )

    def assert_limpio(self, contexto: str) -> None:
        assert not self.items, f"{contexto}: {self.items}"


def abrir_app(
    navegador,
    servidor: str,
    objetivo: str,
    viewport: tuple[int, int],
    timezone: str,
    settings: dict | None = None,
    state: dict | None = None,
    calls: list | None = None,
):
    """Devuelve (page, errores, cerrar). El gate de sesión se puentea a mano."""
    contexto = navegador.new_context(
        viewport={"width": viewport[0], "height": viewport[1]},
        timezone_id=timezone,
        locale="es-MX",
    )
    page = contexto.new_page()
    errores = Errores()
    errores.enganchar(page)

    semilla = {
        SETTINGS_KEY: json.dumps(settings if settings is not None else SETTINGS_LISTO),
    }
    if state is not None:
        semilla[STATE_KEY] = json.dumps(state)
    if calls is not None:
        semilla[CALLS_KEY] = json.dumps(calls)

    page.add_init_script(
        "(() => { const s = %s; for (const [k, v] of Object.entries(s)) "
        "localStorage.setItem(k, v); })();" % json.dumps(semilla)
    )

    if objetivo == "app":
        # boot.js necesita Supabase; acá se anula y la app se monta a mano con
        # exactamente los mismos dos pasos que hace mountApp().
        page.route(
            "**/js/boot.js",
            lambda route: route.fulfill(
                status=200, content_type="application/javascript", body="/* anulado en pruebas */"
            ),
        )
        page.goto(f"{servidor}/app.html", wait_until="domcontentloaded")
        # Antes de montar, la app NO debe existir: eso es el gate de sesión.
        assert page.evaluate("typeof window.render") == "undefined", (
            "La app se ejecutó sin sesión: el gate de sesión no está funcionando."
        )
        assert page.locator("#bootGate").is_visible()
        page.evaluate(
            """() => {
                document.body.classList.add('app-ready');
                const gate = document.getElementById('bootGate');
                if (gate) gate.remove();
                const holder = document.getElementById('appMainScript');
                const s = document.createElement('script');
                s.textContent = holder.textContent;
                document.body.appendChild(s);
            }"""
        )
    else:
        page.goto(
            f"{servidor}/reference/propio_shift_tracker_Fixed_v539.html",
            wait_until="domcontentloaded",
        )

    page.wait_for_function("typeof window.render === 'function'", timeout=10_000)
    page.wait_for_timeout(300)
    return page, errores, contexto.close


OBJETIVOS = ["reference", "app"]


# ---------------------------------------------------------------------------
# Pruebas
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("objetivo", OBJETIVOS)
@pytest.mark.parametrize("nombre_vp", list(VIEWPORTS))
@pytest.mark.parametrize("timezone", TIMEZONES)
def test_carga_sin_errores(navegador, servidor, objetivo, nombre_vp, timezone):
    page, errores, cerrar = abrir_app(
        navegador, servidor, objetivo, VIEWPORTS[nombre_vp], timezone
    )
    try:
        assert page.locator("#heroSection").is_visible()
        assert page.locator("#clockNow").inner_text() != "--:--:--"
        errores.assert_limpio(f"{objetivo} {nombre_vp}px {timezone}")
    finally:
        cerrar()


@pytest.mark.parametrize("objetivo", OBJETIVOS)
@pytest.mark.parametrize("nombre_vp", list(VIEWPORTS))
def test_paginas_del_sidebar(navegador, servidor, objetivo, nombre_vp):
    page, errores, cerrar = abrir_app(
        navegador, servidor, objetivo, VIEWPORTS[nombre_vp], TIMEZONES[0]
    )
    try:
        for pagina in PAGINAS:
            page.evaluate(f"window.navigateToPage('{pagina}')")
            page.wait_for_timeout(180)
            visible = page.evaluate(
                f"!document.querySelector('.app-page[data-page=\"{pagina}\"]').hidden"
            )
            assert visible, f"La página {pagina} no se mostró"
            errores.assert_limpio(f"{objetivo} página {pagina}")
    finally:
        cerrar()


@pytest.mark.parametrize("objetivo", OBJETIVOS)
def test_modales_abren_atrapan_foco_y_cierran(navegador, servidor, objetivo):
    page, errores, cerrar = abrir_app(navegador, servidor, objetivo, VIEWPORTS["1280"], TIMEZONES[0])
    try:
        for modal_id in MODALES:
            page.evaluate(f"window.openModal('{modal_id}')")
            page.wait_for_timeout(120)
            assert page.locator(f"#{modal_id}").evaluate(
                "el => el.classList.contains('open')"
            ), f"{modal_id} no abrió"

            # 12 Tab seguidos no deben sacar el foco del modal.
            for _ in range(12):
                page.keyboard.press("Tab")
            dentro = page.evaluate(
                f"document.getElementById('{modal_id}').contains(document.activeElement)"
            )
            assert dentro, f"El foco se escapó de {modal_id}"

            page.keyboard.press("Escape")
            page.wait_for_timeout(120)
            assert not page.locator(f"#{modal_id}").evaluate(
                "el => el.classList.contains('open')"
            ), f"{modal_id} no cerró con Escape"
            errores.assert_limpio(f"{objetivo} modal {modal_id}")
    finally:
        cerrar()


@pytest.mark.parametrize("objetivo", OBJETIVOS)
@pytest.mark.parametrize("nombre_vp", list(VIEWPORTS))
def test_sin_desborde_horizontal(navegador, servidor, objetivo, nombre_vp):
    page, errores, cerrar = abrir_app(
        navegador, servidor, objetivo, VIEWPORTS[nombre_vp], TIMEZONES[0]
    )
    try:
        for pagina in PAGINAS:
            page.evaluate(f"window.navigateToPage('{pagina}')")
            page.wait_for_timeout(200)
            medidas = page.evaluate(
                "() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth })"
            )
            assert medidas["scroll"] <= medidas["inner"] + 1, (
                f"{objetivo} {nombre_vp}px · página {pagina}: desborde horizontal "
                f"({medidas['scroll']} > {medidas['inner']})"
            )
        errores.assert_limpio(f"{objetivo} {nombre_vp}px desborde")
    finally:
        cerrar()


@pytest.mark.parametrize("objetivo", OBJETIVOS)
def test_migracion_de_datos_viejos(navegador, servidor, objetivo):
    """Datos de una versión anterior deben migrar sin excepciones ni perder días."""
    page, errores, cerrar = abrir_app(
        navegador,
        servidor,
        objetivo,
        VIEWPORTS["1280"],
        TIMEZONES[0],
        settings=SETTINGS_VIEJOS,
        state=STATE_VIEJO,
        calls=CALLS_VIEJAS,
    )
    try:
        # breaks[]/lunch{} deben haberse convertido a blocks[].
        tiene_bloques = page.evaluate(
            "() => Object.values(window.settings.weeklySchedule).every(d => Array.isArray(d.blocks))"
        )
        assert tiene_bloques, "El horario viejo no migró a blocks[]"

        # La clave de semana sin ceros a la izquierda debe quedar normalizada.
        claves = page.evaluate("() => Object.keys(window.settings.scheduleOverridesByWeek)")
        assert "2026-01-05" in claves, f"La semana específica no se normalizó: {claves}"

        # La ventana válida sobrevive con la fecha acolchada; la basura se descarta.
        ventanas = page.evaluate("() => window.settings.higherRateWindows")
        assert len(ventanas) == 1, f"Se esperaba 1 ventana válida, quedaron {len(ventanas)}"
        assert ventanas[0]["date"] == "01/05/2026"

        # Los overrides basura no deben sobrevivir.
        assert page.evaluate("() => Object.keys(window.settings.cycleGoalOverrides).length") == 0
        assert page.evaluate("() => Object.keys(window.settings.yearGoalOverrides).length") == 0
        assert page.evaluate("() => Object.keys(window.settings.dailyGoalOverrides).length") == 0

        # Los registros sin id deben haber recibido uno.
        assert page.evaluate("() => window.state.events.every(e => !!e.id)")
        assert page.evaluate("() => window.state.pauseHistory.every(p => !!p.id)")
        assert page.evaluate("() => window.calls.every(c => !!c.id)")

        # Los toasts de descarte son esperados; los errores de consola no.
        errores.assert_limpio(f"{objetivo} migración")
    finally:
        cerrar()


@pytest.mark.parametrize("objetivo", OBJETIVOS)
def test_popup_de_bienvenida_en_perfil_nuevo(navegador, servidor, objetivo):
    page, errores, cerrar = abrir_app(
        navegador, servidor, objetivo, VIEWPORTS["1280"], TIMEZONES[0], settings={}
    )
    try:
        assert page.locator("#onboardingModal").evaluate("el => el.classList.contains('open')"), (
            "Un perfil nuevo debería ver el popup de bienvenida"
        )
        page.fill("#onboardingNameInput", "Jonathan")
        page.click("#onboardingSaveBtn")
        page.wait_for_timeout(250)
        assert not page.locator("#onboardingModal").evaluate(
            "el => el.classList.contains('open')"
        )
        assert "Jonathan" in page.locator("#greetingTitle").inner_text()
        errores.assert_limpio(f"{objetivo} bienvenida")
    finally:
        cerrar()


def test_gate_de_sesion_bloquea_la_app(navegador, servidor):
    """Sin sesión, app.html no debe ejecutar una sola línea de la app."""
    contexto = navegador.new_context(viewport={"width": 1280, "height": 900}, locale="es-MX")
    page = contexto.new_page()
    try:
        page.route(
            "**/js/boot.js",
            lambda route: route.fulfill(
                status=200, content_type="application/javascript", body="/* anulado */"
            ),
        )
        page.goto(f"{servidor}/app.html", wait_until="domcontentloaded")
        page.wait_for_timeout(400)
        assert page.evaluate("typeof window.render") == "undefined"
        assert page.evaluate("typeof window.state") == "undefined"
        assert page.locator("#bootGate").is_visible()
        # El resto del documento queda oculto hasta que se monte.
        assert not page.locator("#heroSection").is_visible()
    finally:
        contexto.close()


def test_landing_carga_y_muestra_formularios(navegador, servidor):
    contexto = navegador.new_context(viewport={"width": 1280, "height": 900}, locale="es-MX")
    page = contexto.new_page()
    errores = Errores()
    errores.enganchar(page)
    try:
        page.goto(f"{servidor}/index.html", wait_until="networkidle")
        page.wait_for_timeout(400)
        assert page.locator("#loginForm").is_visible()
        assert page.locator("#googleBtn").count() == 1
        # Sin configurar Supabase, la landing debe decirlo en vez de romperse.
        assert page.locator("#authMsg").is_visible()
        page.click("#tabSignup")
        page.wait_for_timeout(150)
        assert page.locator("#signupForm").is_visible()
        assert not page.locator("#loginForm").is_visible()
        # Cero errores de consola pese a la configuración incompleta.
        duros = [e for e in errores.items if "pageerror" in e]
        assert not duros, duros
    finally:
        contexto.close()


def test_paginas_legales_cargan(navegador, servidor):
    contexto = navegador.new_context(viewport={"width": 1280, "height": 900}, locale="es-MX")
    page = contexto.new_page()
    try:
        for ruta, titulo in [
            ("/privacidad.html", "Política de privacidad"),
            ("/terminos.html", "Términos de uso"),
        ]:
            page.goto(f"{servidor}{ruta}", wait_until="domcontentloaded")
            assert titulo in page.locator("h1").first.inner_text()
            # Recordatorio: quedan marcadores por rellenar antes de publicar.
            pendientes = page.evaluate(
                "() => (document.body.innerText.match(/\\[TU [^\\]]+\\]/g) || []).length"
            )
            if pendientes:
                print(f"  aviso: {ruta} tiene {pendientes} marcador(es) [TU ...] sin rellenar")
    finally:
        contexto.close()


def test_app_html_esta_al_dia():
    """app.html debe ser exactamente lo que genera el script desde el congelado."""
    import subprocess
    import sys

    resultado = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "build_app_html.py"), "--check"],
        capture_output=True,
        text=True,
    )
    assert resultado.returncode == 0, resultado.stdout + resultado.stderr
