from repro import *
# Mide cuanto tarda la web en dejar su nota de sesion y en estar lista, desde que empieza a cargar.
with sync_playwright() as p:
    prof = '/tmp/prof_repro10'; shutil.rmtree(prof, ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, locale='es', timezone_id='America/Tegucigalpa',
        args=['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT])
    ctx.route(lambda u: not (u.startswith('http://127.0.0.1') or u.startswith('chrome-extension') or 'supabase.co' in u or u.startswith('data:') or u.startswith('blob:')), lambda r, q: r.abort())
    ctx.route('**/*.supabase.co/**', handler); ctx.route('**/assets/register-sw.js*', lambda r, q: r.abort()); ctx.add_init_script(SEED)
    PUMP = ctx.new_page(); sl = lambda ms: PUMP.wait_for_timeout(ms)
    res = []
    for k in range(3):
        C.notes.clear()
        W = ctx.new_page(); t0 = time.time(); W.goto('http://127.0.0.1:%d/app.html' % PORT, wait_until='commit')
        tn = tr = None
        while time.time() - t0 < 40 and (tn is None or tr is None):
            sl(50)
            if tn is None and any(n['kind'] == 'web' for n in C.notes.values()): tn = time.time() - t0
            if tr is None and state(W).get('ready'): tr = time.time() - t0
        res.append((round(tn, 2) if tn else None, round(tr, 2) if tr else None)); W.close(); sl(500)
    say('RESULTADO (nota web, app lista) en segundos, 3 cargas:', res)
    ctx.close()
