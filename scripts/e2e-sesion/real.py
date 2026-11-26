# Nube falsa como servidor HTTPS REAL (sin interceptar con Playwright): las peticiones al cerrar la pagina viajan como en Chrome.
from repro import *
import ssl
from http.server import BaseHTTPRequestHandler
CPORT = 9611
class FR:
    def __init__(s): s.out = None
    def fulfill(s, status=200, headers=None, body=''): s.out = (status, headers or {}, body)
class Rq:
    def __init__(s, url, method, data): s.url, s.method, s.post_data = url, method, data
class CH(BaseHTTPRequestHandler):
    def log_message(s, *a): pass
    def _do(s):
        time.sleep(float(os.environ.get('LAT', '0')))
        n = int(s.headers.get('content-length') or 0); data = s.rfile.read(n).decode() if n else ''
        r = FR(); handler(r, Rq('https://ccqlvcrsoluxoymuhxnl.supabase.co' + s.path, s.command, data))
        st, hd, body = r.out
        s.send_response(st)
        for k, v in hd.items(): s.send_header(k, v)
        b = body.encode() if isinstance(body, str) else (body or b'')
        s.send_header('content-length', str(len(b))); s.end_headers(); s.wfile.write(b)
        if 'session_leave' in s.path: say('NUBE recibio session_leave', s.command, 'auth=' + str(bool(s.headers.get('authorization'))))
    do_GET = do_POST = do_OPTIONS = do_PATCH = do_DELETE = do_HEAD = _do
cs = ThreadingHTTPServer(('127.0.0.1', CPORT), CH); cs.daemon_threads = True
sc = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); CERTS = os.environ.get('PROPIO_CERT_DIR', '/tmp/repro')
sc.load_cert_chain(os.path.join(CERTS, 'c.pem'), os.path.join(CERTS, 'k.pem'))
cs.socket = sc.wrap_socket(cs.socket, server_side=True)
threading.Thread(target=cs.serve_forever, daemon=True).start()
def launch(p, name):
    prof = '/tmp/prof_' + name; shutil.rmtree(prof, ignore_errors=True)
    ctx = p.chromium.launch_persistent_context(prof, channel='chromium', headless=True, locale='es', timezone_id='America/Tegucigalpa', ignore_https_errors=True,
        args=['--headless=new', '--ignore-certificate-errors', '--disable-extensions-except=' + EXT, '--load-extension=' + EXT,
              '--host-resolver-rules=MAP ccqlvcrsoluxoymuhxnl.supabase.co 127.0.0.1:%d, EXCLUDE 127.0.0.1' % CPORT])
    ctx.add_init_script(SEED)
    return ctx
