from real import *
with sync_playwright() as p:
    ctx = launch(p, 'real7')
    PUMP = ctx.new_page(); sl = lambda s: PUMP.wait_for_timeout(int(s*1000))
    P = ctx.new_page(); P.goto('chrome-extension://%s/panel.html?popup=1' % EXTID, wait_until='commit')
    for _ in range(60):
        if any(n['kind']=='extension' for n in C.notes.values()): break
        sl(1)
    sl(2); show('1 ventanita abierta', P=P)
    say('--- la ventanita se va (navega a otra pagina: pagehide) ---')
    P.goto('http://127.0.0.1:%d/nada-existe' % PORT); sl(3); show('2 ventanita ida')
    say('RESULTADO: notas de extension que quedaron =', sum(1 for n in C.notes.values() if n['kind']=='extension'))
    ctx.close()
