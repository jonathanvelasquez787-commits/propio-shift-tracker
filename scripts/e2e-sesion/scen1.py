from repro import *
with sync_playwright() as p:
    prof = '/tmp/prof_repro'; shutil.rmtree(prof, ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, locale='es', timezone_id='America/Tegucigalpa',
        args=['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT])
    ctx.route(lambda u: not (u.startswith('http://127.0.0.1') or u.startswith('chrome-extension') or 'supabase.co' in u or u.startswith('data:') or u.startswith('blob:')), lambda r, q: r.abort())
    ctx.route('**/*.supabase.co/**', handler)
    ctx.route('**/assets/register-sw.js*', lambda r, q: r.abort())
    ctx.add_init_script(SEED)
    PUMP = ctx.new_page(); sl = lambda s: PUMP.wait_for_timeout(int(s*1000))
    try: ctx.wait_for_event('serviceworker', timeout=4000)
    except Exception: say('sin service worker')
    W = ctx.new_page(); W.on('pageerror', lambda e: say('ERR web:', str(e)[:100]))
    W.goto('http://127.0.0.1:%d/app.html' % PORT, wait_until='commit'); 
    for _ in range(90):
        if any(n['kind']=='web' for n in C.notes.values()): break
        sl(1)
    sl(3); show('1 web abierta', W=W)
    P = ctx.new_page(); P.on('pageerror', lambda e: say('ERR popup:', str(e)[:100]))
    P.goto('chrome-extension://%s/panel.html?popup=1' % EXTID, wait_until='commit'); sl(8); show('2 ventanita abierta', W=W, P=P)
    if P.locator('#sessionSwitchHere').count():
        say('>> clic en Abrir aqui'); P.click('#sessionSwitchHere')
    else: say('no salio la pregunta')
    for i in range(5):
        sl(3); show('3 +%ds' % ((i+1)*3), W=W, P=P)
    say('--- ventanita se cierra (clic afuera) ---'); P.close(); sl(4); show('4 sin ventanita', W=W)
    P2 = ctx.new_page(); P2.goto('chrome-extension://%s/panel.html?popup=1' % EXTID, wait_until='commit'); sl(8); show('5 ventanita otra vez', W=W, P2=P2)
    say('llamadas de traspaso:', [(round(a), b, c, d) for a, b, c, d in C.log])
    ctx.close()
