import os
import json
import time
import threading
import datetime
import ctypes
import glob
import winsound
import tkinter as tk
from tkinter import ttk
from tkinter import font as tkfont

import numpy as np
import soundcard as sc
import soundfile as sf
import pystray
from PIL import Image, ImageDraw, ImageTk

# Nitidez en pantallas con escala y agrupar bien el icono en la barra de tareas
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(1)
except Exception:
    pass
try:
    ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("jonathan.grabadora.sistema")
except Exception:
    pass

SR = 44100
ROJO = (198, 40, 40)
GRIS = (69, 90, 100)


def carpeta_musica():
    try:
        import winreg
        k = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders")
        ruta = winreg.QueryValueEx(k, "My Music")[0]
        winreg.CloseKey(k)
        if ruta:
            return ruta
    except Exception:
        pass
    return os.path.join(os.path.expanduser("~"), "Music")


CARPETA = os.path.join(carpeta_musica(), "Grabadora")
CONFIG = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")),
                      "Grabadora", "config.json")

TEMAS = {
    False: dict(bg="#f3f3f3", fg="#1f1f1f", sec="#666666", campo="#ffffff",
                borde="#c8c8c8", boton="#e6e6e6", boton_h="#d6d6d6",
                barra="#43a047", sel="#cfe3ff", sel_fg="#000000"),
    True: dict(bg="#1e1e1e", fg="#e8e8e8", sec="#9a9a9a", campo="#2a2a2a",
               borde="#3c3c3c", boton="#333333", boton_h="#444444",
               barra="#4caf50", sel="#3d5a80", sel_fg="#ffffff"),
}


def cargar_config():
    try:
        with open(CONFIG, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def guardar_config(cfg):
    try:
        os.makedirs(os.path.dirname(CONFIG), exist_ok=True)
        with open(CONFIG, "w", encoding="utf-8") as f:
            json.dump(cfg, f)
    except Exception:
        pass


def icono(fondo):
    """Micrófono blanco sobre un cuadrado redondeado de color."""
    s = 256
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=56, fill=fondo)
    b = "white"
    d.rounded_rectangle((92, 36, 164, 152), radius=36, fill=b)
    d.arc((66, 84, 190, 208), 0, 180, fill=b, width=14)
    d.rectangle((121, 206, 135, 228), fill=b)
    d.rounded_rectangle((90, 224, 166, 238), radius=7, fill=b)
    return img


