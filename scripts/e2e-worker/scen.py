import sys, time, json
from lib import *
name = sys.argv[1]
r = Rig(name)
ok = True
def check(label, cond, extra=''):
    global ok
    ok = ok and bool(cond); r.say(('PASA ' if cond else 'FALLA'), label, extra)
def brief(st): return dict(session=st['workerSession']['state'], lease=st['workerLease']['state'], data=st['workerData']['state'], plan=st['workerPlan']['state'], inferred=st['workerPlan'].get('inferredStart'), mode=st['mode'], attention=st['attention'], wait=(st['preparation'] or {}).get('waitReason'))
def wait_for(pred, secs, step=1.0):
    end = time.time() + secs; last = None
    while time.time() < end:
        last = r.status()
        if pred(last): return last
        time.sleep(step)
    return last
try:
    if name == 'A':   # todo cerrado + ACW en 0: debe pulsar Start Calls; sesion casi vencida -> se renueva sola
        r.seed(session_ttl_ms=30000, last_ended_min=3)
        r.kick(); r.say('sembrado: sesion vence en 30 s, ACW terminado hace 3 min (minimo 2). Abro SOLO el portal falso.')
        r.open_portal()
        st = wait_for(lambda s: s['workerPlan']['state'] == 'ok', 25)
        r.say('estado:', brief(st))
        check('la sesion se renovo sola (refresh_token) contra la nube', r.fake.refreshes >= 1, f'refreshes={r.fake.refreshes}')
        check('permiso del worker concedido', st['workerLease']['state'] == 'granted')
        check('datos de la nube leidos', st['workerData']['state'] == 'ok')
        check('plan del worker listo (todo cerrado)', st['workerPlan']['state'] == 'ok', 'turno inferido=%s' % st['workerPlan'].get('inferredStart'))
        end = time.time() + 40
        while time.time() < end and r.clicks() < 1: time.sleep(1)
        r.say('estado final:', brief(r.status()))
        check('SE PULSO Start Calls en el portal con todo cerrado', r.clicks() == 1, f'clicks={r.clicks()}')
        t = [e for e in r.fake.log if 'lease' in e[1]]
        check('el permiso uso el token NUEVO tras renovar la sesion', len(t) > 0 and t[-1][2] == (r.fake.token or '')[-6:])
    elif name == 'B':  # nube caida: datos viejos y luego red caida -> NO pulsa
        r.fake.mode = 'down'
        r.seed(session_ttl_ms=3600000, last_ended_min=3, data_old=6 * 60000)
        r.say('sembrado: copia de datos revisada hace 6 min, nube CAIDA (503).')
        r.open_portal()
        time.sleep(6)
        st = r.status(); r.say('estado a los 6 s:', brief(st))
        check('con datos de hace 6 min el plan NO se arma', st['workerPlan']['state'] != 'ok', st['workerPlan']['state'])
        r.kick(); time.sleep(5)
        st = r.status(); r.say('tras revisar la nube caida:', brief(st))
        check('la nube caida queda anotada en datos (la copia se conserva y dice que el ultimo intento fallo)', st['workerData'].get('failing') in ('network', 'error'), str(st['workerData']))
        check('el plan sigue sin armarse', st['workerPlan']['state'] != 'ok', st['workerPlan']['state'])
        time.sleep(20)
        check('NO se pulso Start Calls sin datos al dia', r.clicks() == 0, f'clicks={r.clicks()}')
        r.fake.mode = 'ok'; r.kick(); r.say('la nube vuelve...')
        st = wait_for(lambda s: s['workerPlan']['state'] == 'ok', 20); r.say('estado:', brief(st))
        check('al volver la nube el plan se arma otra vez', st['workerPlan']['state'] == 'ok')
        end = time.time() + 30
        while time.time() < end and r.clicks() < 1: time.sleep(1)
        check('y entonces si pulsa Start Calls', r.clicks() == 1, f'clicks={r.clicks()}')
    elif name == 'C':  # marca "!" cuando falta la sesion del worker
        r.seed(session=False)
        r.kick(); time.sleep(4)
        st = r.status(); r.say('sin sesion propia:', brief(st), 'marca=%r' % r.badge())
        check('sin sesion del worker: marca "!"', r.badge() == '!')
        r.seed(session=True); r.kick(); time.sleep(5)
        st = r.status(); r.say('con sesion propia:', brief(st), 'marca=%r' % r.badge())
        check('con sesion conectada la marca se quita', r.badge() == '')
        r.ctl.evaluate("chrome.storage.local.remove('worker-session-v1')"); r.ctl.evaluate("chrome.runtime.sendMessage({kind:'device-passive', enabled:true})"); r.kick(); time.sleep(4)
        check('«solo registro en esta PC» sin sesion del worker no avisa', r.badge() == '', 'marca=%r' % r.badge())
    elif name == 'F':  # caida CORTA de la nube: el diseño de la 4c dice que aguanta 5 min sin pulsar con datos viejos
        r.seed(last_ended_min=3); r.kick(); r.open_portal(); r.say('nube OK; portal abierto; espero plan listo')
        st = wait_for(lambda s: s['workerPlan']['state'] == 'ok', 20); r.say('estado:', brief(st))
        check('arranque normal: plan listo', st['workerPlan']['state'] == 'ok')
        r.fake.mode = 'down'; r.say('>>> la nube se cae (503) <<<'); r.kick(); t_down = time.time()
        states = []
        for i in range(12):
            time.sleep(5); st = r.status(); states.append((st['workerData']['state'], st['workerPlan']['state']))
            r.say('datos=%s plan=%s' % states[-1])
        r.fake.mode = 'ok'
        # el permiso vale ~80 s sin renovar: una caida corta no apaga el pulso; pasado ese tiempo el plan se apaga (sin permiso no se pulsa, a proposito)
        first_bad = next((i for i, (d, p) in enumerate(states) if p != 'ok'), None)
        check('los datos se conservan durante la caida (siguen "ok")', all(d == 'ok' for d, p in states), 'estados: %s' % sorted(set(states)))
        check('el plan aguanta mas de 45 s de caida (permiso vigente)', first_bad is None or first_bad >= 9, 'primer cambio en la muestra %s' % first_bad)
    elif name == 'E':  # solo alarmas: sin portal, sin ventanita; el permiso no debe tener huecos
        r.seed(last_ended_min=3); r.kick(); r.say('sembrado; NO hay portal ni ventanita; solo miro el almacenamiento (no despierto al worker).')
        lapses = 0; samples = 0; last_asks = -1; asks_changes = 0; end = time.time() + 120
        while time.time() < end:
            time.sleep(5)
            lease = r.storage('worker-lease-v1'); samples += 1
            if not lease: continue
            valid = lease.get('result') == 'granted' and lease.get('expiresAt', 0) > time.time() * 1000
            if not valid: lapses += 1
            if lease.get('asks') != last_asks: asks_changes += 1; last_asks = lease.get('asks')
            r.say('permiso: valido=%s pedidos=%s vence en %.0fs' % (valid, lease.get('asks'), (lease.get('expiresAt', 0) - time.time() * 1000) / 1000), '| SW vivos:', len(r.ctx.service_workers))
        check('el permiso nunca se quedo sin vigencia en 2 min', lapses == 0, f'huecos={lapses} de {samples}')
        check('el worker despierto solo (alarmas) y renovo varias veces', asks_changes >= 4, f'cambios de pedidos={asks_changes}')
except Exception as e:
    import traceback; traceback.print_exc(); ok = False
finally:
    r.say('RESULTADO ESCENARIO', name, 'OK' if ok else 'CON FALLAS'); r.close()
