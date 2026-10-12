# Gastos y Metas — v603

Cambios aprobados por el usuario sobre la captura de Finanzas, incluida la
petición posterior de explicar los campos y Sumar/Restar mediante tooltips.

- Presupuesto, dinero reservado y pagos fechados se muestran por separado.
  El estado de pago deriva del ledger del mes elegido; reservar dinero no
  crea pagos. La marca manual antigua conserva su efecto de exclusión del
  reparto automático, visible como «Omitir reserva automática».
- «Liberar reserva» devuelve lo reservado, conserva pagos y exclusiones, y
  revierte el cambio si el guardado se rechaza. El reparto sigue priorizando
  Gastos antes de Metas y respeta las exclusiones.
- Mes de los pagos visible; períodos opcionales por fila: semanal, dos
  semanas, mensual, una sola vez o sin definir. No se infieren del nombre ni
  se multiplican los importes; se conserva el presupuesto actual, sin crear
  presupuestos históricos. La comparación mensual lo explica expresamente.
- Filas compactas, con ajustes e historial desplegables. Etiquetas completas,
  saldo pendiente/exceso explícito y porcentaje del total pagado del mes;
  sin pagos se muestra «—».
- Pagos y ajustes utilizan una sola entrada con selector USD/moneda local y
  equivalencia. Al cambiar la moneda se conserva el valor USD; los importes
  se redondean al centavo, incluida la frontera 1.005 → 1.01.
- Metas muestran dinero reservado y aportes mensuales orientativos con meses
  editables; no afirman depósitos bancarios ni una fecha límite automática.
- Campo «Monto a sumar o restar», desplegable «Apartar o devolver dinero» y
  botón «Aplicar ajuste». Ayuda visible y tooltips sobre el importe, moneda,
  Reservado, Sumar, Restar, Aplicar y Liberar. Funcionan con puntero y foco
  de teclado, Escape, y ubicación limitada a la ventana para evitar recortes.

## Verificación

- 583 pruebas Node, sin fallos ni omitidas: diez regresiones nuevas sobre
  pagos, centavos, datos heredados, liberación/rollback, conversión y período.
- Build de producción, puente y resumen independientes correctos; 2.214
  textos ES/EN, contratos de módulos, listeners y criterios de producción.
- Cuenta ficticia en servidor local: 17 comprobaciones de flujo real en
  navegador — moneda, pagos parcial/completo/exceso, filtros de mes,
  liberación, prioridades, edición, recarga y metas.
- 24 comprobaciones de distribución: Gastos/Metas, español/inglés,
  claro/oscuro, 1440/390/320 px; sin desbordamiento de página ni Finanzas.
- Ocho comprobaciones de tooltips: hover, explicación, foco, Escape y tamaño
  móvil; sin mutaciones financieras al pasar el puntero ni errores JS.

La cuenta y sus escrituras de prueba son exclusivamente locales. No se
modificaron datos reales ni se aplicaron migraciones. Los resultados locales
no certifican el despliegue; CI, integración y release publicado se comprueban
por separado antes de anunciar la publicación.
