import json, ssl, threading, time, base64, hashlib, uuid, os, shutil, sys
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

SUPA = 'ccqlvcrsoluxoymuhxnl.supabase.co'
PORTAL = 'interpreters.propio-ls.com'
EXT = os.environ.get('EXT_DIR', '/tmp/ext/propio-bridge')
CERT_DIR = os.environ.get('CERT_DIR', '/tmp/e2e')
USER = 'c0ffee00-1111-4222-8333-444455556666'
OWNER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
SCOPE = hashlib.sha256(('pst-propio-bridge/v1:' + USER).encode()).hexdigest()
UPDATED = '2026-11-23T10:00:00+00:00'

def b64(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).rstrip(b'=').decode()
def jwt(exp): return b64({'alg': 'HS256', 'typ': 'JWT'}) + '.' + b64({'sub': USER, 'exp': int(exp)}) + '.sig'
def iso(ms): return time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime(ms / 1000)) + '.%03dZ' % (ms % 1000)

PORTAL_HTML = """<!doctype html><html><head><title>portal</title></head><body>
<h2>Welcome, Test User (1234)</h2><span id=st>Offline</span>
<div style="background:#00bcd4;padding:8px"><span style="background:rgba(0,0,0,.25);color:#06202a;border-radius:14px;padding:5px 14px;font:500 13px sans-serif;display:inline-block">Calls: 0</span> <span style="background:rgba(0,0,0,.25);color:#06202a;border-radius:14px;padding:5px 14px;font:500 13px sans-serif;display:inline-block">Minutes: 0</span></div>
<button id=b onclick="window.__clicks=(window.__clicks||0)+1;document.getElementById('st').textContent='Available';this.textContent='Stop Calls'">Start Calls</button>
</body></html>"""

class Fake:
    def __init__(self):
        self.mode = 'ok'; self.log = []; self.refreshes = 0; self.token = None
        self.lock = threading.Lock()
    def start(self):
        fake = self
        class H(BaseHTTPRequestHandler):
            protocol_version = 'HTTP/1.1'
            def log_message(self, *a): pass
            def _send(self, code, body, ctype='application/json'):
                data = body if isinstance(body, bytes) else (body if isinstance(body, str) else json.dumps(body)).encode()
                self.send_response(code)
                self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(data)))
                self.send_header('Access-Control-Allow-Origin', '*'); self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Methods', '*')
                self.send_header('Connection', 'close'); self.end_headers(); self.wfile.write(data)
            def do_OPTIONS(self): self._send(204, b'')
            def _handle(self):
                host = (self.headers.get('Host') or '').split(':')[0]; u = urlparse(self.path); n = int(self.headers.get('Content-Length') or 0)
                body = self.rfile.read(n) if n else b''
                if u.path == '/__ctl':
                    q = parse_qs(u.query); fake.mode = q.get('mode', ['ok'])[0]; return self._send(200, {'mode': fake.mode})
                if host == PORTAL: return self._send(200, PORTAL_HTML, 'text/html; charset=utf-8')
                auth = (self.headers.get('Authorization') or '').replace('Bearer ', '')
                fake.log.append((time.time(), u.path, auth[-6:]))
                if fake.mode == 'down': return self._send(503, {'message': 'down'})
                if u.path == '/auth/v1/token':
                    fake.refreshes += 1; exp = time.time() + 3600; fake.token = jwt(exp)
                    return self._send(200, {'access_token': fake.token, 'refresh_token': 'r%d' % fake.refreshes, 'expires_in': 3600, 'user': {'id': USER, 'email': 'jonathan@test'}})
                if u.path == '/rest/v1/rpc/automation_lease_worker':
                    now = int(time.time() * 1000)
                    return self._send(200, [{'granted': True, 'expires_at': iso(now + 90000), 'server_now': iso(now)}])
                if u.path == '/rest/v1/user_data':
                    sel = parse_qs(u.query).get('select', [''])[0]
                    if sel == 'updated_at': return self._send(200, [{'updated_at': UPDATED}])
                    return self._send(200, [{'state': {}, 'settings': {}, 'updated_at': UPDATED, 'schema_version': 1}])
                if u.path == '/rest/v1/calls': return self._send(200, [])
                return self._send(404, {'message': 'nope ' + u.path})
            do_GET = do_POST = _handle
        srv = ThreadingHTTPServer(('127.0.0.1', 8443), H); srv.daemon_threads = True
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); ctx.load_cert_chain(CERT_DIR + '/cert.pem', CERT_DIR + '/key.pem')
        srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        return srv

