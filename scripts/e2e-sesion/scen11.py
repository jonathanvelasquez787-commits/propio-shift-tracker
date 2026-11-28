from repro import *
# La nube NO contesta el aviso "ya guarde" (session_takeover_ack): la web igual tiene que borrar su nota, ponerse en pausa y recargarse.
HANG = set()
def h2(route, request):
    if request.method == 'POST' and any(n in request.url for n in HANG): return
    return handler(route, request)
with sync_playwright() as p:
    prof = '/tmp/prof_repro11'; shutil.rmtree(prof, ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, locale='es', timezone_id='America/Tegucigalpa',
        args=['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT])
    ctx.route(lambda u: not (u.startswith('http://127.0.0.1') or u.startswith('chrome-extension') or 'supabase.co' in u or u.startswith('data:') or u.startswith('blob:')), lambda r, q: r.abort())
    ctx.route('**/*.supabase.co/**', h2); ctx.route('**/assets/register-sw.js*', lambda r, q: r.abort()); ctx.add_init_script(SEED)
    PUMP = ctx.new_page(); sl = lambda s: PUMP.wait_for_timeout(int(s*1000))
    W = ctx.new_page(); W.goto('http://127.0.0.1:%d/app.html' % PORT, wait_until='commit')
    for _ in range(90):
        if any(n['kind']=='web' for n in C.notes.values()): break
        sl(1)
    sl(3)
    P = ctx.new_page(); P.goto('chrome-extension://%s/panel.html?popup=1' % EXTID, wait_until='commit'); sl(8)
    say('ventanita:', state(P))
    HANG.add('session_takeover_ack')
    say('>> la nube deja de contestar el aviso "ya guarde" y clic en Abrir aqui'); t0 = time.time(); P.click('#sessionSwitchHere')
    paused = gone = opened = None
    for i in range(24):
        sl(1); dt = round(time.time() - t0)
        webnote = any(n['kind']=='web' for n in C.notes.values())
        if gone is None and not webnote: gone = dt
        try: wtxt = W.evaluate("document.body.innerText").replace('\n', ' ')
        except Exception: wtxt = ''
        if paused is None and 'Abriste Propio en otro lugar' in wtxt: paused = dt
        if opened is None and state(P).get('ready'): opened = dt
    say('RESULTADO: nota de la web borrada a los', gone, 's | web en pausa a los', paused, 's | ventanita abrio a los', opened, 's')
    ctx.close()
