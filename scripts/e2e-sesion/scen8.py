from repro import *
HANG = set()
def h2(route, request):
    if request.method == 'POST' and any(n in request.url for n in HANG): return   # la nube nunca contesta
    return handler(route, request)
with sync_playwright() as p:
    prof = '/tmp/prof_repro8'; shutil.rmtree(prof, ignore_errors=True)
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
    HANG.add('session_takeover_get')
    if os.environ.get('HANG','both') == 'both': HANG.add('session_takeover_request')
    say('>> la nube deja de contestar el pedido de traspaso y clic en Abrir aqui'); t0 = time.time(); P.click('#sessionSwitchHere')
    opened = None
    for i in range(int(os.environ.get('STEPS','14'))):
        sl(3); st = state(P); say('+%ds' % round(time.time()-t0), st)
        if st.get('ready') and opened is None: opened = round(time.time()-t0)
    say('RESULTADO: la ventanita abrio a los', opened, 's' if opened else '(NUNCA en 42 s)')
    ctx.close()