class Rig:
    def __init__(self, name):
        self.fake = Fake(); self.srv = self.fake.start()
        prof = '/tmp/prof_' + name; shutil.rmtree(prof, ignore_errors=True)
        self.pw = sync_playwright().start()
        self.ctx = self.pw.chromium.launch_persistent_context(prof, channel='chromium', headless=True, env={**os.environ, 'TZ': 'Etc/GMT+12'},
            args=['--headless=new', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT, '--ignore-certificate-errors',
                  f'--host-resolver-rules=MAP {SUPA} 127.0.0.1:8443, MAP {PORTAL} 127.0.0.1:8443'], viewport={'width': 600, 'height': 600})
        sw = self.ctx.service_workers[0] if self.ctx.service_workers else self.ctx.wait_for_event('serviceworker')
        self.sw = sw; self.id = sw.url.split('/')[2]
        self.t0 = time.time()
        self.ctl = self.ctx.new_page(); self.ctl.goto(f'chrome-extension://{self.id}/popup.html', wait_until='commit'); time.sleep(1)
    def say(self, *a): print('[%5.1fs]' % (time.time() - self.t0), *a, flush=True)
    def status(self):
        return self.ctl.evaluate("chrome.runtime.sendMessage({kind:'status'})")
    def seed(self, session=True, session_ttl_ms=3600000, auto=True, last_ended_min=3, data_old=None):
        self.status()
        now = int(time.time() * 1000)
        cfg = dict(scope=SCOPE, owner=OWNER, session=session, exp=now + session_ttl_ms, token=jwt(now / 1000 + session_ttl_ms / 1000), now=now, auto=auto,
                   lastEnded=None if last_ended_min is None else iso(now - last_ended_min * 60000))
        self.ctl.evaluate("""async (c) => {
          const cur = (await chrome.storage.local.get('bridge-v1'))['bridge-v1'] || {};
          const prep = cur.preparation || {};
          const next = { ...cur, mode: c.auto ? 'auto' : 'observe', accountScope: c.scope, coordinationOwner: c.owner,
            preparation: { ...prep, enabled: true, devicePassive: false, spacing: { enabled: true, minutes: 2, lastEndedAt: c.lastEnded }, resume: prep.resume || { break:false, lunch:false, mode:'manual' } } };
          const put = { 'bridge-v1': next, 'automation-device-passive': false };
          if (c.session) put['worker-session-v1'] = { accessToken: c.token, refreshToken: 'r0', expiresAt: c.exp, scope: c.scope, email: 'jonathan@test', savedAt: c.now };
          await chrome.storage.local.set(put);
        }""", cfg)
        if data_old is not None:
            self.ctl.evaluate("""async (a) => { const now = Date.now(); await chrome.storage.local.set({ 'worker-data-v1': { scope: a.scope, userId: a.user, result: 'ok', updatedAt: a.upd, fetchedAt: now - a.old, checkedAt: now - a.old, state: {}, settings: {}, calls: [], callsCount: 0 } }); }""",
                          dict(scope=SCOPE, user=USER, upd=UPDATED, old=data_old))
    def kick(self):  # dispara la alarma real del worker ahora (mismo nombre que usa el worker)
        self.ctl.evaluate("chrome.alarms.create('retry-bridge', { delayInMinutes: 0.02, periodInMinutes: 0.5 })")
        # OJO: create() reemplaza la alarma periodica; la restauramos despues de dispararse
    def storage(self, key):
        return self.ctl.evaluate("(k) => chrome.storage.local.get(k).then(o => o[k] || null)", key)
    def badge(self):
        return self.sw.evaluate("chrome.action.getBadgeText({})")
    def open_portal(self):
        p = self.ctx.new_page(); p.goto(f'https://{PORTAL}/portal', wait_until='load'); self.portal = p; return p
    def clicks(self):
        return self.portal.evaluate("window.__clicks || 0")
    def close(self):
        try: self.ctx.close()
        finally: self.pw.stop(); self.srv.shutdown()
