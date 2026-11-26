from repro import *
# La app NO logra montarse (se bloquea assets/app-main.js de la web): la web no debe dejar una nota de sesion viva.
with sync_playwright() as p:
    prof = '/tmp/prof_repro12'; shutil.rmtree(prof, ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, locale='es', timezone_id='America/Tegucigalpa',
        args=['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT])
    ctx.route(lambda u: not (u.startswith('http://127.0.0.1') or u.startswith('chrome-extension') or 'supabase.co' in u or u.startswith('data:') or u.startswith('blob:')), lambda r, q: r.abort())
    ctx.route('**/*.supabase.co/**', handler); ctx.route('**/assets/register-sw.js*', lambda r, q: r.abort()); ctx.add_init_script(SEED)
    ctx.route('http://127.0.0.1:%d/assets/app-main.js*' % PORT, lambda r, q: r.abort())
    PUMP = ctx.new_page(); sl = lambda ms: PUMP.wait_for_timeout(ms)
    W = ctx.new_page(); errs = []; W.on('pageerror', lambda e: errs.append(str(e)[:90]))
    t0 = time.time(); W.goto('http://127.0.0.1:%d/app.html' % PORT, wait_until='commit')
    timeline = []; last = None
    while time.time() - t0 < 25:
        sl(250); has = any(n['kind'] == 'web' for n in C.notes.values())
        if has != last: timeline.append(('nota web ' + ('APARECE' if has else 'DESAPARECE'), round(time.time() - t0, 1))); last = has
    say('linea de tiempo:', timeline)
    say('app lista =', state(W).get('ready'), '| errores de la pagina:', errs[:2])
    say('RESULTADO: notas de web vivas al final =', sum(1 for n in C.notes.values() if n['kind'] == 'web' and time.time() - n['seen'] < 15))
    ctx.close()
