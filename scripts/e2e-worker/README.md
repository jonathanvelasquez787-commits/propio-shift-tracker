# Pruebas del worker en Chromium real

Cargan la extension construida en un Chromium de verdad, SIN ventanita ni app (solo una pestaña de portal falsa).
Supabase y el portal de Propio son falsos (servidor HTTPS local; `--host-resolver-rules` redirige sus dominios).
La sesion del worker se siembra a mano (el login con Google NO se puede probar aqui). Zona horaria forzada a UTC-12 para caer dentro del horario 7-15.

- A: todo cerrado, ACW cumplido, sesion casi vencida -> se renueva sola y SE PULSA Start Calls.
- B: nube caida con datos de hace 6 min -> NO pulsa; al volver la nube, pulsa.
- C: marca "!" si falta la sesion del worker; en «solo registro» no avisa.
- E: 2 min solo con alarmas: el permiso no tiene huecos.
- F: caida corta de la nube (1 min): datos y plan se conservan (Parte 6).

No se ejecutan con `node --test` ni en CI (necesitan Playwright para Python y ~6 min). Correr con `sh scripts/e2e-worker/run.sh`.
