from repro import *
with sync_playwright() as p:
    prof = '/tmp/prof_repro3'; shutil.rmtree(prof, ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, locale='es', timezone_id='America/Tegucigalpa',
        args=['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT])
    ctx.route(lambda u: not (u.startswith('http://127.0.0.1') or u.startswith('chrome-extension') or 'supabase.co' in u or u.startswith('data:') or u.startswith('blob:')), lambda r, q: r.abort())
    ctx.route('**/*.supabase.co/**', handler); ctx.route('**/assets/register-sw.js*', lambda r, q: r.abort()); ctx.add_init_script(SEED)
    PUMP = ctx.new_page(); sl = lambda s: PUMP.wait_for_timeout(int(s*1000))
    # notas viejas de una web que YA NO esta abierta (cargas anteriores, la salida nunca llego)
    for k, age in enumerate((100, 70, 30)):
        C.notes['00000000-0000-4000-8000-00000000000%d' % k] = {'device': 'dev_webold', 'label': 'Windows', 'kind': 'web', 'seen': time.time() - age}
    show('0 sin web abierta, 3 notas viejas de web')
    P = ctx.new_page(); P.goto('chrome-extension://%s/panel.html?popup=1' % EXTID, wait_until='commit'); sl(9); show('1 ventanita', P=P)
    if P.locator('#sessionSwitchHere').count():
        say('>> PREGUNTA FALSA (nadie vivo). Clic en Abrir aqui'); P.click('#sessionSwitchHere')
    for i in range(8):
        sl(3); show('2 +%ds' % ((i+1)*3), P=P)
    ctx.close()
