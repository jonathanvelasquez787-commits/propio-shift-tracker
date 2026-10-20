# Reportes, calendario y alcance de exportaciones

## Primero, qué pasó en el día

Reportes abre con el día seleccionado, su conclusión y las tres metas existentes.
Después aparecen ciclo, semana y gráficos. No se duplican controles ni se cambian
las cifras guardadas para conseguir ese orden.

Un día sin turno ni llamadas queda **sin evaluar**. Un día libre conserva su
actividad sin juzgar la meta. Un turno registrado con cero minutos sí tiene
datos y puede quedar debajo de la meta. Si ayer no tiene registros, el reporte
no inventa una comparación contra cero. La cabecera distingue Hoy de un día
histórico.

## Qué supone la proyección

La proyección divide lo ganado en el ciclo entre sus días naturales transcurridos,
incluido hoy, y extiende ese promedio a los catorce días. Incluye los bonos ya
registrados; no adivina promociones futuras. También cuenta días libres y hoy
puede estar incompleto.

Por ejemplo, 200 USD registrados en cuatro días naturales dan un promedio de
50 USD y una proyección de 700 USD. Es distinto del ritmo necesario para llegar
a la meta, que usa los días laborales restantes. La diferencia negativa respecto
de la meta conserva también su signo en la moneda secundaria.

El cálculo y sus supuestos están plegados dentro de la tarjeta de proyección.
No representan ingreso garantizado.

## Cómo leer el calendario

- **Sin datos:** no hay turno ni llamadas; no es incumplimiento.
- **Libre:** lo indica el horario o la elección manual del usuario.
- **Con actividad:** el color compara los minutos con la meta de esa fecha.

La ayuda compartida funciona en año y mes. Los días conservan su descripción en
el tooltip. Higher Rate añade minutos equivalentes al color; los minutos de
llamada y el bono se muestran separados. Los umbrales numéricos de la leyenda
mensual corresponden a la meta general actual, mientras un día puede conservar
su propia meta histórica.

## Qué sale en CSV y PDF

En Ajustes, la exportación identifica rango, número de días, llamadas y ganancias
antes de descargar. Un rango personalizado necesita ambas fechas; si se invierten,
se ordenan sin ampliar el período. El archivo incluye días sin llamadas.

Los archivos son en USD y contienen resumen diario y detalle por llamada.
El detalle separa **pago base, Higher Rate y total**, para entender su relación
con el resumen. La adherencia sin registros queda vacía en CSV y como raya en PDF,
en lugar de un 0% inventado. Se conserva la protección contra fórmulas de hoja de
cálculo y se escapa el texto del documento HTML.

No incluyen reservas, pagos de gastos ni recepciones manuales; no son respaldo
JSON ni certificación de dinero recibido. El PDF abre una ventana lista para
imprimir o guardar; la tabla se adapta a la impresión horizontal. En una ventana
angosta se desplaza con una indicación visible de que hay más columnas.

La generación de archivos se carga al solicitarla. La ventana del PDF se abre
durante el clic y después recibe el documento; si falla la carga o cambia la
cuenta, no se exportan datos de la cuenta anterior.
Las llamadas y sus bonos se capturan al pulsar exportar: cambiar una promoción
mientras carga el documento no modifica su detalle ni lo descuadra del resumen.

## Validación y límites

Pruebas de conclusiones, días sin datos/libres/con actividad, proyección natural,
CSV con bono y texto hostil, PDF sin eventos inline y preservación de registros.
941 pruebas completas correctas, 16 recorridos compilados en ES/EN, claro/oscuro
y 320/390/768/1365 px, más la comprobación final de todos los encabezados en inglés.
El generador de documentos se movió al paquete diferido: presupuesto revisado
de 100 a 103 KB; no se aumenta el inicial ni el de idiomas.

Chrome aislado canceló una descarga mínima de texto incluso en una página vacía,
tanto dentro como fuera del sandbox. Por eso el contenido real del Blob CSV y
el nombre propuesto se validan desde el navegador, pero no se certifica su
guardado nativo a disco en este entorno. No se alteraron políticas ni preferencias
de Chrome. La ventana HTML de impresión se comprueba por separado; no implica
una impresión física.
