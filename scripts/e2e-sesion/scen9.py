from real import *
import os
with sync_playwright() as p:
    ctx = launch(p, 'real9')
    PUMP = ctx.new_page(); sl = lambda s: PUMP.wait_for_timeout(int(s*1000))
    W = ctx.new_page(); W.goto('http://127.0.0.1:%d/app.html' % PORT, wait_until='commit')
    for _ in range(60):
        if any(n['kind']=='web' for n in C.notes.values()): break
        sl(1)
    sl(12); show('1 web abierta y viva', W=W)
    say('--- CIERRO LA PESTANA de la web (page.close) ---'); W.close(); sl(1)
    say('notas de web 1 s despues del cierre =', sum(1 for n in C.notes.values() if n['kind']=='web'))
    sl(25)
    say('RESULTADO: notas de web 26 s despues =', sum(1 for n in C.notes.values() if n['kind']=='web'))
    P = ctx.new_page(); P.goto('chrome-extension://%s/panel.html?popup=1' % EXTID, wait_until='commit'); sl(9); show('2 ventanita', P=P)
    st = state(P); say('RESULTADO: pregunta falsa =', st.get('card') == 'prompt', '| ventanita abierta =', st.get('ready'))
    ctx.close()
