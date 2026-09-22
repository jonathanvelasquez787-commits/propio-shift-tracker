#!/usr/bin/env python3
"""
DEPRECADO — este script ya no se usa.

Desde este cambio, `app.html` es el único archivo: se edita directamente
(pegándolo o subiéndolo a Claude para que lo modifique con sus herramientas
de archivo) y se sube tal cual a GitHub. Ya no existe un archivo de
referencia "congelado" del que se generaba `app.html`, así que no hay nada
que verificar byte por byte.

Este archivo se deja solo como aviso. Puedes borrarlo del repo sin problema
(GitHub: abre el archivo → ícono de basura → "Commit changes"). Si lo
ejecutas, no hace nada.
"""

import sys


def main() -> int:
    print(
        "Este script ya no se usa. app.html se edita directamente — "
        "no hace falta generarlo ni verificarlo. Puedes borrar este archivo."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
