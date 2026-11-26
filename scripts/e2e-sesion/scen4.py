from repro import *
with sync_playwright() as p:
    prof = '/tmp/prof_repro4'; shutil.rmtree(prof, ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, locale='es', timezone_id='America/Tegucigalpa',
        args=['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT])
    ctx.route(lambda u: not (u.startswith('http://127.0.0.1') or u.startswith('chrome-extension') or 'supabase.co' in u or u.startswith('data:') or u.startswith('blob:')), lambda r, q: r.abort())
    ctx.route('**/*.supabase.co/**', handler); ctx.route('**/assets/register-sw.js*', lambda r, q: r.abort()); ctx.add_init_script(SEED)
    PUMP = ctx.new_page(); sl = lambda s: PUMP.wait_for_timeout(int(s*1000))
    W = ctx.new_page()
    W.goto('http://127.0.0.1:%d/app.html' % PORT, wait_until='commit')
    for _ in range(90):
        if any(n['kind']=='web' for n in C.notes.values()): break
        sl(1)
    sl(2); show('1 web abierta', W=W)
    say('--- se CIERRA la web (la pagina se va, la nota deberia borrarse) ---')
    W.goto('about:blank'); sl(3); show('2 web cerrada (3 s despues)')
    webnotes = sum(1 for n in C.notes.values() if n['kind']=='web')
    say('RESULTADO: notas de web que quedaron =', webnotes)
    P = ctx.new_page(); P.goto('chrome-extension://%s/panel.html?popup=1' % EXTID, wait_until='commit'); sl(9); show('3 ventanita justo despues', P=P)
    st = state(P)
    say('RESULTADO: pregunta falsa =', st.get('card') == 'prompt', '| ventanita abierta =', st.get('ready'))
    ctx.close()