class BotonRedondeado(tk.Canvas):
    """Boton en forma de pildora con efecto al pasar el mouse."""
    PALETAS = {
        False: {
            "listo": ("#e53935", "#c62828", "Grabar"),
            "grabando": ("#37474f", "#263238", "Parar y guardar"),
            "guardando": ("#9e9e9e", "#9e9e9e", "Guardando..."),
        },
        True: {
            "listo": ("#e53935", "#c62828", "Grabar"),
            "grabando": ("#607d8b", "#546e7a", "Parar y guardar"),
            "guardando": ("#616161", "#616161", "Guardando..."),
        },
    }

    def __init__(self, master, comando, ancho=320, alto=64):
        fondo = ttk.Style().lookup("TFrame", "background") or master.winfo_toplevel().cget("bg")
        super().__init__(master, width=ancho, height=alto, bd=0,
                         highlightthickness=0, bg=fondo)
        self.comando = comando
        self.w, self.h = ancho, alto
        self.modo = "listo"
        self.encima = False
        self.oscuro = False
        self.fuente = ("Segoe UI", 15, "bold")
        self.fondo_id = self.create_polygon(
            self._puntos(2, 2, ancho - 2, alto - 2, (alto - 4) // 2),
            smooth=True, splinesteps=24, outline="")
        self.punto = self.create_oval(0, 0, 0, 0, outline="")
        self.texto = self.create_text(0, alto // 2, fill="white",
                                      font=self.fuente, anchor="w")
        self.bind("<Enter>", self._entra)
        self.bind("<Leave>", self._sale)
        self.bind("<Button-1>", self._click)
        self.dibujar()

    @staticmethod
    def _puntos(x1, y1, x2, y2, r):
        return [x1 + r, y1, x1 + r, y1, x2 - r, y1, x2 - r, y1, x2, y1,
                x2, y1 + r, x2, y1 + r, x2, y2 - r, x2, y2 - r, x2, y2,
                x2 - r, y2, x2 - r, y2, x1 + r, y2, x1 + r, y2, x1, y2,
                x1, y2 - r, x1, y2 - r, x1, y1 + r, x1, y1 + r, x1, y1]

    def dibujar(self):
        base, hover, texto = self.PALETAS[self.oscuro][self.modo]
        self.itemconfigure(self.fondo_id, fill=hover if self.encima else base)
        self.itemconfigure(self.texto, text=texto)
        d = 16
        gap = 12
        ancho_t = tkfont.Font(font=self.fuente).measure(texto)
        if self.modo == "guardando":
            x0 = (self.w - ancho_t) / 2
            self.itemconfigure(self.punto, state="hidden")
        else:
            x0 = (self.w - (d + gap + ancho_t)) / 2
            cy = self.h / 2
            self.coords(self.punto, x0, cy - d / 2, x0 + d, cy + d / 2)
            color = "white" if self.modo == "listo" else "#ff5252"
            self.itemconfigure(self.punto, fill=color, state="normal")
            x0 += d + gap
        self.coords(self.texto, x0, self.h / 2)
        self.config(cursor="arrow" if self.modo == "guardando" else "hand2")

    def estado(self, modo):
        self.modo = modo
        self.dibujar()

    def tema(self, oscuro, fondo):
        self.oscuro = oscuro
        self.config(bg=fondo)
        self.dibujar()

    def pulso(self, visible):
        if self.modo == "grabando":
            self.itemconfigure(self.punto, state="normal" if visible else "hidden")

    def _entra(self, e):
        self.encima = True
        self.dibujar()

    def _sale(self, e):
        self.encima = False
        self.dibujar()

    def _click(self, e):
        if self.modo != "guardando":
            self.comando()


class App:
    def __init__(self, root):
        self.root = root
        root.title("Grabadora del sistema")
        self.img_ventana = ImageTk.PhotoImage(icono(ROJO).resize((64, 64)))
        root.iconphoto(True, self.img_ventana)

        self.grabando = False
        self.stop_ev = threading.Event()
        self.chunks = []
        self.pico = 0.0
        self.t0 = 0.0
        self.tray_iniciado = False
        self.chunks_mic = []
        self.usar_mic = False
        self.archivos = []
        self.cfg = cargar_config()
        self.reproduciendo = False
        self.repro_id = None

        self.estilo = ttk.Style()
        self.estilo.theme_use("clam")
        self.oscuro = tk.BooleanVar(value=bool(self.cfg.get("oscuro", True)))
        self.norm = tk.BooleanVar(value=True)
        self.mic = tk.BooleanVar(value=False)

        frm = ttk.Frame(root, padding=(22, 12, 22, 20))
        frm.pack(fill="both", expand=True)

        self.lbl_tema = ttk.Label(frm, style="Sec.TLabel",
                                  font=("Segoe UI", 9), cursor="hand2")
        self.lbl_tema.pack(anchor="e")
        self.lbl_tema.bind("<Button-1>", self.alternar_tema)

        self.btn = BotonRedondeado(frm, self.alternar)
        self.btn.pack(pady=(6, 0))

        self.tiempo = ttk.Label(frm, text="00:00", font=("Segoe UI", 22))
        self.tiempo.pack(pady=(10, 6))

        self.barra = ttk.Progressbar(frm, maximum=100)
        self.barra.pack(fill="x")

        opc = ttk.Frame(frm)
        opc.pack(pady=(12, 0))
        ttk.Checkbutton(opc, text="Subir volumen",
                        variable=self.norm).pack(side="left", padx=8)
        ttk.Checkbutton(opc, text="Grabar mi micrófono",
                        variable=self.mic).pack(side="left", padx=8)

        marco = ttk.Frame(frm, height=44)
        marco.pack(fill="x", pady=(6, 4))
        marco.pack_propagate(False)
        self.estado = ttk.Label(
            marco, text="Listo. Dale a Grabar y luego haz sonar el audio.",
            wraplength=320, justify="center", anchor="center",
            font=("Segoe UI", 9))
        self.estado.pack(expand=True)

        ttk.Separator(frm).pack(fill="x", pady=(0, 10))

        self.todas = tk.BooleanVar(value=False)
        cab = ttk.Frame(frm)
        cab.pack(fill="x")
        ttk.Label(cab, text="Clic para marcar  ·  doble clic para escuchar",
                  style="Sec.TLabel", font=("Segoe UI", 8)).pack(side="left")
        ttk.Checkbutton(cab, text="Todas", variable=self.todas,
                        command=self.alternar_todas).pack(side="right")
        zona = ttk.Frame(frm)
        zona.pack(fill="x", pady=(2, 10))
        self.lista = tk.Listbox(zona, height=5, width=34, activestyle="none",
                                selectmode="multiple", exportselection=False,
                                font=("Segoe UI", 10), relief="flat", bd=0)
        sb = ttk.Scrollbar(zona, orient="vertical", command=self.lista.yview)
        self.lista.config(yscrollcommand=sb.set)
        self.lista.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        self.lista.bind("<Double-Button-1>", self.doble_click)
        self.lista.bind("<<ListboxSelect>>", lambda e: self.sincronizar())
        self.lista.bind("<Delete>", self.pedir_borrado)
        self.lista.bind("<Control-a>", self.seleccionar_todo)

        fila = ttk.Frame(frm)
        fila.pack(fill="x")
        for c in range(3):
            fila.columnconfigure(c, weight=1, uniform="b")
        self.btn_play = ttk.Button(fila, text="▶ Reproducir",
                                   command=self.boton_play)
        self.btn_play.grid(row=0, column=0, sticky="ew", padx=(0, 4), ipady=2)
        self.btn_borrar = ttk.Button(fila, text="Borrar",
                                     command=self.pedir_borrado)
        self.btn_borrar.grid(row=0, column=1, sticky="ew", padx=4, ipady=2)
        ttk.Button(fila, text="Carpeta", command=self.abrir_carpeta).grid(
            row=0, column=2, sticky="ew", padx=(4, 0), ipady=2)
        self.refrescar_lista()
        self.aplicar_tema()

        menu = pystray.Menu(
            pystray.MenuItem("Abrir", lambda i, it: self.root.after(0, self.mostrar),
                             default=True),
            pystray.MenuItem(
                lambda it: "Parar y guardar" if self.grabando else "Grabar",
                lambda i, it: self.root.after(0, self.alternar)),
            pystray.MenuItem("Salir", lambda i, it: self.root.after(0, self.salir)),
        )
        self.tray = pystray.Icon("grabadora", icono(GRIS).resize((64, 64)),
                                 "Grabadora del sistema", menu)

        root.bind("<Unmap>", self.al_minimizar)
        root.protocol("WM_DELETE_WINDOW", self.salir)
        root.resizable(False, False)
        root.update_idletasks()
        w, h = root.winfo_reqwidth(), root.winfo_reqheight()
        x = (root.winfo_screenwidth() - w) // 2
        y = (root.winfo_screenheight() - h) // 2
        root.geometry("+%d+%d" % (x, y))
        self.tick()

    # --- tema ---------------------------------------------------------------
    def aplicar_tema(self):
        oscuro = self.oscuro.get()
        p = TEMAS[oscuro]
        s = self.estilo
        s.configure(".", background=p["bg"], foreground=p["fg"],
                    bordercolor=p["borde"], focuscolor=p["bg"])
        s.configure("TFrame", background=p["bg"])
        s.configure("TLabel", background=p["bg"], foreground=p["fg"])
        s.configure("Sec.TLabel", background=p["bg"], foreground=p["sec"])
        s.configure("TCheckbutton", background=p["bg"], foreground=p["fg"],
                    indicatorforeground=p["fg"], upperbordercolor=p["borde"],
                    lowerbordercolor=p["borde"])
        s.map("TCheckbutton",
              background=[("active", p["bg"])],
              foreground=[("active", p["fg"])],
              indicatorbackground=[("!disabled", p["campo"])])
        s.configure("TButton", background=p["boton"], foreground=p["fg"],
                    bordercolor=p["borde"], lightcolor=p["boton"],
                    darkcolor=p["boton"], focuscolor=p["boton"],
                    padding=(10, 4))
        s.map("TButton",
              background=[("disabled", p["bg"]), ("pressed", p["boton_h"]),
                          ("active", p["boton_h"])],
              foreground=[("disabled", p["sec"])],
              lightcolor=[("pressed", p["boton_h"]), ("active", p["boton_h"])],
              darkcolor=[("pressed", p["boton_h"]), ("active", p["boton_h"])])
        s.configure("Horizontal.TProgressbar", background=p["barra"],
                    troughcolor=p["campo"], bordercolor=p["borde"],
                    lightcolor=p["barra"], darkcolor=p["barra"], thickness=6)
        s.configure("TSeparator", background=p["borde"])
        rojo = "#c62828"
        s.configure("Peligro.TButton", background=rojo, foreground="#ffffff",
                    bordercolor=rojo, lightcolor=rojo, darkcolor=rojo,
                    focuscolor=rojo, padding=(10, 4))
        s.map("Peligro.TButton",
              background=[("pressed", "#8e1b1b"), ("active", "#b71c1c")],
              lightcolor=[("pressed", "#8e1b1b"), ("active", "#b71c1c")],
              darkcolor=[("pressed", "#8e1b1b"), ("active", "#b71c1c")])
        s.configure("Vertical.TScrollbar", background=p["boton"],
                    troughcolor=p["campo"], bordercolor=p["borde"],
                    arrowcolor=p["fg"], lightcolor=p["boton"],
                    darkcolor=p["boton"])
        s.map("Vertical.TScrollbar", background=[("active", p["boton_h"])])
        self.root.configure(bg=p["bg"])
        self.lista.config(bg=p["campo"], fg=p["fg"],
                          selectbackground=p["sel"], selectforeground=p["sel_fg"],
                          highlightthickness=1, highlightbackground=p["borde"],
                          highlightcolor=p["borde"])
        self.lbl_tema.config(text="☀ Modo claro" if oscuro else "☾ Modo oscuro")
        self.btn.tema(oscuro, p["bg"])
        self.titulo_oscuro(oscuro)

    def titulo_oscuro(self, oscuro, ventana=None):
        """Pone la barra de título de Windows en oscuro (si el sistema lo permite)."""
        ventana = ventana or self.root
        try:
            ventana.update_idletasks()
            hwnd = ctypes.windll.user32.GetParent(ventana.winfo_id())
            v = ctypes.c_int(1 if oscuro else 0)
            for attr in (20, 19):
                if ctypes.windll.dwmapi.DwmSetWindowAttribute(
                        hwnd, attr, ctypes.byref(v), ctypes.sizeof(v)) == 0:
                    break
        except Exception:
            pass

    def alternar_tema(self, e=None):
        self.oscuro.set(not self.oscuro.get())
        self.cambiar_tema()

    def cambiar_tema(self):
        self.aplicar_tema()
        self.cfg["oscuro"] = self.oscuro.get()
        guardar_config(self.cfg)

    # --- bandeja del sistema -------------------------------------------
    def al_minimizar(self, e):
        if e.widget is self.root and self.root.state() == "iconic":
            self.root.withdraw()
            if not self.tray_iniciado:
                self.tray_iniciado = True
                self.tray.run_detached()
            else:
                self.tray.visible = True
            self.actualizar_tray()

    def mostrar(self):
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
        try:
            self.tray.visible = False
        except Exception:
            pass

    def actualizar_tray(self):
        try:
            color = ROJO if self.grabando else GRIS
            self.tray.icon = icono(color).resize((64, 64))
            self.tray.title = "Grabando..." if self.grabando else "Grabadora del sistema"
            self.tray.update_menu()
        except Exception:
            pass

    def salir(self):
        if self.grabando:
            self.mostrar()
            self.estado.config(text="Primero para y guarda la grabación, luego cierra.")
            return
        try:
            self.tray.stop()
        except Exception:
            pass
        self.root.destroy()

    # --- grabación --------------------------------------------------------
    def alternar(self):
        if not self.grabando:
            self.chunks = []
            self.pico = 0.0
            self.stop_ev.clear()
            self.chunks_mic = []
            self.parar_reproduccion()
            self.usar_mic = self.mic.get()
            self.t0 = time.time()
            self.grabando = True
            self.btn.estado("grabando")
            self.estado.config(text="Grabando...")
            self.actualizar_tray()
            threading.Thread(target=self.hilo, daemon=True).start()
        else:
            self.stop_ev.set()
            self.btn.estado("guardando")
            self.estado.config(text="Guardando...")

    def hilo(self):
        try:
            altavoz = sc.default_speaker()
            loop = sc.get_microphone(id=str(altavoz.name), include_loopback=True)
            canales = min(2, loop.channels)
            if self.usar_mic:
                entrada = sc.default_microphone()
                with loop.recorder(samplerate=SR, channels=canales) as rs, \
                        entrada.recorder(samplerate=SR, channels=1) as rm:
                    while not self.stop_ev.is_set():
                        d = rs.record(numframes=SR // 10)
                        m = rm.record(numframes=SR // 10)
                        self.chunks.append(d)
                        self.chunks_mic.append(m)
                        self.pico = max(float(np.abs(d).max()),
                                        float(np.abs(m).max()))
            else:
                with loop.recorder(samplerate=SR, channels=canales) as rec:
                    while not self.stop_ev.is_set():
                        d = rec.record(numframes=SR // 10)
                        self.chunks.append(d)
                        self.pico = float(np.abs(d).max())
            self.root.after(0, self.guardar)
        except Exception as e:
            msg = str(e)
            self.root.after(0, lambda m=msg: self.error(m))

    def guardar(self):
        try:
            if not self.chunks:
                self.estado.config(text="No se grabó nada.")
            else:
                sis = np.concatenate(self.chunks).mean(axis=1)
                mono = sis
                if self.chunks_mic:
                    voz = np.concatenate(self.chunks_mic).mean(axis=1)
                    n = min(len(sis), len(voz))
                    sis, voz = sis[:n], voz[:n]
                    if self.norm.get():
                        if np.abs(sis).max() > 0.002:
                            sis = sis / np.abs(sis).max() * 0.5
                        if np.abs(voz).max() > 0.002:
                            voz = voz / np.abs(voz).max() * 0.5
                    mono = sis + voz
                pico = float(np.abs(mono).max())
                if self.norm.get() and pico > 0:
                    mono = mono / pico * 0.9
                os.makedirs(CARPETA, exist_ok=True)
                nombre = "grabacion_%s.wav" % datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                ruta = os.path.join(CARPETA, nombre)
                sf.write(ruta, np.clip(mono, -1, 1), SR)
                self.refrescar_lista(ruta)
                texto = "Guardado en Música > Grabadora:\n" + nombre
                if pico < 0.002:
                    texto += ("\nOjo: casi no sonó nada. Sube el volumen de Windows "
                              "o revisa que el audio salga por el dispositivo predeterminado.")
                self.estado.config(text=texto)
        except Exception as e:
            self.estado.config(text="Error al guardar: " + str(e))
        self.reiniciar_boton()

    def error(self, msg):
        self.estado.config(text="Error: " + msg)
        self.reiniciar_boton()

    def reiniciar_boton(self):
        self.grabando = False
        self.btn.estado("listo")
        self.actualizar_tray()

    # --- lista y reproducción --------------------------------------------
    def etiqueta(self, ruta):
        base = os.path.basename(ruta)[len("grabacion_"):-4]
        try:
            f = datetime.datetime.strptime(base, "%Y%m%d_%H%M%S")
            txt = f.strftime("%d/%m/%Y  %H:%M:%S")
        except ValueError:
            txt = base
        try:
            seg = int(round(sf.info(ruta).duration))
            txt += "   ·   %02d:%02d" % (seg // 60, seg % 60)
        except Exception:
            pass
        return txt

    def refrescar_lista(self, elegir=None, seleccionar=True):
        self.archivos = sorted(
            glob.glob(os.path.join(CARPETA, "grabacion_*.wav")), reverse=True)
        self.etiquetas = [self.etiqueta(r) for r in self.archivos]
        self.lista.delete(0, "end")
        for t in self.etiquetas:
            self.lista.insert("end", "☐  " + t)
        if self.archivos and seleccionar:
            i = self.archivos.index(elegir) if elegir in self.archivos else 0
            self.lista.selection_set(i)
            self.lista.see(i)
        self.sincronizar()

    def sincronizar(self):
        """Pone ☑/☐ según lo marcado y actualiza botones y el selector Todas."""
        sel = set(self.lista.curselection())
        arriba = self.lista.yview()[0]
        self.lista.delete(0, "end")
        for i, t in enumerate(self.etiquetas):
            self.lista.insert("end", ("☑  " if i in sel else "☐  ") + t)
        for i in sel:
            self.lista.selection_set(i)
        self.lista.yview_moveto(arriba)
        self.todas.set(bool(self.etiquetas) and len(sel) == len(self.etiquetas))
        self.actualizar_botones()

    def alternar_todas(self):
        if self.todas.get():
            self.lista.selection_set(0, "end")
        else:
            self.lista.selection_clear(0, "end")
        self.sincronizar()

    def actualizar_botones(self):
        n = len(self.lista.curselection())
        self.btn_play.state(["!disabled" if (n or self.reproduciendo) else "disabled"])
        self.btn_borrar.state(["!disabled" if n else "disabled"])
        self.btn_borrar.config(text="Borrar (%d)" % n if n > 1 else "Borrar")

    def seleccionar_todo(self, e=None):
        self.lista.selection_set(0, "end")
        self.sincronizar()
        return "break"

    def ruta_seleccionada(self):
        sel = self.lista.curselection()
        if sel and sel[0] < len(self.archivos):
            return self.archivos[sel[0]]
        return None

    def boton_play(self):
        if self.reproduciendo:
            self.parar_reproduccion()
        else:
            self.reproducir()

    def doble_click(self, e):
        if not self.archivos:
            return
        i = self.lista.nearest(e.y)
        caja = self.lista.bbox(i)
        if not caja or e.y > caja[1] + caja[3]:
            return
        self.lista.selection_clear(0, "end")
        self.lista.selection_set(i)
        self.sincronizar()
        self.parar_reproduccion()
        self.reproducir()

    # --- borrar con confirmación --------------------------------------------
    def confirmar_borrado(self, etiquetas):
        oscuro = self.oscuro.get()
        p = TEMAS[oscuro]
        n = len(etiquetas)
        d = tk.Toplevel(self.root)
        d.title("Borrar")
        d.configure(bg=p["bg"])
        d.resizable(False, False)
        d.transient(self.root)
        resultado = {"ok": False}

        def cerrar(ok):
            resultado["ok"] = ok
            d.destroy()

        marco = ttk.Frame(d, padding=22)
        marco.pack()
        titulo = ("¿Borrar esta grabación?" if n == 1
                  else "¿Borrar %d grabaciones?" % n)
        ttk.Label(marco, text=titulo, font=("Segoe UI", 12, "bold")).pack(anchor="w")
        muestra = etiquetas[:5]
        if n > 5:
            muestra.append("… y %d más" % (n - 5))
        ttk.Label(marco, text="\n".join(muestra), justify="left",
                  font=("Segoe UI", 10)).pack(anchor="w", pady=(10, 6))
        ttk.Label(marco, text="No se pueden recuperar.", style="Sec.TLabel",
                  font=("Segoe UI", 9)).pack(anchor="w", pady=(0, 14))
        botones = ttk.Frame(marco)
        botones.pack(anchor="e")
        cancelar = ttk.Button(botones, text="Cancelar", command=lambda: cerrar(False))
        cancelar.pack(side="left", padx=(0, 8), ipady=2)
        ttk.Button(botones, text="Borrar", style="Peligro.TButton",
                   command=lambda: cerrar(True)).pack(side="left", ipady=2)
        d.bind("<Escape>", lambda e: cerrar(False))
        d.protocol("WM_DELETE_WINDOW", lambda: cerrar(False))

        self.titulo_oscuro(oscuro, d)
        d.update_idletasks()
        x = self.root.winfo_x() + (self.root.winfo_width() - d.winfo_reqwidth()) // 2
        y = self.root.winfo_y() + (self.root.winfo_height() - d.winfo_reqheight()) // 2
        d.geometry("+%d+%d" % (max(x, 0), max(y, 0)))
        d.wait_visibility()
        d.grab_set()
        cancelar.focus_set()
        self.root.wait_window(d)
        return resultado["ok"]

    def pedir_borrado(self, e=None):
        sel = self.lista.curselection()
        if not sel:
            return
        rutas = [self.archivos[i] for i in sel if i < len(self.archivos)]
        etiquetas = [self.etiquetas[i] for i in sel if i < len(self.archivos)]
        if not rutas or not self.confirmar_borrado(etiquetas):
            return
        self.parar_reproduccion()
        fallos = 0
        for r in rutas:
            try:
                os.remove(r)
            except Exception:
                fallos += 1
        self.refrescar_lista(seleccionar=False)
        if not self.grabando:
            hechas = len(rutas) - fallos
            if hechas == 1:
                texto = "Se borró 1 grabación."
            else:
                texto = "Se borraron %d grabaciones." % hechas
            if fallos:
                texto = ("No pude borrar %d (¿está abierta en otro programa?)." % fallos)
            self.estado.config(text=texto)

    def reproducir(self):
        if self.grabando:
            self.estado.config(text="Para la grabación antes de reproducir.")
            return
        ruta = self.ruta_seleccionada()
        if not ruta or not os.path.exists(ruta):
            self.estado.config(text="Elige una grabación de la lista.")
            return
        try:
            ms = int(sf.info(ruta).duration * 1000) + 300
            winsound.PlaySound(ruta, winsound.SND_FILENAME | winsound.SND_ASYNC)
            self.reproduciendo = True
            self.btn_play.config(text="■ Detener")
            self.estado.config(text="Reproduciendo:\n" + os.path.basename(ruta))
            self.repro_id = self.root.after(ms, self.parar_reproduccion)
        except Exception as e:
            self.estado.config(text="No pude reproducir: " + str(e))

    def parar_reproduccion(self):
        if self.repro_id:
            try:
                self.root.after_cancel(self.repro_id)
            except Exception:
                pass
            self.repro_id = None
        if self.reproduciendo:
            try:
                winsound.PlaySound(None, winsound.SND_PURGE)
            except Exception:
                pass
            self.reproduciendo = False
            self.btn_play.config(text="▶ Reproducir")
            if self.estado.cget("text").startswith("Reproduciendo"):
                self.estado.config(
                    text="Listo. Dale a Grabar y luego haz sonar el audio.")

    def abrir_carpeta(self):
        os.makedirs(CARPETA, exist_ok=True)
        os.startfile(CARPETA)

    def tick(self):
        if self.grabando:
            seg = int(time.time() - self.t0)
            self.tiempo.config(text="%02d:%02d" % (seg // 60, seg % 60))
            self.btn.pulso(int(time.time() * 2) % 2 == 0)
            db = 20 * np.log10(max(self.pico, 1e-6))
            self.barra["value"] = max(0, min(100, (db + 70) / 70 * 100))
        else:
            self.barra["value"] = 0
        self.root.after(100, self.tick)


if __name__ == "__main__":
    ventana = tk.Tk()
    App(ventana)
    ventana.mainloop()
