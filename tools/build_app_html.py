#!/usr/bin/env python3
"""
Genera app.html a partir del HTML congelado de referencia.

Regla de esta fase: la app NO se reescribe. Este script aplica exactamente
4 cambios y verifica que el resto del archivo quede byte por byte igual:

  1. <link> al CSS del envoltorio de sesión.
  2. El <script> principal pasa a type="text/plain" id="appMainScript".
     Así el navegador NO lo ejecuta al cargar: lo inyecta js/boot.js recién
     cuando la sesión está resuelta y localStorage ya tiene los datos de la
     cuenta correcta. Es lo que hace posible el "gate de sesión" sin tocar
     una sola línea de las ~10.000 del script.
  3. El div #bootGate antes de </body>.
  4. El <script type="module" src="/js/boot.js"> al final.

Uso:
    python3 tools/build_app_html.py
    python3 tools/build_app_html.py --check    (solo verifica, no escribe)
"""

import argparse
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "reference" / "propio_shift_tracker_Fixed_v539.html"
TARGET = ROOT / "app.html"

SHELL_LINK = '<link rel="stylesheet" href="/css/app-shell.css"/>\n'

BOOT_GATE = """<div id="bootGate" role="status" aria-live="polite">
  <div class="boot-inner" id="bootGateBody">
    <span class="boot-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 15 15"/><path d="M5 3 2 6"/><path d="M22 6 19 3"/></svg>
    </span>
    <span class="boot-spinner" aria-hidden="true"></span>
    <span class="boot-text" id="bootGateText">Abriendo tu cuenta…</span>
  </div>
</div>
<script type="module" src="/js/boot.js"></script>
"""


# Ojo: el archivo contiene un documento HTML completo DENTRO de un template
# literal de JS (exportAccountingPdf arma el reporte imprimible). Por eso hay
# dos </head> y dos </body>, y hay que anclarse a marcas que solo existan en el
# documento real, no contar apariciones.
HEAD_ANCHOR = "  </style>\n</head>\n<body>"
BODY_ANCHOR = "  </script>\n</body>\n</html>"


def build(source_html: str) -> str:
    html = source_html

    # 1. CSS del envoltorio, justo antes de cerrar el head real.
    assert html.count(HEAD_ANCHOR) == 1, "El ancla del <head> real no es única"
    html = html.replace(HEAD_ANCHOR, "  </style>\n" + SHELL_LINK + "</head>\n<body>", 1)

    # 2. El script principal deja de autoejecutarse.
    opens = re.findall(r"<script[^>]*>", html)
    plain_opens = [s for s in opens if s == "<script>"]
    assert len(plain_opens) == 1, f"Se esperaba un solo <script> sin atributos, hay {len(plain_opens)}"
    html = html.replace("<script>", '<script type="text/plain" id="appMainScript">', 1)

    # 3 y 4. Gate de arranque + módulo de boot, antes del </body> real.
    new_body_anchor = "  </script>\n</body>\n</html>".replace(
        "  </script>\n", "  </script>\n"
    )
    assert html.count(new_body_anchor) == 1, "El ancla del </body> real no es única"
    html = html.replace(new_body_anchor, "  </script>\n" + BOOT_GATE + "</body>\n</html>", 1)

    return html


def verify(source_html: str, built_html: str) -> list[str]:
    """Confirma que lo único que cambió es lo que este script agrega."""
    problems = []

    # El script principal debe llegar intacto, carácter por carácter.
    def main_script(text: str, opening: str) -> str:
        start = text.index(opening) + len(opening)
        end = text.index("</script>", start)
        return text[start:end]

    src_script = main_script(source_html, "<script>")
    out_script = main_script(built_html, '<script type="text/plain" id="appMainScript">')
    if src_script != out_script:
        problems.append("El contenido del script principal cambió — no debería.")
    else:
        digest = hashlib.sha256(src_script.encode("utf-8")).hexdigest()[:16]
        print(f"  script principal intacto (sha256:{digest}, {len(src_script):,} chars)")

    # Quitar lo agregado debe devolver exactamente el original.
    rebuilt = built_html
    rebuilt = rebuilt.replace("  </style>\n" + SHELL_LINK + "</head>\n<body>", HEAD_ANCHOR, 1)
    rebuilt = rebuilt.replace('<script type="text/plain" id="appMainScript">', "<script>", 1)
    rebuilt = rebuilt.replace("  </script>\n" + BOOT_GATE + "</body>\n</html>", BODY_ANCHOR, 1)
    if rebuilt != source_html:
        problems.append("Al revertir los cambios no se recupera el original: hay una edición no declarada.")
    else:
        print("  revertir los cambios devuelve el v539 original, byte por byte")

    # Comprobaciones estructurales básicas.
    for needle, label in [
        ('id="bootGate"', "gate de arranque"),
        ('src="/js/boot.js"', "módulo de boot"),
        ("/css/app-shell.css", "CSS del envoltorio"),
        ('id="appMainScript"', "script principal marcado"),
    ]:
        if built_html.count(needle) != 1:
            problems.append(f"Se esperaba exactamente 1 aparición de {label} ({needle}).")

    ids = re.findall(r'\sid="([^"]+)"', built_html)
    dupes = sorted({i for i in ids if ids.count(i) > 1})
    print(f"  ids totales: {len(ids)} · duplicados: {dupes if dupes else 'ninguno nuevo'}")

    return problems


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="solo verificar, no escribir")
    args = parser.parse_args()

    if not SOURCE.exists():
        print(f"No existe el archivo de referencia: {SOURCE}", file=sys.stderr)
        return 1

    source_html = SOURCE.read_text(encoding="utf-8")
    built = build(source_html)

    print(f"Origen : {SOURCE.name} ({len(source_html):,} chars)")
    print(f"Salida : {TARGET.name} ({len(built):,} chars)")
    print("Verificación:")
    problems = verify(source_html, built)

    if problems:
        for p in problems:
            print(f"  ERROR: {p}", file=sys.stderr)
        return 1

    if args.check:
        current = TARGET.read_text(encoding="utf-8") if TARGET.exists() else None
        if current != built:
            print("  ERROR: app.html no coincide con lo que genera este script.", file=sys.stderr)
            return 1
        print("  app.html está al día")
        return 0

    TARGET.write_text(built, encoding="utf-8")
    print(f"\nEscrito: {TARGET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
