from repro import *
PINGS = []
orig = H.do_GET
def patched(s):
    if 'ping-ka' in s.path: PINGS.append(s.path)
    return orig(s)
H.do_GET = patched
with sync_playwright() as p:
    prof = '/tmp/prof_repro5'; shutil.rmtree(prof, ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, args=['--headless=new'])
    ctx.add_init_script("window.addEventListener('pagehide', () => { fetch('http://127.0.0.1:%d/ping-ka-1', {keepalive: true}).catch(() => {}); });" % PORT)
    PUMP = ctx.new_page(); sl = lambda s: PUMP.wait_for_timeout(int(s*1000))
    W = ctx.new_page(); W.goto('http://127.0.0.1:%d/app.html' % PORT, wait_until='commit'); sl(2)
    W.goto('http://127.0.0.1:%d/nada-existe' % PORT); sl(2)
    say('keepalive recibido por el servidor al irse la pagina:', PINGS)
    ctx.close()
