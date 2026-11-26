import json, time, threading, base64, os, sys, shutil
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

# Rutas: el repo (public/ ya construido) y la extension armada; se pueden cambiar con variables de entorno.
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PUB = os.environ.get('PROPIO_PUB', os.path.join(REPO, 'public')); EXT = os.environ.get('PROPIO_EXT', '/tmp/ext/propio-bridge')
USER = 'c0ffee00-1111-4222-8333-444455556666'
EXTID = 'fpdhiecihjndclfjjlchipnjnpmnepkg'
PORT = 9610
T0 = time.time()
def say(*a): print('[%5.1fs]' % (time.time() - T0), *a, flush=True)
def b64(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b'=').decode()
def jwt(exp): return b64({'alg':'HS256','typ':'JWT'})+'.'+b64({'sub':USER,'exp':int(exp)})+'.sig'

class H(SimpleHTTPRequestHandler):
    def __init__(s,*a,**k): super().__init__(*a,directory=PUB,**k)
    def log_message(s,*a): pass
    def do_GET(s):
        if s.path.split('?')[0] in ('/','/app','/app/'): s.path='/app.html'
        return super().do_GET()
srv = ThreadingHTTPServer(('127.0.0.1', PORT), H); srv.daemon_threads=True
threading.Thread(target=srv.serve_forever, daemon=True).start()

# ---- nube falsa (misma logica que el SQL de las notas y el traspaso) ----
class Cloud:
    def __init__(s):
        s.notes = {}      # instance -> dict
        s.take = None
        s.updated = '2026-11-23T10:00:00.000+00:00'
        s.rev = 0
        s.log = []
    def age(s, t): return max(0, int(time.time() - t))
    def rows(s, inst=None, dev=None, kind=None, others=True):
        out = []
        for i, n in s.notes.items():
            if time.time() - n['seen'] > 120: continue
            if others:
                if i == inst: continue
                if n['device'] == dev and n['kind'] == kind: continue
            out.append({'instance': i, 'device_id': n['device'], 'label': n['label'], 'kind': n['kind'], 'age_seconds': s.age(n['seen'])})
        return sorted(out, key=lambda r: r['age_seconds'])
C = Cloud()

def short(d): return (d or '')[:6]
def rpc(name, a):
    now = time.time()
    if name == 'session_heartbeat':
        C.notes[a['p_instance']] = {'device': a['p_device_id'], 'label': a['p_label'], 'kind': a['p_kind'], 'seen': now}
        rows = C.rows(others=False)
        for r in rows: r['is_self'] = r['instance'] == a['p_instance']
        return rows
    if name == 'session_others': return C.rows(a.get('p_instance'), a['p_device_id'], a['p_kind'])
    if name == 'session_leave': C.notes.pop(a['p_instance'], None); return None
    if name == 'session_takeover_request':
        C.take = {'dev': a['p_device_id'], 'label': a['p_label'], 'kind': a['p_kind'], 'at': now, 'acked': False}; return None
    if name == 'session_takeover_get':
        t = C.take
        return [] if not t else [{'by_device_id': t['dev'], 'by_label': t['label'], 'by_kind': t['kind'], 'age_seconds': C.age(t['at']), 'acked': t['acked']}]
    if name == 'session_takeover_ack':
        if C.take: C.take['acked'] = True
        return None
    if name == 'push_user_data_v2':
        C.rev += 1; C.updated = '2026-11-25T01:00:%02d.000+00:00' % (C.rev % 60)
        return {'updated_at': C.updated}
    if name in ('automation_lease', 'automation_lease_worker'):
        return [{'granted': False, 'expires_at': None, 'server_now': None}]
    return None

