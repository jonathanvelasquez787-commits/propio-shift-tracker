# Revisar llamadas e importaciones

Web 630 y código de extensión 2.3.0. La versión instalada en Chrome puede
seguir siendo anterior hasta instalar y recargar esa entrega.

## En la aplicación

- En Bloques del día → Llamadas, cada registro identifica su origen:
  estimado en vivo, oficial importado, corrección oficial, corrección manual,
  manual u origen sin confirmar. Los registros antiguos sin procedencia no se
  presentan como oficiales por suposición.
- Buscar Customer ID y Estado del registro filtran las llamadas del día activo.
  No borran registros ni cambian las ganancias. El contador compara las llamadas
  de ese día con las que coinciden; los filtros Todo/Llamadas/Acciones siguen disponibles.
- Agregar llamada manual muestra fecha, inicio, final, duración y pago base con
  conversión. Advierte un final futuro o traslape; Guardar sigue validando los datos.
  Un fallo al guardar conserva el formulario y no entrega una recompensa.
- Pegar llamadas informa cada fila: agregada, estimado actualizado, oficial
  corregida, duplicado sin cambios, traslape, fecha futura o formato inválido.
  Los motivos están plegados bajo el resumen. Una repetición dentro del texto se
  lee una sola vez y aparece en el resultado.
- El detalle se descarga al abrir la tabla. Si falla, Reintentar vuelve a cargarlo
  sin borrar llamadas ni el texto pegado. La sincronización de la extensión
  conserva su funcionamiento silencioso.

Ejemplo: una llamada estimada en vivo se reemplaza al llegar su historial oficial.
Podés encontrarla por Customer ID y consultar su estado. Al pegar otra vez la
misma fila ya guardada, se informa Sin cambios y no se suma otra llamada.

## Medición propia y recuperación

La aplicación conserva inicio y final observados con milisegundos y calcula la
duración sin redondeo decimal: 7:41 sigue siendo 461000 ms. El umbral personal
inclusivo de 40 segundos solo estima el pago: 7:39 usa 7 minutos y 7:40 usa 8.
El pago en vivo es una estimación según la tarifa configurada. Esto no demuestra
cómo Propio calcula sus segundos ni modifica sus importes oficiales.

Al finalizar una llamada se guarda primero un borrador recuperable con su inicio
y fin. Si falla esa escritura, la actividad anterior se conserva. Si falla el
guardado completo posterior, no se agrega una fila sin guardar ni una recompensa;
el borrador sigue disponible para recuperar la llamada después de recargar.
La detección recuperada directamente desde la extensión conserva además su cola
sin confirmar el evento como guardado cuando la aplicación rechaza la escritura.

## En el popup de la extensión

La cola muestra eventos pendientes, que pueden ser llamadas, sesiones o historial;
su cantidad no equivale a llamadas adicionales. Informa cuándo vence el evento
más antiguo, a las 24 horas. Al vencer se pausa su registro automático para revisión:
no se borra de la cola. Abrir Propio Shift Tracker reutiliza su pestaña si ya existe.

Ejemplo: quedan tres eventos y el más antiguo vence en una hora. Abrí Propio Shift Tracker
con la cuenta vinculada para reintentar. Si ya venció, compará con el historial de
Propio antes de resolverlo. La fecha se calcula con el reloj del dispositivo.

## Validación y límites

Pruebas de procedencia, búsqueda, importador de una sola pasada, cero minutos,
motivos por fila, escape de texto, vencimiento y reutilización de pestaña; también
rechazo y reintento de guardados manuales y en vivo. Recorridos con datos ficticios
en Chrome aislado, ES/EN, ambos temas y cuatro anchos, incluyendo descarga fallida,
cuota y persistencia al recargar. El popup usa una API Chrome simulada; no se
provocaron llamadas reales ni se modificaron datos del propietario.
