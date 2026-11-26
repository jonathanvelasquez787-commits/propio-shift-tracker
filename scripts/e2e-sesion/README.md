# Pruebas en Chromium real: una sola sesion a la vez

Chromium con la extension cargada y `js/boot.js` REAL; la web sale de `public/`; la nube de Supabase es FALSA
(`repro.py`, mismas reglas que el SQL: notas de 2 minutos, traspaso, ack). No prueban tu Chrome real ni tu nube real,
ni el cierre de la ventanita al perder el foco. No corren en CI.

Correr: `sh scripts/e2e-sesion/run.sh [scen1 scen3 ...]` (construye la app y la extension; crea un certificado de prueba en /tmp/repro).
Variables: `LAT` = segundos de latencia por llamada de la nube HTTPS falsa (real.py), `HANG=get|both` y `STEPS` (scen8),
`PROPIO_PUB`, `PROPIO_EXT`, `PROPIO_CERT_DIR`.

| Guion | Que prueba | Resultado esperado (2.8.71) |
|---|---|---|
| scen1 | Web viva, la ventanita pregunta, "Abrir aqui", la web se pausa, se cierra y reabre la ventanita | pregunta una vez; la web queda en pausa; al reabrir no pregunta |
| scen3 | 3 notas viejas de una web que ya no existe | la ventanita abre SOLA, sin pregunta, y borra las notas |
| scen4 | Cierra la web con `ctx.route` (la peticion de salida no llega a ese manejador: no sirve para el cierre) | solo referencia |
| scen5 | Que el servidor reciba el `keepalive` al irse la pagina | llega el ping |
| scen6 | Cierra la web (navega a otra pagina) y abre la ventanita (nube HTTPS real) | notas de web = 0, pregunta falsa = False |
| scen7 | La ventanita se va (navega a otra pagina) | notas de extension = 0 |
| scen8 | La nube deja de contestar el traspaso (`HANG=get`: ~18 s; `HANG=both`: ~6 s) | la ventanita abre; con el codigo viejo (<=2.8.68) NUNCA |
| scen9 | Cierra la pestaña de la web de verdad con latencia (`LAT=0.6`) | notas de web = 0 y sin pregunta falsa |
| scen10 | Mide cuando la web deja su nota respecto a "app lista" | la nota sale antes (o junto) de "app lista" |
| scen11 | La nube NO contesta el aviso "ya guarde" (`session_takeover_ack`) al pausarse la web | la web borra su nota (~8 s), se pausa (~9 s) y la ventanita abre (~14 s); con <=2.8.70 la web NUNCA se pausaba |
| scen12 | La app de la web NO logra montarse (se bloquea `assets/app-main.js`) | la nota de la web aparece y se borra enseguida (no queda una nota viva de una pagina rota) |