CORS = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': '*'}
def handler(route, request):
    u = request.url; m = request.method
    if m == 'OPTIONS': return route.fulfill(status=204, headers=CORS)
    path = u.split('supabase.co', 1)[1].split('?')[0]
    if path.startswith('/rest/v1/rpc/'):
        name = path.rsplit('/', 1)[1]
        try: a = json.loads(request.post_data or '{}')
        except Exception: a = {}
        res = rpc(name, a)
        if name.startswith('session_') and name not in ('session_heartbeat', 'session_others'):
            C.log.append((time.time() - T0, name, short(a.get('p_instance') or a.get('p_device_id')), a.get('p_kind', '')))
        if res is None: return route.fulfill(status=204, headers=CORS)
        return route.fulfill(status=200, headers={**CORS, 'content-type': 'application/json'}, body=json.dumps(res))
    if path == '/rest/v1/user_data':
        sel = u.split('select=')[1].split('&')[0] if 'select=' in u else ''
        if sel.startswith('updated_at'): body = [{'updated_at': C.updated}]
        else: body = [{'state': {}, 'calls': [], 'settings': {'onboarded': True, 'language': 'es', 'theme': 'dark'}, 'updated_at': C.updated, 'device_id': 'x', 'device_label': 'x', 'schema_version': 1}]
        return route.fulfill(status=200, headers={**CORS, 'content-type': 'application/json'}, body=json.dumps(body))
    if path == '/rest/v1/calls':
        return route.fulfill(status=200, headers={**CORS, 'content-type': 'application/json', 'content-range': '*/0'}, body='[]')
    if path == '/rest/v1/profiles':
        return route.fulfill(status=200, headers={**CORS, 'content-type': 'application/json'}, body=json.dumps([{'user_id': USER, 'username': 'jonathan', 'display_name': 'Jonathan'}]))
    if path.startswith('/auth/v1/'):
        exp = time.time() + 3600
        return route.fulfill(status=200, headers={**CORS, 'content-type': 'application/json'}, body=json.dumps({'access_token': jwt(exp), 'refresh_token': 'r1', 'expires_in': 3600, 'token_type': 'bearer', 'user': {'id': USER, 'email': 'jonathan@test', 'aud': 'authenticated'}, 'id': USER, 'email': 'jonathan@test'}))
    return route.fulfill(status=404, headers=CORS, body='{}')

SEED = """(() => { try {
 if (!/^(http:|chrome-extension:)/.test(location.protocol) || location.hostname.includes('propio-ls')) return;
 const k = 'sb-ccqlvcrsoluxoymuhxnl-auth-token';
 if (!localStorage.getItem(k)) { const exp = Math.floor(Date.now()/1000)+3600;
  localStorage.setItem(k, JSON.stringify({access_token: '%s', refresh_token: 'r0', expires_at: exp, expires_in: 3600, token_type: 'bearer', user: {id: '%s', aud: 'authenticated', email: 'jonathan@test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z'}})); }
 if (!localStorage.getItem('propio_shift_tracker_settings_es_v1')) localStorage.setItem('propio_shift_tracker_settings_es_v1', JSON.stringify({onboarded: true, language: 'es', theme: 'dark'}));
} catch (e) {} })();""" % (jwt(time.time() + 3600), USER)

def state(pg):
    try:
        return pg.evaluate("""() => ({card: document.querySelector('#sessionSwitchCard')?.dataset.state || null,
          ready: document.body.classList.contains('app-ready'), gate: !!document.getElementById('bootGate') && getComputedStyle(document.getElementById('bootGate')).display !== 'none',
          txt: (document.getElementById('bootGateBody')?.innerText || '').slice(0, 60).replace(/\\n/g, ' ')})""")
    except Exception as e: return {'err': str(e)[:40]}
def show(label, **pages):
    notes = ' | '.join('%s:%s:%ds' % (n['kind'][:3], short(i), time.time() - n['seen']) for i, n in C.notes.items() if time.time() - n['seen'] < 120)
    say(label, {k: (state(p) if not p.is_closed() else 'cerrada') for k, p in pages.items()}, 'notas=[', notes, '] take=', (C.take and (C.take['kind'][:3], C.take['acked'])))

def run():
    prof = '/tmp/prof_repro'; shutil.rmtree(prof, ignore_errors=True)
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, locale='es', timezone_id='America/Tegucigalpa',
            args=['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT])
        ctx.route('**/*.supabase.co/**', handler)
        ctx.route('**/assets/register-sw.js*', lambda r, q: r.abort())
        ctx.add_init_script(SEED)
        return ctx, p
