from real import *
with sync_playwright() as p:
    ctx = launch(p, 'real6')
    PUMP = ctx.new_page(); sl = lambda s: PUMP.wait_for_timeout(int(s*1000))
    W = ctx.new_page(); W.goto('http://127.0.0.1:%d/app.html' % PORT, wait_until='commit')
    for _ in range(60):
        if any(n['kind']=='web' for n in C.notes.values()): break
        sl(1)
    sl(2); show('1 web abierta', W=W)
    say('--- se CIERRA la web ---')
    W.goto('http://127.0.0.1:%d/nada-existe' % PORT); sl(3); show('2 web cerrada (3 s despues)')
    say('RESULTADO: notas de web que quedaron =', sum(1 for n in C.notes.values() if n['kind']=='web'))
    P = ctx.new_page(); P.goto('chrome-extension://%s/panel.html?popup=1' % EXTID, wait_until='commit'); sl(9); show('3 ventanita justo despues', P=P)
    st = state(P); say('RESULTADO: pregunta falsa =', st.get('card') == 'prompt', '| ventanita abierta =', st.get('ready'))
    ctx.close()
